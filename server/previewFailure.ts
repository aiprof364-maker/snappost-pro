import { isTransientFailure } from "./transientRetry";

type ErrorRecord = {
  message: string;
  code?: string | number;
};

function collectErrors(error: unknown): ErrorRecord[] {
  const records: ErrorRecord[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (typeof current === "string") {
      records.push({ message: current });
      break;
    }
    if (typeof current !== "object") break;
    const record = current as {
      message?: unknown;
      code?: string | number;
      errno?: number;
      http_code?: number;
      cause?: unknown;
      error?: unknown;
    };
    records.push({
      message: typeof record.message === "string" ? record.message : "",
      code: record.code ?? record.errno ?? record.http_code,
    });
    current = record.cause ?? record.error;
  }
  return records;
}

/** A short, secret-free description for Railway logs. */
export function describePreviewFailure(error: unknown): {
  reason: string;
  detail: string;
} {
  const records = collectErrors(error);
  const detail = records
    .map(record => [record.code, record.message].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(" | ")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .slice(0, 500);
  const blob = detail.toLowerCase();
  const codes = new Set(records.map(record => record.code));

  if (
    blob.includes("enoent") &&
    (blob.includes(".ttf") || blob.includes("font"))
  ) {
    return { reason: "font_missing", detail };
  }
  if (
    codes.has(1146) ||
    codes.has("ER_NO_SUCH_TABLE") ||
    blob.includes("er_no_such_table") ||
    blob.includes("doesn't exist")
  ) {
    return { reason: "schema_missing", detail };
  }
  if (
    codes.has(1054) ||
    codes.has("ER_BAD_FIELD_ERROR") ||
    blob.includes("unknown column")
  ) {
    return { reason: "schema_column_missing", detail };
  }
  if (blob.includes("data too long")) {
    return { reason: "value_too_long", detail };
  }
  if (blob.includes("cloudinary") || blob.includes("invalid image file")) {
    return { reason: "storage", detail };
  }
  if (isTransientFailure(error)) {
    return { reason: "transient", detail };
  }
  return { reason: "unknown", detail: detail || "no error message" };
}

/** Visitor-safe copy. Database and filesystem details stay in the logs. */
export function previewFailureMessage(reason: string) {
  switch (reason) {
    case "font_missing":
      return "We could not draw the SnapPost mark on that photo. Please try again shortly.";
    case "schema_missing":
    case "schema_column_missing":
      return "Preview storage is still updating. Please try again in a minute.";
    case "value_too_long":
      return "We could not save that preview. Please use a shorter business name or city.";
    case "storage":
      return "We could not store that photo. Please try another JPG or PNG shortly.";
    case "transient":
      return "Our server had a brief connection problem making your preview. Please try again.";
    default:
      return "Something went wrong on our side making that preview. Please try again in a minute.";
  }
}
