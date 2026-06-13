import { useAuth } from "@/_core/hooks/useAuth";
import FacebookConnect from "@/components/FacebookConnect";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import UploadCard from "@/components/UploadCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { PLANS } from "@shared/const";
import {
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Loader2,
  Stamp,
  XCircle,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Dashboard() {
  const { isAuthenticated, loading, user } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const utils = trpc.useUtils();
  const overview = trpc.account.overview.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const posts = trpc.posts.list.useQuery(undefined, { enabled: isAuthenticated });
  const logoRef = useRef<HTMLInputElement>(null);

  const uploadLogo = trpc.account.uploadLogo.useMutation({
    onSuccess: () => {
      toast.success("Logo saved. New posts will be branded with it.");
      utils.account.overview.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const portal = trpc.billing.portal.useMutation({
    onSuccess: d => d.url && (window.location.href = d.url),
    onError: e => toast.error(e.message),
  });

  // Handle facebook callback query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fb = params.get("facebook");
    const checkout = params.get("checkout");
    if (fb === "connected") toast.success("Facebook connected.");
    else if (fb === "denied") toast.error("Facebook connection was cancelled.");
    else if (fb === "error") toast.error("Facebook connection failed.");
    else if (fb === "session") toast.error("Please log in again to connect Facebook.");
    if (checkout === "success") {
      toast.success("Subscription active. Welcome aboard!");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
    if (fb || checkout) {
      window.history.replaceState({}, "", window.location.pathname);
      utils.account.overview.invalidate();
    }
  }, [utils]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const plan = overview.data?.plan ?? "free";
  const planLabel =
    plan === "free" ? "Free" : PLANS[plan as "starter" | "pro"]?.name ?? plan;
  const facebookConnected = overview.data?.facebook?.status === "connected";
  const usage = overview.data?.usage;
  const subStatus = overview.data?.subscriptionStatus ?? "none";
  const usageLabel =
    usage == null
      ? null
      : usage.limit === null
        ? `${usage.used} posts this month · Unlimited`
        : `${usage.used} / ${usage.limit} posts this month`;
  const atLimit =
    usage != null && usage.limit !== null && usage.used >= usage.limit;

  const handleLogo = async (file?: File) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    uploadLogo.mutate({ image: dataUrl });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-muted/20">
        <div className="container py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold">
                Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>
              <p className="mt-1 text-muted-foreground">
                Create branded posts and manage your account.
              </p>
              <a href="/analytics" className="mt-2 inline-flex text-sm text-primary hover:underline">
                View analytics →
              </a>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={plan === "free" ? "secondary" : "default"}>
                  {planLabel} plan
                </Badge>
                {plan !== "free" && subStatus !== "none" && (
                  <Badge
                    variant={
                      subStatus === "active" || subStatus === "trialing"
                        ? "default"
                        : "destructive"
                    }
                    className="capitalize"
                  >
                    {subStatus.replace("_", " ")}
                  </Badge>
                )}
              </div>
              {plan === "free" ? (
                <a href="/pricing">
                  <Button size="sm">Upgrade</Button>
                </a>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => portal.mutate({ origin: window.location.origin })}
                    disabled={portal.isPending}
                  >
                    {portal.isPending ? "Opening..." : "Manage subscription"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Cancel, refund, or update payment
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {usageLabel && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{usageLabel}</span>
                    {plan !== "free" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Resets on the 1st of each month
                      </p>
                    )}
                  </div>
                  {atLimit && (
                    <a href="/pricing">
                      <Button size="sm" variant="outline">
                        Upgrade for more
                      </Button>
                    </a>
                  )}
                </div>
              )}
              <UploadCard
                facebookConnected={facebookConnected}
                atLimit={atLimit}
              />
            </div>

            <div className="space-y-6">
              {/* Logo */}
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Stamp className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-lg font-bold">Your logo</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {overview.data?.hasLogo
                    ? "Logo set. It's added to every new post."
                    : "Upload your logo to brand every post automatically."}
                </p>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={e => handleLogo(e.target.files?.[0])}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => logoRef.current?.click()}
                  disabled={uploadLogo.isPending}
                >
                  {uploadLogo.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : overview.data?.hasLogo ? (
                    "Replace logo"
                  ) : (
                    "Upload logo"
                  )}
                </Button>
              </div>

              <FacebookConnect />
            </div>
          </div>

          {/* Post history */}
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold">Post history</h2>
            {posts.isLoading ? (
              <Loader2 className="mt-4 h-5 w-5 animate-spin text-muted-foreground" />
            ) : (posts.data ?? []).length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <p className="mt-2 text-sm">
                  No posts yet. Upload your first job photo above.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(posts.data ?? []).map(p => (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    {p.brandedImageUrl || p.originalImageUrl ? (
                      <img
                        src={p.brandedImageUrl ?? p.originalImageUrl ?? ""}
                        alt="Post"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <StatusBadge status={p.status} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {p.caption || "No caption"}
                      </p>
                      {p.status === "published" && p.facebookPostId && (
                        <a
                          href={`https://www.facebook.com/${p.facebookPostId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View on Facebook <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "published")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" /> Published
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
        <XCircle className="h-3.5 w-3.5" /> Failed
      </span>
    );
  return (
    <Badge variant="secondary" className="text-xs">
      Draft
    </Badge>
  );
}
