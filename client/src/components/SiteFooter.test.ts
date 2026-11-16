import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({
  Link: (props: {
    href?: string;
    children?: React.ReactNode;
    className?: string;
  }) =>
    React.createElement(
      "a",
      { href: props.href, className: props.className },
      props.children
    ),
}));

vi.mock("@/assets/brand/snappost-pro-logo.jpg", () => ({
  default: "/snappost-pro-logo.jpg",
}));

const indexHtml = readFileSync(
  new URL("../../index.html", import.meta.url),
  "utf8"
);

function openingTags(html: string, tag: string) {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))].map(
    match => match[0]
  );
}

function expectDirectoryBadges(html: string) {
  const links = openingTags(html, "a");
  const dang = links.find(link => link.includes('href="https://dang.ai"'));
  const fazier = links.find(link => link.includes('href="https://fazier.com"'));

  expect(dang).toBeDefined();
  expect(fazier).toBeDefined();
  expect(dang).toContain('rel="dofollow noopener"');
  expect(fazier).toContain('rel="noopener"');
  expect(dang).not.toMatch(/nofollow|ugc|sponsored/);
  expect(fazier).not.toMatch(/nofollow|ugc|sponsored/);
  expect(html).not.toMatch(/rel="[^"]*\b(?:nofollow|ugc|sponsored)\b/);

  const images = openingTags(html, "img");
  expect(
    images.some(image =>
      image.includes("https://assets.dang.ai/badges/dang-verified-dark.png")
    )
  ).toBe(true);
  expect(html).not.toContain("dang-verified-light.png");
  expect(
    images.some(image =>
      image.includes(
        "https://fazier.com/api/v1/public/badges/launch_badges.svg"
      )
    )
  ).toBe(true);
  expect(html).toMatch(/theme=neutral/);
}

describe("directory badges in the site footer", () => {
  it("renders Dang and Fazier links without nofollow", async () => {
    const { default: SiteFooter } = await import("./SiteFooter");
    const html = renderToStaticMarkup(React.createElement(SiteFooter));

    expectDirectoryBadges(html);
    expect(html).toContain("<footer");
  });

  it("includes the same links in the static homepage shell", () => {
    expect(indexHtml).toContain('<div id="root">');
    expectDirectoryBadges(indexHtml);
  });
});
