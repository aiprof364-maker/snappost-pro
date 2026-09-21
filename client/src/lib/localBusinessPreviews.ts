import cafePreview from "@/assets/landing-carousel/cafe-preview.webp";
import salonPreview from "@/assets/landing-carousel/salon-preview.webp";
import floristPreview from "@/assets/landing-carousel/florist-preview.webp";
import propertyPreview from "@/assets/landing-carousel/property-preview.webp";
import petPreview from "@/assets/landing-carousel/pet-preview.webp";
import tradesPreview from "@/assets/landing-carousel/trades-preview.jpg";

export const LOCAL_BUSINESS_PREVIEWS = [
  {
    category: "Trades & Home Services",
    imageUrl: tradesPreview,
    alt: "Completed A-frame deck as an example trades and home services post",
    caption: "A finished outdoor space, ready to enjoy. Quality work, ready to share.",
    hashtags: "#DeckBuild #OutdoorLiving #QualityWork",
    showLogoOverlay: false,
  },
  {
    category: "Food & Hospitality",
    imageUrl: cafePreview,
    alt: "Coffee and pastry as an example food and hospitality post",
    caption: "Freshly made coffee and pastries, ready for the morning rush.",
    hashtags: "#CafeLife #LocalBusiness #FreshDaily",
    showLogoOverlay: true,
  },
  {
    category: "Beauty, Wellness & Fitness",
    imageUrl: salonPreview,
    alt: "Salon interior as an example beauty and wellness post",
    caption: "A calm, polished space for your next appointment.",
    hashtags: "#SalonLife #LocalBusiness #BeautyBusiness",
    showLogoOverlay: true,
  },
  {
    category: "Retail & Creative Businesses",
    imageUrl: floristPreview,
    alt: "Seasonal bouquet as an example retail and creative business post",
    caption: "Fresh seasonal blooms, wrapped and ready.",
    hashtags: "#LocalFlorist #FreshFlowers #SmallBusiness",
    showLogoOverlay: true,
  },
  {
    category: "Property, Events & Local Services",
    imageUrl: propertyPreview,
    alt: "Staged living room as an example property and local services post",
    caption: "A welcoming space, styled and ready to show.",
    hashtags: "#HomeStaging #PropertyStyling #LocalBusiness",
    showLogoOverlay: true,
  },
  {
    category: "Pet, Care & Professional Services",
    imageUrl: petPreview,
    alt: "Freshly groomed dog as an example pet services post",
    caption: "Freshly groomed and feeling good.",
    hashtags: "#DogGrooming #PetCare #LocalBusiness",
    showLogoOverlay: true,
  },
] as const;
