import type { TradeLandingId } from "./tradeLandingNav";

/**
 * YouTube Shorts for the trade landing pages. Realtors have none.
 *
 * Fetched 2026-11-28 from public YouTube data for channel @snappostpro:
 * oEmbed supplied the title and channel, and the public Shorts watch page
 * (`/shorts/<id>`, `ytInitialPlayerResponse`) supplied the description,
 * upload date, duration, and original-aspect thumbnail. The standard
 * `/watch` player response was bot-gated here; the Shorts page exposes the
 * same player payload. Duration is `videoDetails.lengthSeconds` as ISO 8601.
 * Thumbnails are the 1080×1920 `i.ytimg.com` `oar2.jpg` image the player
 * lists. One Short does not publish `oardefault.jpg`.
 */

export type TradeVideo = {
  id: string;
  title: string;
  description: string;
  uploadDate: string;
  duration: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
};

export type TradeVideoSection = {
  intro: string;
  videos: readonly TradeVideo[];
};

export type TradeWithVideos = Exclude<TradeLandingId, "realtors">;

export const TRADE_VIDEO_SECTIONS: Record<TradeWithVideos, TradeVideoSection> =
  {
    contractors: {
      intro:
        "Short videos for contractors. See a finished-job photo turn into a branded Facebook post you can review before it goes on your Page.",
      videos: [
        {
          id: "maBuOQbWHDk",
          title:
            "Contractors: turn a job photo into a branded post in 30 seconds",
          description:
            'How contractors post job photos with a logo and caption, ready to share in about 30 seconds.\n\nTry 3 free posts at snappostpro.com https://snappostpro.com/yt\n\nFree caption pack: https://creativeassetslab.gumroad.com/l/qpadgf\n\nMusic: "Hip Hop 02 by Lily J" (Mixkit Stock Music Free License)\n\n#Shorts #ContractorMarketing #SnapPostPro',
          uploadDate: "2026-11-26T16:50:38-08:00",
          duration: "PT10S",
          thumbnailUrl: "https://i.ytimg.com/vi/maBuOQbWHDk/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "Coub5XUU_vY",
          title:
            "Contractors: post the finished job with your logo and caption",
          description:
            'A simple way for contractors to post the finished job as a branded post, with the logo and caption already on the photo.\n\nTry 3 free posts at snappostpro.com https://snappostpro.com/yt\n\nFree caption pack: https://creativeassetslab.gumroad.com/l/qpadgf\n\nMusic: "Trap Electro Vibes by Alejandro Magaña" (Mixkit Stock Music Free License)\n\n#Shorts #ContractorMarketing #SnapPostPro',
          uploadDate: "2026-11-26T19:50:09-08:00",
          duration: "PT10S",
          thumbnailUrl: "https://i.ytimg.com/vi/Coub5XUU_vY/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "iFod_6e2alM",
          title: "Contractors: shoot the after from the same spot #Shorts",
          description:
            'Contractors: shoot the after from the same spot.\n\nInstead of this: two shots from different angles, so the change is hard to see.\nDo this: same spot, same light, with your name on the finished job.\nSame angle and same light make the change obvious at a glance.\n\n(Ridgeline Builders is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com\n\nMusic: "Hip Hop 02" by Lily J (Mixkit Stock Music Free License)\n#Shorts #contractors #homeimprovement #smallbusiness #beforeandafter',
          uploadDate: "2026-11-21T13:27:05-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/iFod_6e2alM/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "pk-YhZem_r8",
          title: "Contractors: post the finished deck first #Shorts",
          description:
            'Contractors: post the finished deck first\n\nThe part most of us skip is posting it. Start the clip on the result.\n\n(Ridgeline Builders is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Trap Electro Vibes by Alejandro Magaña (A. M.)" (Mixkit Stock Music Free License)\n#Shorts #contractors #homeimprovement #localbusiness #smallbusiness #facebookmarketing #beforeandafter',
          uploadDate: "2026-11-25T18:35:36-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/pk-YhZem_r8/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
      ],
    },
    landscapers: {
      intro:
        "Short videos for landscapers. See a yard photo turn into a branded Facebook post you can review before it goes on your Page.",
      videos: [
        {
          id: "_VRmtMsm2DI",
          title:
            "Landscapers: turn a yard photo into a branded post in 30 seconds",
          description:
            'Landscapers: turn a finished yard photo into a branded post with your logo and caption, ready to share.\n\nTry 3 free posts at snappostpro.com https://snappostpro.com/yt\n\nFree caption pack: https://creativeassetslab.gumroad.com/l/izzbe\n\nMusic: "Ride the Waves by Ahjay Stelino" (Mixkit Stock Music Free License)\n\n#Shorts #LandscapingBusiness #SnapPostPro',
          uploadDate: "2026-11-26T17:35:10-08:00",
          duration: "PT10S",
          thumbnailUrl: "https://i.ytimg.com/vi/_VRmtMsm2DI/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "gbqEkm8XP-g",
          title:
            "Landscapers: turn a finished yard into a branded Facebook post #Shorts",
          description:
            'Fall cleanups and final installs look their best on the day you finish them.\n\nOne outdoor photo becomes a branded Facebook post, with your logo in the corner and a caption written for you to edit. (Northfield Yard is a sample brand for this demo.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com\n\nMusic: "Upbeat song" by Ruhinre (CC0)\n#Shorts #landscaping #lawncare #smallbusiness #beforeandafter',
          uploadDate: "2026-11-21T13:29:38-08:00",
          duration: "PT12S",
          thumbnailUrl: "https://i.ytimg.com/vi/gbqEkm8XP-g/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "Y-4Rf5Wtbw0",
          title: "Landscapers: post your real work, not stock photos #Shorts",
          description:
            'Landscapers: post your real work, not stock photos.\n\nStock photos say "generic." Your truck and your work say "local."\n\n(Northfield Yard is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Hip Hop 02 by Lily J" (Mixkit Stock Music Free License)\n#Shorts #landscapers #landscaping #localbusiness #smallbusiness',
          uploadDate: "2026-11-22T17:18:30-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/Y-4Rf5Wtbw0/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "GPg2bKzhDRU",
          title: "Landscapers: one job photo, one branded post #Shorts",
          description:
            'Landscapers: one job photo, one branded post.\n\nSnap the finished yard and you get a caption and your brand, ready to post.\n\n(Northfield Yard is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Ride the Waves by Ahjay Stelino" (Mixkit Stock Music Free License)\n#Shorts #landscapers #landscaping #localbusiness #smallbusiness #facebookmarketing #beforeandafter',
          uploadDate: "2026-11-23T15:05:34-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/GPg2bKzhDRU/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
      ],
    },
    hairdressers: {
      intro:
        "Short videos for salon owners. See a salon photo turn into a branded Facebook post you can review before it goes on your Page.",
      videos: [
        {
          id: "gctCheVjMtw",
          title:
            "Salon owners: turn a hair photo into a branded post in 30 seconds",
          description:
            'Salon marketing tip: one hair photo becomes a branded social post with your logo and caption, ready in about 30 seconds.\n\nTry 3 free posts at snappostpro.com https://snappostpro.com/yt\n\nFree caption pack: https://creativeassetslab.gumroad.com/l/srgovd\n\nMusic: "Trap Electro Vibes by Alejandro Magaña" (Mixkit Stock Music Free License)\n\n#Shorts #SalonMarketing #SnapPostPro',
          uploadDate: "2026-11-27T13:26:37-08:00",
          duration: "PT10S",
          thumbnailUrl: "https://i.ytimg.com/vi/gctCheVjMtw/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "owrJbhp-fes",
          title:
            "Salon owners: turn one photo into a branded Facebook post #Shorts",
          description:
            "Salon owners: your space looks great today. Here's a quick way to show it off.\n\nOne salon photo becomes a Facebook post with your logo in the corner and a caption that's ready for you to review. (Halo Room is a made-up sample brand for this demo.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com\n\nMusic: \"Upbeat song\" by Ruhinre (CC0)\n#Shorts #salonowner #hairsalon #salonmarketing #smallbusiness",
          uploadDate: "2026-11-21T13:28:51-08:00",
          duration: "PT12S",
          thumbnailUrl: "https://i.ytimg.com/vi/owrJbhp-fes/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "ewyW3bTT2G4",
          title: "Salon owners: post the finished look as a branded salon post",
          description:
            'Salon owners: turn a finished look into a branded salon post with your logo and caption in about 30 seconds.\n\nTry 3 free posts at snappostpro.com https://snappostpro.com/yt\n\nFree caption pack: https://creativeassetslab.gumroad.com/l/srgovd\n\nMusic: "Trap Electro Vibes by Alejandro Magaña" (Mixkit Stock Music Free License)\n\n#Shorts #SalonMarketing #SnapPostPro',
          uploadDate: "2026-11-26T18:20:00-08:00",
          duration: "PT10S",
          thumbnailUrl: "https://i.ytimg.com/vi/ewyW3bTT2G4/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "e46PGi1A7TA",
          title:
            "Salon owners: one post can work on Facebook and Instagram #Shorts",
          description:
            'Salon owners: one post can work on Facebook and Instagram.\n\nTurn one branded job photo into a Facebook post, an Instagram caption, and a Reel.\n\n(Halo Room is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Ride the Waves by Ahjay Stelino" (Mixkit Stock Music Free License)\n#Shorts #salons #hairsalon #localbusiness #smallbusiness #facebookmarketing #instagramtips',
          uploadDate: "2026-11-23T13:40:25-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/e46PGi1A7TA/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
      ],
    },
    "pet-groomers": {
      intro:
        "Short videos for pet groomers. See a finished groom turn into a branded Facebook post you can review before it goes on your Page.",
      videos: [
        {
          id: "ck8mV2twZII",
          title: "Pet groomers: put before and after in one post #Shorts",
          description:
            'Pet groomers: put before and after in one post.\n\nOne clear before-and-after sells the job for you.\n\n(Tidy Hound is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Hip Hop 02 by Lily J" (Mixkit Stock Music Free License)\n#Shorts #petgroomers #doggrooming #localbusiness #smallbusiness',
          uploadDate: "2026-11-22T18:09:17-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/ck8mV2twZII/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "ik-rWqGV5Zc",
          title: "Pet groomers: turn a before-and-after into a branded post",
          description:
            'Pet groomers: turn a before-and-after groom photo into a branded post with your logo and caption.\n\nTry 3 free posts at snappostpro.com https://snappostpro.com/yt\n\nFree caption pack: https://creativeassetslab.gumroad.com/l/iewtht\n\nMusic: "Trap Electro Vibes by Alejandro Magaña" (Mixkit Stock Music Free License)\n\n#Shorts #PetGroomer #SnapPostPro',
          uploadDate: "2026-11-27T16:20:01-08:00",
          duration: "PT10S",
          thumbnailUrl: "https://i.ytimg.com/vi/ik-rWqGV5Zc/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "2IvKVLaBtY8",
          title: "Pet groomers: lead with the after #Shorts",
          description:
            'Pet groomers: lead with the after\n\nThe reveal is the hook. Show the finished groom, then post it without adding to the pile.\n\n(Tidy Hound is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Hip Hop 02 by Lily J" (Mixkit Stock Music Free License)\n#Shorts #petgroomers #doggrooming #localbusiness #smallbusiness #facebookmarketing #beforeandafter',
          uploadDate: "2026-11-25T19:20:34-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/2IvKVLaBtY8/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "9Qbrh338fA0",
          title: "Pet groomers: film upright and lead with the result #Shorts",
          description:
            'Pet groomers: film upright and lead with the result.\n\nA vertical clip of the finished groom stops the scroll in the first seconds.\n\n(Tidy Hound is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Trap Electro Vibes by Alejandro Magaña (A. M.)" (Mixkit Stock Music Free License)\n#Shorts #petgroomers #doggrooming #localbusiness #smallbusiness',
          uploadDate: "2026-11-22T19:17:20-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/9Qbrh338fA0/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
      ],
    },
    "auto-detailers": {
      intro:
        "Short videos for auto detailers. See a reveal photo turn into a branded Facebook post you can review before it goes on your Page.",
      videos: [
        {
          id: "3OFgDqC1abY",
          title: "Auto detailers: turn a reveal photo into a branded post",
          description:
            'Auto detailers: turn a reveal shot into a branded post with your logo and caption, ready to share.\n\nTry 3 free posts at snappostpro.com https://snappostpro.com/yt\n\nFree caption pack: https://creativeassetslab.gumroad.com/l/dgzemb\n\nMusic: "Ride the Waves by Ahjay Stelino" (Mixkit Stock Music Free License)\n\n#Shorts #AutoDetailing #SnapPostPro',
          uploadDate: "2026-11-27T15:35:24-08:00",
          duration: "PT10S",
          thumbnailUrl: "https://i.ytimg.com/vi/3OFgDqC1abY/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "6rFTqsoIuCg",
          title:
            "Auto detailers: that job clip is already a short video #Shorts",
          description:
            'Auto detailers: that job clip is already a short video.\n\nFilm it upright on your phone and post the finished shine.\n\n(Gloss Lab Detailing is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Hip Hop 02 by Lily J" (Mixkit Stock Music Free License)\n#Shorts #autodetailing #cardetailing #localbusiness #smallbusiness #facebookmarketing #beforeandafter',
          uploadDate: "2026-11-23T13:57:06-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/6rFTqsoIuCg/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "Oc5IPKcd1fk",
          title: "Auto detailers: blur private details before you post #Shorts",
          description:
            'Auto detailers: blur private details before you post.\n\nBlur house numbers, license plates and phone numbers so you protect the customer.\n\n(Gloss Lab Detailing is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Hip Hop 02 by Lily J" (Mixkit Stock Music Free License)\n#Shorts #autodetailing #cardetailing #localbusiness #smallbusiness',
          uploadDate: "2026-11-22T16:27:16-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/Oc5IPKcd1fk/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
      ],
    },
    "food-trucks": {
      intro:
        "Short videos for food truck owners. See a food photo turn into a branded Facebook post you can review before it goes on your Page.",
      videos: [
        {
          id: "Y4VrPTm2jKA",
          title: "Restaurant owners: put your name on every photo #Shorts",
          description:
            'Restaurant owners: put your name on every photo.\n\nIf there\'s no logo, nobody knows whose work it is.\n\n(Ember Room is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Trap Electro Vibes by Alejandro Magaña (A. M.)" (Mixkit Stock Music Free License)\n#Shorts #restaurants #localrestaurant #localbusiness #smallbusiness',
          uploadDate: "2026-11-22T18:26:34-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/Y4VrPTm2jKA/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "a3jv9Y79EQo",
          title: "Cafe owners: use a few local and trade hashtags #Shorts",
          description:
            'Cafe owners: use a few local and trade hashtags.\n\nThree to five relevant tags beat a long generic list.\n\n(Maple & Rye is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Ride the Waves by Ahjay Stelino" (Mixkit Stock Music Free License)\n#Shorts #cafes #coffeeshop #localbusiness #smallbusiness #facebookmarketing #instagramtips',
          uploadDate: "2026-11-23T14:31:36-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/a3jv9Y79EQo/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
        {
          id: "dYttCUFsfJI",
          title:
            "Cafe owners: hook viewers in the first 1 to 2 seconds #Shorts",
          description:
            'Cafe owners: hook viewers in the first 1 to 2 seconds.\n\nStart with the finished result. Explain later.\n\n(Maple & Rye is a sample brand for this demo, not a customer.)\n\nTry it free: 3 free posts, no card. https://snappostpro.com/yt\n\nMusic: "Ride the Waves by Ahjay Stelino" (Mixkit Stock Music Free License)\n#Shorts #cafes #coffeeshop #localbusiness #smallbusiness',
          uploadDate: "2026-11-22T17:01:24-08:00",
          duration: "PT11S",
          thumbnailUrl: "https://i.ytimg.com/vi/dYttCUFsfJI/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
      ],
    },
    cleaners: {
      intro:
        "Short videos for cleaners. See a finished cleaning photo turn into a branded Facebook post you can review before it goes on your Page.",
      videos: [
        {
          id: "lAgRaNR3WyY",
          title: "Cleaners: turn a job photo into a branded cleaning post",
          description:
            'A simple way for cleaning businesses to turn one job photo into a branded post with a logo and caption.\n\nTry 3 free posts at snappostpro.com https://snappostpro.com/yt\n\nFree caption pack: https://creativeassetslab.gumroad.com/l/bwkmvr\n\nMusic: "Hip Hop 02 by Lily J" (Mixkit Stock Music Free License)\n\n#Shorts #CleaningBusiness #SnapPostPro',
          uploadDate: "2026-11-26T19:05:16-08:00",
          duration: "PT10S",
          thumbnailUrl: "https://i.ytimg.com/vi/lAgRaNR3WyY/oar2.jpg",
          thumbnailWidth: 1080,
          thumbnailHeight: 1920,
        },
      ],
    },
  };

export function videosForTrade(
  id: TradeLandingId | undefined
): readonly TradeVideo[] {
  if (!id || !Object.hasOwn(TRADE_VIDEO_SECTIONS, id)) return [];
  return TRADE_VIDEO_SECTIONS[id as TradeWithVideos].videos;
}

export function tradeVideoSection(
  id: TradeLandingId | undefined
): TradeVideoSection | undefined {
  if (!id || !Object.hasOwn(TRADE_VIDEO_SECTIONS, id)) return undefined;
  return TRADE_VIDEO_SECTIONS[id as TradeWithVideos];
}

export function tradeVideoContentUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function tradeVideoEmbedUrl(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export function tradeVideosJsonLd(videos: readonly TradeVideo[]) {
  return {
    "@context": "https://schema.org",
    "@graph": videos.map(video => ({
      "@type": "VideoObject",
      name: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      uploadDate: video.uploadDate,
      duration: video.duration,
      contentUrl: tradeVideoContentUrl(video.id),
      embedUrl: tradeVideoEmbedUrl(video.id),
    })),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function insertInHead(html: string, snippet: string) {
  if (html.includes("</head>")) {
    return html.replace("</head>", `${snippet}\n</head>`);
  }
  if (html.includes("</title>")) {
    return html.replace("</title>", `</title>\n${snippet}`);
  }
  return `${html}\n${snippet}`;
}

const VIDEO_JSON_LD =
  /<script\s+type="application\/ld\+json"\s+data-trade-videos="true">[\s\S]*?<\/script>/i;

const VIDEO_CRAWL =
  /<section\b[^>]*\bdata-trade-videos="crawl"[^>]*>[\s\S]*?<\/section>/i;

/** Static thumbnails and watch links for the HTML response before JavaScript runs. */
export function tradeVideoCrawlHtml(section: TradeVideoSection) {
  const cards = section.videos
    .map(video => {
      const href = escapeHtml(tradeVideoContentUrl(video.id));
      const src = escapeHtml(video.thumbnailUrl);
      const title = escapeHtml(video.title);
      return `<a href="${href}" style="display:block;width:160px;flex:0 0 auto;color:inherit;text-decoration:none;"><img src="${src}" alt="" width="${video.thumbnailWidth}" height="${video.thumbnailHeight}" style="display:block;width:160px;height:284px;object-fit:cover;border-radius:12px;background:#111;" /><span style="display:block;margin-top:8px;font-size:13px;font-weight:600;line-height:1.3;">${title}</span></a>`;
    })
    .join("");
  return `<section data-trade-videos="crawl" aria-label="See it in action" style="font-family:Inter,ui-sans-serif,system-ui,sans-serif;padding:32px 16px;"><h2 style="margin:0;font-size:1.75rem;">See it in action</h2><p style="margin:12px 0 0;max-width:40rem;line-height:1.6;color:#52525b;">${escapeHtml(section.intro)}</p><div style="display:flex;gap:16px;overflow:auto;margin-top:20px;">${cards}</div></section>`;
}

export function injectTradeVideoMarkup(html: string, tradeId: TradeLandingId) {
  const section = tradeVideoSection(tradeId);
  const json = section
    ? JSON.stringify(tradeVideosJsonLd(section.videos)).replaceAll(
        "<",
        "\\u003c"
      )
    : "";
  const jsonLdTag = json
    ? `<script type="application/ld+json" data-trade-videos="true">${json}</script>`
    : "";
  const crawl = section ? tradeVideoCrawlHtml(section) : "";

  let next = html;
  if (next.search(VIDEO_JSON_LD) !== -1) {
    next = next.replace(VIDEO_JSON_LD, () => jsonLdTag);
  } else if (jsonLdTag) {
    next = insertInHead(next, jsonLdTag);
  }

  if (next.search(VIDEO_CRAWL) !== -1) {
    next = next.replace(VIDEO_CRAWL, () => crawl);
  } else if (crawl) {
    if (next.includes('<div id="root">')) {
      next = next.replace('<div id="root">', `<div id="root">\n${crawl}`);
    } else {
      next = `${next}\n${crawl}`;
    }
  }
  return next;
}
