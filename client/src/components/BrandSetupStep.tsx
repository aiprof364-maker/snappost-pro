import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { PREVIEW_TRADE_GROUPS, PREVIEW_TRADES } from "@shared/previewTrades";
import {
  PREVIEW_BUSINESS_NAME_MAX,
  PREVIEW_SUBURB_MAX,
} from "@shared/previewCaption";
import {
  brandSetupPrefill,
  brandStepForSignedInVisit,
  shouldShowBrandNudge,
} from "@shared/brandProfile";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export type BrandSetupValues = {
  businessName: string;
  suburb?: string;
  trade?: string;
  logo?: string;
};

type Prefill = {
  businessName: string;
  suburb: string;
  tradeId: string;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BrandSetupDialog({
  open,
  prefill,
  saving,
  skipping,
  onSave,
  onSkip,
}: {
  open: boolean;
  prefill: Prefill;
  saving: boolean;
  skipping: boolean;
  onSave: (values: BrandSetupValues) => void;
  onSkip: () => void;
}) {
  const [businessName, setBusinessName] = useState(prefill.businessName);
  const [town, setTown] = useState(prefill.suburb);
  const [trade, setTrade] = useState(prefill.tradeId);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    const justOpened = !wasOpen.current;
    wasOpen.current = true;
    if (justOpened) {
      setBusinessName(prefill.businessName);
      setTown(prefill.suburb);
      setTrade(prefill.tradeId);
      setLogo(null);
      setLogoError("");
      return;
    }
    setBusinessName(current =>
      current.trim() ? current : prefill.businessName
    );
    setTown(current => (current.trim() ? current : prefill.suburb));
    setTrade(current => current || prefill.tradeId);
  }, [open, prefill.businessName, prefill.suburb, prefill.tradeId]);

  const busy = saving || skipping;
  const nameReady = businessName.trim().length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nameReady || busy) return;
    if (logo && logo.size > MAX_LOGO_BYTES) {
      setLogoError("Use a logo under 2 MB.");
      return;
    }
    setLogoError("");
    const logoData = logo ? await fileToDataUrl(logo) : undefined;
    onSave({
      businessName: businessName.trim(),
      suburb: town.trim() || undefined,
      trade: trade || undefined,
      logo: logoData,
    });
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={event => event.preventDefault()}
        onPointerDownOutside={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Add your business name
          </DialogTitle>
          <DialogDescription>
            This is the name customers see on posts when you don&apos;t have a
            logo. Town and trade are optional. You can skip and add them later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="brand-business-name">
              Business name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="brand-business-name"
              value={businessName}
              onChange={event => setBusinessName(event.target.value)}
              maxLength={PREVIEW_BUSINESS_NAME_MAX}
              placeholder="Northside Decks"
              className="mt-1.5"
              autoComplete="organization"
              required
            />
          </div>
          <div>
            <Label htmlFor="brand-town">
              Town or city{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="brand-town"
              value={town}
              onChange={event => setTown(event.target.value)}
              maxLength={PREVIEW_SUBURB_MAX}
              placeholder="Austin, TX"
              className="mt-1.5"
              autoComplete="address-level2"
            />
          </div>
          <div>
            <Label htmlFor="brand-trade">
              Trade{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <select
              id="brand-trade"
              value={trade}
              onChange={event => setTrade(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">Choose a trade</option>
              {PREVIEW_TRADE_GROUPS.map(group => (
                <optgroup key={group} label={group}>
                  {PREVIEW_TRADES.filter(item => item.group === group).map(
                    item => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    )
                  )}
                </optgroup>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Sets the short line under your name, such as a quote or booking
              prompt.
            </p>
          </div>
          <div>
            <Label htmlFor="brand-logo">
              Logo{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="brand-logo"
              type="file"
              accept="image/png,image/jpeg"
              className="mt-1.5 cursor-pointer"
              onChange={event => {
                const file = event.target.files?.[0] ?? null;
                setLogo(file);
                setLogoError(
                  file && file.size > MAX_LOGO_BYTES
                    ? "Use a logo under 2 MB."
                    : ""
                );
              }}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {logo
                ? logo.name
                : "JPG or PNG. A logo replaces the name badge on new posts."}
            </p>
            {logoError && (
              <p className="mt-1 text-sm text-destructive">{logoError}</p>
            )}
          </div>
          {!nameReady && (
            <p id="brand-name-help" className="text-sm text-muted-foreground">
              Add your business name to continue, or skip for now.
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={!nameReady || busy}
            aria-describedby={!nameReady ? "brand-name-help" : undefined}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Continue"
            )}
          </Button>
          <div className="text-center">
            <button
              type="button"
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-60"
              onClick={onSkip}
              disabled={busy}
            >
              {skipping ? "Skipping…" : "Skip for now"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type BrandSuggestion = {
  businessName?: string | null;
  suburb?: string | null;
};

/**
 * Same brand step on /preview and /dashboard. Visibility comes from the
 * account overview: no business name, and the owner has not skipped.
 */
export function BrandSetupGate({
  showNudge = false,
  suggestion = null,
}: {
  showNudge?: boolean;
  suggestion?: BrandSuggestion | null;
}) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const overview = trpc.account.overview.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [dismissed, setDismissed] = useState(false);
  const [reopened, setReopened] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveBrandSetup = trpc.account.saveBrandSetup.useMutation({
    onSuccess: () => {
      toast.success("Business name saved. New posts can show it.");
      setSaved(true);
      setReopened(false);
      setDismissed(true);
      utils.account.overview.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const skipBrandSetup = trpc.account.skipBrandSetup.useMutation({
    onSuccess: () => {
      setReopened(false);
      setDismissed(true);
      utils.account.overview.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const profile = overview.data;
  if (!isAuthenticated || !profile) return null;

  const account = {
    businessName: saved ? "saved" : profile.businessName,
    brandSetupSkipped: profile.brandSetupSkipped,
  };
  const businessName = account.businessName;
  const brandSetupSkipped = Boolean(account.brandSetupSkipped);
  const visible = brandStepForSignedInVisit(account, { dismissed, reopened });
  const nudgeVisible = shouldShowBrandNudge({
    businessName,
    brandSetupSkipped: brandSetupSkipped || dismissed,
    setupVisible: visible,
  });
  const prefill = brandSetupPrefill({
    businessName: profile.businessName,
    suburb: profile.suburb,
    trade: profile.trade,
    suggestion: {
      businessName:
        suggestion?.businessName || profile.brandSuggestion?.businessName,
      suburb: suggestion?.suburb || profile.brandSuggestion?.suburb,
    },
  });

  return (
    <>
      <BrandSetupDialog
        open={visible}
        prefill={prefill}
        saving={saveBrandSetup.isPending}
        skipping={skipBrandSetup.isPending}
        onSave={values => saveBrandSetup.mutate(values)}
        onSkip={() => skipBrandSetup.mutate()}
      />
      {showNudge && nudgeVisible && (
        <BrandNameNudge
          onAdd={() => {
            setSaved(false);
            setDismissed(false);
            setReopened(true);
          }}
        />
      )}
    </>
  );
}

export function BrandNameNudge({ onAdd }: { onAdd: () => void }) {
  return (
    <section
      id="brand-name-nudge"
      className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"
    >
      <h2 className="font-display text-lg font-bold">Add your business name</h2>
      <p className="mt-1 text-sm">
        You skipped this at sign-up, so posts without a logo only show the
        SnapPost mark. Add your business name and new posts will show it.
      </p>
      <Button type="button" className="mt-4" size="sm" onClick={onAdd}>
        Add your business name
      </Button>
    </section>
  );
}
