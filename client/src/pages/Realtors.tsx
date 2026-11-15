import TradeLandingPage from "@/components/TradeLandingPage";
import propertyPreview from "@/assets/landing-carousel/property-preview.webp";
import { realtorsPage } from "@shared/tradeLandingPages";

const example = realtorsPage.examples[0];

export default function Realtors() {
  return (
    <TradeLandingPage
      page={realtorsPage}
      proof={{
        originalImageUrl: propertyPreview,
        brandedImageUrl: propertyPreview,
        originalAlt: "Staged living room as an example listing photo",
        brandedAlt: "The same room photo with an example logo overlay",
        caption: example.caption,
        hashtags: example.hashtags,
        showLogoOverlay: true,
      }}
    />
  );
}
