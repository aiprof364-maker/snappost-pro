import { useAuth } from "@/_core/hooks/useAuth";
import FacebookConnect from "@/components/FacebookConnect";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import UploadCard from "@/components/UploadCard";
import { SuccessDashboard } from "@/components/SuccessDashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { isDashboardDataLoading } from "@/lib/dashboardDataState";
import { trackMetaEvent } from "@/lib/metaPixel";
import { PLANS } from "@shared/const";
import { getUploadLimitNotice } from "@shared/uploadLimit";
import {
  CheckCircle2,
  ExternalLink,
  Facebook,
  ImageIcon,
  LockKeyhole,
  Loader2,
  Share2,
  Stamp,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const posts = trpc.posts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const logoRef = useRef<HTMLInputElement>(null);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [selectedCaption, setSelectedCaption] = useState("");

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

  const resendVerificationEmail = trpc.auth.resendVerificationEmail.useMutation(
    {
      onSuccess: () => {
        toast.success("Verification email sent. Check your inbox.");
      },
      onError: e => {
        toast.error(e.message);
      },
    }
  );

  const updateSavedCaption = trpc.posts.updateCaption.useMutation({
    onSuccess: () => {
      toast.success("Caption saved.");
      utils.posts.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const completeFirstPostPublished =
    trpc.onboarding.completeFirstPostPublished.useMutation();
  const publishSavedDraft = trpc.posts.publish.useMutation({
    onSuccess: result => {
      toast.success(`Posted successfully to ${result.pageName}!`);
      completeFirstPostPublished.mutate();
      utils.posts.list.invalidate();
      setSelectedPostId(null);
    },
    onError: e => toast.error(e.message),
  });

  // Handle facebook callback query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fb = params.get("facebook");
    const checkout = params.get("checkout");
    const accountCreated = params.get("account_created");
    const landing = params.get("landing");
    if (fb === "connected") toast.success("Facebook connected.");
    else if (fb === "denied") toast.error("Facebook connection was cancelled.");
    else if (fb === "error") toast.error("Facebook connection failed.");
    else if (fb === "session")
      toast.error("Please log in again to connect Facebook.");
    if (checkout === "success") {
      toast.success("Subscription active. Welcome aboard!");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
    if (accountCreated === "1") {
      trackMetaEvent(
        "CompleteRegistration",
        landing ? { landing_page: landing } : undefined
      );
      toast.success("Your free account is ready.");
    }
    if (fb || checkout || accountCreated) {
      window.history.replaceState({}, "", window.location.pathname);
      utils.account.overview.invalidate();
    }
  }, [utils]);

  if (
    isDashboardDataLoading({
      authLoading: loading,
      isAuthenticated,
      overviewLoading: overview.isLoading,
    })
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const plan = overview.data?.plan ?? "free";
  const planLabel =
    plan === "free" ? "Free" : (PLANS[plan as "starter" | "pro"]?.name ?? plan);
  const facebookConnected = overview.data?.facebook?.status === "connected";
  const hasLogo = Boolean(overview.data?.hasLogo);
  const selectedPost = posts.data?.find(post => post.id === selectedPostId);
  const usage = overview.data?.usage;
  const subStatus = overview.data?.subscriptionStatus ?? "none";
  const emailVerified = user?.emailVerified ?? false;
  const usageLabel =
    usage == null
      ? null
      : usage.limit === null
        ? `${usage.used} posts this month · Unlimited`
        : plan === "free"
          ? `${usage.used} / ${usage.limit} free posts used`
          : `${usage.used} / ${usage.limit} posts this month`;
  const atLimit =
    usage != null && usage.limit !== null && usage.used >= usage.limit;
  const uploadLimitNotice = getUploadLimitNotice(plan, usage);

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
              <a
                href="/analytics"
                className="mt-2 inline-flex text-sm text-primary hover:underline"
              >
                View analytics →
              </a>
            </div>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
              {!emailVerified && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-yellow-900">
                        Verify your email
                      </p>
                      <p className="mt-1 text-sm text-yellow-800">
                        Check your inbox for a verification link. You need to
                        verify before posting to Facebook.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resendVerificationEmail.mutate()}
                      disabled={resendVerificationEmail.isPending}
                      className="ml-2 shrink-0"
                    >
                      {resendVerificationEmail.isPending
                        ? "Sending..."
                        : "Resend"}
                    </Button>
                  </div>
                </div>
              )}
              {plan === "free" ? (
                <a href="/pricing">
                  <Button size="sm">Upgrade</Button>
                </a>
              ) : (
                <div className="flex flex-col items-end gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      portal.mutate({ origin: window.location.origin })
                    }
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

          {usageLabel && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <div>
                <span className="font-medium">{usageLabel}</span>
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

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <section
              id="facebook-section"
              className={`scroll-mt-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 ${
                facebookConnected ? "border-emerald-200" : "border-border"
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${facebookConnected ? "bg-emerald-100 text-emerald-700" : "bg-[#1877F2]/10 text-[#1877F2]"}`}
                >
                  <Facebook className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                        Step 1
                      </p>
                      <h2 className="mt-1 font-display text-xl font-bold">
                        Connect your Facebook Page
                      </h2>
                    </div>
                    {facebookConnected && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4" /> Connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {facebookConnected
                      ? `Posting to ${overview.data?.facebook?.pageName ?? "your Facebook Page"}.`
                      : "Choose the one business Page where you want to publish posts."}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <FacebookConnect compact />
              </div>
            </section>

            <section
              id="logo-section"
              className={`scroll-mt-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 ${
                hasLogo ? "border-emerald-200" : "border-border"
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${hasLogo ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}`}
                >
                  <Stamp className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                        Step 2
                      </p>
                      <h2 className="mt-1 font-display text-xl font-bold">
                        Upload your logo
                      </h2>
                    </div>
                    {hasLogo && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4" /> Ready
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasLogo
                      ? "Your logo is ready to be added as a watermark to every new post."
                      : "Upload your business logo once. SnapPost Pro adds it as a watermark to every new post."}
                  </p>
                  {hasLogo && overview.data?.logoUrl && (
                    <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-2 pr-3">
                      <img
                        src={overview.data.logoUrl}
                        alt="Saved business logo"
                        className="h-11 w-11 rounded-lg object-contain bg-white p-1 ring-1 ring-emerald-100"
                      />
                      <span className="text-sm font-semibold text-emerald-800">
                        Logo saved
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={e => handleLogo(e.target.files?.[0])}
              />
              {!facebookConnected ? (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    Complete Step 1 first to connect the Facebook Page you will
                    post to.
                  </p>
                </div>
              ) : (
                <Button
                  variant={hasLogo ? "outline" : "default"}
                  className="mt-5"
                  onClick={() => logoRef.current?.click()}
                  disabled={uploadLogo.isPending}
                >
                  {uploadLogo.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading
                      logo…
                    </>
                  ) : hasLogo ? (
                    "Replace logo"
                  ) : (
                    "Upload logo"
                  )}
                </Button>
              )}
            </section>
          </div>

          <div className="mt-5">
            <UploadCard
              facebookConnected={facebookConnected}
              hasLogo={hasLogo}
              emailVerified={emailVerified}
              atLimit={atLimit}
              limitNotice={uploadLimitNotice}
            />
          </div>

          {/* Post history */}
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold">Post history</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a draft to review, edit its caption, or publish it.
            </p>
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
                    role={p.status === "draft" ? "button" : undefined}
                    tabIndex={p.status === "draft" ? 0 : undefined}
                    onClick={() => {
                      if (p.status === "draft") {
                        setSelectedPostId(p.id);
                        setSelectedCaption(p.caption ?? "");
                      }
                    }}
                    onKeyDown={event => {
                      if (
                        p.status === "draft" &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        setSelectedPostId(p.id);
                        setSelectedCaption(p.caption ?? "");
                      }
                    }}
                    className={`overflow-hidden rounded-xl border border-border bg-card ${
                      p.status === "draft"
                        ? "cursor-pointer transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        : ""
                    }`}
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
                      {p.status === "draft" && (
                        <p className="mt-3 text-xs font-medium text-primary">
                          Review draft →
                        </p>
                      )}
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

          {user?.plan !== "free" && (
            <section className="mt-12 border-t border-border pt-10">
              <h2 className="font-display text-xl font-bold">
                Account overview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your plan and posting activity.
              </p>
              <div className="mt-5">
                <SuccessDashboard />
              </div>
            </section>
          )}

          <Dialog
            open={Boolean(selectedPost)}
            onOpenChange={open => {
              if (!open) setSelectedPostId(null);
            }}
          >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              {selectedPost && (
                <>
                  <DialogHeader>
                    <DialogTitle>Review draft post</DialogTitle>
                    <DialogDescription>
                      Edit the caption, then publish this saved draft when you
                      are ready.
                    </DialogDescription>
                  </DialogHeader>
                  <img
                    src={
                      selectedPost.brandedImageUrl ??
                      selectedPost.originalImageUrl ??
                      ""
                    }
                    alt="Saved draft post"
                    className="max-h-80 w-full rounded-lg object-contain ring-1 ring-border"
                  />
                  <div>
                    <label
                      htmlFor="saved-draft-caption"
                      className="text-sm font-medium"
                    >
                      Caption
                    </label>
                    <Textarea
                      id="saved-draft-caption"
                      value={selectedCaption}
                      onChange={event => setSelectedCaption(event.target.value)}
                      rows={6}
                      className="mt-2"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateSavedCaption.mutate({
                          id: selectedPost.id,
                          caption: selectedCaption,
                        })
                      }
                      disabled={updateSavedCaption.isPending}
                    >
                      {updateSavedCaption.isPending
                        ? "Saving..."
                        : "Save caption"}
                    </Button>
                    <Button
                      className="gap-1.5"
                      disabled={
                        !facebookConnected || publishSavedDraft.isPending
                      }
                      onClick={() =>
                        publishSavedDraft.mutate({ id: selectedPost.id })
                      }
                    >
                      {publishSavedDraft.isPending ? (
                        "Posting..."
                      ) : (
                        <>
                          <Share2 className="h-4 w-4" /> Post to Facebook
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                  {!facebookConnected && (
                    <p className="text-sm text-muted-foreground">
                      Connect a Facebook Page before publishing this draft.
                    </p>
                  )}
                </>
              )}
            </DialogContent>
          </Dialog>
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
