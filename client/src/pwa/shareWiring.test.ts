import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const preview = readFileSync(
  new URL("../pages/FreePreview.tsx", import.meta.url),
  "utf8"
);
const upload = readFileSync(
  new URL("../components/UploadCard.tsx", import.meta.url),
  "utf8"
);

describe("share preload wiring", () => {
  it("puts a shared photo into the preview picker without creating the preview", () => {
    expect(preview).toContain("isShareLanding");
    expect(preview).toContain("consumeSharedPhoto");
    expect(preview).toContain("acceptPickedPhoto");
    expect(preview).toContain("readPreviewImage");
    expect(preview).toContain("setPhoto(ready)");
    expect(preview).toContain("signedInShareDestination");
    expect(preview).not.toMatch(/consumeSharedPhoto[\s\S]{0,240}createPreview/);
  });

  it("keeps the shared-photo preload beside the brand step", () => {
    expect(preview).toContain("BrandSetupGate");
    expect(preview).toContain("setPhoto(ready)");
    const handler = preview.slice(
      preview.indexOf("if (!isShareLanding(search))"),
      preview.indexOf("setPhoto(ready)")
    );
    expect(handler).toContain("consumeSharedPhoto");
    expect(handler).toContain("acceptPickedPhoto");
    expect(handler).toContain("readPreviewImage");
    expect(handler).not.toContain("BrandSetupGate");
    expect(handler).not.toContain("saveBrandSetup");
    expect(preview).toContain('params.delete("account_created")');
    expect(preview).not.toContain("previewPath(token ?? undefined, landing)");
  });

  it("starts the dashboard upload with the same handler as a picked file", () => {
    expect(upload).toContain("consumeSharedPhoto");
    expect(upload).toContain("handleFileRef.current(file)");
    expect(upload).toContain('id="upload-section"');
  });
});
