export const PREVIEW_CALL_TO_ACTION = "Call us for a free quote";
export const PREVIEW_BUSINESS_NAME_MAX = 80;
export const PREVIEW_SUBURB_MAX = 60;
const CAPTION_MAX = 2200;

/** Keep only the text a visitor actually typed, within the preview field limit. */
export function cleanPreviewText(
  value: string | undefined,
  maxLength: number
): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLength);
}

function hasPhrase(text: string, phrase: string) {
  return text.toLowerCase().includes(phrase.toLowerCase());
}

function ensureSentence(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * Make a generated caption sound like the visitor's business.
 * Only the supplied name, suburb, and call to action are added. Missing
 * details stay missing.
 */
export function personalizeCaption(
  caption: string,
  details: {
    businessName?: string;
    suburb?: string;
    callToAction?: string;
  }
): string {
  const businessName = cleanPreviewText(
    details.businessName,
    PREVIEW_BUSINESS_NAME_MAX
  );
  const suburb = cleanPreviewText(details.suburb, PREVIEW_SUBURB_MAX);
  const callToAction = cleanPreviewText(details.callToAction, 80);
  let text = caption.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  if (!text) text = "Another job done right.";

  const nameMissing = Boolean(businessName && !hasPhrase(text, businessName));
  const suburbMissing = Boolean(suburb && !hasPhrase(text, suburb));

  if (nameMissing && suburbMissing && businessName && suburb) {
    text = `${businessName} in ${suburb}. ${text}`;
  } else if (nameMissing && businessName) {
    text = `${businessName}. ${text}`;
  } else if (
    suburbMissing &&
    suburb &&
    businessName &&
    hasPhrase(text, businessName)
  ) {
    const index = text.toLowerCase().indexOf(businessName.toLowerCase());
    const end = index + businessName.length;
    text = `${text.slice(0, end)} in ${suburb}${text.slice(end)}`;
  } else if (suburbMissing && suburb) {
    text = `${suburb}. ${text}`;
  }

  if (callToAction && !hasPhrase(text, callToAction)) {
    text = `${ensureSentence(text)} ${callToAction}.`;
  }

  const finished = text.replace(/\s+/g, " ").trim();
  return finished.length <= CAPTION_MAX
    ? finished
    : finished.slice(0, CAPTION_MAX).trim();
}
