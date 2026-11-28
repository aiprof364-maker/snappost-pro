import { Play } from "lucide-react";
import { useState } from "react";
import type { TradeLandingId } from "@shared/tradeLandingNav";
import {
  tradeVideoContentUrl,
  tradeVideoEmbedUrl,
  tradeVideoSection,
  type TradeVideo,
} from "@shared/tradeLandingVideos";

function videoLead(description: string) {
  const line = description
    .split("\n")
    .map(part => part.trim())
    .find(Boolean);
  return line ?? description;
}

function shelfClass(count: number) {
  if (count === 1) return "mx-auto mt-10 w-full max-w-[260px]";
  if (count === 3) {
    return "mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-3 md:overflow-visible md:pb-0";
  }
  return "mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4";
}

function cardClass(count: number) {
  if (count === 1) return "w-full";
  return "w-[68%] max-w-[240px] shrink-0 snap-start md:w-auto md:max-w-none md:shrink";
}

function TradeVideoCard({
  video,
  active,
  onPlay,
}: {
  video: TradeVideo;
  active: boolean;
  onPlay: () => void;
}) {
  const watchUrl = tradeVideoContentUrl(video.id);

  return (
    <figure className="flex h-full flex-col">
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-black shadow-lg shadow-primary/10">
        {active ? (
          <iframe
            className="absolute inset-0 h-full w-full border-0"
            src={`${tradeVideoEmbedUrl(video.id)}?autoplay=1`}
            title={video.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <a
            href={watchUrl}
            onClick={event => {
              event.preventDefault();
              onPlay();
            }}
            aria-label={`Play video: ${video.title}`}
            className="group absolute inset-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <img
              src={video.thumbnailUrl}
              alt=""
              width={video.thumbnailWidth}
              height={video.thumbnailHeight}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <span
              className="pointer-events-none absolute inset-0 bg-black/15"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg transition duration-200 group-hover:scale-105">
                <Play className="ml-1 h-7 w-7 fill-current" />
              </span>
            </span>
          </a>
        )}
      </div>
      <figcaption className="mt-3">
        <h3 className="text-sm font-semibold leading-5">
          <a
            href={watchUrl}
            onClick={event => {
              event.preventDefault();
              onPlay();
            }}
            className="hover:underline"
          >
            {video.title}
          </a>
        </h3>
        <p className="mt-1 line-clamp-3 text-sm leading-5 text-muted-foreground">
          {videoLead(video.description)}
        </p>
      </figcaption>
    </figure>
  );
}

export default function TradeVideoSection({
  tradeId,
}: {
  tradeId: TradeLandingId;
}) {
  const section = tradeVideoSection(tradeId);
  const [activeId, setActiveId] = useState<string | null>(null);

  if (!section) return null;

  const count = section.videos.length;

  return (
    <section
      id="see-it-in-action"
      aria-labelledby="see-it-in-action-heading"
      className="border-b border-border/60 py-16 md:py-20"
    >
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="see-it-in-action-heading"
            className="font-display text-3xl font-bold sm:text-4xl"
          >
            See it in action
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {section.intro}
          </p>
        </div>
        <ul className={shelfClass(count)}>
          {section.videos.map(video => (
            <li key={video.id} className={cardClass(count)}>
              <TradeVideoCard
                video={video}
                active={activeId === video.id}
                onPlay={() => setActiveId(video.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
