import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FACEBOOK_SCOPES,
  filterPagesForBusiness,
  getPublishedPostPermalink,
  listBusinesses,
} from "./facebook";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("facebook scopes", () => {
  it("requests only the business and Page permissions needed to select, publish, and verify the newly created post", () => {
    expect([...FACEBOOK_SCOPES]).toEqual([
      "business_management",
      "pages_manage_posts",
      "pages_show_list",
      "pages_read_engagement",
    ]);
  });

  it("does not include any extra permissions", () => {
    expect(FACEBOOK_SCOPES).toHaveLength(4);
  });

  it("returns only Page tokens belonging to the contractor-selected business portfolio", () => {
    const pages = filterPagesForBusiness(
      [
        { id: "tradie", name: "TradiePosts", access_token: "token-1" },
        { id: "other", name: "Other Page", access_token: "token-2" },
      ],
      [{ id: "tradie", name: "TradiePosts" }],
    );
    expect(pages).toEqual([
      { id: "tradie", name: "TradiePosts", access_token: "token-1" },
    ]);
  });

  it("reads only the newly published post permalink and no Page feed data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ permalink_url: "https://www.facebook.com/123_456" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      getPublishedPostPermalink({ postId: "123_456", pageAccessToken: "secret" }),
    ).resolves.toBe("https://www.facebook.com/123_456");

    const [request] = fetchMock.mock.calls[0];
    const url = new URL(String(request));
    expect(url.pathname).toBe("/v19.0/123_456");
    expect(url.searchParams.get("fields")).toBe("id,permalink_url");
    expect(url.searchParams.get("fields")).not.toContain("feed");
    expect(url.searchParams.get("fields")).not.toContain("comments");
    expect(url.searchParams.get("fields")?.split(",")).not.toContain("link");
  });

  it("throws when Facebook rejects business-portfolio discovery instead of treating it as an empty result", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: "Permission denied" } }),
    }) as unknown as typeof fetch;

    await expect(listBusinesses("secret")).rejects.toThrow(
      "Facebook list businesses failed: Permission denied",
    );
  });
});
