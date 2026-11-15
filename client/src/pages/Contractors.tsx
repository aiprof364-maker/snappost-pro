import TradeLandingPage from "@/components/TradeLandingPage";
import { LANDING_MOCKUP } from "@/lib/landingMockup";
import { LANDING_PROMOS } from "@/lib/landingPromos";
import { contractorsPage } from "@shared/tradeLandingPages";

export default function Contractors() {
  return (
    <TradeLandingPage
      page={contractorsPage}
      promo={LANDING_PROMOS.contractors}
      proof={{
        originalImageUrl: LANDING_MOCKUP.originalPhotoUrl,
        brandedImageUrl: LANDING_MOCKUP.brandedPhotoUrl,
        originalAlt: "Completed outdoor deck photo before branding",
        brandedAlt:
          "The same completed deck photo with a contractor logo watermark",
        caption: LANDING_MOCKUP.heroCaption,
        hashtags: "#DeckBuild #OutdoorLiving #QualityWork",
      }}
    />
  );
}
