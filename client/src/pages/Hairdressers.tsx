import TradeLandingPage from "@/components/TradeLandingPage";
import { LANDING_PROMOS } from "@/lib/landingPromos";
import salonPreview from "@/assets/landing-carousel/salon-preview.webp";
import { hairdressersPage } from "@shared/tradeLandingPages";

const example = hairdressersPage.examples[0];

export default function Hairdressers() {
  return (
    <TradeLandingPage
      page={hairdressersPage}
      promo={LANDING_PROMOS.hairdressers}
      proof={{
        originalImageUrl: salonPreview,
        brandedImageUrl: salonPreview,
        originalAlt: "Example salon interior photo before branding",
        brandedAlt:
          "The same salon interior photo with an example logo overlay",
        caption: example.caption,
        hashtags: example.hashtags,
        showLogoOverlay: true,
      }}
    />
  );
}
