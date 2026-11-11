import { cn } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type LandingPromoVideoProps = {
  src: string;
  poster: string;
  captions: string;
  label: string;
  className?: string;
};

export default function LandingPromoVideo({
  src,
  poster,
  captions,
  label,
  className,
}: LandingPromoVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const onVolumeChange = () => setMuted(video.muted);
    video.addEventListener("volumechange", onVolumeChange);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      video.autoplay = false;
      video.loop = false;
      video.pause();
      return () => video.removeEventListener("volumechange", onVolumeChange);
    }

    const attempt = video.play();
    if (attempt) {
      attempt.catch(() => {
        // Autoplay can be blocked. The poster and controls stay available.
      });
    }

    return () => video.removeEventListener("volumechange", onVolumeChange);
  }, []);

  const toggleMuted = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (!video.muted && video.paused) {
      video.play().catch(() => {});
    }
  };

  return (
    <figure
      className={cn(
        "w-[46%] max-w-[270px] shrink-0 sm:w-[220px] lg:w-[250px]",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/10">
        <video
          ref={videoRef}
          className="aspect-[9/16] w-full bg-black object-cover"
          width={720}
          height={1280}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
          aria-label={label}
        >
          <source src={src} type="video/mp4" />
          <track kind="captions" srcLang="en" label="English" src={captions} />
        </video>
        <button
          type="button"
          onClick={toggleMuted}
          aria-pressed={!muted}
          className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-black"
        >
          {muted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
