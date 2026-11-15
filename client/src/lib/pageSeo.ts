import { useEffect } from "react";
import {
  SITE_DEFAULT_DESCRIPTION,
  SITE_DEFAULT_TITLE,
  SITE_ORIGIN,
  tradeCanonicalUrl,
  tradeFaqJsonLd,
  type TradeFaq,
} from "@shared/tradeLandingPages";

function upsertMeta(
  attribute: "name" | "property",
  key: string,
  content: string
) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
}

function upsertJsonLd(json: string) {
  let element = document.head.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"][data-trade-faq="true"]'
  );
  if (!element) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.setAttribute("data-trade-faq", "true");
    document.head.appendChild(element);
  }
  element.textContent = json;
}

function removeElement(selector: string) {
  document.head.querySelectorAll(selector).forEach(element => element.remove());
}

function restoreDefaultHead() {
  document.title = SITE_DEFAULT_TITLE;
  upsertMeta("name", "description", SITE_DEFAULT_DESCRIPTION);
  upsertMeta("property", "og:title", SITE_DEFAULT_TITLE);
  upsertMeta("property", "og:description", SITE_DEFAULT_DESCRIPTION);
  upsertMeta("property", "og:url", `${SITE_ORIGIN}/`);
  upsertMeta("property", "og:type", "website");
  removeElement('link[rel="canonical"]');
  removeElement('script[type="application/ld+json"][data-trade-faq="true"]');
}

export function useTradePageMetadata(page: {
  title: string;
  description: string;
  path: string;
  faqs: readonly TradeFaq[];
}) {
  const canonicalUrl = tradeCanonicalUrl(page.path);
  const jsonLd = JSON.stringify(tradeFaqJsonLd(page.faqs));

  useEffect(() => {
    document.title = page.title;
    upsertMeta("name", "description", page.description);
    upsertMeta("property", "og:title", page.title);
    upsertMeta("property", "og:description", page.description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:type", "website");
    upsertCanonical(canonicalUrl);
    upsertJsonLd(jsonLd);

    return () => {
      restoreDefaultHead();
    };
  }, [canonicalUrl, jsonLd, page.description, page.title]);
}
