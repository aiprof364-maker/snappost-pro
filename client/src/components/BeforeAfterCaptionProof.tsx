import { ImagePlus, Sparkles } from "lucide-react";

type BeforeAfterCaptionProofProps = {
  originalImageUrl: string;
  brandedImageUrl: string;
  originalAlt: string;
  brandedAlt: string;
  caption: string;
  hashtags: string;
  showLogoOverlay?: boolean;
};

export default function BeforeAfterCaptionProof({
  originalImageUrl,
  brandedImageUrl,
  originalAlt,
  brandedAlt,
  caption,
  hashtags,
  showLogoOverlay = false,
}: BeforeAfterCaptionProofProps) {
  return (
    <figure className="overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-xl shadow-primary/10 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border bg-muted/20">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted-foreground/15 text-xs font-extrabold text-foreground">
              1
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Original photo
            </p>
          </div>
          <img
            src={originalImageUrl}
            alt={originalAlt}
            className="aspect-[4/3] w-full object-cover"
          />
          <p className="px-3 py-3 text-sm font-medium text-muted-foreground">
            Your real work. No logo or caption yet.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-primary/25 bg-primary/5">
          <div className="flex items-center gap-2 border-b border-primary/15 bg-primary/10 px-3 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
              2
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              SnapPost Pro post
            </p>
          </div>
          <div className="relative">
            <img
              src={brandedImageUrl}
              alt={brandedAlt}
              className="aspect-[4/3] w-full object-cover"
            />
            {showLogoOverlay && (
              <span className="absolute bottom-3 right-3 rounded-lg border border-white/70 bg-white/90 px-2.5 py-1.5 text-[10px] font-extrabold tracking-[0.12em] text-slate-800 shadow-sm">
                YOUR LOGO
              </span>
            )}
          </div>
          <div className="m-3 rounded-xl border border-primary/15 bg-background p-3.5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Example SnapPost Pro-written caption
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">{caption}</p>
            <p className="mt-2 text-xs font-semibold text-primary">{hashtags}</p>
          </div>
        </section>
      </div>
      <figcaption className="flex items-center gap-2 px-1 pt-3 text-xs leading-5 text-muted-foreground">
        <ImagePlus className="h-4 w-4 shrink-0 text-primary" />
        You review and can edit your caption before you choose whether to publish.
      </figcaption>
    </figure>
  );
}
