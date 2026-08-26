import { describe, expect, it } from "vitest";
import { FACEBOOK_SCOPES } from "./facebook";

describe("facebook scopes", () => {
  it("requests only the Page permissions needed to list, publish, and verify the newly created post", () => {
    expect([...FACEBOOK_SCOPES]).toEqual([
      "pages_manage_posts",
      "pages_show_list",
      "pages_read_engagement",
    ]);
  });

  it("does not include any extra permissions", () => {
    expect(FACEBOOK_SCOPES).toHaveLength(3);
  });
});
