import { describe, expect, it } from "vitest";
import { FACEBOOK_SCOPES } from "./facebook";

describe("facebook scopes", () => {
  it("requests the minimum Business and Page permissions needed to list and publish to a selected Page", () => {
    expect([...FACEBOOK_SCOPES]).toEqual([
      "business_management",
      "pages_manage_posts",
      "pages_read_engagement",
      "pages_show_list",
    ]);
  });

  it("does not include any extra permissions", () => {
    expect(FACEBOOK_SCOPES).toHaveLength(4);
  });
});
