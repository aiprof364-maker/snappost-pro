# SnapPost Pro Railway security remediation — 23–24 October 2026

No variable values are recorded in this document.

## Completed sensitive-variable actions

- Replaced and deployed: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `JWT_SECRET`, `AUTH_SESSION_SECRET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `FACEBOOK_APP_SECRET`, and `OPENAI_API_KEY`.
- Replaced the failed external `DATABASE_URL` dependency with a fresh Railway-managed MySQL database. No legacy customer data was retained.
- Removed `MAKE_WEBHOOK_URL` because it was unused. Its linked Make webhook and linked scenario were deleted.

## Public or non-secret settings not rotated solely for the incident

- `VITE_STRIPE_PUBLISHABLE_KEY`, Stripe price IDs, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `ADMIN_EMAIL`, `CLOUDINARY_CLOUD_NAME`, `FACEBOOK_APP_ID`, `OWNER_EMAIL`, `PORT`, and support/display settings.

## Deployment and history verification

- Railway is connected to GitHub `main` with automatic deployments enabled.
- The latest cleaned source deployment completed successfully on 24 October.
- Legacy Make webhook test scripts were removed from current source and purged from rewritten public Git history. The removed file paths return HTTP 404 on the public default branch.
