import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { refreshPostCreationQueries } from "@/lib/postQueryInvalidation";
import { getFacebookPostUrl } from "@shared/facebookPost";
import type { UploadLimitNotice } from "@shared/uploadLimit";
import {
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  Send,
  Share2,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type Props = {
  facebookConnected: boolean;
  hasLogo: boolean;
  emailVerified: boolean;
  atLimit?: boolean;
  limitNotice?: UploadLimitNotice | null;
  onCreated?: () => void;
};

type StepCardProps = {
  id: string;
  number: number;
  title: string;
  description: string;
  complete?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
};

function StepCard({
  id,
  number,
  title,
  description,
  complete = false,
  icon,
  children,
}: StepCardProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-6 rounded-2xl border bg-card p-5 shadow-sm transition-all sm:p-6 ${
        complete ? "border-emerald-200" : "border-border"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            complete
              ? "bg-emerald-100 text-emerald-700"
              : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Step {number}
              </p>
              <h3 className="mt-1 font-display text-xl font-bold">{title}</h3>
            </div>
            {complete && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> Complete
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function LockedStep({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

export default function UploadCard({
  facebookConnected,
  hasLogo,
  emailVerified,
  atLimit = false,
  limitNotice = null,
  onCreated,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [trade, setTrade] = useState("");
  const [tone, setTone] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [brandedUrl, setBrandedUrl] = useState<string | null>(null);
  const [publishedPost, setPublishedPost] = useState<{
    facebookPostId: string;
    facebookPostUrl: string;
    pageName: string;
  } | null>(null);

  const utils = trpc.useUtils();

  const completeFirstPost = trpc.onboarding.completeFirstPost.useMutation();
  const completeFirstPostPublished =
    trpc.onboarding.completeFirstPostPublished.useMutation();

  const createPost = trpc.posts.create.useMutation({
    onSuccess: post => {
      if (!post) return;
      setCreatedId(post.id);
      setCaption(post.caption ?? "");
      setBrandedUrl(post.brandedImageUrl ?? null);
      completeFirstPost.mutate();
      refreshPostCreationQueries({
        invalidatePosts: () => utils.posts.list.invalidate(),
        invalidateAccountOverview: () => utils.account.overview.invalidate(),
      });
      onCreated?.();
      toast.success("Photo branded and SnapPost Pro caption written.");
      window.setTimeout(() => {
        document
          .getElementById("caption-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    },
    onError: e => toast.error(e.message),
  });

  const updateCaption = trpc.posts.updateCaption.useMutation({
    onSuccess: () => toast.success("Caption saved."),
    onError: e => toast.error(e.message),
  });

  const publish = trpc.posts.publish.useMutation({
    onSuccess: result => {
      setPublishedPost({
        facebookPostId: result.facebookPostId,
        facebookPostUrl: result.facebookPostUrl,
        pageName: result.pageName,
      });
      toast.success(`Posted successfully to ${result.pageName}!`);
      completeFirstPostPublished.mutate();
      utils.posts.list.invalidate();
      window.setTimeout(() => {
        document
          .getElementById("publish-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    },
    onError: e => {
      if (e.message.includes("Facebook")) {
        toast.error("Connect your Facebook Page to publish posts.");
      } else {
        toast.error(e.message);
      }
    },
  });

  const photoReady = Boolean(createdId && brandedUrl);
  const captionReady = Boolean(createdId);
  const canUpload = facebookConnected && hasLogo && !atLimit;

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (atLimit) {
      toast.error("You've reached your post limit. Upgrade to continue.");
      return;
    }
    if (!facebookConnected || !hasLogo) {
      toast.error(
        "Complete Facebook connection and logo setup before creating a post."
      );
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setCreatedId(null);
    setBrandedUrl(null);
    setCaption("");
    setPublishedPost(null);
    createPost.mutate({
      image: dataUrl,
      trade: trade || undefined,
      tone: tone || undefined,
    });
  };

  const uploadLockMessage = !facebookConnected
    ? "Complete Step 1 first: connect the Facebook Page where you want to publish."
    : !hasLogo
      ? "Complete Step 2 first: upload your business logo so every new post is branded."
      : null;

  return (
    <div className="space-y-5">
      <StepCard
        id="upload-section"
        number={3}
        title="Upload a photo"
        description="Choose a real finished-job or business photo. We add your logo and create a new draft."
        complete={photoReady}
        icon={<ImagePlus className="h-6 w-6" aria-hidden="true" />}
      >
        {atLimit && limitNotice ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
          >
            <p className="text-sm font-semibold">{limitNotice.message}</p>
            {limitNotice.action && (
              <a
                href={limitNotice.action.href}
                className="mt-2 inline-flex text-sm font-semibold underline underline-offset-4 hover:text-amber-800"
              >
                {limitNotice.action.label} →
              </a>
            )}
          </div>
        ) : uploadLockMessage ? (
          <LockedStep message={uploadLockMessage} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="trade">
                  Your trade or business type{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="trade"
                  placeholder="e.g. Builder, salon, plumber"
                  value={trade}
                  onChange={e => setTrade(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="tone">
                  Caption tone{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="tone"
                  placeholder="e.g. Friendly, professional, proud"
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleFile(e.target.files?.[0])}
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.025] py-10 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/[0.05] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
              disabled={createPost.isPending || !canUpload}
            >
              {createPost.isPending ? (
                <>
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <span className="text-base font-semibold text-foreground">
                    Branding your photo and writing your caption…
                  </span>
                  <span className="text-xs">This can take a moment.</span>
                </>
              ) : (
                <>
                  <ImagePlus className="h-7 w-7 text-primary" />
                  <span className="text-base font-semibold text-foreground">
                    {photoReady ? "Choose a different photo" : "Choose a photo"}
                  </span>
                  <span className="text-xs">JPG or PNG</span>
                </>
              )}
            </button>
          </>
        )}

        {(preview || brandedUrl) && (
          <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
            <p className="mb-3 text-sm font-semibold">
              {photoReady ? "Your branded photo" : "Your photo"}
            </p>
            <img
              src={brandedUrl ?? preview ?? ""}
              alt="Your post preview"
              className="max-h-[28rem] w-full rounded-lg object-contain ring-1 ring-border"
            />
          </div>
        )}
      </StepCard>

      <StepCard
        id="caption-section"
        number={4}
        title="Review your SnapPost Pro caption"
        description="Read, edit and save the caption before you decide to publish."
        complete={captionReady}
        icon={<MessageSquareText className="h-6 w-6" aria-hidden="true" />}
      >
        {!captionReady ? (
          <LockedStep message="This unlocks after you upload a photo in Step 3." />
        ) : (
          <>
            <Label
              htmlFor="caption"
              className="flex items-center gap-1.5 text-base font-semibold"
            >
              <Sparkles className="h-4 w-4 text-primary" /> Your caption
            </Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={7}
              className="mt-3"
            />
            <Button
              variant="outline"
              className="mt-3"
              disabled={!createdId || updateCaption.isPending}
              onClick={() =>
                createdId && updateCaption.mutate({ id: createdId, caption })
              }
            >
              {updateCaption.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save caption"
              )}
            </Button>
          </>
        )}
      </StepCard>

      <StepCard
        id="publish-section"
        number={5}
        title="Publish to Facebook"
        description="Your post stays a draft until you press publish."
        complete={Boolean(publishedPost)}
        icon={<Send className="h-6 w-6" aria-hidden="true" />}
      >
        {!captionReady ? (
          <LockedStep message="This unlocks after your SnapPost Pro caption is ready in Step 4." />
        ) : !emailVerified ? (
          <LockedStep message="Verify your email using the message above before publishing to Facebook." />
        ) : (
          <>
            <Button
              size="lg"
              className="w-full gap-2 sm:w-auto"
              disabled={
                !createdId ||
                !facebookConnected ||
                publish.isPending ||
                Boolean(publishedPost)
              }
              onClick={() => createdId && publish.mutate({ id: createdId })}
            >
              {publish.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Publishing…
                </>
              ) : publishedPost ? (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Published
                </>
              ) : (
                <>
                  <Share2 className="h-5 w-5" /> Publish to Facebook
                </>
              )}
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">
              We publish only when you press this button.
            </p>
          </>
        )}

        {publishedPost && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold">
                  Published to {publishedPost.pageName}
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  Your branded image and caption are now live on Facebook.
                </p>
                <a
                  href={
                    publishedPost.facebookPostUrl ??
                    getFacebookPostUrl(publishedPost.facebookPostId)
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950"
                >
                  View live Facebook post <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}
