import { describe, expect, it } from "vitest";
import { FACEBOOK_SCOPES } from "./facebook";

describe("facebook scopes", () => {
  it("requests exactly the four required page permissions", () => {
    expect([...FACEBOOK_SCOPES]).toEqual([
      "pages_manage_posts",
      "pages_read_engagement",
      "pages_show_list",
      "pages_manage_metadata",
    ]);
  });

  it("does not include any extra permissions", () => {
    expect(FACEBOOK_SCOPES).toHaveLength(4);
  });
});
