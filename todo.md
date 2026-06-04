# SnapPost Pro - Domain Migration TODO

## Phase 1: Code Changes (COMPLETED)
- [x] Add Facebook domain verification meta tag to client/index.html
- [x] Audit codebase for hardcoded domain references
- [x] Verify app uses dynamic domain resolution via window.location.origin

## Phase 2: Configuration Updates (PENDING - USER ACTION REQUIRED)

### Facebook Integration
- [ ] Update Facebook OAuth Redirect URI in Meta App Dashboard
  - Old: `https://tradiepost-kkzrtvvp.manus.space/api/oauth/callback`
  - New: `https://snappostpro.com/api/oauth/callback`
  - Location: Meta App Dashboard → Settings → Basic → Redirect URIs
- [ ] Update Facebook Domain Verification in Meta Business Suite
  - Add domain: `snappostpro.com`
  - Location: Meta Business Suite → Brand Safety → Domains
  - Verification method: Meta-tag (already added to HTML)
- [ ] Verify Facebook permissions are correct: pages_manage_posts, pages_read_engagement, pages_show_list, pages_manage_metadata

### Stripe Integration
- [ ] Update Stripe Webhook endpoint URL
  - Old: `https://tradiepost-kkzrtvvp.manus.space/api/webhooks/stripe`
  - New: `https://snappostpro.com/api/webhooks/stripe`
  - Location: Stripe Dashboard → Developers → Webhooks
- [ ] Verify Stripe events are configured: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
- [ ] Update any hardcoded Stripe redirect URLs to use snappostpro.com

### DNS & Deployment
- [ ] Ensure snappostpro.com DNS records point to Manus deployment
- [ ] Verify SSL certificate is valid for snappostpro.com
- [ ] Set DNS TTL to 1 hour during migration (for quick rollback if needed)

## Phase 3: Testing (PENDING - USER ACTION REQUIRED)
- [ ] Test OAuth flow on new domain (sign in with Manus OAuth)
- [ ] Test Stripe payment flow on new domain (create subscription)
- [ ] Test Facebook posting integration on new domain (post to Facebook)
- [ ] Test webhook delivery (Stripe webhooks received successfully)
- [ ] Monitor error logs for domain-related issues

## Phase 4: Post-Migration
- [ ] Verify Meta domain verification is complete (24-48 hours)
- [ ] Confirm all integrations working on new domain
- [ ] Keep old Manus domain active for 24-48 hours as fallback
- [ ] Update any documentation/marketing materials with new domain

## Notes
- No code changes needed in frontend or backend
- App already uses window.location.origin for dynamic domain resolution
- All OAuth and API calls use environment variables
- Facebook verification meta tag added: r4ws2vbab3punrlh4i9vlx96f5cx1p
