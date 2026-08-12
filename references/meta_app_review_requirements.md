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

- `pages_show_list` — show the Pages managed by the signed-in contractor so they can choose the Page to connect.
- `pages_read_engagement` — retrieve minimal connected-Page data needed to identify and display the selected Page and support Page publishing.
- `pages_manage_posts` — publish the contractor's branded image and caption to the contractor-selected Facebook Page.
- `pages_manage_metadata` — only request if the implemented Graph API integration demonstrably needs it; avoid requesting permissions not required by the customer workflow.

## Verified Configuration Finding: 2026-08-12

The `snappostpro` Meta app currently has only the **Authenticate and request data from users with Facebook Login** use case. Meta's official use-case mapping does not make Facebook Page permissions available under that use case. This explains the live error: `Invalid Scopes: pages_manage_posts, pages_read_engagement, pages_show_list, pages_manage_metadata`.

Browser verification of the user’s Meta dashboard confirmed the separate **SnapPostPro Publishing** app (App ID `1405328174824025`) already contains the **Manage everything on your Page** use case. This is the correct app for the Page-publishing integration. The `snappostpro` app (App ID `4515265132043339`) is only configured for ordinary Facebook Login and must not be used for Page publishing.

Meta's official use-case mapping lists **Manage everything on your Page** as the Page-management use case. Its required permissions are `business_management`, `pages_show_list`, and `public_profile`; optional Page permissions include `pages_read_engagement`, `pages_manage_posts`, and `pages_manage_metadata`. It must be added before SnapPost Pro can request its Page scopes.

The Pages API documentation confirms that a Page publishing test requires a Page on which the administrator has the `CREATE_CONTENT` task, a Page access token, and the appropriate Page permissions. A Page can be published or unpublished for testing.

### Configuration Order

1. Add the **Manage everything on your Page** use case to the existing `snappostpro` Meta app.
2. Enable only the Page permissions required for the implemented create-and-publish workflow.
3. Retest administrator OAuth and Page selection.
4. Publish one test post to an administrator-managed Page and view it there.
5. Record the complete evidence before submitting App Review.

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

## Submission Gate

Before submitting, verify that the screen recording shows the complete Facebook connection, Page selection, successful publish, and the published post on the Page for every Page permission requested. If the existing recording stops before those actions, record a corrected review video rather than submitting incomplete evidence.
