import { describe, expect, it } from "vitest";
import { FACEBOOK_SCOPES } from "./facebook";

describe("facebook scopes", () => {
  it("requests the minimum Page permissions needed to list and publish to a selected Page", () => {
    expect([...FACEBOOK_SCOPES]).toEqual([
      "pages_manage_posts",
      "pages_show_list",
    ]);
  });

  it("does not include any extra permissions", () => {
    expect(FACEBOOK_SCOPES).toHaveLength(2);
  });
});
