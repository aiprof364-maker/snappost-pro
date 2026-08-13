# Resend Sender-Domain Verification

## Current status

- Domain added in Resend: `snappostpro.com`
- All three required Resend DNS records are present in Cloudflare and publicly resolvable.
- Resend verified `snappostpro.com` on 13 August 2026. The domain is ready to send email from the approved SnapPost Pro sender address.

## Resend record values

| Type | Name | Content | Priority | Status |
|---|---|---|---:|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDVgF2giNDyQTXoM6giH0ko4v081YEVex3/gffNs0Anyl84i+UkWXiRp8mEg/3VxM/KMBcOXH/Uk9COoa6cwcMvwW9+cdmPNF84i57zRdfBO1R6GNL6z6SLzYOGcSCE1Zz7ikbMr5lUyxzuvlWpTVVAeoFXXyeOedEEQmfJo5K1/wIDAQAB` | — | Verified |
| MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` | 10 | Verified |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — | Verified |

## Safety

- Do not change existing website, Meta, Zoho, Stripe, or Cloudflare proxy records.
- Only add Resend-specific records supplied by the Resend verification screen.

## Live validation — 13 August 2026

- SnapPost Pro accepted the magic-link request for `aiprof364@gmail.com` and displayed its 15-minute expiry confirmation.
- The message arrived in Gmail from `SnapPost Pro <noreply@snappostpro.com>`.
- The email link opened `https://snappostpro.com/dashboard` and created an authenticated application session for the independent email account. The live dashboard identifies the user as `AIProf` and does not use Manus authentication.
- After the logout-redirect regression fix was pushed to GitHub, the Railway production login screen accepted a fresh magic-link request and displayed the 15-minute expiry confirmation.
- The fresh post-deployment magic-link email arrived in the designated Gmail inbox from `SnapPost Pro <noreply@snappostpro.com>`.
- The fresh magic link authenticated the user into the live Railway dashboard, confirming the deployed email sign-in path remained operational after the redirect-race change.
