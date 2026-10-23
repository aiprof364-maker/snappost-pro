# Meta app-secret rotation findings — 23 Oct 2026

Meta’s Basic Settings documentation states that an app secret is used in some Facebook Login flows and must be stored securely only on a server. It directs developers to reset a compromised secret immediately in the app’s Basic Settings and states that programmatic rotation is not available.

Meta’s Facebook Login security guidance says the app secret must never appear in client-side code and that server-to-server Graph API calls should be signed with the app secret. The deployed SnapPost Pro source already reads `FACEBOOK_APP_SECRET` only server-side. Its OAuth code exchange and long-lived-token exchange use the secret server-side.

The production change sequence is therefore: reset the secret in the correct published app dashboard, copy it privately to Railway’s `FACEBOOK_APP_SECRET`, deploy, verify the public site and a server-side Facebook connection path, then treat any existing integration issue as a reconnect requirement rather than assuming token continuity.

Sources:

- https://developers.facebook.com/documentation/development/create-an-app/app-dashboard/basic-settings
- https://developers.facebook.com/documentation/facebook-login/guides/access-tokens
- https://developers.facebook.com/documentation/facebook-login/security
