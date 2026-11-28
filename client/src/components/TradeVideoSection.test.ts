import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { videosForTrade } from "@shared/tradeLandingVideos";

const source = readFileSync(
  new URL("./TradeVideoSection.tsx", import.meta.url),
  "utf8"
);
const pageSource = readFileSync(
  new URL("./TradeLandingPage.tsx", import.meta.url),
  "utf8"
);

describe("See it in action", () => {
  it("keeps the player facade free of YouTube JavaScript until a click", async () => {
    const { default: TradeVideoSection } = await import("./TradeVideoSection");
    const html = renderToStaticMarkup(
      React.createElement(TradeVideoSection, { tradeId: "contractors" })
    );
    const videos = videosForTrade("contractors");

    expect(html).toContain("See it in action");
    expect(html).toContain("Short videos for contractors");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("youtube-nocookie.com");
    expect(html).not.toContain("iframe_api");
    expect(source).toContain("tradeVideoEmbedUrl(video.id)");
    expect(source).toContain('loading="lazy"');
    expect(source).not.toMatch(/tradies|iframe_api|www\.youtube\.com\/embed/i);
    expect(pageSource).toContain("<TradeVideoSection");

    for (const video of videos) {
      expect(html).toContain(`https://i.ytimg.com/vi/${video.id}/oar2.jpg`);
      expect(html).toContain(`https://www.youtube.com/watch?v=${video.id}`);
      expect(html).toContain(`aspect-[9/16]`);
      expect(html).toContain(video.title);
    }
  });

  it("skips trades without videos", async () => {
    const { default: TradeVideoSection } = await import("./TradeVideoSection");
    const html = renderToStaticMarkup(
      React.createElement(TradeVideoSection, { tradeId: "realtors" })
    );
    expect(html).toBe("");
  });

  it("uses salon-owner wording on the hairdresser page", async () => {
    const { default: TradeVideoSection } = await import("./TradeVideoSection");
    const html = renderToStaticMarkup(
      React.createElement(TradeVideoSection, { tradeId: "hairdressers" })
    );
    expect(html).toContain("salon owners");
    expect(html).not.toMatch(/tradies/i);
  });
});
