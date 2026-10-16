# A1 SnapPost Pro newsletter sequence

**Release status: implementation tested locally; not activated or deployed yet.**

**Validation:** 35 newsletter-specific tests pass, including 11 real local-database integration tests. These cover signup, content, sender behavior, Auckland timing, HTTP unsubscribe handling, durable processing, and compatibility with previously deployed invitation links. TypeScript passes. All test email sends are mocked; no subscriber was emailed.

The complete offline regression suite passes **67 tests**; the additional **11 database integration tests** also pass. The production build passes after integrating the concurrent invitation release. No account-onboarding or billing behavior was changed.

## A1a Audience and delivery

Only addresses with `status = active` in the existing newsletter subscriber table receive these emails. Reserved `@example.com` test addresses are excluded, matching the existing invitation audience. App accounts are not automatically subscribed. Delivery remains with the existing Railway backend and Resend sender, `SnapPost Pro <noreply@snappostpro.com>`, with replies sent to the published `support@snappostpro.com` address. No new mailing platform or Manus schedule is introduced.

New newsletter signup receives one welcome, followed by a guide once at least 72 hours have elapsed. The follow-up check runs every 15 minutes. A failed send is retried with a stable idempotency key and recorded delivery state; an API error is not treated as a sent email.

Weekly insights run on **Tuesdays at 9:00 am, Pacific/Auckland**, with automatic daylight-saving handling. The next such slot at document creation is **20 October 2026, 09:00 NZDT**. A subscriber begins weekly emails at least four days after the follow-up is accepted. Missed runs can recover within the same scheduled week; a restart does not replay the weekly email.

Existing active subscribers do not receive another welcome. The previously promised, unsent three-day guide can be sent once as an overdue follow-up, then weekly insights begin after the spacing rule. An already-unsubscribed address stays unsubscribed, even if entered into the public form again. Duplicate signups do not reset the sequence.

The 26 weekly emails below are **evergreen practical insights, not live news**. Each subscriber progresses through them in order. The library repeats after 26 accepted issues; no daily writing or AI generation is needed.

## A1b Unsubscribe and sending safeguards

Every message contains a real, recipient-specific unsubscribe link in its HTML and plain-text footer, plus RFC 8058 one-click headers. Opening the link displays a confirmation page; posting the confirmation stops newsletter sends immediately. Email-scanner GET requests do not unsubscribe someone. Unsubscribing does not cancel an account or billing emails.

Previously sent product-invitation unsubscribe URLs remain valid. They use the same confirmation and POST flow. The separate admin invitation action and its approved email copy are preserved; this newsletter sequence does not automatically send or resend those invitations.

Delivery records are durable in MySQL. A database lock prevents overlapping Railway workers from sending duplicates. Uncertain delivery outcomes are not automatically retried after Resend's idempotency window; stopped sends require owner review. Resend suppresses further delivery to hard-bounced or complaint addresses, but the application list is not automatically updated without a provider webhook.

**Not yet proven:** current recipient count, current Resend account limits, production database permission to create the additive delivery tables, actual provider acceptance, and inbox delivery of this new sequence. These are distinct from passing local code tests. No production recipient is used as a test.

The public site currently provides a contact form rather than a postal address. The footer uses that verified contact page; no business address has been invented. A postal sender address may be required if applicable recipient-country rules require one.

## A1c Common footer

You are receiving this email because you subscribed to the SnapPost Pro newsletter. Unsubscribe at any time. Newsletter preferences do not change your account or billing emails.

SnapPost Pro — photo-to-post for local businesses.

[Contact SnapPost Pro](https://snappostpro.com/contact) · [Privacy policy](https://snappostpro.com/privacy) · **Unsubscribe from the newsletter** (the system inserts the recipient's real secure link).

## A2 Immediate welcome

**Subject:** Welcome to SnapPost Pro — practical tips for local businesses

Thanks for subscribing to SnapPost Pro. This newsletter is for local businesses with real work, products, spaces or results worth showing.

In three days, we will send you a practical guide to preparing your first photo-based Facebook post. After that, look out for one short weekly insight on Tuesdays, covering clear photos, useful captions and consistent branding.

SnapPost Pro turns your photo into a logo-branded image and an AI-written caption. You review the result, then publish to your connected Facebook Page or save the draft for later.

Want to try it? The free account includes three branded post drafts total, with no card required. You do not need an account to receive this newsletter.

Try SnapPost Pro: https://snappostpro.com

## A3 Three-day follow-up

**Subject:** Your 3-day guide: turn one real photo into a branded post

Start with one clear photo of completed work, a product, your space or a result you want to share. Choose an image you own or have permission to publish, and avoid customer, patient or client-identifying details without appropriate consent.

Upload the photo and your business logo to SnapPost Pro. The app adds your logo and prepares an AI-written caption with hashtags. The completed work in your photo stays unchanged.

Read the caption before you publish. Check what is shown, remove unsupported claims, and correct any location, availability or product details. Preview the branded image too.

When you are happy with the draft, publish to your connected Facebook Page or save it for later. If you are trying SnapPost Pro for the first time, the free account includes three branded post drafts total, with no card required.

Your weekly insights will follow on Tuesdays. Each email will focus on one practical part of preparing a photo-based business post.

Try SnapPost Pro: https://snappostpro.com

# A4 Weekly insights — complete copy

## A4a1 Issue 1

**Subject:** Weekly insight: choose one clear subject for your photo

A useful business photo answers one question: what should someone notice? Choose one completed result, product or space rather than trying to show everything at once.

Before uploading, check the light, focus and background. Move closer if the subject looks small. Avoid including unrelated paperwork, vehicle plates or customer details.

This week, choose one photo you own and turn it into a branded draft. Review the logo placement and AI-written caption before sharing it on your Facebook Page.

[Prepare your next branded draft](https://snappostpro.com)

## A4a2 Issue 2

**Subject:** Weekly insight: put the useful detail first

The first sentence of a caption should help someone understand the photo. Start with the product, completed work, space or result rather than a broad claim about your business.

Check the AI draft against what actually happened. Keep the relevant detail, remove anything you cannot verify, and make sure any availability or location information is current.

A clear caption does not need to be long. One factual sentence about the photo and one useful next step can be enough. Review both before publishing.

[Prepare your next branded draft](https://snappostpro.com)

## A4a3 Issue 3

**Subject:** Weekly insight: make your logo easy to recognise

Your branding should help people recognise your business without hiding the subject of the photo. Use the same current logo across your business materials.

SnapPost Pro overlays your uploaded logo on the image. Check the branded preview, especially when the lower-right corner contains an important detail or has a busy background.

Open the draft on your phone before posting. Confirm the logo is readable and the result you want to show is still clear. SnapPost Pro adds branding; it does not complete or improve the work shown in your photo.

[Prepare your next branded draft](https://snappostpro.com)

## A4a4 Issue 4

**Subject:** Weekly insight: give each post one next step

A post is easier to follow when it asks for one action. Choose the next step that fits the photo: view your menu, ask about availability, visit your store or contact you about a service.

Make sure that action is possible. Check the destination link, business hours and contact details before posting. Do not promise a booking option your business does not offer.

When reviewing your AI caption, remove competing requests. One relevant invitation is more useful than asking people to call, comment, share and book all at once.

[Prepare your next branded draft](https://snappostpro.com)

## A4a5 Issue 5

**Subject:** Weekly insight: show a product in its real setting

A product photo can show more than what is for sale. Its setting can explain size, use or presentation without making the caption do all the work.

Use your own real product and a setting you are allowed to photograph. Keep labels readable where they matter, and avoid making accessories look included if they are not.

Review the AI caption for accuracy. Check the product name, what is included and whether the pictured item is currently available. Add your logo, then publish only when the image and wording match.

[Prepare your next branded draft](https://snappostpro.com)

## A4a6 Issue 6

**Subject:** Weekly insight: show completed work without inventing results

A finished result is a useful subject for a local-business post. Describe what the viewer can actually see, rather than adding claims about customer satisfaction or business performance.

If you mention a benefit, make sure you can support it. Avoid invented reviews, guaranteed outcomes or claims that the photo alone cannot demonstrate.

SnapPost Pro keeps the completed work in your photo unchanged while adding your logo and preparing a caption. Read that caption as the business owner before you publish it.

[Prepare your next branded draft](https://snappostpro.com)

## A4a7 Issue 7

**Subject:** Weekly insight: check photo permission before you post

A good photo is not automatically a photo you can publish. Use images you own or have permission to use, and consider who or what is identifiable in them.

Check for faces, names, private addresses, documents and customer or patient information. Where consent is needed, obtain it before uploading or publishing the image.

When in doubt, choose another photo that shows your product, space or completed work without identifying a person. The permission check comes before caption generation, not after the post is live.

[Prepare your next branded draft](https://snappostpro.com)

## A4a8 Issue 8

**Subject:** Weekly insight: make your caption sound like your business

An AI-written caption is a draft, not a statement you have to accept. Read it aloud and decide whether it sounds like something your business would say.

Replace unfamiliar wording with plain language. Remove exaggerated adjectives and any detail the AI cannot know from your photo. Check names and spelling.

Keep the parts that accurately describe your work, product or space. SnapPost Pro lets you review the caption before publishing, so use that step to make the post both useful and yours.

[Prepare your next branded draft](https://snappostpro.com)

## A4a9 Issue 9

**Subject:** Weekly insight: make location information useful

Location can help a local customer understand whether a post is relevant. Mention your town, store or service area only when that information is accurate and useful.

Do not publish a customer home address or private site location without permission. A general area is often enough to explain where your business operates.

Check any location added to an AI caption. The image cannot reliably tell the system where your business is based or which areas you serve. Correct the wording before publishing.

[Prepare your next branded draft](https://snappostpro.com)

## A4a10 Issue 10

**Subject:** Weekly insight: treat hashtags as labels, not promises

Hashtags should describe the real subject of the post. They are not a substitute for a clear photo or a useful caption, and they do not guarantee reach or enquiries.

Review the generated hashtags and remove anything unrelated to your business, location or pictured result. Avoid using another business name as if it were your own.

Keep the caption readable without its hashtags. If the post makes sense on its own, the labels can remain a supporting detail rather than the main message.

[Prepare your next branded draft](https://snappostpro.com)

## A4a11 Issue 11

**Subject:** Weekly insight: use the photos you already have permission to share

You may already have useful photos of completed work, products or your business space. Start by finding images you own and are still comfortable publishing.

Check whether each photo is current. An older photo should not imply that a product, service, price or appointment is available now if that is no longer true.

Choose one suitable image and create a branded draft. Review the caption for timing and accuracy before you publish. There is no need to present an old photo as something completed today.

[Prepare your next branded draft](https://snappostpro.com)

## A4a12 Issue 12

**Subject:** Weekly insight: show the detail customers ask about

Think about one question customers often ask about your work or products. A close-up of a finish, texture, size or feature can make that detail easier to explain.

Take the photo in good light and keep the relevant part in focus. Avoid filters or editing that changes the appearance in a misleading way.

Review your draft caption and explain only the detail the image supports. If a material, measurement or feature matters, check it against your own records before posting.

[Prepare your next branded draft](https://snappostpro.com)

## A4a13 Issue 13

**Subject:** Weekly insight: keep availability claims current

Availability is useful only when it is correct. A post about a product, booking or event should not imply something is available if it has sold out or passed.

Before publishing, check dates, stock, opening hours and any conditions. Remove urgent wording such as last chance unless you can verify it.

If you reuse a saved draft, review it again rather than relying on the original caption. The photo may still be useful even when the timing information needs to change.

[Prepare your next branded draft](https://snappostpro.com)

## A4a14 Issue 14

**Subject:** Weekly insight: explain one service through one result

A photo of a completed result can help explain a service without listing everything your business does. Choose the service that is actually shown.

Use the caption to identify the work and provide a useful next step. Avoid claiming that every customer will get exactly the same outcome.

When reviewing your AI draft, make sure the service name and description are correct. Keep the message focused on the photographed result rather than turning it into a long catalogue.

[Prepare your next branded draft](https://snappostpro.com)

## A4a15 Issue 15

**Subject:** Weekly insight: make your business space worth showing

A real photo of your space can help people understand what a visit might look like. Choose a view that accurately represents your business.

Check the frame for people, booking screens, invoices and other private information. Confirm you have permission to photograph any artwork or third-party material you feature.

Use the caption to explain the space without inventing a customer experience. Check practical details, such as access or opening times, if you decide to include them.

[Prepare your next branded draft](https://snappostpro.com)

## A4a16 Issue 16

**Subject:** Weekly insight: do a phone-sized preview check

A photo that looks clear on a large screen can feel crowded on a phone. Before posting, view the draft at the size your customers are likely to see.

Check whether the main subject is obvious, the logo is visible and the caption is easy to follow. If important details disappear, choose a clearer original photo.

Review the final branded image rather than only the upload. SnapPost Pro prepares the image and caption, but your final check decides whether the post is ready to publish.

[Prepare your next branded draft](https://snappostpro.com)

## A4a17 Issue 17

**Subject:** Weekly insight: use seasonal context without false urgency

Seasonal context can make a real photo relevant, but only when it fits your business and the time of year. Do not rely on the AI to know your local season or schedule.

Check dates and remove wording that suggests a limited offer unless there really is one. If the photo is from a previous season, describe it honestly.

A simple, accurate connection between the image and the occasion is enough. You do not need a countdown or a guaranteed-result claim to make a useful post.

[Prepare your next branded draft](https://snappostpro.com)

## A4a18 Issue 18

**Subject:** Weekly insight: separate a demonstration from a customer story

A product demonstration and a customer story are different kinds of post. Do not describe an example as a real customer result or add a testimonial that was never given.

If you share genuine customer feedback, make sure you have permission and use the actual wording. Avoid attaching it to an unrelated image in a way that could mislead.

For a simple photo post, a factual description is often enough. Review your AI caption for implied endorsements before you publish it.

[Prepare your next branded draft](https://snappostpro.com)

## A4a19 Issue 19

**Subject:** Weekly insight: keep your Page details and post consistent

A useful post should agree with the basic information on your Facebook Page. Check the business name, contact method and opening information you are asking people to use.

If you have changed your service area or hours, update the relevant Page details directly on Facebook. Do not expect an image caption to correct an outdated profile.

Then review your branded draft for the same information. Consistency helps people understand how to contact you; it is not a guarantee of reach or sales.

[Prepare your next branded draft](https://snappostpro.com)

## A4a20 Issue 20

**Subject:** Weekly insight: be precise when you mention an offer

If your business has a real offer, explain it accurately. State what it includes, who it applies to and when it ends where those details are needed.

Check the price and conditions yourself. An AI caption should not invent a discount, bundle, free service or deadline just because a product appears in the photo.

If there is no offer, remove promotional wording and use a straightforward description. A clear product or completed-work post does not need a discount to be useful.

[Prepare your next branded draft](https://snappostpro.com)

## A4a21 Issue 21

**Subject:** Weekly insight: make saved drafts useful, not automatic

Saving a draft lets you return to an image and caption later. It does not mean the draft is scheduled to publish automatically.

Before publishing a saved SnapPost Pro draft, check that its wording is still accurate. Confirm any date, availability, price or contact instruction that may have changed.

Review the logo and image too. Publish to your connected Facebook Page only when the whole post is ready. Keeping a draft is a preparation step, not a substitute for that review.

[Prepare your next branded draft](https://snappostpro.com)

## A4a22 Issue 22

**Subject:** Weekly insight: show a range without making one post crowded

If your business has several products or services, one photo does not have to explain the entire range. Choose a clear subject and let that post focus on it.

Use different suitable photos for different subjects over time. There is no need to promise a daily posting routine or cram every category into one caption.

For your next draft, pick the photo with the clearest story and check that the AI caption stays on that subject. Add only the details needed to understand it.

[Prepare your next branded draft](https://snappostpro.com)

## A4a23 Issue 23

**Subject:** Weekly insight: choose a practical next post

When you are unsure what to share, look for a real photo that answers a practical customer question: what you make, what you do or what your space looks like.

Choose something current and permission-safe. Do not invent a customer story, outcome or event just to have something to post.

SnapPost Pro can prepare a logo-branded image and an AI-written caption from that photo. Your part is to verify the details and decide whether it belongs on your Facebook Page.

[Prepare your next branded draft](https://snappostpro.com)

## A4a24 Issue 24

**Subject:** Weekly insight: describe what is included, not what is assumed

A photo can include items that are not part of your product or service. Make sure the caption does not turn background details or accessories into an implied inclusion.

Check any generated description of materials, sizes, features or extras. Correct the details using your own knowledge of what the customer would actually receive.

If an inclusion is unclear, leave it out or explain it plainly. Accurate wording matters more than making the caption sound comprehensive.

[Prepare your next branded draft](https://snappostpro.com)

## A4a25 Issue 25

**Subject:** Weekly insight: review the post after it is published

After publishing, open the post on your Facebook Page and check the image, caption and any link you included. This is a final accuracy check, not a performance promise.

If something is wrong, use the controls available on Facebook to correct it. SnapPost Pro post history lets you return to your saved post records and published links.

For the next draft, carry forward only the details that remain accurate. Do not assume a previous caption is suitable for a different photo or product.

[Prepare your next branded draft](https://snappostpro.com)

## A4a26 Issue 26

**Subject:** Weekly insight: keep the preparation process simple

A repeatable preparation process can be straightforward: choose a real photo, check permission, add your logo, review the caption, then publish when ready.

SnapPost Pro helps local businesses prepare the branded image and AI-written caption. It does not guarantee enquiries, transform the photographed work or replace your accuracy check.

Use the process whenever you have something suitable to share. Start with the free account if you want to try it: three branded post drafts total, with no card required.

[Prepare your next branded draft](https://snappostpro.com)

## A5 Sources

- [SnapPost Pro live product positioning and features](https://snappostpro.com)
- [SnapPost Pro contact page](https://snappostpro.com/contact)
- [Resend idempotency: 24-hour retention](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Resend unsubscribe headers and POST behavior](https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails)
- [Resend automatic suppression and list hygiene](https://resend.com/docs/knowledge-base/audience-hygiene)
