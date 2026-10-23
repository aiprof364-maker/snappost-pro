import { Check, Images } from "lucide-react";
import { useState } from "react";
import BeforeAfterCaptionProof from "@/components/BeforeAfterCaptionProof";
import { LANDING_MOCKUP } from "@/lib/landingMockup";
import { LOCAL_BUSINESS_PREVIEWS } from "@/lib/localBusinessPreviews";

const BUSINESS_EXAMPLES = LOCAL_BUSINESS_PREVIEWS.map((preview, index) => ({
  ...preview,
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

export default function ResultsFirstHero() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = BUSINESS_EXAMPLES[selectedIndex];

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Images className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold">Choose a business example</p>
            <p className="text-xs text-muted-foreground">
              See the same photo before and after SnapPost Pro.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {selected.category}
        </span>
      </div>

      <div
        className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3"
        aria-label="Choose a business photo example"
      >
        {BUSINESS_EXAMPLES.map((example, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={example.category}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedIndex(index)}
              className={`relative overflow-hidden rounded-xl border text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <img
                src={example.originalImageUrl}
                alt=""
                className="aspect-[16/9] w-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
              />
              <span
                className={`flex min-h-10 items-center gap-1.5 px-2 py-1.5 text-xs font-bold leading-4 ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground"
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                {example.category}
              </span>
            </button>
          );
        })}
      </div>

      <BeforeAfterCaptionProof
        originalImageUrl={selected.originalImageUrl}
        brandedImageUrl={selected.brandedImageUrl}
        originalAlt={selected.originalAlt}
        brandedAlt={selected.brandedAlt}
        caption={selected.caption}
        hashtags={selected.hashtags}
        showLogoOverlay={selected.showLogoOverlay}
      />
    </section>
  );
}
