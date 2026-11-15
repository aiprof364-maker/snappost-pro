import { describe, expect, it } from "vitest";
import { mysqlAffectedRows } from "./previewDrafts";

describe("mysql write counts", () => {
  it("reads affectedRows from mysql2's result tuple", () => {
    expect(mysqlAffectedRows([{ affectedRows: 1, insertId: 4 }, []])).toBe(1);
    expect(mysqlAffectedRows([{ affectedRows: 0 }, []])).toBe(0);
  });

  it("still reads a bare driver header", () => {
    expect(mysqlAffectedRows({ affectedRows: 2 })).toBe(2);
    expect(mysqlAffectedRows(null)).toBe(0);
  });
});
