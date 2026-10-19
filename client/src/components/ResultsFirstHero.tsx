import { ArrowRight, Check, ImagePlus, Stamp } from "lucide-react";
import { LANDING_MOCKUP } from "@/lib/landingMockup";

export default function ResultsFirstHero() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-3xl border border-primary/20 bg-card p-4 shadow-2xl shadow-primary/10 sm:p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-primary">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </span>
              <span>Your real photo</span>
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-primary/25 bg-muted">
              <img
                src={LANDING_MOCKUP.originalPhotoUrl}
                alt="Original completed outdoor space photo before logo branding"
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </div>

          <ArrowRight
            className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6"
            aria-hidden="true"
          />

          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-primary">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </span>
              <span>Logo added</span>
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-primary/25 bg-muted">
              <img
                src={LANDING_MOCKUP.brandedPhotoUrl}
                alt="The same completed outdoor space photo with logo branding"
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              3
            </span>
            <span>Caption ready to review</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground sm:text-base">
            “{LANDING_MOCKUP.heroCaption}”
          </p>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            Review or edit the caption before you decide to publish.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-muted-foreground sm:gap-3 sm:text-sm">
        <span className="flex items-center justify-center gap-1.5 rounded-lg bg-muted/70 px-2 py-2">
          <ImagePlus className="h-3.5 w-3.5 text-primary" /> Your photo
        </span>
        <span className="flex items-center justify-center gap-1.5 rounded-lg bg-muted/70 px-2 py-2">
          <Stamp className="h-3.5 w-3.5 text-primary" /> Your logo
        </span>
        <span className="flex items-center justify-center gap-1.5 rounded-lg bg-muted/70 px-2 py-2">
          <Check className="h-3.5 w-3.5 text-primary" /> Your review
        </span>
      </div>
    </div>
  );
}
