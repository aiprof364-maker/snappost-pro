import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Facebook,
  ImagePlus,
  MessageSquareText,
  Send,
  Stamp,
} from "lucide-react";

type PostingStepsProps = {
  facebookConnected: boolean;
  facebookPageName?: string | null;
  hasLogo: boolean;
  photoReady: boolean;
  captionReady: boolean;
  published: boolean;
  publishedPostUrl?: string | null;
};

type Step = {
  id: string;
  number: number;
  title: string;
  detail: string;
  complete: boolean;
  icon: LucideIcon;
};

function scrollToStep(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PostingSteps({
  facebookConnected,
  facebookPageName,
  hasLogo,
  photoReady,
  captionReady,
  published,
  publishedPostUrl,
}: PostingStepsProps) {
  const steps: Step[] = [
    {
      id: "facebook-section",
      number: 1,
      title: "Connect Facebook",
      detail: facebookConnected
        ? `Connected to ${facebookPageName ?? "your Facebook Page"}`
        : "Connect the Page where you will post",
      complete: facebookConnected,
      icon: Facebook,
    },
    {
      id: "logo-section",
      number: 2,
      title: "Upload your logo",
      detail: hasLogo
        ? "Your logo will be added to new posts"
        : "Use your business logo as a watermark",
      complete: hasLogo,
      icon: Stamp,
    },
    {
      id: "upload-section",
      number: 3,
      title: "Upload a photo",
      detail: photoReady
        ? "Your photo has been branded"
        : "Choose a real finished-job or business photo",
      complete: photoReady,
      icon: ImagePlus,
    },
    {
      id: "caption-section",
      number: 4,
      title: "Review your AI caption",
      detail: captionReady
        ? "Caption ready to edit or save"
        : "We write a caption for your photo",
      complete: captionReady,
      icon: MessageSquareText,
    },
    {
      id: "publish-section",
      number: 5,
      title: "Publish to Facebook",
      detail: published
        ? "Your post is live on Facebook"
        : "Review it, then decide when to publish",
      complete: published,
      icon: Send,
    },
  ];

  const nextStep = steps.findIndex(step => !step.complete);

  return (
    <section
      aria-labelledby="posting-steps-title"
      className="mt-8 rounded-2xl border border-primary/15 bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Your posting flow
          </p>
          <h2
            id="posting-steps-title"
            className="mt-1 font-display text-2xl font-bold"
          >
            Create and publish your next Facebook post
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete each step once. Your Facebook Page and logo stay ready for
            every post after that.
          </p>
        </div>
        <p className="text-sm font-semibold text-primary">
          {steps.filter(step => step.complete).length} of {steps.length}{" "}
          complete
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isNext = index === nextStep;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (step.number === 5 && step.complete && publishedPostUrl) {
                  window.open(
                    publishedPostUrl,
                    "_blank",
                    "noopener,noreferrer"
                  );
                  return;
                }
                scrollToStep(step.id);
              }}
              className={`group min-h-44 rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                step.complete
                  ? "border-emerald-200 bg-emerald-50/70 hover:border-emerald-300"
                  : isNext
                    ? "border-primary bg-primary/[0.04] shadow-sm hover:bg-primary/[0.07]"
                    : "border-border bg-background hover:border-primary/35"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    step.complete
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                {step.complete ? (
                  <CheckCircle2
                    className="h-6 w-6 shrink-0 text-emerald-600"
                    aria-label="Complete"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-bold text-muted-foreground">
                    {step.number}
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-base font-bold">
                {step.title}
              </h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {step.detail}
              </p>
              {step.complete && step.number === 5 && publishedPostUrl && (
                <span className="mt-3 inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-4">
                  View post ↗
                </span>
              )}
              {!step.complete && isNext && (
                <span className="mt-3 inline-flex text-sm font-semibold text-primary">
                  Do this next →
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
