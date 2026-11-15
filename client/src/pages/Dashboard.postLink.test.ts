import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Dashboard.tsx", import.meta.url), "utf8");

describe("dashboard post link", () => {
  it("opens the draft named by the preview handoff", () => {
    expect(source).toContain('params.get("post")');
    expect(source).toContain("setSelectedPostId(requestedPost)");
    expect(source).toContain("captionWhenPostOpens");
  });
});
