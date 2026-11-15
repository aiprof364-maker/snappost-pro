import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLAN_POST_LIMITS, PLANS } from "./const";
import { TRADE_LANDING_NAV } from "./tradeLandingNav";
import {
  SITE_DEFAULT_DESCRIPTION,
  SITE_DEFAULT_TITLE,
  TRADE_LANDING_PAGES,
  applyTradeLandingMetadata,
  tradeCanonicalUrl,
  tradeFaqJsonLd,
  tradeLandingByPath,
  tradePreviewHref,
} from "./tradeLandingPages";

const indexHtml = readFileSync(
  new URL("../client/index.html", import.meta.url),
  "utf8"
);
const sitemap = readFileSync(
  new URL("../client/public/sitemap.xml", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../client/src/App.tsx", import.meta.url),
  "utf8"
);
const footerSource = readFileSync(
  new URL("../client/src/components/SiteFooter.tsx", import.meta.url),
  "utf8"
);

const BANNED =
  /testimonial|5-star|five-star|trusted by|customers love|raving|as seen in|guaranteed results|join thousands|\d+(?:\.\d+)?%/i;

describe("trade landing pages", () => {
  it("covers the eight trades without a second salon URL", () => {
    expect(TRADE_LANDING_PAGES.map(page => page.path)).toEqual([
      "/contractors",
      "/landscapers",
      "/hairdressers",
      "/food-trucks",
      "/realtors",
      "/cleaners",
      "/auto-detailers",
      "/pet-groomers",
    ]);
    expect(TRADE_LANDING_NAV.map(page => page.label)).toContain("Salons");
    expect(TRADE_LANDING_PAGES.some(page => page.path === "/salons")).toBe(
      false
    );
  });

  it("keeps the existing preview landing params for contractors and salons", () => {
    expect(tradePreviewHref("contractors")).toBe(
      "/preview?landing=contractors"
    );
    expect(tradePreviewHref("hairdressers")).toBe(
      "/preview?landing=hairdressers"
    );
    for (const page of TRADE_LANDING_PAGES) {
      expect(page.previewLanding).toBe(page.id);
      expect(tradePreviewHref(page.previewLanding)).toBe(
        `/preview?landing=${page.id}`
      );
    }
  });

  it("gives every page unique search copy, examples, and FAQs", () => {
    const titles = TRADE_LANDING_PAGES.map(page => page.title);
    const descriptions = TRADE_LANDING_PAGES.map(page => page.description);
    const headings = TRADE_LANDING_PAGES.map(page => page.h1);
    const intros = TRADE_LANDING_PAGES.map(page => page.intro);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(new Set(headings).size).toBe(headings.length);
    expect(new Set(intros).size).toBe(intros.length);

    for (const page of TRADE_LANDING_PAGES) {
      expect(page.title.endsWith("| SnapPost Pro")).toBe(true);
      expect(page.title.length).toBeLessThanOrEqual(70);
      expect(page.description.length).toBeGreaterThanOrEqual(120);
      expect(page.description.length).toBeLessThanOrEqual(170);
      expect(page.description).toMatch(/no card/i);
      expect(page.examples).toHaveLength(3);
      expect(page.steps).toHaveLength(4);
      expect(page.faqs.length).toBeGreaterThanOrEqual(4);
      expect(page.h1.length).toBeGreaterThan(10);

      const visible = [
        page.title,
        page.description,
        page.h1,
        page.intro,
        page.exampleIntro,
        page.closingBody,
        ...page.examples.flatMap(example => [
          example.title,
          example.caption,
          example.photo,
        ]),
        ...page.faqs.flatMap(faq => [faq.question, faq.answer]),
      ].join("\n");
      expect(visible, page.path).not.toMatch(BANNED);
    }
  });

  it("states the real free offer and paid prices in every FAQ", () => {
    for (const page of TRADE_LANDING_PAGES) {
      const pricing = page.faqs.find(faq =>
        faq.question.toLowerCase().includes("cost")
      );
      expect(pricing?.answer).toContain(String(PLAN_POST_LIMITS.free));
      expect(pricing?.answer).toContain(PLANS.starter.priceLabel);
      expect(pricing?.answer).toContain(PLANS.pro.priceLabel);
      expect(pricing?.answer).toMatch(/no card/i);
    }
  });

  it("builds FAQ schema from the same questions shown on the page", () => {
    for (const page of TRADE_LANDING_PAGES) {
      const schema = tradeFaqJsonLd(page.faqs);
      expect(schema["@type"]).toBe("FAQPage");
      expect(schema.mainEntity.map(item => item.name)).toEqual(
        page.faqs.map(faq => faq.question)
      );
      expect(schema.mainEntity.map(item => item.acceptedAnswer.text)).toEqual(
        page.faqs.map(faq => faq.answer)
      );
    }
  });

  it("injects a unique title, description, canonical, Open Graph tags, and FAQ schema", () => {
    for (const page of TRADE_LANDING_PAGES) {
      const html = applyTradeLandingMetadata(indexHtml, page.path);
      const canonical = tradeCanonicalUrl(page.path);
      expect(html).toContain(`<title>${page.title}</title>`);
      expect(html).toContain(
        `<meta name="description" content="${page.description}" />`
      );
      expect(html).toContain(
        `<meta property="og:title" content="${page.title}" />`
      );
      expect(html).toContain(
        `<meta property="og:description" content="${page.description}" />`
      );
      expect(html).toContain(
        `<meta property="og:url" content="${canonical}" />`
      );
      expect(html).toContain(`<link rel="canonical" href="${canonical}" />`);
      expect(html.match(/<title>/g)).toHaveLength(1);
      expect(html.match(/name="description"/g)).toHaveLength(1);
      expect(html.match(/property="og:title"/g)).toHaveLength(1);
      expect(html.match(/rel="canonical"/g)).toHaveLength(1);
      expect(html.match(/data-trade-faq="true"/g)).toHaveLength(1);

      const json = html.match(
        /<script type="application\/ld\+json" data-trade-faq="true">([\s\S]*?)<\/script>/
      )?.[1];
      expect(JSON.parse(json ?? "{}")).toEqual(tradeFaqJsonLd(page.faqs));
      expect(html).not.toContain(SITE_DEFAULT_TITLE);
      expect(html).not.toContain(SITE_DEFAULT_DESCRIPTION);
    }
  });

  it("leaves unrelated documents alone and still works without a head tag", () => {
    const shell = "<!doctype html><title>SnapPost Pro</title>";
    expect(applyTradeLandingMetadata(indexHtml, "/pricing")).toBe(indexHtml);
    expect(applyTradeLandingMetadata(shell, "/")).toBe(shell);

    const html = applyTradeLandingMetadata(shell, "/landscapers/");
    expect(html).toContain(
      "Facebook Post Ideas for Landscapers | SnapPost Pro"
    );
    expect(html).toContain(
      'rel="canonical" href="https://snappostpro.com/landscapers"'
    );
    expect(applyTradeLandingMetadata(html, "/landscapers")).toBe(html);
  });

  it("lists every trade URL in the sitemap and the app routes", () => {
    expect(sitemap).toContain("https://snappostpro.com/preview");
    expect(sitemap).not.toContain("/dashboard");
    expect(sitemap).not.toContain("/admin");
    for (const page of TRADE_LANDING_PAGES) {
      expect(sitemap).toContain(`https://snappostpro.com${page.path}`);
      expect(appSource).toContain(`path={"${page.path}"}`);
    }
    expect(footerSource).toContain('aria-label="For your trade"');
    expect(footerSource).toContain("TRADE_LANDING_NAV");
  });

  it("resolves trade paths with a query or a trailing slash", () => {
    expect(tradeLandingByPath("/food-trucks?landing=food-trucks")?.id).toBe(
      "food-trucks"
    );
    expect(tradeLandingByPath("/pet-groomers/")?.id).toBe("pet-groomers");
    expect(tradeLandingByPath("/salons")).toBeUndefined();
  });
});
