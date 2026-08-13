# Meta App Review: Verified Requirements

Research completed: 2026-08-11

## Official Sources

1. Meta App Review: https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review
2. Meta Permissions/Login Review: https://developers.facebook.com/documentation/facebook-login/guides/permissions/review
3. Meta Screen Recordings: https://developers.facebook.com/docs/app-review/submission-guide/screen-recordings/
4. Meta Permissions Reference: https://developers.facebook.com/docs/permissions/

## Requirements Relevant to SnapPost Pro

Meta reviews whether an app actually uses every requested permission and feature. If reviewers cannot access the app, the submission can be rejected. If they cannot test a specific requested permission, that permission can be rejected.

For each requested permission, the review recording must show:

1. The complete login or business-login flow.
2. The user granting the relevant permission.
3. The app using the data or capability that requires the permission.

For Facebook Page publishing, Meta's screen-recording guide explicitly says reviewers should see the user select a Page, create a post, publish it, and view the published post on the Page. The submission form, rather than the video, asks why each permission is required.

## SnapPost Pro Permissions in Code

- `business_management` — enumerate the contractor-selected business portfolio so the app can access its permitted Pages through the current Facebook Login for Business flow.
- `pages_show_list` — show the Pages managed by the signed-in contractor so they can choose the Page to connect.
- `pages_read_engagement` — retrieve minimal connected-Page data needed to identify and display the selected Page and support Page publishing.
- `pages_manage_posts` — publish the contractor's branded image and caption to the contractor-selected Facebook Page.
- `pages_manage_metadata` — required by Meta's Manage everything on your Page use case to obtain the selected Page's access token and manage the Page connection.

## Verified Configuration Finding: 2026-08-12

The `snappostpro` Meta app currently has only the **Authenticate and request data from users with Facebook Login** use case. Meta's official use-case mapping does not make Facebook Page permissions available under that use case. This explains the live error: `Invalid Scopes: pages_manage_posts, pages_read_engagement, pages_show_list, pages_manage_metadata`.

Browser verification of the user’s Meta dashboard confirmed the separate **SnapPostPro Publishing** app (App ID `1405328174824025`) already contains the **Manage everything on your Page** use case. This is the correct app for the Page-publishing integration. The `snappostpro` app (App ID `4515265132043339`) is only configured for ordinary Facebook Login and must not be used for Page publishing.

Meta's official use-case mapping lists **Manage everything on your Page** as the Page-management use case. Its required permissions are `business_management`, `pages_show_list`, and `public_profile`; optional Page permissions include `pages_read_engagement`, `pages_manage_posts`, and `pages_manage_metadata`. It must be added before SnapPost Pro can request its Page scopes.

The Pages API documentation confirms that a Page publishing test requires a Page on which the administrator has the `CREATE_CONTENT` task, a Page access token, and the appropriate Page permissions. A Page can be published or unpublished for testing.

### Verified Production Configuration: 2026-08-12

1. **SnapPostPro Publishing** (App ID `1405328174824025`) is the live Facebook Page-publishing app. It has the **Manage everything on your Page** use case.
2. The enabled permission set is exactly: `business_management`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, and `pages_manage_metadata`.
3. Railway's `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` were switched to the matching SnapPostPro Publishing credentials.
4. Valid OAuth callback URLs are `https://snappostpro.com/api/facebook/callback` and `https://www.snappostpro.com/api/facebook/callback`.
5. Administrator testing connected the **Airprof Studios** business portfolio and selected the **TradiePosts** Page (ID `1174494559070858`).
6. The test post was successfully published to TradiePosts with post ID `1174494559070858_122115921831314961`.

### Sources

- Meta Use Case Permission Mapping: https://developers.facebook.com/documentation/development/create-an-app/use-cases-permission-mapping
- Meta Pages API Getting Started: https://developers.facebook.com/documentation/pages-api/getting-started
- Meta Pages API Overview: https://developers.facebook.com/documentation/pages-api

## Current Evidence

- Live app: https://snappostpro.com
- Privacy Policy: https://snappostpro.com/privacy
- Unlisted workflow video: https://youtu.be/yghFV2XWcKI
- Business verification: confirmed by the user
- The YouTube link resolves to an unlisted video titled `SnapPost Pro — Facebook Page Posting Workflow`.
- The live dashboard URL resolves at https://snappostpro.com/dashboard.
- Airprof Studios and the TradiePosts Page have completed a successful administrator connection and test publish.

## Submission Gate

Before submitting, verify that the screen recording shows the complete Facebook connection, Page selection, successful publish, and the published post on the Page for every Page permission requested. If the existing recording stops before those actions, record a corrected review video rather than submitting incomplete evidence.

## Recording Preparation — 13 August 2026

- Part 1 remains available at `https://youtu.be/yghFV2XWcKI`.
- The Resend sender domain and independent Railway sign-in flow are now verified; a fresh test-account sign-in was requested to reset the existing Facebook connection before recording the required Page-selection and successful-publish segment.
- The recording-preparation magic link arrived from `SnapPost Pro <noreply@snappostpro.com>` in the designated Gmail inbox.
- The message is present in the existing SnapPost Pro sign-in email thread and ready to be opened for the dashboard-reset step.
- The Gmail thread contains the latest 15-minute SnapPost Pro magic link required to access the dashboard for the controlled connection reset.
- Sender-filtered Gmail results confirm the newest message is from `noreply@snappostpro.com` at 2:56 PM and contains the required one-time sign-in link.
- The newest message has been expanded in the Gmail thread; its sign-in action is ready to open the test dashboard.
- The latest magic link opened the authenticated live Railway dashboard for the connection-reset step.
- The live dashboard confirms the existing test connection is currently **Connected to TradiePosts** and exposes the **Disconnect** action needed to reset the demonstrable connection flow.
- The authenticated dashboard is stable, with the Facebook connection card directly below the saved logo card and the existing TradiePosts connection ready to reset before starting the screen recording.
- Dashboard search confirmed one exact **Disconnect** control associated with the existing TradiePosts connection; no other connection action was identified.
- The connection-reset target remains the single **Disconnect** action on the TradiePosts Facebook card; no post, subscription, or account data will be changed.
- The browser viewport now exposes that exact **Disconnect** control on the existing Facebook card, immediately above Post history.
- The approved **Disconnect** action was invoked on the existing TradiePosts connection; the dashboard is now being checked for its disconnected state before recording begins.
- The live dashboard confirmed **Disconnected** and now displays the **Connect Facebook** action. It is ready to begin the recording at the exact start of the required Facebook business connection flow.
- Live subscription validation on 13 August 2026: the dashboard now shows **Starter plan**, **Active**, and **5 / 30 posts this month**. The photo-upload control is enabled and the existing TradiePosts Facebook connection is available for the final upload-and-publish evidence flow.
