import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Share2, Sparkles, Upload } from "lucide-react";
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
  atLimit?: boolean;
  onCreated?: () => void;
};

export default function UploadCard({
  facebookConnected,
  atLimit = false,
  onCreated,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [trade, setTrade] = useState("");
  const [tone, setTone] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [brandedUrl, setBrandedUrl] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const createPost = trpc.posts.create.useMutation({
    onSuccess: post => {
      if (!post) return;
      setCreatedId(post.id);
      setCaption(post.caption ?? "");
      setBrandedUrl(post.brandedImageUrl ?? null);
      utils.posts.list.invalidate();
      onCreated?.();
      toast.success("Caption written and photo branded.");
    },
    onError: e => toast.error(e.message),
  });

  const updateCaption = trpc.posts.updateCaption.useMutation({
    onSuccess: () => toast.success("Caption saved."),
    onError: e => toast.error(e.message),
  });

  const publish = trpc.posts.publish.useMutation({
    onSuccess: () => {
      toast.success("Posted to Facebook!");
      utils.posts.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (atLimit) {
      toast.error("You've reached your monthly post limit. Upgrade to continue.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setCreatedId(null);
    setBrandedUrl(null);
    setCaption("");
    createPost.mutate({
      image: dataUrl,
      trade: trade || undefined,
      tone: tone || undefined,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-bold">Create a new post</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a job photo. We write the caption and add your logo automatically.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="trade">Your trade (optional)</Label>
          <Input
            id="trade"
            placeholder="e.g. Builder, Plumber, Electrician"
            value={trade}
            onChange={e => setTrade(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="tone">Caption tone (optional)</Label>
          <Input
            id="tone"
            placeholder="e.g. Friendly, Professional, Proud"
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
        className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 py-10 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        disabled={createPost.isPending || atLimit}
      >
        {createPost.isPending ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm">Writing caption & branding photo…</span>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6" />
            <span className="text-sm font-medium">Click to upload a photo</span>
            <span className="text-xs">JPG or PNG</span>
          </>
        )}
      </button>

      {(preview || brandedUrl) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {brandedUrl ? "Branded image" : "Preview"}
            </p>
            <img
              src={brandedUrl ?? preview ?? ""}
              alt="Post"
              className="w-full rounded-lg ring-1 ring-border"
            />
          </div>
          <div className="flex flex-col">
            <Label htmlFor="caption" className="mb-2 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI caption
            </Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={7}
              placeholder="Your caption will appear here…"
              className="flex-1"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!createdId || updateCaption.isPending}
                onClick={() =>
                  createdId &&
                  updateCaption.mutate({ id: createdId, caption })
                }
              >
                {updateCaption.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save caption"
                )}
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={!createdId || !facebookConnected || publish.isPending}
                onClick={() => createdId && publish.mutate({ id: createdId })}
              >
                {publish.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Share2 className="h-4 w-4" /> Post to Facebook
                  </>
                )}
              </Button>
            </div>
            {!facebookConnected && createdId && (
              <p className="mt-2 text-xs text-muted-foreground">
                Connect a Facebook page to publish. Your post is saved as a
                draft in the meantime.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
