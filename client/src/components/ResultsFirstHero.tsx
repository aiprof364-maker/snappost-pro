import { Check, Images } from "lucide-react";
import { useState } from "react";
import BeforeAfterCaptionProof from "@/components/BeforeAfterCaptionProof";
import { LANDING_MOCKUP } from "@/lib/landingMockup";
import { LOCAL_BUSINESS_PREVIEWS } from "@/lib/localBusinessPreviews";

const SHORT_LABELS = [
  "Trades",
  "Café",
  "Salon",
  "Florist",
  "Property",
  "Pet",
  "Fitness",
  "Restaurant",
] as const;

const BUSINESS_EXAMPLES = LOCAL_BUSINESS_PREVIEWS.map((preview, index) => ({
  ...preview,
  shortLabel: SHORT_LABELS[index],
  originalImageUrl:
    index === 0 ? LANDING_MOCKUP.originalPhotoUrl : preview.imageUrl,
  brandedImageUrl:
    index === 0 ? LANDING_MOCKUP.brandedPhotoUrl : preview.imageUrl,
  originalAlt:
    index === 0
      ? "Completed outdoor deck photo before branding"
      : `${preview.alt} before logo branding`,
  brandedAlt:
    index === 0
      ? "Completed outdoor deck photo with a contractor logo watermark"
      : `${preview.alt} with an example logo overlay`,
  caption: index === 0 ? LANDING_MOCKUP.heroCaption : preview.caption,
  showLogoOverlay: index === 0 ? false : preview.showLogoOverlay,
}));

type ResultsFirstHeroProps = {
  freeStartFeatures: readonly string[];
};

export default function ResultsFirstHero({
  freeStartFeatures,
}: ResultsFirstHeroProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = BUSINESS_EXAMPLES[selectedIndex];

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_13.5rem] lg:gap-5">
        <BeforeAfterCaptionProof
          originalImageUrl={selected.originalImageUrl}
          brandedImageUrl={selected.brandedImageUrl}
          originalAlt={selected.originalAlt}
          brandedAlt={selected.brandedAlt}
          caption={selected.caption}
          hashtags={selected.hashtags}
          showLogoOverlay={selected.showLogoOverlay}
        />

        <aside
          className="flex rounded-2xl border border-border bg-card p-3 shadow-sm lg:h-full lg:flex-col"
          aria-label="Choose a business photo example"
        >
          <div className="mb-3 flex items-start gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Images className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold">Choose an example</p>
              <p className="text-xs leading-5 text-muted-foreground">
                See its before and after.
              </p>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-4 gap-2 lg:grid-cols-2 lg:grid-rows-4">
            {BUSINESS_EXAMPLES.map((example, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={example.category}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Show ${example.category} before-and-after example`}
                  onClick={() => setSelectedIndex(index)}
                  className={`flex min-h-0 flex-col overflow-hidden rounded-lg border text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <img
                    src={example.originalImageUrl}
                    alt=""
                    className="min-h-0 w-full flex-1 object-cover"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                  <span
                    className={`flex items-center gap-1 px-1.5 py-1 text-xs font-bold ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    {example.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-left sm:p-6">
          <h2 className="text-lg font-bold">Your free start includes</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {freeStartFeatures.map(feature => (
              <li
                key={feature}
                className="flex items-start gap-3 text-sm leading-6"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
