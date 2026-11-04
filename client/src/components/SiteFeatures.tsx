import { Check } from "lucide-react";

const FEATURES = [
  {
    title: "Snap & upload",
    desc: "Upload a photo of your completed work, product, space or result from your phone or desktop.",
  },
  {
    title: "SnapPost Pro captions",
    desc: "Get a ready-to-post caption with hashtags written for you.",
  },
  {
    title: "Optional logo branding",
    desc: "Add your logo when you have one, or create your post without it.",
  },
  {
    title: "Post to Facebook",
    desc: "Connect one Facebook Page when your post is ready, then manually publish it.",
  },
  {
    title: "Save hours every week",
    desc: "Spend less time writing captions and preparing images for social media.",
  },
  {
    title: "Built for local businesses",
    desc: "Made for businesses with real work, products, spaces or results worth showing.",
  },
];

export default function SiteFeatures() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-t border-border/60 bg-muted/20 py-3"
    >
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Everything you need to post like a pro
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built so you spend time on the tools, not on social media.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
          <h3 className="text-lg font-bold">Everything you need includes</h3>
          <ul className="mt-4 space-y-4">
            {FEATURES.map(feature => (
              <li key={feature.title} className="flex items-start gap-3">
                <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">{feature.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {feature.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
