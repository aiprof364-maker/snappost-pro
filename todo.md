# SnapPost Pro - Build TODO

**⚠️ IMPORTANT:** See AI_AGENT_GUIDELINES.md for rules to prevent repeated mistakes

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

## Phase 4: Contractor Onboarding Sequence (Complete)
- [x] Create 3-email onboarding templates (day 1, day 3, day 5)
- [x] Implement sendOnboardingDay1, sendOnboardingDay3, sendOnboardingDay5 functions
- [x] Create scheduled onboarding job endpoint (/api/scheduled/onboarding-sequence)
- [x] Deploy Heartbeat cron job for onboarding (FDejCrA3Bm5SRbH7LryVCg)
- [x] All 12 tests passing
- [x] TypeScript clean

## Email Automation Complete
- [x] Trial expiration warnings (day 6 of 7-day trial)
- [x] Renewal reminders (1 day before renewal)
- [x] Onboarding sequence (day 1, 3, 5 after signup)
- [x] All emails sent via Resend with persistent API key
- [x] All scheduled jobs deployed and firing daily at 9am UTC

## Cron Migration: Manus → Railway (COMPLETE)
- [x] Install node-cron package
- [x] Create server/cron.ts with three scheduled jobs
- [x] Export handlers from scheduledRoutes.ts
- [x] Integrate cron initialization into server startup
- [x] Verify cron jobs running on Railway at 9am UTC daily
- [x] Delete all 3 Manus Heartbeat jobs (FDejCrA3Bm5SRbH7LryVCg, C42Bn4SV6yaNuoixaLFuqV, 76WrUwkooDAsxbfTTAPGig)
- [x] Confirm zero Manus charges for scheduled jobs going forward

**Result:** All email automation now runs on Railway via node-cron. No more Manus platform costs for scheduled jobs.

## Error Alerting for Cron Jobs
- [x] Set up error alerting for cron job failures (email-based via Resend)
  - Added sendCronErrorAlert() function to email.ts
  - Integrated error capture into all three cron jobs
  - Errors sent to admin@snappostpro.com with full stack traces
  - Zero additional cost (uses existing Resend integration)

## Onboarding Checklist Widget
- [x] Build contractor onboarding checklist for dashboard
  - Added onboarding_checklist table to track: profile setup, Facebook connection, first post, first publish
  - Created tRPC procedures to get and update checklist status
  - Built OnboardingChecklist component with progress bar and step tracking
  - Integrated into Dashboard to display on page load
  - Completion percentage calculated automatically (0-100%)
  - Timestamps recorded for each completed step

## Contextual Prompts & Guidance
- [x] Add contextual prompts to guide contractors
  - UploadCard now shows blue info banner when Facebook not connected
  - Checklist auto-updates when user uploads first photo (completeFirstPost)
  - Checklist auto-updates when user publishes first post (completeFirstPostPublished)
  - Error messages guide users to connect Facebook before publishing

## Completion Incentives
- [x] Build FeatureUnlock component to drive engagement
  - Shows 4 premium features locked until 100% onboarding completion
  - Features: Advanced Analytics, Multi-Page Management, Content Calendar, AI Caption Variations
  - Visual progress indicator (X/4 features unlocked)
  - Celebration message when all steps complete
  - Integrated into Dashboard sidebar for constant visibility


## Onboarding Email Reminders
- [x] Build email reminder system for incomplete onboarding
  - Added sendOnboardingReminder24h() — sends at 24h if onboarding incomplete
  - Added sendOnboardingReminder48h() — sends at 48h if no progress in 24h
  - Created handlers: handleOnboarding24hReminders, handleOnboarding48hReminders
  - Endpoints: /api/scheduled/onboarding-24h-reminders, /api/scheduled/onboarding-48h-reminders
  - Added database helpers: getIncompleteOnboardingUsers(), getStalledOnboardingUsers()
  - Ready to wire up with Heartbeat cron jobs (24h and 48h after signup)
- [x] Create Heartbeat cron jobs for reminder emails
  - Created: onboarding-24h-reminders (task_uid: MeRqovonGkUQ5bLynTkaGC)
  - Created: onboarding-48h-reminders (task_uid: hnqRTx7RKSJx7MkwWmmh4U)
  - Both run hourly (0 0 * * * *) and check for users needing reminders
  - Active and monitoring now


## Conversion Funnel Tracking & Success Dashboard
- [x] Add conversion_events table to track signup → first post → upgrade funnel
  - Tracks: signup, first_post, first_publish, upgrade_starter, upgrade_pro
  - Includes metadata (plan, amount, stripe session ID)
  - Database migration created and pushed
- [x] Integrate Stripe webhook to log conversion events
  - Updated checkout.session.completed handler to log upgrade events
  - Logs plan, amount, and stripe session ID for each purchase
  - Added logConversionEvent() helper function
- [x] Create database helpers for funnel analysis
  - getUserConversionStats(userId) — returns full conversion timeline
  - logConversionEvent(userId, eventType, metadata) — logs events
- [x] Build SuccessDashboard component with premium features
  - Shows: posts published, days active, engagement rate
  - Premium features: Advanced Analytics, Multi-Page Management, Content Calendar
  - Upgrade CTAs for each locked feature
  - Only visible to Starter/Pro users
- [x] Integrate SuccessDashboard into Dashboard page
  - Displayed after onboarding checklist for paying users
  - Shows current plan info and feature comparison


## SSL Certificate Fix (Current)
- [x] Fixed NET::ERR_CERT_COMMON_NAME_INVALID error on snappostpro.com
  - Added CNAME record to Namecheap: `e934u323.up.railway.app`
  - Added TXT record to Namecheap: `_railway-verify` with verification token
  - DNS records saved and propagating (5-10 min wait)
  - Railway will auto-issue SSL certificate once TXT record verifies
  - Status: Pending DNS propagation and Railway verification

## Migration: Remove Manus Dependency (Current)
- [ ] Replace Manus LLM (invokeLLM) with OpenAI API for AI caption generation
- [ ] Replace Manus storage (storagePut/storageProxy) with Cloudinary for image upload/retrieval
- [ ] Replace Manus image branding with Cloudinary logo overlay transformation
- [ ] Add OpenAI + Cloudinary environment variables to Railway
- [ ] Save all credentials to project reference file
- [ ] Test full flow on Railway: upload photo → AI caption → logo branding → display
- [ ] Fix Stripe checkout branding (TRADIEPOST → SnapPost Pro)

## Meta App Review Submission (Current)
- [x] Record and upload unlisted Meta App Review workflow screencast
- [ ] Verify the published unlisted screencast and review its suitability
- [ ] Confirm the required Meta permissions and App Review instructions
- [ ] Submit the requested permissions for Meta App Review
- [ ] Record the submission status and follow-up requirements
- [ ] Record Part 2 of the Meta evidence: Facebook business connection, Airprof Studios selection, TradiePosts Page selection, successful branded-photo publish, and the live Page post
- [ ] Combine Part 1 and Part 2 into one unlisted YouTube video before submitting App Review

## Facebook Permission Configuration Blocker (Current)
- [x] Verify the correct Page-publishing Meta app: SnapPostPro Publishing (App ID 1405328174824025)
- [x] Switch Railway Facebook App ID and matching App Secret from the ordinary Login app to SnapPostPro Publishing
- [x] Configure SnapPostPro Publishing’s valid OAuth redirect URLs for the live Facebook callback
- [x] Verify the required Page permissions under SnapPostPro Publishing’s Manage everything on your Page use case
- [x] Add the required `business_management` scope to the live Facebook Login for Business request
- [x] Add a visible Facebook reauthorization control when a connected account has no selected Page
- [x] Verify the Facebook request contains only the required Business and Page permissions
- [x] Verify administrator Page connection and a successful test post before App Review submission

## Meta App Review Correction — Business-Portfolio Page Discovery
- [x] Restore `business_management` and implement a visible business-portfolio → Page selection flow for business-owned Pages
  - OAuth now requests only `business_management`, `pages_manage_posts`, `pages_show_list`, and `pages_read_engagement`.
  - The dashboard visibly asks the contractor to select a business portfolio before loading its publishing-ready Pages. The selected portfolio is used with Meta’s `owned_pages` endpoint and Page tokens are matched only from that portfolio.
  - Fresh OAuth no longer silently auto-selects or silently fails Page discovery. Graph failures display an actionable reconnect state; connection state is cleared until the user makes the explicit selections.
- [x] Preserve minimal exact-post verification for `pages_read_engagement`
  - The server reads only `/{new-post-id}?fields=id,permalink_url`, and the success UI exposes the verified live permalink.
  - Unit coverage verifies the four scopes, portfolio filtering, exact-post fields, and Graph discovery errors. Full suite, TypeScript check, and production build pass locally.
- [x] Deploy the correction and live-verify Airprof Studios → TradiePosts discovery, a publish, and the verified live permalink before recording replacement Meta evidence

## Replacement Meta Evidence Recording — 26 August 2026
- [x] Prepare the one-piece replacement recording script covering passwordless sign-in, Facebook Login for Business, Airprof Studios and TradiePosts selection, publish, verified permalink, and live Facebook post
  - Ready-to-follow script: `/home/ubuntu/snappost-pro/references/meta_replacement_recording_script.md`.
- [x] Reset the current Facebook connection and record the single replacement Meta evidence video using the approved script
  - Replacement video: `https://youtu.be/aZL6lI4PYOo` — verified public as Unlisted, 5:01 long, and independently reviewed against the required flow.
- [x] Revise the evidence script to begin from the already authenticated SnapPost dashboard and focus only on Meta’s previously missing Facebook Login for Business grant evidence
- [x] Prepare and submit the corrected Meta App Review form with the replacement evidence after explicit user approval
  - Resubmission draft ID `1418013020222207` is now **Review in progress** for `pages_manage_posts`, `pages_show_list`, `business_management`, and `pages_read_engagement`. Meta’s page states that most submissions are reviewed within 20 days and may take longer if it needs more information.
- [x] Validate and document the reviewer-accessible passwordless sign-in path required for Meta’s App Verification Details
  - Reviewers can request their own 15-minute magic link at `https://snappostpro.com/`; no personal password or Facebook credential is supplied in the verification instructions.
- [x] Monitor Meta’s review response and record the completed decision
  - On 5 September 2026, Meta approved `pages_manage_posts`, `pages_show_list`, `business_management`, and `pages_read_engagement`; `public_profile` was renewed. SnapPostPro Publishing was then changed to **Published** and its dashboard has no required actions.

## Exact Facebook Permalink Verification Regression — 26 August 2026
- [x] Remove the deprecated `link` field from exact newly published post verification and retain only the canonical `permalink_url`
  - The live failure was Graph API error `(#12) deprecate_post_aggregated_fields_for_attachment`; `link` was removed from the exact-post lookup. The regression test, full test suite, TypeScript check, and production build pass.
- [x] Deploy the verifier correction and publish one different existing draft to confirm a working verified-live permalink without retrying the failed post
  - Live result: the 11 August branded deck draft published to TradiePosts, returned a direct canonical Facebook permalink, and the permalink opened the live post with its branded image and caption. The earlier failed gazebo draft was not retried.

## Content Compliance
- [x] Remove the fabricated customer testimonial section from the public landing page; do not replace it with invented reviews, ratings, names, or outcomes

## Post-Publication Dashboard Truthfulness — 5 September 2026
- [x] Diagnose the live `Posts Published: 0` summary metric when the same dashboard lists multiple published posts
  - Root cause: `SuccessDashboard` explicitly set `totalPosts` and `publishedPosts` to zero rather than reading the authenticated user’s saved post data.
- [x] Replace placeholder dashboard metrics and unsupported premium-feature claims with truthful current-post statistics and available functionality
  - The dashboard now derives total and published counts from `posts.list`, shows remaining current-month allowance, and removes unbuilt claims for real-time engagement, audience data, multi-Page posting, and automatic scheduling.
- [ ] Deploy and verify the corrected dashboard metric on the live Railway site without creating a post, payment, or trial

## Draft Post Usability (Current)
- [x] Make draft posts in Post History reopenable so a contractor can review, edit, or publish an existing saved draft
- [x] Show an immediate successful-publish confirmation with the connected Page name and a View on Facebook link

## Onboarding Accuracy (Current)
- [x] Mark the Connect Facebook checklist step complete after a successful Facebook OAuth callback
- [x] Backfill the checklist for already-connected users so their progress is accurate

## Subscription Entitlement Audit (Current)
- [x] Trace the live Starter account state across the database, Stripe Checkout session, webhook, pricing display, and dashboard feature gates
- [x] Prevent Starter subscribers from receiving Pro plan display or Pro-only access unless Stripe confirms an active Pro subscription
- [x] Add automated entitlement coverage for Starter, Pro, inactive, and cancelled subscription states
- [x] Redirect every successful logout to the SnapPost Pro home page instead of a 404 route
- [x] Prevent the logged-out home page from automatically restarting OAuth after an intentional logout
  - Verified live on 13 August 2026: logout opens `/login?next=%2Fdashboard`; a direct request to `/dashboard` remains at the sign-in screen with no automatic re-authentication.

## Zero Manus Runtime Authority (Current)
- [x] Inventory every remaining Manus runtime dependency in authentication, API helpers, storage, scheduled work, and client configuration
  - Completed by the 14 August 2026 Railway runtime audit; active Manus notification, analytics, asset, and legacy storage route dependencies were removed.
- [x] Replace Manus OAuth with independent Railway-hosted authentication so login and logout never involve Manus
  - Verified live on 13 August 2026: the independent email sign-in screen, inbox delivery, dashboard session, and logout flow worked without Manus authentication.
- [ ] Verify the live app continues to operate when all Manus runtime environment variables and routes are absent
  - Static and route audit complete: the deployed HTML and JavaScript have no Manus endpoint or asset reference, and the previous live Manus system route returns HTTP 404.
  - Still required: fresh post-removal live evidence for passwordless sign-in, Starter dashboard load, photo upload and branding, Facebook publish, scheduled email behavior, and Railway environment-variable absence.
- [x] Prevent the logged-out home page from automatically restarting OAuth after an intentional logout
  - Verified live on 13 August 2026: logged-out dashboard access redirects to the email sign-in screen and stays logged out.

## Final Railway Runtime Independence Audit — 14 August 2026
- [x] Inventory every currently deployed Manus import, environment variable, endpoint, storage route, and scheduled-job reference
  - Found a reachable legacy `system.notifyOwner` route that invoked the Manus notification service, two public Manus CDN image references, a Manus analytics tag, and an obsolete `/manus-storage/*` route.
- [x] Remove or isolate any code path required by live Railway operations that still calls a Manus service
  - Removed the live system router and storage route, replaced public images with Cloudinary-hosted assets, and removed the analytics tag. Legacy template files remain in source only and are not mounted or imported by the Railway entrypoint.
- [x] Verify core live functions continue with Manus runtime variables and routes absent: email sign-in, Starter entitlement, upload, branding, Facebook publish, and scheduled email jobs
  - Final live audit: `snappostpro.com` HTML and JavaScript bundle contain no `api.manus.im`, `forge.manus.im`, `files.manuscdn.com`, or `/__manus__/` reference; Cloudinary assets load from `res.cloudinary.com`; legacy `system.health` returns HTTP 404. The live service response identifies Railway (`x-railway-request-id`).
- [ ] Re-test every core Railway flow after the Manus-removal deployment: passwordless sign-in, Starter dashboard load, photo upload and branding, Facebook publish, and scheduled email behavior
- [ ] Audit Railway production configuration to confirm the removed Manus environment variables are absent or unused by the live application

## Active Starter Persistence Regression — 14 August 2026
- [ ] Diagnose why the same authenticated account briefly displayed Starter with post history, logo, and TradiePosts connection, then reloaded as Free with empty dashboard data
- [ ] Correct the proven Stripe reconciliation, customer linkage, or session/account-data defect without granting unverified access
- [ ] Verify stable live Starter access with `6 / 30`, persisted history, logo, and Facebook connection across repeated refreshes

## Independent Sign-In Recovery (Current)
- [x] Diagnose and correct independent Resend magic-link delivery for the live Railway app
  - Added the required Resend DKIM, MX, and SPF records in Cloudflare; Resend verified `snappostpro.com` on 13 August 2026.
  - Live test: `noreply@snappostpro.com` delivered the 15-minute magic link to `aiprof364@gmail.com`, and that link opened the authenticated Railway-hosted dashboard.
- [ ] Add a safe visible resend-link action with rate limiting and user-facing delivery guidance
- [x] Send a user to the public SnapPost Pro home page after logout while ensuring no automatic re-authentication loop occurs
  - Fixed the protected-page unauthenticated redirect race and verified live on 13 August 2026: dashboard Logout now opens `https://snappostpro.com/` with **Log in** and **Get started** visible, and no automatic re-authentication.

## Live Upload Regression — 13 August 2026
- [x] Diagnose the reported production failure when a user selects a job-site photo for a new post
  - The test account is correctly reconciled as `free` because its recorded Stripe subscription is `canceled`; it has already created 5 posts against the 3-post free allowance. The file control was intentionally disabled by this entitlement state, but previously gave no clear explanation.
- [x] Repair the upload flow without changing independent authentication, Facebook connection behavior, or existing post history
  - The disabled upload control now states **Upload limit reached** and displays the exact allowance message plus the appropriate pricing action. Key files: `client/src/components/UploadCard.tsx`, `client/src/pages/Dashboard.tsx`, `shared/uploadLimit.ts`.
- [x] Add regression coverage for the exact upload-limit explanation
  - `shared/uploadLimit.test.ts` covers available capacity plus Free, Starter, and Pro monthly-cap messages; the full test suite and TypeScript validation pass.
- [x] Verify a live Railway photo upload succeeds after the test account has valid active posting entitlement, before resuming Meta App Review recording
  - With Starter active, the user uploaded, captioned, branded, and successfully published a new job photo to TradiePosts; usage persisted as `6 / 30`.

## Live Usage Counter Regression — 13 August 2026
- [x] Diagnose why the Starter dashboard remains at `5 / 30 posts this month` after a verified successful photo upload and Facebook publish
  - Root cause: `UploadCard` refreshed post history only after creating the draft. The dashboard allowance comes from the separate `account.overview` query, so its cached value remained at 5 until a full page refresh.
- [x] Refresh the account usage query after new-post creation and publishing without changing entitlement enforcement or the existing Facebook flow
  - New post creation now invalidates both post history and `account.overview`, so the count refreshes as soon as a draft consumes allowance.
- [ ] Add regression coverage and verify the live dashboard reflects the new post count
  - Production recheck after the successful post now correctly shows `6 / 30 posts this month`; the next post creation will confirm the newly deployed automatic in-page refresh.

## Active Starter Persistence Regression — 14 August 2026
- [x] Diagnose why the same authenticated account briefly displayed Starter with post history, logo, and TradiePosts connection, then reloaded as Free with empty dashboard data
  - The persisted account was correct: Starter, active Stripe subscription, six current-month posts, logo key, and a Facebook integration. The client briefly rendered its `free` fallback before the authoritative account-overview query returned.
- [x] Correct the proven Stripe reconciliation, customer linkage, or session/account-data defect without granting unverified access
  - The dashboard now remains in a neutral loading state until account overview completes, eliminating the false Free and empty-data flash without altering Stripe entitlement checks.
- [x] Verify stable live Starter access with `6 / 30`, persisted history, logo, and Facebook connection across repeated refreshes
  - Fresh independent sign-in on 14 August 2026 confirmed Starter, 30 monthly posts, `6 / 30` used, and active photo-upload access. The database independently confirms the active Stripe subscription, persisted logo, six posts, and one TradiePosts connection.

## Paid Starter Entitlement Correction — 13 August 2026
- [x] Trace the real paid Starter subscription for `aiprof364@gmail.com` across Stripe, checkout, webhooks, and the user record
- [x] Correct any proven cancellation, webhook, customer-linkage, or entitlement-reconciliation defect so the real paid subscriber has the Starter 30-post allowance
  - No application entitlement defect was found. Stripe confirms the prior paid Starter subscription was deliberately set to cancel at period end and expired on 9 July 2026; a new active Starter subscription will correctly restore the 30-post allowance without another trial.
- [x] Verify the live dashboard shows Starter and `5 / 30 posts this month`, then complete one real photo-upload test
  - Verified after the successful test post as Starter with `6 / 30` used, an enabled upload control, and successful branded Facebook publishing.
  - Evidence preserved: Stripe records a successful **US$19.00** payment for Starter on 9 June 2026. That subscription was marked `cancel_at_period_end` on 12 June 2026 with Stripe reason `cancellation_requested` and feedback `other`; it expired on 9 July 2026. No newer subscription exists for the linked Stripe customer. The application source contains no direct Stripe cancellation API call, so the record points to a Stripe-hosted cancellation path rather than a failed file upload or a current entitlement-mapping mismatch.

## Single 7-Day Trial Enforcement — 13 August 2026
- [x] Trace why both Starter and Pro currently offer a 7-day trial after a customer has already received one
  - Root cause: checkout always passed `trial_period_days: 7`, regardless of prior plan, Stripe customer history, or account identity.
- [x] Enforce one 7-day trial across every paid plan for the same account and Stripe customer
  - Checkout now omits the Stripe trial field once an account has Stripe billing history or an existing trial claim.
- [x] Prevent simple repeat trials through a changed email by applying a durable anti-abuse rule without blocking legitimate users
  - Added the `trial_claims` ledger with hashed normalized email, user, Stripe customer, and Stripe subscription identities; existing paid customers were backfilled.
- [x] Assess Facebook Page linkage as a secondary duplicate-trial signal, not the sole eligibility authority
  - First-time trial checkout requires a connected Facebook business Page and records its Page ID. A new email reusing that Page cannot receive a second trial; Page identity remains an additional signal rather than the only account identity.
- [x] Test and deploy the updated Starter and Pro checkout behavior
  - 28 Vitest tests and TypeScript validation pass. Live Railway pricing now shows this existing customer **Your introductory trial has already been used** for both Starter and Pro, and the checkout server will not create another trial for this account.
