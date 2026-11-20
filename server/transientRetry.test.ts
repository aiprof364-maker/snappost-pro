import { describe, expect, it, vi } from "vitest";
import { isTransientFailure, retryTransient } from "./transientRetry";
import {
  describePreviewFailure,
  previewFailureMessage,
} from "./previewFailure";

describe("preview transient retry", () => {
  it("treats dropped database connections and upstream 5xx as transient", () => {
    expect(
      isTransientFailure(
        Object.assign(
          new Error("Connection lost: The server closed the connection."),
          {
            code: "PROTOCOL_CONNECTION_LOST",
          }
        )
      )
    ).toBe(true);
    expect(
      isTransientFailure(
        new Error("Failed query: insert", {
          cause: Object.assign(new Error("read ECONNRESET"), {
            code: "ECONNRESET",
          }),
        })
      )
    ).toBe(true);
    expect(
      isTransientFailure({ message: "Server Error", http_code: 500 })
    ).toBe(true);
  });

  it("does not retry deterministic failures", () => {
    expect(
      isTransientFailure(
        new Error("Input buffer contains unsupported image format")
      )
    ).toBe(false);
    expect(
      isTransientFailure(
        Object.assign(new Error("Unknown column 'x'"), {
          code: "ER_BAD_FIELD_ERROR",
        })
      )
    ).toBe(false);
  });

  it("retries once and then succeeds", async () => {
    const work = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" })
      )
      .mockResolvedValueOnce("ok");
    await expect(retryTransient("test", work, { delayMs: 1 })).resolves.toBe(
      "ok"
    );
    expect(work).toHaveBeenCalledTimes(2);
  });

  it("does not retry a deterministic error", async () => {
    const work = vi.fn().mockRejectedValue(new Error("bad pixels"));
    await expect(retryTransient("test", work, { delayMs: 1 })).rejects.toThrow(
      "bad pixels"
    );
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("tells the visitor a connection problem is on our side, not their photo", () => {
    const failure = describePreviewFailure(
      Object.assign(new Error("Connection lost"), {
        code: "PROTOCOL_CONNECTION_LOST",
      })
    );
    expect(failure.reason).toBe("transient");
    expect(previewFailureMessage(failure.reason)).not.toContain("JPG");
    expect(previewFailureMessage("unknown")).not.toContain("JPG");
  });
});
