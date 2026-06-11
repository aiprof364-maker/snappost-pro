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
- [x] Add orange accent color token (keep blue primary)
- [x] Hero: "Stop Writing Captions. Start Getting Leads." + save 5+ hrs/week + 7-day trial line
- [x] How It Works: 4-step visual (Photo -> AI Caption -> Branded -> Post)
- [x] Before/after transformation section (covered by hero post-preview mock + 4-step)
- [x] Newsletter email-capture block (wired to Make webhook)
- [x] Cost-transparency block ("what we pay so you don't have to")
- [x] Connect screen: clear "you need a free Facebook Page" guidance + 1-line how-to
- [x] EXCLUDE false/non-functional claims: Instagram/LinkedIn posting, personal-profile posting, Starter "unlimited"
- [x] Test + checkpoint (7/7 pass, version d9a7cdc9)

## Port from previous version (round 2)
- [x] Recover Privacy Policy page content from old site and add /privacy route
- [x] Add Terms page if present on old site (verified: only Privacy Policy recovered from legacy site)
- [x] Recover before/after photo image URLs from old site and use real images in before/after section
- [x] Link Privacy/Terms in footer
- [x] Test + checkpoint

## Final Status
- [x] All core features implemented and tested
- [x] Privacy Policy page created and linked
- [x] Before/after transformation image hosted and rendering
- [x] Type-check passing
- [x] All 9 vitest tests passing
- [x] Ready for domain migration to snappostpro.com

## Stripe Checkout Debugging (Current)
- [x] Fix Stripe checkout button not redirecting to Stripe Checkout page
- [x] Verify trpc mutation is being called from frontend
- [x] Check network requests in browser
- [x] Verify Stripe session creation is returning valid URL
- [x] Change all "tradies" references to "contractors" throughout the app
- [x] Fix post limit display after subscription purchase
- [x] Add subscription management UI (unsubscribe, billing portal, refund info)
- [x] Set up Stripe webhook for subscription syncing


## FAQ & Feature Verification
- [x] Verify "Can I edit the caption before posting?" - VERIFIED: Textarea + Save caption button in UploadCard
- [x] Verify "Can I cancel anytime?" - VERIFIED: Manage subscription button opens Stripe billing portal
- [x] Verify "7-day free trial" - VERIFIED: Trial is applied to all new subscriptions via Stripe
- [x] Verify "No credit card required" - VERIFIED: Stripe trial doesn't require card upfront

## Email Notifications
- [x] Send purchase confirmation email when checkout completes (DONE - Resend integrated)
- [x] Send trial expiration warning email on day 6 of trial (DONE - Heartbeat endpoint created)
- [x] Send subscription renewal reminder email before renewal date (DONE - Heartbeat endpoint created)
- [x] Set up email service integration (DONE - Resend configured with persistent secrets)
- [x] Harden email initialization (DONE - Lazy loading prevents startup errors)

## Usage Analytics Dashboard
- [x] Track posts created per user per plan (DONE - Analytics page with usage metrics)
- [x] Track feature usage (AI captions, logo branding, Facebook posts) (DONE - Feature usage breakdown)
- [x] Identify high-usage users for upsell opportunities (DONE - Usage alerts when >80%)
- [x] Build analytics dashboard showing usage trends (DONE - Posts over time, status breakdown, feature usage)

## Scheduled Email Jobs (Heartbeat)
- [x] Create scheduled email endpoints (/api/scheduled/trial-expiration-warnings, /api/scheduled/renewal-reminders)
- [x] Mount scheduled routes in Express server
- [x] Implement cron-safe authentication checks
- [x] Ready for Heartbeat job creation (requires deployment first)

## Final Deliverables
- [x] All 12 vitest tests passing
- [x] TypeScript type-check clean
- [x] Resend API key configured in persistent platform secrets
- [x] Analytics dashboard fully functional
- [x] Scheduled email endpoints ready for deployment

## Phase 3: Advanced Features (Complete)
- [x] Deploy Heartbeat cron jobs (trial-expiration-warnings, renewal-reminders)
- [x] Implement real email logic with Stripe API (queries trial_end, current_period_end)
- [x] Build admin dashboard for high-usage contractors (>70% of limit)
- [x] Admin procedures: highUsageContractors, contractorAnalytics, emailDeliveryStats
- [x] Admin-only access control (role-based)
- [x] Upsell opportunity alerts in admin dashboard
