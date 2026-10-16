// Owner approved deployment and activation on 17 October 2026 (Auckland time).
export const NEWSLETTER_AUTOMATION_ENABLED = true;

export type NewsletterKind = 'welcome' | 'followup' | 'weekly';
export type NewsletterIssue = { subject: string; paragraphs: string[] };

export const NEWSLETTER_WEEKLY_ISSUES: NewsletterIssue[] = [
  {
    subject: 'Weekly insight: choose one clear subject for your photo',
    paragraphs: [
      'A useful business photo answers one question: what should someone notice? Choose one completed result, product or space rather than trying to show everything at once.',
      'Before uploading, check the light, focus and background. Move closer if the subject looks small. Avoid including unrelated paperwork, vehicle plates or customer details.',
      'This week, choose one photo you own and turn it into a branded draft. Review the logo placement and AI-written caption before sharing it on your Facebook Page.'
    ]
  },
  {
    subject: 'Weekly insight: put the useful detail first',
    paragraphs: [
      'The first sentence of a caption should help someone understand the photo. Start with the product, completed work, space or result rather than a broad claim about your business.',
      'Check the AI draft against what actually happened. Keep the relevant detail, remove anything you cannot verify, and make sure any availability or location information is current.',
      'A clear caption does not need to be long. One factual sentence about the photo and one useful next step can be enough. Review both before publishing.'
    ]
  },
  {
    subject: 'Weekly insight: make your logo easy to recognise',
    paragraphs: [
      'Your branding should help people recognise your business without hiding the subject of the photo. Use the same current logo across your business materials.',
      'SnapPost Pro overlays your uploaded logo on the image. Check the branded preview, especially when the lower-right corner contains an important detail or has a busy background.',
      'Open the draft on your phone before posting. Confirm the logo is readable and the result you want to show is still clear. SnapPost Pro adds branding; it does not complete or improve the work shown in your photo.'
    ]
  },
  {
    subject: 'Weekly insight: give each post one next step',
    paragraphs: [
      'A post is easier to follow when it asks for one action. Choose the next step that fits the photo: view your menu, ask about availability, visit your store or contact you about a service.',
      'Make sure that action is possible. Check the destination link, business hours and contact details before posting. Do not promise a booking option your business does not offer.',
      'When reviewing your AI caption, remove competing requests. One relevant invitation is more useful than asking people to call, comment, share and book all at once.'
    ]
  },
  {
    subject: 'Weekly insight: show a product in its real setting',
    paragraphs: [
      'A product photo can show more than what is for sale. Its setting can explain size, use or presentation without making the caption do all the work.',
      'Use your own real product and a setting you are allowed to photograph. Keep labels readable where they matter, and avoid making accessories look included if they are not.',
      'Review the AI caption for accuracy. Check the product name, what is included and whether the pictured item is currently available. Add your logo, then publish only when the image and wording match.'
    ]
  },
  {
    subject: 'Weekly insight: show completed work without inventing results',
    paragraphs: [
      'A finished result is a useful subject for a local-business post. Describe what the viewer can actually see, rather than adding claims about customer satisfaction or business performance.',
      'If you mention a benefit, make sure you can support it. Avoid invented reviews, guaranteed outcomes or claims that the photo alone cannot demonstrate.',
      'SnapPost Pro keeps the completed work in your photo unchanged while adding your logo and preparing a caption. Read that caption as the business owner before you publish it.'
    ]
  },
  {
    subject: 'Weekly insight: check photo permission before you post',
    paragraphs: [
      'A good photo is not automatically a photo you can publish. Use images you own or have permission to use, and consider who or what is identifiable in them.',
      'Check for faces, names, private addresses, documents and customer or patient information. Where consent is needed, obtain it before uploading or publishing the image.',
      'When in doubt, choose another photo that shows your product, space or completed work without identifying a person. The permission check comes before caption generation, not after the post is live.'
    ]
  },
  {
    subject: 'Weekly insight: make your caption sound like your business',
    paragraphs: [
      'An AI-written caption is a draft, not a statement you have to accept. Read it aloud and decide whether it sounds like something your business would say.',
      'Replace unfamiliar wording with plain language. Remove exaggerated adjectives and any detail the AI cannot know from your photo. Check names and spelling.',
      'Keep the parts that accurately describe your work, product or space. SnapPost Pro lets you review the caption before publishing, so use that step to make the post both useful and yours.'
    ]
  },
  {
    subject: 'Weekly insight: make location information useful',
    paragraphs: [
      'Location can help a local customer understand whether a post is relevant. Mention your town, store or service area only when that information is accurate and useful.',
      'Do not publish a customer home address or private site location without permission. A general area is often enough to explain where your business operates.',
      'Check any location added to an AI caption. The image cannot reliably tell the system where your business is based or which areas you serve. Correct the wording before publishing.'
    ]
  },
  {
    subject: 'Weekly insight: treat hashtags as labels, not promises',
    paragraphs: [
      'Hashtags should describe the real subject of the post. They are not a substitute for a clear photo or a useful caption, and they do not guarantee reach or enquiries.',
      'Review the generated hashtags and remove anything unrelated to your business, location or pictured result. Avoid using another business name as if it were your own.',
      'Keep the caption readable without its hashtags. If the post makes sense on its own, the labels can remain a supporting detail rather than the main message.'
    ]
  },
  {
    subject: 'Weekly insight: use the photos you already have permission to share',
    paragraphs: [
      'You may already have useful photos of completed work, products or your business space. Start by finding images you own and are still comfortable publishing.',
      'Check whether each photo is current. An older photo should not imply that a product, service, price or appointment is available now if that is no longer true.',
      'Choose one suitable image and create a branded draft. Review the caption for timing and accuracy before you publish. There is no need to present an old photo as something completed today.'
    ]
  },
  {
    subject: 'Weekly insight: show the detail customers ask about',
    paragraphs: [
      'Think about one question customers often ask about your work or products. A close-up of a finish, texture, size or feature can make that detail easier to explain.',
      'Take the photo in good light and keep the relevant part in focus. Avoid filters or editing that changes the appearance in a misleading way.',
      'Review your draft caption and explain only the detail the image supports. If a material, measurement or feature matters, check it against your own records before posting.'
    ]
  },
  {
    subject: 'Weekly insight: keep availability claims current',
    paragraphs: [
      'Availability is useful only when it is correct. A post about a product, booking or event should not imply something is available if it has sold out or passed.',
      'Before publishing, check dates, stock, opening hours and any conditions. Remove urgent wording such as last chance unless you can verify it.',
      'If you reuse a saved draft, review it again rather than relying on the original caption. The photo may still be useful even when the timing information needs to change.'
    ]
  },
  {
    subject: 'Weekly insight: explain one service through one result',
    paragraphs: [
      'A photo of a completed result can help explain a service without listing everything your business does. Choose the service that is actually shown.',
      'Use the caption to identify the work and provide a useful next step. Avoid claiming that every customer will get exactly the same outcome.',
      'When reviewing your AI draft, make sure the service name and description are correct. Keep the message focused on the photographed result rather than turning it into a long catalogue.'
    ]
  },
  {
    subject: 'Weekly insight: make your business space worth showing',
    paragraphs: [
      'A real photo of your space can help people understand what a visit might look like. Choose a view that accurately represents your business.',
      'Check the frame for people, booking screens, invoices and other private information. Confirm you have permission to photograph any artwork or third-party material you feature.',
      'Use the caption to explain the space without inventing a customer experience. Check practical details, such as access or opening times, if you decide to include them.'
    ]
  },
  {
    subject: 'Weekly insight: do a phone-sized preview check',
    paragraphs: [
      'A photo that looks clear on a large screen can feel crowded on a phone. Before posting, view the draft at the size your customers are likely to see.',
      'Check whether the main subject is obvious, the logo is visible and the caption is easy to follow. If important details disappear, choose a clearer original photo.',
      'Review the final branded image rather than only the upload. SnapPost Pro prepares the image and caption, but your final check decides whether the post is ready to publish.'
    ]
  },
  {
    subject: 'Weekly insight: use seasonal context without false urgency',
    paragraphs: [
      'Seasonal context can make a real photo relevant, but only when it fits your business and the time of year. Do not rely on the AI to know your local season or schedule.',
      'Check dates and remove wording that suggests a limited offer unless there really is one. If the photo is from a previous season, describe it honestly.',
      'A simple, accurate connection between the image and the occasion is enough. You do not need a countdown or a guaranteed-result claim to make a useful post.'
    ]
  },
  {
    subject: 'Weekly insight: separate a demonstration from a customer story',
    paragraphs: [
      'A product demonstration and a customer story are different kinds of post. Do not describe an example as a real customer result or add a testimonial that was never given.',
      'If you share genuine customer feedback, make sure you have permission and use the actual wording. Avoid attaching it to an unrelated image in a way that could mislead.',
      'For a simple photo post, a factual description is often enough. Review your AI caption for implied endorsements before you publish it.'
    ]
  },
  {
    subject: 'Weekly insight: keep your Page details and post consistent',
    paragraphs: [
      'A useful post should agree with the basic information on your Facebook Page. Check the business name, contact method and opening information you are asking people to use.',
      'If you have changed your service area or hours, update the relevant Page details directly on Facebook. Do not expect an image caption to correct an outdated profile.',
      'Then review your branded draft for the same information. Consistency helps people understand how to contact you; it is not a guarantee of reach or sales.'
    ]
  },
  {
    subject: 'Weekly insight: be precise when you mention an offer',
    paragraphs: [
      'If your business has a real offer, explain it accurately. State what it includes, who it applies to and when it ends where those details are needed.',
      'Check the price and conditions yourself. An AI caption should not invent a discount, bundle, free service or deadline just because a product appears in the photo.',
      'If there is no offer, remove promotional wording and use a straightforward description. A clear product or completed-work post does not need a discount to be useful.'
    ]
  },
  {
    subject: 'Weekly insight: make saved drafts useful, not automatic',
    paragraphs: [
      'Saving a draft lets you return to an image and caption later. It does not mean the draft is scheduled to publish automatically.',
      'Before publishing a saved SnapPost Pro draft, check that its wording is still accurate. Confirm any date, availability, price or contact instruction that may have changed.',
      'Review the logo and image too. Publish to your connected Facebook Page only when the whole post is ready. Keeping a draft is a preparation step, not a substitute for that review.'
    ]
  },
  {
    subject: 'Weekly insight: show a range without making one post crowded',
    paragraphs: [
      'If your business has several products or services, one photo does not have to explain the entire range. Choose a clear subject and let that post focus on it.',
      'Use different suitable photos for different subjects over time. There is no need to promise a daily posting routine or cram every category into one caption.',
      'For your next draft, pick the photo with the clearest story and check that the AI caption stays on that subject. Add only the details needed to understand it.'
    ]
  },
  {
    subject: 'Weekly insight: choose a practical next post',
    paragraphs: [
      'When you are unsure what to share, look for a real photo that answers a practical customer question: what you make, what you do or what your space looks like.',
      'Choose something current and permission-safe. Do not invent a customer story, outcome or event just to have something to post.',
      'SnapPost Pro can prepare a logo-branded image and an AI-written caption from that photo. Your part is to verify the details and decide whether it belongs on your Facebook Page.'
    ]
  },
  {
    subject: 'Weekly insight: describe what is included, not what is assumed',
    paragraphs: [
      'A photo can include items that are not part of your product or service. Make sure the caption does not turn background details or accessories into an implied inclusion.',
      'Check any generated description of materials, sizes, features or extras. Correct the details using your own knowledge of what the customer would actually receive.',
      'If an inclusion is unclear, leave it out or explain it plainly. Accurate wording matters more than making the caption sound comprehensive.'
    ]
  },
  {
    subject: 'Weekly insight: review the post after it is published',
    paragraphs: [
      'After publishing, open the post on your Facebook Page and check the image, caption and any link you included. This is a final accuracy check, not a performance promise.',
      'If something is wrong, use the controls available on Facebook to correct it. SnapPost Pro post history lets you return to your saved post records and published links.',
      'For the next draft, carry forward only the details that remain accurate. Do not assume a previous caption is suitable for a different photo or product.'
    ]
  },
  {
    subject: 'Weekly insight: keep the preparation process simple',
    paragraphs: [
      'A repeatable preparation process can be straightforward: choose a real photo, check permission, add your logo, review the caption, then publish when ready.',
      'SnapPost Pro helps local businesses prepare the branded image and AI-written caption. It does not guarantee enquiries, transform the photographed work or replace your accuracy check.',
      'Use the process whenever you have something suitable to share. Start with the free account if you want to try it: three branded post drafts total, with no card required.'
    ]
  }
];

const welcome: NewsletterIssue = {
  subject: 'Welcome to SnapPost Pro — practical tips for local businesses',
  paragraphs: [
    'Thanks for subscribing to SnapPost Pro. This newsletter is for local businesses with real work, products, spaces or results worth showing.',
    'In three days, we will send you a practical guide to preparing your first photo-based Facebook post. After that, look out for one short weekly insight on Tuesdays, covering clear photos, useful captions and consistent branding.',
    'SnapPost Pro turns your photo into a logo-branded image and an AI-written caption. You review the result, then publish to your connected Facebook Page or save the draft for later.',
    'Want to try it? The free account includes three branded post drafts total, with no card required. You do not need an account to receive this newsletter.'
  ]
};

const followup: NewsletterIssue = {
  subject: 'Your 3-day guide: turn one real photo into a branded post',
  paragraphs: [
    'Start with one clear photo of completed work, a product, your space or a result you want to share. Choose an image you own or have permission to publish, and avoid customer, patient or client-identifying details without appropriate consent.',
    'Upload the photo and your business logo to SnapPost Pro. The app adds your logo and prepares an AI-written caption with hashtags. The completed work in your photo stays unchanged.',
    'Read the caption before you publish. Check what is shown, remove unsupported claims, and correct any location, availability or product details. Preview the branded image too.',
    'When you are happy with the draft, publish to your connected Facebook Page or save it for later. If you are trying SnapPost Pro for the first time, the free account includes three branded post drafts total, with no card required.',
    'Your weekly insights will follow on Tuesdays. Each email will focus on one practical part of preparing a photo-based business post.'
  ]
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function getNewsletterMessage(kind: NewsletterKind, unsubscribeUrl: string, issueIndex = 0) {
  const parsed = new URL(unsubscribeUrl);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'snappostpro.com' || parsed.pathname !== '/api/newsletter/unsubscribe') {
    throw new Error('Invalid newsletter unsubscribe URL');
  }
  const index = ((issueIndex % NEWSLETTER_WEEKLY_ISSUES.length) + NEWSLETTER_WEEKLY_ISSUES.length) % NEWSLETTER_WEEKLY_ISSUES.length;
  const issue = kind === 'welcome' ? welcome : kind === 'followup' ? followup : NEWSLETTER_WEEKLY_ISSUES[index];
  const cta = kind === 'weekly' ? 'Prepare your next branded draft' : 'Try SnapPost Pro';
  const footer = 'You are receiving this email because you subscribed to the SnapPost Pro newsletter. Unsubscribe at any time. Newsletter preferences do not change your account or billing emails.';
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033;line-height:1.65;padding:24px">
    <p style="font-weight:700;color:#5747e8;margin-bottom:24px">SnapPost Pro</p>
    <h1 style="font-size:24px;line-height:1.3">${escapeHtml(issue.subject)}</h1>
    ${issue.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('\n')}
    <p style="margin:28px 0"><a href="https://snappostpro.com" style="background:#5747e8;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700">${cta}</a></p>
    <hr style="border:0;border-top:1px solid #ddd;margin:28px 0">
    <p style="font-size:12px;color:#64748b">${footer}<br>SnapPost Pro — photo-to-post for local businesses.<br>
    <a href="https://snappostpro.com/contact">Contact SnapPost Pro</a> · <a href="https://snappostpro.com/privacy">Privacy policy</a> · <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe from the newsletter</a></p>
  </div>`;
  const text = `${issue.subject}\n\n${issue.paragraphs.join('\n\n')}\n\n${cta}: https://snappostpro.com\n\n${footer}\nSnapPost Pro — photo-to-post for local businesses.\nContact: https://snappostpro.com/contact\nPrivacy: https://snappostpro.com/privacy\nUnsubscribe: ${unsubscribeUrl}\n`;
  return { subject: issue.subject, html, text };
}
