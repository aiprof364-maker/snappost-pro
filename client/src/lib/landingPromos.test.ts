import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANDING_PROMOS } from "./landingPromos";

describe("landing promo videos", () => {
  it("keeps the salon cut on hairdressers and the contractor cut on contractors", () => {
    expect(LANDING_PROMOS.hairdressers.src).toBe(
      "/media/landing/hairdressers-promo.mp4"
    );
    expect(LANDING_PROMOS.contractors.src).toBe(
      "/media/landing/contractors-promo.mp4"
    );

    const salonCaptions = readFileSync(
      "client/public/media/landing/hairdressers-promo.vtt",
      "utf8"
    );
    const contractorCaptions = readFileSync(
      "client/public/media/landing/contractors-promo.vtt",
      "utf8"
    );

    expect(salonCaptions).toContain("NO TIME TO POST?");
    expect(salonCaptions).toContain("snappostpro.com/hairdressers");
    expect(salonCaptions).not.toContain("/contractors");
    expect(contractorCaptions).toContain("BUSY ON THE TOOLS?");
    expect(contractorCaptions).toContain("snappostpro.com/contractors");
    expect(contractorCaptions).not.toContain("/hairdressers");
  });

  it("ships a poster and caption track next to each optimized video", () => {
    for (const promo of Object.values(LANDING_PROMOS)) {
      for (const url of [promo.src, promo.poster, promo.captions]) {
        const file = statSync(`client/public${url}`);
        expect(file.size).toBeGreaterThan(20);
        expect(file.size).toBeLessThan(3_000_000);
      }
    }
  });
});
