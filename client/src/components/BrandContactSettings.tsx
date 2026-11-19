import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  parseBusinessPhone,
  parseBusinessWebsite,
} from "@shared/brandContact";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type BrandContactSettingsProps = {
  businessName?: string | null;
  suburb?: string | null;
  phone?: string | null;
  website?: string | null;
  onDraftChange?: (draft: { phone: string; website: string }) => void;
};

export function BrandContactSettings({
  businessName,
  suburb,
  phone,
  website,
  onDraftChange,
}: BrandContactSettingsProps) {
  const utils = trpc.useUtils();
  const [businessPhone, setBusinessPhone] = useState(phone ?? "");
  const [businessWebsite, setBusinessWebsite] = useState(website ?? "");
  const [phoneError, setPhoneError] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const saveContact = trpc.account.saveBrandContact.useMutation({
    onSuccess: result => {
      toast.success("Phone and website saved.");
      setBusinessPhone(result.phone ?? "");
      setBusinessWebsite(result.website ?? "");
      onDraftChange?.({
        phone: result.phone ?? "",
        website: result.website ?? "",
      });
      utils.account.overview.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    setBusinessPhone(phone ?? "");
    setBusinessWebsite(website ?? "");
    setPhoneError("");
    setWebsiteError("");
  }, [phone, website]);

  function updatePhone(value: string) {
    setBusinessPhone(value);
    setPhoneError("");
    onDraftChange?.({ phone: value, website: businessWebsite });
  }

  function updateWebsite(value: string) {
    setBusinessWebsite(value);
    setWebsiteError("");
    onDraftChange?.({ phone: businessPhone, website: value });
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    const parsedPhone = parseBusinessPhone(businessPhone);
    const parsedWebsite = parseBusinessWebsite(businessWebsite);
    setPhoneError(parsedPhone.ok ? "" : parsedPhone.message);
    setWebsiteError(parsedWebsite.ok ? "" : parsedWebsite.message);
    if (!parsedPhone.ok || !parsedWebsite.ok) return;
    saveContact.mutate({
      phone: parsedPhone.value ?? "",
      website: parsedWebsite.value ?? "",
    });
  }

  return (
    <form onSubmit={save} className="mt-5 border-t border-border pt-5">
      <h3 className="font-display text-lg font-bold">Business details</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Phone and website are optional. They sit with your business name and
        city, and show on the name bar when you add them.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Business name</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {businessName?.trim() || "Not added yet"}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">City</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {suburb?.trim() || "Not added yet"}
          </p>
        </div>
        <div>
          <Label htmlFor="account-phone">
            Phone{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="account-phone"
            value={businessPhone}
            onChange={event => updatePhone(event.target.value)}
            onBlur={() => {
              const parsed = parseBusinessPhone(businessPhone);
              if (parsed.ok && parsed.value) {
                setBusinessPhone(parsed.value);
                onDraftChange?.({
                  phone: parsed.value,
                  website: businessWebsite,
                });
              }
              setPhoneError(parsed.ok ? "" : parsed.message);
            }}
            placeholder="(512) 555-0142"
            autoComplete="tel"
            inputMode="tel"
            className="mt-1.5"
          />
          {phoneError && (
            <p className="mt-1 text-sm text-destructive">{phoneError}</p>
          )}
        </div>
        <div>
          <Label htmlFor="account-website">
            Website{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Input
            id="account-website"
            value={businessWebsite}
            onChange={event => updateWebsite(event.target.value)}
            onBlur={() => {
              const parsed = parseBusinessWebsite(businessWebsite);
              if (parsed.ok && parsed.value) {
                setBusinessWebsite(parsed.value);
                onDraftChange?.({
                  phone: businessPhone,
                  website: parsed.value,
                });
              }
              setWebsiteError(parsed.ok ? "" : parsed.message);
            }}
            placeholder="northsidedecks.com"
            autoComplete="url"
            inputMode="url"
            className="mt-1.5"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            A domain or address, shown without https://.
          </p>
          {websiteError && (
            <p className="mt-1 text-sm text-destructive">{websiteError}</p>
          )}
        </div>
      </div>
      <Button
        type="submit"
        variant="secondary"
        className="mt-4"
        disabled={saveContact.isPending}
      >
        {saveContact.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </>
        ) : (
          "Save phone and website"
        )}
      </Button>
    </form>
  );
}
