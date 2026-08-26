const GRAPH = "https://graph.facebook.com/v19.0";
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID ?? "";
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET ?? "";

/** Minimum permissions for contractor-selected Facebook Page listing and publishing. */
export const FACEBOOK_SCOPES = [
  "pages_manage_posts",
  "pages_show_list",
  // Read only the permalink for the exact post SnapPost Pro just created.
  "pages_read_engagement",
] as const;

export function isFacebookConfigured(): boolean {
  return Boolean(FACEBOOK_APP_ID && FACEBOOK_APP_SECRET);
}

/** Build the Facebook OAuth dialog URL. redirectUri must match the app settings. */
export function buildFacebookAuthUrl(redirectUri: string, state: string): string {
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", FACEBOOK_APP_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", FACEBOOK_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}

/** Exchange an OAuth code for a short-lived user access token. */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<string> {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("client_id", FACEBOOK_APP_ID);
  url.searchParams.set("client_secret", FACEBOOK_APP_SECRET);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const resp = await fetch(url);
  const data = (await resp.json()) as { access_token?: string; error?: any };
  if (!resp.ok || !data.access_token) {
    throw new Error(
      `Facebook token exchange failed: ${data.error?.message ?? resp.status}`,
    );
  }
  return data.access_token;
}

/** Upgrade a short-lived token to a long-lived (~60 day) user token. */
export async function getLongLivedToken(shortToken: string): Promise<string> {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", FACEBOOK_APP_ID);
  url.searchParams.set("client_secret", FACEBOOK_APP_SECRET);
  url.searchParams.set("fb_exchange_token", shortToken);

  const resp = await fetch(url);
  const data = (await resp.json()) as { access_token?: string; error?: any };
  if (!resp.ok || !data.access_token) {
    throw new Error(
      `Facebook long-lived token failed: ${data.error?.message ?? resp.status}`,
    );
  }
  return data.access_token;
}

export type FacebookPage = {
  id: string;
  name: string;
  access_token: string;
};

/** List the pages the user manages, with page-scoped tokens. */
export async function listPages(userToken: string): Promise<FacebookPage[]> {
  const url = new URL(`${GRAPH}/me/accounts`);
  url.searchParams.set("access_token", userToken);
  url.searchParams.set("fields", "id,name,access_token");

  const resp = await fetch(url);
  const data = (await resp.json()) as { data?: FacebookPage[]; error?: any };
  if (!resp.ok) {
    throw new Error(`Facebook list pages failed: ${data.error?.message ?? resp.status}`);
  }
  return data.data ?? [];
}

/**
 * Publish a photo with a caption to a Facebook page.
 * Returns the created post/photo id.
 */
export async function postPhotoToPage(params: {
  pageId: string;
  pageAccessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<string> {
  const { pageId, pageAccessToken, imageUrl, caption } = params;
  const url = new URL(`${GRAPH}/${pageId}/photos`);

  const body = new URLSearchParams();
  body.set("url", imageUrl);
  body.set("caption", caption);
  body.set("access_token", pageAccessToken);

  const resp = await fetch(url, { method: "POST", body });
  const data = (await resp.json()) as {
    id?: string;
    post_id?: string;
    error?: any;
  };
  if (!resp.ok || (!data.id && !data.post_id)) {
    throw new Error(
      `Facebook post failed: ${data.error?.message ?? resp.status}`,
    );
  }
  return data.post_id ?? data.id!;
}

/**
 * Verify the exact Page post just created and return its canonical Facebook URL.
 * This deliberately reads no Page feed, comments, audience data, or historical content.
 */
export async function getPublishedPostPermalink(params: {
  postId: string;
  pageAccessToken: string;
}): Promise<string> {
  const url = new URL(`${GRAPH}/${params.postId}`);
  url.searchParams.set("fields", "id,permalink_url,link");
  url.searchParams.set("access_token", params.pageAccessToken);

  const resp = await fetch(url);
  const data = (await resp.json()) as {
    permalink_url?: string;
    link?: string;
    error?: any;
  };
  const permalinkUrl = data.permalink_url ?? data.link;
  if (!resp.ok || !permalinkUrl) {
    throw new Error(
      `Facebook post verification failed: ${data.error?.message ?? resp.status}`,
    );
  }
  return permalinkUrl;
}
