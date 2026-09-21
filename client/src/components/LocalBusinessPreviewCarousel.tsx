import { useEffect, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Share2,
} from "lucide-react";
import { LOCAL_BUSINESS_PREVIEWS } from "@/lib/localBusinessPreviews";
import { Button } from "@/components/ui/button";

const AUTO_ADVANCE_MS = 6000;

export default function LocalBusinessPreviewCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activePreview = LOCAL_BUSINESS_PREVIEWS[activeIndex];

  useEffect(() => {
    if (isPaused) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex(current => (current + 1) % LOCAL_BUSINESS_PREVIEWS.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(intervalId);
  }, [isPaused]);

  const selectPreview = (index: number) => {
    setActiveIndex(index);
    setIsPaused(true);
  };

  const showPrevious = () => {
    selectPreview((activeIndex - 1 + LOCAL_BUSINESS_PREVIEWS.length) % LOCAL_BUSINESS_PREVIEWS.length);
  };

  const showNext = () => {
    selectPreview((activeIndex + 1) % LOCAL_BUSINESS_PREVIEWS.length);
  };

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Camera className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">New post preview</span>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            Example
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {activePreview.category}
          </p>
          <p className="text-xs text-muted-foreground">
            {activeIndex + 1} of {LOCAL_BUSINESS_PREVIEWS.length}
          </p>
        </div>

        <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border">
          {LOCAL_BUSINESS_PREVIEWS.map((preview, index) => (
            <img
              key={preview.category}
              src={preview.imageUrl}
              alt={preview.alt}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${
                index === activeIndex
                  ? "scale-100 opacity-100"
                  : "scale-[1.03] opacity-0"
              }`}
              loading={index === 0 ? "eager" : "lazy"}
              aria-hidden={index !== activeIndex}
            />
          ))}
          {activePreview.showLogoOverlay && (
            <div className="absolute bottom-3 right-3 rounded-lg border border-white/70 bg-white/90 px-2.5 py-1.5 text-[10px] font-extrabold tracking-[0.12em] text-slate-800 shadow-sm">
              YOUR LOGO
            </div>
          )}
        </div>

        <p className="mt-4 text-sm leading-6">
          {activePreview.caption}{" "}
          <span className="text-primary">{activePreview.hashtags}</span>
        </p>

        <Button className="mt-4 w-full gap-2" size="sm" type="button">
          <Share2 className="h-4 w-4" /> Post to Facebook
        </Button>

        <div className="mt-4 flex items-center justify-between gap-2" aria-label="Example post preview controls">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            type="button"
            onClick={showPrevious}
            aria-label="Show previous example"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-1 items-center justify-center gap-1.5">
            {LOCAL_BUSINESS_PREVIEWS.map((preview, index) => (
              <button
                key={preview.category}
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/50"
                }`}
                type="button"
                onClick={() => selectPreview(index)}
                aria-label={`Show ${preview.category} example`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
          </div>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => setIsPaused(current => !current)}
            aria-label={isPaused ? "Play carousel" : "Pause carousel"}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            type="button"
            onClick={showNext}
            aria-label="Show next example"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Example previews for local-business categories. Your business uses your own photo and logo.
      </p>
    </div>
  );
}
