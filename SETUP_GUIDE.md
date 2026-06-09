# SnapPost Pro — Go-Live & snappostpro.com Setup Guide

This guide gets SnapPost Pro live on **snappostpro.com** with Facebook posting, Stripe billing, and the Contact form all working. The app code is already domain-agnostic (it uses the live request origin), so there are no hardcoded domain references to change — you only configure dashboards and add secrets.

---

## 0. Order of operations (do these in order)

1. Publish the app and attach the snappostpro.com domain (Section 1).
2. Add the secrets/credentials (Section 2).
3. Configure Stripe (Section 3).
4. Configure the Meta/Facebook app (Section 4).
5. Configure the Make webhook for the Contact form (Section 5).
6. Run the go-live checklist (Section 6).

---

## 1. Domain — attach snappostpro.com

1. In the Manus project, create a checkpoint, then click **Publish** (top-right).
2. Open **Settings → Domains**.
3. Bind your custom domain `snappostpro.com` (and `www.snappostpro.com`). Follow the DNS records shown.
4. Wait until the domain shows **Active / verified**. Everything below uses `https://snappostpro.com`.

> The app reads the current domain automatically, so OAuth redirects, Stripe return URLs, and cookies all use snappostpro.com once it's the live domain. No code change required.

---

## 2. Secrets to add

Add these in **Settings → Secrets** (or I can add them for you on request). The app runs without them but the related feature stays in its "not configured" state until provided.

| Secret | Used for | Where to get it |
| --- | --- | --- |
| `FACEBOOK_APP_ID` | Facebook OAuth + posting | Meta App → Settings → Basic |
| `FACEBOOK_APP_SECRET` | Facebook OAuth + posting | Meta App → Settings → Basic |
| `STRIPE_SECRET_KEY` | Billing (server) | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Verifying Stripe webhooks | Stripe → Webhooks → your endpoint → Signing secret |
| `STRIPE_PRICE_STARTER` | Starter $19/mo price | Stripe → Products → Starter → Price ID (`price_...`) |
| `STRIPE_PRICE_PRO` | Pro $29/mo price | Stripe → Products → Pro → Price ID (`price_...`) |
| `MAKE_WEBHOOK_URL` | Contact form delivery | Make.com scenario webhook URL |

---

## 3. Stripe

1. **Products & prices** (Stripe Dashboard → Products):
   - Create **Starter** with a recurring price of **$19.00 / month**. Copy its `price_...` ID → `STRIPE_PRICE_STARTER`.
   - Create **Pro** with a recurring price of **$29.00 / month**. Copy its `price_...` ID → `STRIPE_PRICE_PRO`.
2. **API key:** Developers → API keys → copy the **Secret key** → `STRIPE_SECRET_KEY`.
3. **Webhook:** Developers → Webhooks → **Add endpoint**:
   - Endpoint URL: `https://snappostpro.com/api/stripe/webhook`
   - Events to send: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
   - After creating, copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`.
4. Checkout success/cancel URLs are generated automatically from the live origin:
   - Success: `https://snappostpro.com/dashboard?checkout=success`
   - Cancel: `https://snappostpro.com/pricing?checkout=cancel`

---

## 4. Meta / Facebook app

You now have a registered business + NZBN, which satisfies Meta's Business Verification requirement that previously blocked `pages_manage_posts`.

1. **App domains** (App → Settings → Basic):
   - App Domains: `snappostpro.com`
   - Site URL: `https://snappostpro.com`
   - Privacy Policy URL: `https://snappostpro.com/` (add a privacy page before App Review if Meta requires one)
2. **Domain verification** (Business Settings → Brand Safety → Domains):
   - Add `snappostpro.com`.
   - The verification meta tag is already in the app's `<head>`:
     `<meta name="facebook-domain-verification" content="r4ws2vbab3punrlh4i9vlx96f5cx1p" />`
   - Click **Verify**.
3. **Facebook Login → Settings**:
   - Valid OAuth Redirect URIs: `https://snappostpro.com/api/facebook/callback`
4. **Permissions / App Review** — request exactly these four (no more, no less):
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_show_list`
   - `pages_manage_metadata`
5. **Business Verification:** complete it in Business Settings → Security Center using your NZBN documents. Until the app is approved and in **Live** mode, only admins/testers of the app can connect — the dashboard shows a clear "activates once approved" state for everyone else.

---

## 5. Make webhook (Contact form)

1. In Make.com create a scenario starting with a **Custom webhook** trigger; copy its URL.
2. Set it as `MAKE_WEBHOOK_URL`.
3. The Contact form sends JSON: `{ name, email, message, source: "snappostpro.com", submittedAt }`.
4. If this secret is missing, the Contact form **fails clearly** and notifies the project owner instead of silently dropping the message.

---

## 6. Go-live checklist

- [ ] snappostpro.com is bound and shows Active.
- [ ] All secrets in Section 2 are set.
- [ ] Stripe: Starter $19 and Pro $29 prices exist; webhook endpoint added; signing secret set.
- [ ] Test a real checkout in Stripe test mode, confirm dashboard shows the plan + status.
- [ ] Meta: domain verified, OAuth redirect URI set, four permissions requested, business verification submitted.
- [ ] Once Meta approves: connect a page, upload a photo, confirm caption + logo, click **Post to Facebook**, verify it appears on the page.
- [ ] Contact form: submit a test message, confirm it lands in your Make scenario.

---

## Endpoint reference (built into the app)

| Purpose | Path |
| --- | --- |
| Facebook OAuth callback | `/api/facebook/callback` |
| Stripe webhook | `/api/stripe/webhook` |
| Checkout success redirect | `/dashboard?checkout=success` |
| Checkout cancel redirect | `/pricing?checkout=cancel` |

All paths are relative to `https://snappostpro.com` once the domain is live.
