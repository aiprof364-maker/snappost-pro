import TradeLandingPage from "@/components/TradeLandingPage";
import petPreview from "@/assets/landing-carousel/pet-preview.webp";
import { petGroomersPage } from "@shared/tradeLandingPages";

const example = petGroomersPage.examples[0];

export default function PetGroomers() {
  return (
    <TradeLandingPage
      page={petGroomersPage}
      proof={{
        originalImageUrl: petPreview,
        brandedImageUrl: petPreview,
        originalAlt: "Freshly groomed dog as an example pet grooming photo",
        brandedAlt: "The same groomed dog photo with an example logo overlay",
        caption: example.caption,
        hashtags: example.hashtags,
        showLogoOverlay: true,
      }}
    />
  );
}
