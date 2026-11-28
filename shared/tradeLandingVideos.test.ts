import { describe, expect, it } from "vitest";
import { TRADE_LANDING_NAV } from "./tradeLandingNav";
import {
  TRADE_VIDEO_SECTIONS,
  tradeVideoContentUrl,
  tradeVideoEmbedUrl,
  tradeVideosJsonLd,
  videosForTrade,
} from "./tradeLandingVideos";

const EXPECTED = {
  contractors: ["maBuOQbWHDk", "Coub5XUU_vY", "iFod_6e2alM", "pk-YhZem_r8"],
  landscapers: ["_VRmtMsm2DI", "gbqEkm8XP-g", "Y-4Rf5Wtbw0", "GPg2bKzhDRU"],
  hairdressers: ["gctCheVjMtw", "owrJbhp-fes", "ewyW3bTT2G4", "e46PGi1A7TA"],
  "pet-groomers": ["ck8mV2twZII", "ik-rWqGV5Zc", "2IvKVLaBtY8", "9Qbrh338fA0"],
  "auto-detailers": ["3OFgDqC1abY", "6rFTqsoIuCg", "Oc5IPKcd1fk"],
  "food-trucks": ["Y4VrPTm2jKA", "a3jv9Y79EQo", "dYttCUFsfJI"],
  cleaners: ["lAgRaNR3WyY"],
} as const;

describe("trade landing videos", () => {
  it("maps every trade except realtors to the SnapPost Pro Shorts", () => {
    expect(Object.keys(TRADE_VIDEO_SECTIONS)).toEqual([
      "contractors",
      "landscapers",
      "hairdressers",
      "pet-groomers",
      "auto-detailers",
      "food-trucks",
      "cleaners",
    ]);
    expect(videosForTrade("realtors")).toEqual([]);
    expect(videosForTrade(undefined)).toEqual([]);

    for (const trade of TRADE_LANDING_NAV) {
      const videos = videosForTrade(trade.id);
      if (trade.id === "realtors") {
        expect(videos).toEqual([]);
        continue;
      }
      expect(videos.map(video => video.id)).toEqual(EXPECTED[trade.id]);
    }
  });

  it("stores public YouTube metadata and VideoObject fields", () => {
    for (const section of Object.values(TRADE_VIDEO_SECTIONS)) {
      expect(section.intro).not.toMatch(
        /tradies|colour|whilst|favourite|suburb/i
      );
      expect(section.intro.length).toBeGreaterThan(40);
      const schema = tradeVideosJsonLd(section.videos);
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@graph"]).toHaveLength(section.videos.length);

      section.videos.forEach((video, index) => {
        expect(video.title.length).toBeGreaterThan(8);
        expect(video.description.length).toBeGreaterThan(40);
        expect(video.uploadDate).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/
        );
        expect(video.duration).toMatch(/^PT(?:\d+H)?(?:\d+M)?\d+S$/);
        expect(video.thumbnailUrl).toBe(
          `https://i.ytimg.com/vi/${video.id}/oar2.jpg`
        );
        expect(video.thumbnailWidth).toBe(1080);
        expect(video.thumbnailHeight).toBe(1920);

        const node = schema["@graph"][index];
        expect(node).toEqual({
          "@type": "VideoObject",
          name: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnailUrl,
          uploadDate: video.uploadDate,
          duration: video.duration,
          contentUrl: tradeVideoContentUrl(video.id),
          embedUrl: tradeVideoEmbedUrl(video.id),
        });
        expect(node?.contentUrl).toBe(
          `https://www.youtube.com/watch?v=${video.id}`
        );
        expect(node?.embedUrl).toBe(
          `https://www.youtube-nocookie.com/embed/${video.id}`
        );
      });
    }
  });
});
