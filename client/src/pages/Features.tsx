import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SiteFeatures from "@/components/SiteFeatures";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Features() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container py-6 text-center">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
            SnapPost Pro features
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Create your post preview before email. Add a logo only if you have
            one. Connect one Facebook Page when you are ready to publish.
          </p>
        </div>
        <SiteFeatures />
        <div className="container py-6 text-center">
          <Link href="/preview">
            <Button size="lg">Create free preview</Button>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            3 free posts total · No card required · Logo optional
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
