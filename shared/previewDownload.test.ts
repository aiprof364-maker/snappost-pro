import { describe, expect, it } from "vitest";
import {
  isPreviewAccessToken,
  watermarkedPreviewDownloadPath,
  watermarkedPreviewStorageKey,
} from "./previewDownload";

describe("watermarked preview download", () => {
  it("accepts only opaque preview tokens", () => {
    expect(isPreviewAccessToken("a".repeat(32))).toBe(true);
    expect(isPreviewAccessToken("abc_-ABC123".padEnd(43, "x"))).toBe(true);
    expect(isPreviewAccessToken("short")).toBe(false);
    expect(isPreviewAccessToken(`${"a".repeat(32)}/clean.jpg`)).toBe(false);
    expect(isPreviewAccessToken("../clean-image")).toBe(false);
  });

  it("returns the marked file and never the clean file", () => {
    expect(
      watermarkedPreviewStorageKey({
        brandedImageKey: "marked-key",
        cleanImageKey: "clean-key",
      })
    ).toBe("marked-key");
    expect(
      watermarkedPreviewStorageKey({
        brandedImageKey: "same-key",
        cleanImageKey: "same-key",
      })
    ).toBeNull();
    expect(
      watermarkedPreviewStorageKey({
        brandedImageKey: "only-public",
        cleanImageKey: null,
      })
    ).toBeNull();
    expect(
      watermarkedPreviewStorageKey({
        brandedImageKey: "  ",
        cleanImageKey: "clean-key",
      })
    ).toBeNull();
  });

  it("builds a same-origin download path", () => {
    const token = "abc_-".padEnd(43, "x");
    expect(watermarkedPreviewDownloadPath(token)).toBe(
      `/api/preview/${token}/download`
    );
  });
});
