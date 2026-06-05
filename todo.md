# SnapPost Pro - Build TODO

## Database & Backend Foundation
- [x] Add Facebook domain verification meta tag to client/index.html
- [x] Add `posts` table to schema (image, caption, status, fbPostId, createdAt)
- [x] Add `integrations` table to schema (provider, accessToken, pageId, pageName)
- [x] Add subscription fields to users table (plan, stripeCustomerId, subscriptionStatus)
- [x] Push schema with pnpm db:push
- [x] Add db query helpers for posts and integrations

## Design System
- [x] Choose color palette + typography for professional SaaS look
- [x] Configure index.css theme tokens + Google font

## Backend Routers & Integrations
- [x] tRPC routers: account, posts, facebook, billing, contact
- [x] Facebook Graph helper (OAuth, pages, post photo)
- [x] Caption generation (LLM)
- [x] Logo branding (sharp composite)
- [x] Stripe helper + checkout + billing portal
- [x] Facebook OAuth callback Express route
- [x] Stripe webhook Express route
- [x] Backend type-check passes

## Landing Page
- [x] Hero section with CTA
- [x] Features section
- [x] Pricing section (Starter $19/mo, Pro $29/mo)
- [x] FAQ section
- [x] Footer with links to Contact + Changelog

## Photo Upload Flow
- [x] Upload job site photo (store to S3)
- [x] AI LLM generates trade-specific caption
- [x] Brand image with logo overlay
- [x] Preview + edit before posting

## Facebook Integration (wired, activates on Meta approval)
- [x] Facebook OAuth connect flow (pages_manage_posts, pages_read_engagement, pages_show_list, pages_manage_metadata)
- [x] Store FB tokens + selected page in integrations table
- [x] Post branded photo to connected FB page
- [x] Graceful "pending Meta approval" state

## Stripe Subscriptions
- [x] Stripe SDK + checkout + webhook + portal
- [x] Starter $19/mo and Pro $29/mo plans
- [x] Checkout flow
- [x] Subscription status gating in dashboard

## User Dashboard
- [x] Connected Facebook pages display
- [x] Post history
- [x] Account & subscription status

## Other Pages
- [x] Contact Us page with Make webhook
- [x] Changelog page with version history

## Domain Readiness
- [x] App uses window.location.origin (no hardcoded domains)
- [x] Provide snappostpro.com config guide (Meta + Stripe dashboard settings)

## Testing & Delivery
- [x] Write vitest tests (plans, facebook scopes, contact hardening)
- [x] Run all tests and ensure they pass (7/7)
- [x] Verify landing page renders in browser
- [x] Save checkpoint and deliver

## Pro Plan Cap (cost control)
- [x] Pro hard cap 300/mo (was unlimited); Starter 30/mo; free 3/mo

## Marketing Port from original (safe items only)
- [ ] Add orange accent color token (keep blue primary)
- [ ] Hero: "Stop Writing Captions. Start Getting Leads." + save 5+ hrs/week + 7-day trial line
- [ ] How It Works: 4-step visual (Photo -> AI Caption -> Branded -> Post)
- [ ] Before/after transformation section
- [ ] Newsletter email-capture block (wired to Make webhook)
- [ ] Cost-transparency block ("what we pay so you don't have to")
- [ ] Connect screen: clear "you need a free Facebook Page" guidance + 1-line how-to
- [ ] EXCLUDE false/non-functional claims: Instagram/LinkedIn posting, personal-profile posting, Starter "unlimited"
- [ ] Test + checkpoint
