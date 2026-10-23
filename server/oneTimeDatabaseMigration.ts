import type { Express, Request, Response } from "express";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { createHash, timingSafeEqual } from "crypto";

type TableCopyResult = {
  table: string;
  sourceRows: number;
  targetRows: number;
};

type MigrationResponse = {
  success: boolean;
  tables?: TableCopyResult[];
  error?: string;
};

let migrationInProgress = false;
let migrationCompleted = false;

function getRequiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function quoteIdentifier(identifier: string): string {
  return `\`${identifier.replace(/`/g, "``")}\``;
}

function safeTokenMatches(requestToken: string | undefined): boolean {
  const expected = process.env.DATABASE_MIGRATION_TOKEN;
  if (!expected || !requestToken) return false;

  const actualHash = createHash("sha256").update(requestToken).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

async function getTableNames(connection: mysql.Connection): Promise<string[]> {
  const [rows] = await connection.query<RowDataPacket[]>("SHOW TABLES");
  return rows.map(row => String(Object.values(row)[0]));
}

async function getRowCount(
  connection: mysql.Connection,
  table: string
): Promise<number> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${quoteIdentifier(table)}`
  );
  return Number(rows[0]?.total ?? 0);
}

async function copyTable(
  source: mysql.Connection,
  target: mysql.Connection,
  table: string
): Promise<TableCopyResult> {
  const quotedTable = quoteIdentifier(table);
  const [definitionRows] = await source.query<RowDataPacket[]>(
    `SHOW CREATE TABLE ${quotedTable}`
  );
  const createStatement = Object.entries(definitionRows[0] ?? {}).find(
    ([key]) => key.toLowerCase().startsWith("create table")
  )?.[1];

  if (typeof createStatement !== "string") {
    throw new Error(`Could not read schema for ${table}`);
  }

  await target.query(`DROP TABLE IF EXISTS ${quotedTable}`);
  await target.query(createStatement);

  const [rows] = await source.query<RowDataPacket[]>(
    `SELECT * FROM ${quotedTable}`
  );

  if (rows.length > 0) {
    const columns = Object.keys(rows[0]);
    const columnList = columns.map(quoteIdentifier).join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const insertSql = `INSERT INTO ${quotedTable} (${columnList}) VALUES (${placeholders})`;

    for (const row of rows) {
      await target.execute(
        insertSql,
        columns.map(column => row[column])
      );
    }
  }

  const sourceRows = rows.length;
  const targetRows = await getRowCount(target, table);
  if (sourceRows !== targetRows) {
    throw new Error(`Row-count mismatch for ${table}`);
  }

  return { table, sourceRows, targetRows };
}

async function migrateDatabase(): Promise<TableCopyResult[]> {
  const sourceUrl = getRequiredEnvironment("DATABASE_URL");
  const targetUrl = getRequiredEnvironment("MIGRATION_TARGET_DATABASE_URL");

  if (sourceUrl === targetUrl) {
    throw new Error("Source and target databases must be different");
  }

  const source = await mysql.createConnection(sourceUrl);
  const target = await mysql.createConnection(targetUrl);

  try {
    const existingTargetTables = await getTableNames(target);
    if (existingTargetTables.length > 0) {
      throw new Error("Target database is not empty; refusing to overwrite it");
    }

    await target.query("SET FOREIGN_KEY_CHECKS = 0");
    const tableNames = await getTableNames(source);
    const copiedTables: TableCopyResult[] = [];

    for (const table of tableNames) {
      copiedTables.push(await copyTable(source, target, table));
    }

    await target.query("SET FOREIGN_KEY_CHECKS = 1");
    return copiedTables;
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}

export function registerOneTimeDatabaseMigration(app: Express) {
  app.post(
    "/internal/one-time-db-migration",
    async (req: Request, res: Response<MigrationResponse>) => {
      if (!safeTokenMatches(req.get("x-database-migration-token"))) {
        return res.status(404).json({ success: false, error: "Not found" });
      }

      if (migrationCompleted) {
        return res.status(409).json({
          success: false,
          error: "Migration has already completed in this deployment",
        });
      }

      if (migrationInProgress) {
        return res.status(409).json({
          success: false,
          error: "Migration is already in progress",
        });
      }

      migrationInProgress = true;
      try {
        const tables = await migrateDatabase();
        migrationCompleted = true;
        return res.status(200).json({ success: true, tables });
      } catch (error) {
        console.error("[One-time database migration] failed", error);
        return res.status(500).json({
          success: false,
          error:
            "Migration failed before cutover; the live app remains on its original database.",
        });
      } finally {
        migrationInProgress = false;
      }
    }
  );
}
