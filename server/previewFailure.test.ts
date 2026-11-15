import { describe, expect, it } from "vitest";
import { describePreviewFailure, previewFailureMessage } from "./previewFailure";

describe("preview failure reporting", () => {
  it("identifies a missing font without putting the path in the visitor message", () => {
    const error = Object.assign(
      new Error(
        "ENOENT: SnapPost font file is missing (SnapPostBadge-Bold.ttf). Looked in /app/dist/fonts/SnapPostBadge-Bold.ttf"
      ),
      { code: "ENOENT" }
    );
    const failure = describePreviewFailure(error);
    expect(failure.reason).toBe("font_missing");
    expect(previewFailureMessage(failure.reason)).toBe(
      "We could not draw the SnapPost mark on that photo. Please try again shortly."
    );
    expect(previewFailureMessage(failure.reason)).not.toContain("/app");
  });

  it("identifies a database that has not picked up the new preview columns", () => {
    const error = Object.assign(new Error("Unknown column 'cleanImageKey' in 'field list'"), {
      code: "ER_BAD_FIELD_ERROR",
      errno: 1054,
    });
    expect(describePreviewFailure(error).reason).toBe("schema_column_missing");
    expect(previewFailureMessage("schema_column_missing")).toContain("still updating");
  });

  it("redacts API-key-like text from the log detail", () => {
    const failure = describePreviewFailure(new Error("rejected sk-live-secret-token-value"));
    expect(failure.detail).not.toContain("sk-live-secret-token-value");
    expect(failure.detail).toContain("[redacted]");
  });
});
