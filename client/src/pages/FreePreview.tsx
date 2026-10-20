import { useAuth } from "@/_core/hooks/useAuth";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { trackMetaCustomEvent, trackMetaEvent } from "@/lib/metaPixel";
import {
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Mail,
  PenLine,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

type Landing = "contractors" | "hairdressers" | undefined;

type PreviewResult = {
  token: string;
  landing: string | null;
  originalImageUrl: string;
  brandedImageUrl: string;
  hasLogo: boolean;
  caption: string;
  expiresAt: Date;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseLanding(value: string | null): Landing {
  return value === "contractors" || value === "hairdressers"
    ? value
    : undefined;
}

function previewPath(token?: string, landing?: Landing) {
  const search = new URLSearchParams();
  if (token) search.set("token", token);
  if (landing) search.set("landing", landing);
  const query = search.toString();
  return query ? `/preview?${query}` : "/preview";
}

function FilePicker({
  id,
  label,
  helper,
  value,
  maxBytes,
  onChange,
}: {
  id: string;
  label: string;
  helper: string;
  value: File | null;
  maxBytes: number;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-base font-bold">
        {label}
      </Label>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      <Input
        id={id}
        className="mt-3 cursor-pointer"
        type="file"
        accept="image/jpeg,image/png"
        onChange={event => {
          const file = event.target.files?.[0] ?? null;
          if (file && file.size > maxBytes) {
            onChange(null);
            event.currentTarget.value = "";
            return;
          }
          onChange(file);
        }}
      />
      {value ? (
        <p className="mt-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="mr-1 inline h-4 w-4" /> {value.name}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          JPG or PNG · {Math.round(maxBytes / (1024 * 1024))} MB maximum
        </p>
      )}
    </div>
  );
}

export default function FreePreview() {
  const { isAuthenticated, loading } = useAuth();
  const initialSearch = new URLSearchParams(window.location.search);
  const [landing, setLanding] = useState<Landing>(() =>
    parseLanding(initialSearch.get("landing"))
  );
  const [token, setToken] = useState<string | null>(() =>
    initialSearch.get("token")
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [trade, setTrade] = useState("");
  const [tone, setTone] = useState("");
  const [photoPermission, setPhotoPermission] = useState(false);
  const [formError, setFormError] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [caption, setCaption] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [claimMessage, setClaimMessage] = useState("");
  const claimStarted = useRef(false);
  const registrationTracked = useRef(false);
  const [accountCreated] = useState(() =>
    initialSearch.get("account_created") === "1"
  );

  const storedPreview = trpc.preview.get.useQuery(
    { token: token ?? "invalid" },
    {
      enabled: Boolean(token) && !isAuthenticated && !preview,
      retry: false,
    }
  );

  useEffect(() => {
    if (storedPreview.data && token && !preview) {
      setPreview({ token, ...storedPreview.data });
      setCaption(storedPreview.data.caption);
    }
  }, [preview, storedPreview.data, token]);

  const createPreview = trpc.preview.create.useMutation({
    onSuccess: data => {
      const nextPreview = data as PreviewResult;
      setPreview(nextPreview);
      setCaption(nextPreview.caption);
      setToken(nextPreview.token);
      window.history.replaceState(
        {},
        "",
        previewPath(nextPreview.token, landing)
      );
      trackMetaCustomEvent("FreePreviewCreated", {
        ...(landing ? { landing_page: landing } : {}),
      });
    },
    onError: error => setFormError(error.message),
  });

  const updateCaption = trpc.preview.updateCaption.useMutation({
    onError: error => setEmailError(error.message),
  });

  const requestLink = trpc.auth.requestSignInLink.useMutation({
    onSuccess: () => {
      trackMetaEvent("Lead", {
        lead_type: "preview_saved",
        ...(landing ? { landing_page: landing } : {}),
      });
      setSent(true);
    },
    onError: error => setEmailError(error.message),
  });

  const claim = trpc.preview.claim.useMutation({
    onSuccess: result => {
      setClaimMessage(
        result.alreadyClaimed
          ? "Your preview is already saved in your dashboard."
          : "Your preview is saved as a draft in your dashboard."
      );
    },
    onError: error => setClaimMessage(error.message),
  });

  useEffect(() => {
    if (
      !loading &&
      isAuthenticated &&
      token &&
      !claimStarted.current &&
      !claim.isPending
    ) {
      claimStarted.current = true;
      claim.mutate({ token });
    }
  }, [claim, isAuthenticated, loading, token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (accountCreated && !registrationTracked.current) {
      registrationTracked.current = true;
      trackMetaEvent(
        "CompleteRegistration",
        landing ? { landing_page: landing } : undefined
      );
      window.history.replaceState(
        {},
        "",
        previewPath(token ?? undefined, landing)
      );
    }
  }, [accountCreated, landing, token]);

  const makePreview = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!photo) {
      setFormError("Add a photo to create your Facebook-post preview.");
      return;
    }
    if (!photoPermission) {
      setFormError(
        "Confirm you have permission to use this photo before continuing."
      );
      return;
    }
    if (photo.size > MAX_PHOTO_BYTES || (logo && logo.size > MAX_LOGO_BYTES)) {
      setFormError("Use a photo under 8 MB and a logo under 2 MB.");
      return;
    }
    try {
      const [image, logoImage] = await Promise.all([
        fileToDataUrl(photo),
        logo ? fileToDataUrl(logo) : Promise.resolve(undefined),
      ]);
      createPreview.mutate({
        image,
        logo: logoImage,
        trade: trade.trim() || undefined,
        tone: tone.trim() || undefined,
        landing,
      });
    } catch {
      setFormError(
        "We could not read that image. Please try another JPG or PNG."
      );
    }
  };

  const savePreview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!preview || !token) return;
    setEmailError("");
    try {
      if (caption.trim() !== preview.caption.trim()) {
        await updateCaption.mutateAsync({ token, caption: caption.trim() });
      }
      await requestLink.mutateAsync({
        email: email.trim(),
        origin: window.location.origin,
        next: previewPath(token, landing),
        previewToken: token,
      });
    } catch {
      // Each mutation supplies the visitor-safe error message above.
    }
  };

  const startAgain = () => {
    setToken(null);
    setPreview(null);
    setCaption("");
    setPhoto(null);
    setLogo(null);
    setPhotoPermission(false);
    setFormError("");
    setSent(false);
    setEmailError("");
    window.history.replaceState({}, "", previewPath(undefined, landing));
  };

  if (!loading && isAuthenticated && token) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/20">
        <SiteHeader />
        <main className="container flex flex-1 items-center justify-center py-12">
          <section className="w-full max-w-xl rounded-3xl border border-border bg-card p-7 text-center shadow-sm sm:p-10">
            {claim.isPending || !claimMessage ? (
              <>
                <Loader2 className="mx-auto h-9 w-9 animate-spin text-primary" />
                <h1 className="mt-5 font-display text-3xl font-bold">
                  Saving your preview
                </h1>
                <p className="mt-3 text-muted-foreground">
                  We are adding your branded image and caption to your
                  dashboard.
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-600" />
                <h1 className="mt-5 font-display text-3xl font-bold">
                  Your free post is ready
                </h1>
                <p className="mt-3 text-muted-foreground">{claimMessage}</p>
                <Link href="/dashboard" className="mt-7 inline-flex">
                  <Button
                    size="lg"
                    className="gap-2 px-8 py-6 text-base font-bold"
                  >
                    Go to my dashboard <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            )}
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const loadingPreview = Boolean(token) && storedPreview.isLoading && !preview;

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      <SiteHeader />
      <main className="flex-1">
        {accountCreated && (
          <section className="border-b border-emerald-200 bg-emerald-50">
            <div className="container max-w-3xl py-4 text-center text-emerald-950">
              <p className="font-bold">Your free SnapPost Pro account is ready.</p>
              <p className="mt-1 text-sm text-emerald-900">
                Add one real business photo now to create your first branded Facebook post.
              </p>
            </div>
          </section>
        )}
        <section className="border-b border-border/60 bg-background">
          <div className="container max-w-3xl py-10 sm:py-14">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Free branded preview
              </span>
              <h1 className="font-display mt-4 text-3xl font-extrabold sm:text-5xl">
                See your own photo ready for Facebook.
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Add a photo and, if you have one, your logo. We create a
                Facebook-post preview and an AI-written caption for you to
                review before asking for your email.
              </p>
              <p className="mt-3 text-sm font-semibold text-muted-foreground">
                3 posts total · No card required · Nothing is published
                automatically
              </p>
            </div>
          </div>
        </section>

        <section className="container max-w-3xl py-8 sm:py-12">
          {loadingPreview ? (
            <div className="flex min-h-64 items-center justify-center rounded-3xl border bg-card">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : storedPreview.isError && token && !preview ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7 text-center text-amber-950">
              <h2 className="font-display text-2xl font-bold">
                This preview has expired
              </h2>
              <p className="mt-2 text-sm text-amber-900">
                Free previews are saved for 24 hours. Create a new one to
                continue.
              </p>
              <Button className="mt-5" onClick={startAgain}>
                Create a new preview
              </Button>
            </div>
          ) : preview ? (
            <div className="space-y-6">
              <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                <div className="border-b border-border/70 p-5 sm:p-7">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-emerald-700">
                        Your real preview
                      </p>
                      <h2 className="font-display text-2xl font-bold">
                        Your Facebook post is ready to review
                      </h2>
                    </div>
                  </div>
                </div>
                <div className="grid gap-0 md:grid-cols-2">
                  <figure className="border-b border-border/70 bg-muted/20 p-4 md:border-b-0 md:border-r">
                    <img
                      src={preview.brandedImageUrl}
                      alt={
                        preview.hasLogo
                          ? "Your photo with your business logo watermark"
                          : "Your photo ready for Facebook"
                      }
                      className="aspect-square w-full rounded-xl object-contain bg-white"
                    />
                    <figcaption className="mt-3 text-sm font-semibold text-muted-foreground">
                      {preview.hasLogo
                        ? "Your photo with your logo watermark"
                        : "Your photo, ready to post"}
                    </figcaption>
                  </figure>
                  <div className="p-5 sm:p-7">
                    <div className="flex items-center gap-2 text-sm font-bold text-primary">
                      <PenLine className="h-4 w-4" /> AI-written caption
                    </div>
                    <Label htmlFor="preview-caption" className="sr-only">
                      Your caption
                    </Label>
                    <Textarea
                      id="preview-caption"
                      value={caption}
                      onChange={event => setCaption(event.target.value)}
                      rows={10}
                      className="mt-3 resize-y"
                    />
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      You can edit this now or later. You choose whether to
                      publish.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-bold">
                      Save your free post
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      Enter your business email and we will send one secure
                      link. It saves this image and caption to your dashboard so
                      you can connect your Facebook Page and publish when ready.
                    </p>
                  </div>
                </div>
                {sent ? (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
                    <p className="font-bold">
                      Your secure access link is on its way.
                    </p>
                    <p className="mt-1 text-sm text-emerald-800">
                      Open the email from SnapPost Pro within 15 minutes. Your
                      preview will be waiting in your dashboard.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={savePreview}
                    className="mt-6 max-w-lg space-y-4"
                  >
                    <div>
                      <Label
                        htmlFor="preview-email"
                        className="text-sm font-bold"
                      >
                        Business email address
                      </Label>
                      <Input
                        id="preview-email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        required
                        value={email}
                        onChange={event => setEmail(event.target.value)}
                        placeholder="you@yourbusiness.com"
                        className="mt-2 h-12 bg-background"
                      />
                    </div>
                    {emailError && (
                      <p className="text-sm text-destructive">{emailError}</p>
                    )}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full gap-2 py-6 text-base font-bold sm:w-auto"
                      disabled={
                        requestLink.isPending || updateCaption.isPending
                      }
                    >
                      {requestLink.isPending || updateCaption.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" /> Saving
                          your post…
                        </>
                      ) : (
                        <>
                          Email my secure access link{" "}
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </section>

              <button
                type="button"
                className="mx-auto block text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
                onClick={startAgain}
              >
                Create a different preview
              </button>
            </div>
          ) : (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ImagePlus className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-bold">
                    Create your free preview
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Use a real business, completed-job, product, salon or result
                    photo you have permission to publish. Add your logo if you
                    have one and we will place it in the lower-right.
                  </p>
                </div>
              </div>
              <form onSubmit={makePreview} className="mt-7 space-y-6">
                <FilePicker
                  id="preview-photo"
                  label="1. Add your photo"
                  helper="Choose the photo you want to turn into a Facebook post."
                  value={photo}
                  maxBytes={MAX_PHOTO_BYTES}
                  onChange={setPhoto}
                />
                <FilePicker
                  id="preview-logo"
                  label="2. Add your business logo (optional)"
                  helper="Have a logo? We will add it to this preview and save it to your account after you use the secure email link. No logo? You can still continue."
                  value={logo}
                  maxBytes={MAX_LOGO_BYTES}
                  onChange={setLogo}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="preview-trade">
                      Business type{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="preview-trade"
                      value={trade}
                      onChange={event => setTrade(event.target.value)}
                      placeholder={
                        landing === "hairdressers"
                          ? "e.g. Hair salon"
                          : "e.g. Builder"
                      }
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="preview-tone">
                      Caption tone{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="preview-tone"
                      value={tone}
                      onChange={event => setTone(event.target.value)}
                      placeholder="e.g. Friendly and professional"
                      className="mt-2"
                    />
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6">
                  <Checkbox
                    checked={photoPermission}
                    onCheckedChange={checked =>
                      setPhotoPermission(checked === true)
                    }
                    aria-label="Confirm photo permission"
                  />
                  <span>
                    I own this photo or have permission to use and publish it. I
                    will not upload customer, patient or client-identifying
                    information without appropriate consent.
                  </span>
                </label>
                {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2 py-6 text-base font-bold sm:w-auto sm:px-8"
                  disabled={createPreview.isPending}
                >
                  {createPreview.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Creating your
                      preview…
                    </>
                  ) : (
                    <>
                      Create my Facebook-post preview{" "}
                      <Sparkles className="h-5 w-5" />
                    </>
                  )}
                </Button>
                <p className="text-xs leading-5 text-muted-foreground">
                  Your unclaimed preview is kept for up to 24 hours. No card is
                  required.
                </p>
              </form>
            </section>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
