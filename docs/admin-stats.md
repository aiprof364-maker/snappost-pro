# Admin stats endpoint

`GET /api/admin/stats` returns the same aggregate counts as the admin dashboard at `/admin`. It is read-only. The response has no email addresses, names, or other personal data.

An automated check can call it with a bearer token. The dashboard itself still uses the admin magic link.

## Railway variable

Add this variable on the Railway service that serves `snappostpro.com`:

`ADMIN_STATS_TOKEN`

Generate a 256-bit token locally and paste only the value into Railway. Do not commit it, and do not put it in the URL.

```bash
openssl rand -hex 32
```

Save the variable and redeploy, or restart the service, so the process picks it up. Until `ADMIN_STATS_TOKEN` is set to a non-blank value, `GET /api/admin/stats` responds with HTTP 404 and does not query the database.

## Request

```bash
curl -sS \
  -H "Authorization: Bearer $ADMIN_STATS_TOKEN" \
  https://snappostpro.com/api/admin/stats
```

The token is compared in constant time. Send it only in the `Authorization` header. A missing or wrong token returns HTTP 401. A database read failure returns HTTP 503. Responses use `Cache-Control: no-store`.

## Response

`generated_at` is when the counts were read, as an ISO-8601 timestamp.

`realAccounts.count` is accounts that are not internal or test. The excluded accounts are:

- `role` of `admin`
- the configured admin address (`ADMIN_EMAIL`, otherwise `OWNER_EMAIL`, otherwise `admin@snappostpro.com`)
- `OWNER_EMAIL` when it is set to a different address
- `OWNER_OPEN_ID` when it matches the account
- any address at `mail.grokbot.com`

`realAccounts.latestCreatedAt` is the newest remaining account's `createdAt`, or `null` when there are none. The field is a timestamp only.

`subscriberFunnel` is the all-time Subscriber Funnel, including the referral cards and promo-code counts.

`freePreviewFunnel` is the Free-preview Funnel for the last 30 days.

`emailReminders` is the Trial Expiration Warnings and Renewal Reminders cards. Sent is `accepted` rows in `account_email_delivery` (`trial-ending` and `renewal`). Failed includes `failed` and `uncertain`. Pending, retrying, and cancelled rows are not counted. `lastRun` is the latest accepted or attempted time for that reminder, or `null`. If that table does not exist yet, both cards are zero.

```json
{
  "generated_at": "2026-11-26T00:00:00.000Z",
  "realAccounts": {
    "count": 2,
    "latestCreatedAt": "2026-11-20T04:12:00.000Z"
  },
  "subscriberFunnel": {
    "accounts": 4,
    "freeAccounts": 3,
    "activatedAccounts": 1,
    "facebookConnectionClicked": 1,
    "connectedPages": 1,
    "checkoutStarted": 1,
    "subscriptionTrials": 1,
    "paidSubscribers": 0,
    "freePostsExhausted": 1,
    "exhaustedNotUpgraded": 1,
    "paywallShown": 1,
    "promoCodeRedemptions": 1,
    "promoCodeRedemptionsByCode": [{ "code": "CREATOR-1", "count": 1 }],
    "referralSignups": 1,
    "referralBonusesGranted": 1,
    "referralBonusPostsGranted": 2,
    "referralPayingCustomers": 1,
    "referralCreditsApplied": 0,
    "referralCreditsWaiting": 1
  },
  "freePreviewFunnel": {
    "periodDays": 30,
    "previewsCreated": 3,
    "previewsEmailRequested": 2,
    "previewsClaimed": 1,
    "freeAccessRequested": 4,
    "freeAccessOpened": 3,
    "freeAccountsCreated": 2,
    "facebookConnectionClicked": 1,
    "connectedPages": 1,
    "draftsCreated": 1,
    "postsPublished": 1,
    "landingAccounts": { "contractors": 1, "hairdressers": 0 }
  },
  "emailReminders": {
    "trialExpirationWarnings": {
      "sent": 1,
      "failed": 0,
      "lastRun": "2026-11-01T00:00:00.000Z"
    },
    "renewalReminders": { "sent": 2, "failed": 1, "lastRun": null }
  }
}
```

The endpoint only runs `SELECT` queries. It does not create rows, send email, or call Stripe. Promo codes are the same public codes already shown on the dashboard.
