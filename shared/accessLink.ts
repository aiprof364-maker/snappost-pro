/** How long an emailed free or admin access link can still be opened. */
export const ACCESS_LINK_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Plain-language lifetime used in email and on the sign-in page. */
export const ACCESS_LINK_LIFETIME_LABEL = "24 hours";

export function accessLinkExpiresAt(now = Date.now()) {
  return new Date(now + ACCESS_LINK_MAX_AGE_MS);
}

export function accessLinkEmailParagraph() {
  return `Open the secure link below to access SnapPost Pro. It stays active for ${ACCESS_LINK_LIFETIME_LABEL}, and you can open it more than once until then. If it has expired, go back to the sign-in page and request a new one.`;
}

export function accessLinkSentHint() {
  return `It stays active for ${ACCESS_LINK_LIFETIME_LABEL}, and you can open it again if you get interrupted or called away.`;
}

export type AccessLinkProblem = {
  code: "expired-link" | "invalid-link";
  title: string;
  body: string;
  emailAction: string;
  adminAction: string;
};

/**
 * Copy for someone who followed an access link and still needs to get in.
 * Expired is a finished link. Invalid is a link we could not use at all.
 */
export function accessLinkProblem(
  error: string | null
): AccessLinkProblem | null {
  if (error === "expired-link") {
    return {
      code: "expired-link",
      title: "That link has expired",
      body: `Your access link works for ${ACCESS_LINK_LIFETIME_LABEL}. You can open the same link more than once until then, so a second tap, opening it on the wrong device, or getting called away will not lock you out. This link has finished.`,
      emailAction: "Email me a new access link",
      adminAction: "Send a new admin access link",
    };
  }
  if (error === "invalid-link" || error === "sign-in-failed") {
    return {
      code: "invalid-link",
      title: "That link did not work",
      body: "We could not use that access link. Request a new one and open it when you are ready.",
      emailAction: "Email me a new access link",
      adminAction: "Send a new admin access link",
    };
  }
  return null;
}

export function accessLinkProblemHelp(isAdminAccess: boolean) {
  return isAdminAccess
    ? "Send a new link to the admin inbox."
    : "Enter your email below and we’ll send a new one.";
}
