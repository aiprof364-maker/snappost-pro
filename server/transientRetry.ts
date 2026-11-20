/**
 * Retry helper for the free preview. Only network, database-connection and
 * upstream 5xx style failures are retried. Bad photos, schema problems and
 * other deterministic errors fail on the first try.
 */
const TRANSIENT_CODES = new Set<string | number>([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
  "ENOTFOUND",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_SEQUENCE_TIMEOUT",
  "ER_CON_COUNT_ERROR",
  "ER_LOCK_DEADLOCK",
  "ER_LOCK_WAIT_TIMEOUT",
  1040,
  1205,
  1213,
  2006,
  2013,
]);

const TRANSIENT_TEXT =
  /connection lost|server closed the connection|closed state|socket hang up|timed? ?out|timeout|econnreset|etimedout|temporarily unavailable|too many connections|gone away|lost connection|service unavailable|bad gateway|gateway time|rate limit/i;

function errorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    chain.push(current);
    if (typeof current !== "object") break;
    const record = current as { cause?: unknown; error?: unknown };
    current = record.cause ?? record.error;
  }
  return chain;
}

export function isTransientFailure(error: unknown): boolean {
  for (const item of errorChain(error)) {
    if (typeof item === "string") return TRANSIENT_TEXT.test(item);
    if (typeof item !== "object" || !item) continue;
    const record = item as {
      name?: unknown;
      code?: unknown;
      errno?: unknown;
      message?: unknown;
      http_code?: unknown;
      status?: unknown;
    };
    if (record.name === "PreviewPhotoError" || record.name === "TRPCError") {
      return false;
    }
    for (const code of [record.code, record.errno]) {
      if (
        (typeof code === "string" || typeof code === "number") &&
        TRANSIENT_CODES.has(code)
      ) {
        return true;
      }
    }
    for (const status of [record.http_code, record.status]) {
      if (
        typeof status === "number" &&
        (status >= 500 || status === 499 || status === 429 || status === 420)
      ) {
        return true;
      }
    }
    if (
      typeof record.message === "string" &&
      TRANSIENT_TEXT.test(record.message)
    ) {
      return true;
    }
  }
  return false;
}

export async function retryTransient<T>(
  label: string,
  work: () => Promise<T>,
  options: { attempts?: number; delayMs?: number } = {}
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 2);
  const delayMs = options.delayMs ?? 500;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientFailure(error)) throw error;
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message).slice(0, 200)
          : String(error).slice(0, 200);
      console.warn(
        `[Preview] ${label} failed (attempt ${attempt}/${attempts}), retrying: ${message}`
      );
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw lastError;
}
