import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routers = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const previewBlock = routers.slice(
  routers.indexOf("/* ---------------------- Public free preview"),
  routers.indexOf("/* --------------------------- Account")
);

describe("anonymous job-photo preview", () => {
  it("does not post anything to Facebook", () => {
    expect(previewBlock).not.toContain("postPhotoToPage");
    expect(previewBlock).not.toContain("posts.publish");
    expect(previewBlock).toContain("watermark: showMark");
    expect(previewBlock).toContain("watermarkedBuffer");
  });

  it("logs tool use and caps anonymous caption calls", () => {
    expect(previewBlock).toContain('logConversionEvent(null, "tool_used"');
    expect(previewBlock).toContain("reservePreviewDailySlot");
    expect(routers).toContain('"tool_signup_click"');
    expect(routers).toContain("markPreviewEmailRequested");
    expect(routers).toContain("preview: Boolean(input.previewToken)");
  });
});
