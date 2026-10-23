# SnapPost Pro credential rotation status — 23–24 Oct 2026

Railway reported potential exposure of stored environment variables. No credential values are recorded in this document.

## Completed

- `STRIPE_SECRET_KEY`: replacement deployed; the confirmed superseded SnapPost Pro key was expired in Stripe.
- `STRIPE_WEBHOOK_SECRET`: replacement deployed; the old signing secret expired immediately.
- `RESEND_API_KEY`: replacement sending-only key deployed; the obsolete key was deleted.
- `JWT_SECRET` and `AUTH_SESSION_SECRET`: distinct new values deployed.
- `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`: replacement pair deployed; the former Root pair was deleted.
- `OPENAI_API_KEY`: restricted replacement deployed; the previous full-access key was revoked.
- `FACEBOOK_APP_SECRET`: reset with zero-hour grace period; replacement deployed server-side.
- `DATABASE_URL`: the inaccessible external database was deliberately retired. SnapPost Pro now uses a clean Railway-managed MySQL database; no legacy customer data was carried forward.
- `MAKE_WEBHOOK_URL`: confirmed unused. Removed from source and Railway on 24 Oct. The linked legacy Make webhook and its Google Sheets scenario were deleted. The public Git history was rewritten to remove the two legacy webhook test files and the exposed webhook string.

## Verification completed

- Railway reports the current cleaned `main` deployment successful and the production service online.
- `snappostpro.com`, the direct Railway service, and the public landing/preview/privacy routes returned HTTP 200 after the remediation.
- The public GitHub `main` ref now points to the rewritten history. The removed webhook test files return HTTP 404 from the public default branch.

## Still verify in normal use

- First genuine OpenAI caption request.
- First normal Facebook connect/publish flow.
- Secure owner access-link email, `/admin`, preview generation, authenticated image upload, Stripe checkout/webhook behavior.

All old credentials that were specifically replaced above are revoked or retired. The deleted Make webhook can no longer accept requests.
