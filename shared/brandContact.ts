export type BrandContactResult =
  | { ok: true; value: string | null }
  | { ok: false; message: string };

const PHONE_MESSAGE =
  "Enter a 10-digit US phone number, such as (512) 555-0142.";
const WEBSITE_MESSAGE = "Enter a website like northsidedecks.com.";

/** Middle dot used between phone and website on the name bar. */
export const BRAND_CONTACT_SEPARATOR = " · ";

/**
 * Optional US phone. Blank stays blank. Ten digits, or eleven with a leading 1,
 * are stored as (555) 555-0142.
 */
export function parseBusinessPhone(
  value: string | null | undefined
): BrandContactResult {
  if (!value || !value.trim()) return { ok: true, value: null };
  const trimmed = value.trim();
  if (/[a-z]/i.test(trimmed)) return { ok: false, message: PHONE_MESSAGE };
  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return { ok: false, message: PHONE_MESSAGE };
  const area = digits.slice(0, 3);
  const exchange = digits.slice(3, 6);
  const line = digits.slice(6);
  if (
    area[0] === "0" ||
    area[0] === "1" ||
    exchange[0] === "0" ||
    exchange[0] === "1"
  ) {
    return { ok: false, message: PHONE_MESSAGE };
  }
  return { ok: true, value: `(${area}) ${exchange}-${line}` };
}

const HOSTNAME =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

/**
 * Optional website. A domain or an http(s) URL is stored without the scheme,
 * for example northsidedecks.com.
 */
export function parseBusinessWebsite(
  value: string | null | undefined
): BrandContactResult {
  if (!value || !value.trim()) return { ok: true, value: null };
  const trimmed = value.trim();
  if (/\s/.test(trimmed) || trimmed.length > 200) {
    return { ok: false, message: WEBSITE_MESSAGE };
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, message: WEBSITE_MESSAGE };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, message: WEBSITE_MESSAGE };
  }
  if (url.username || url.password) {
    return { ok: false, message: WEBSITE_MESSAGE };
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!HOSTNAME.test(host)) return { ok: false, message: WEBSITE_MESSAGE };
  const path = url.pathname.replace(/\/+$/, "");
  const display = `${host}${path === "/" ? "" : path}${url.search}`;
  if (!display || display.length > 160) {
    return { ok: false, message: WEBSITE_MESSAGE };
  }
  return { ok: true, value: display };
}
