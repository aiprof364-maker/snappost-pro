import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  BORDER_PRESETS,
  borderInk,
  borderUsesCustomColor,
  layoutPostBorder,
  nameBarCopy,
  parseBorderColor,
  parseBorderStyle,
  resolvedBorderColor,
  type BorderStyle,
} from "@shared/postBorder";
import { Frame } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type PostBorderSettingsProps = {
  borderStyle?: string | null;
  borderColor?: string | null;
  businessName?: string | null;
  suburb?: string | null;
  phone?: string | null;
  website?: string | null;
};

export function PostBorderSettings({
  borderStyle,
  borderColor,
  businessName,
  suburb,
  phone,
  website,
}: PostBorderSettingsProps) {
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<BorderStyle>(
    parseBorderStyle(borderStyle)
  );
  const [picked, setPicked] = useState(resolvedBorderColor(borderColor));
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValidColor = useRef(resolvedBorderColor(borderColor));
  const saveBorder = trpc.account.saveBorder.useMutation({
    onSuccess: () => {
      utils.account.overview.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    const nextColor = resolvedBorderColor(borderColor);
    lastValidColor.current = nextColor;
    setSelected(parseBorderStyle(borderStyle));
    setPicked(nextColor);
  }, [borderStyle, borderColor]);

  useEffect(() => {
    return () => {
      if (colorTimer.current) clearTimeout(colorTimer.current);
    };
  }, []);

  const parsedColor = parseBorderColor(picked);
  if (parsedColor) lastValidColor.current = parsedColor;
  const validColor = parsedColor ?? lastValidColor.current;
  const savedName = businessName?.trim() ?? "";
  const savedCity = suburb?.trim() ?? "";

  function persist(style: BorderStyle, color: string) {
    if (colorTimer.current) clearTimeout(colorTimer.current);
    saveBorder.mutate({ style, color });
  }

  function choose(style: BorderStyle) {
    setSelected(style);
    persist(style, validColor);
  }

  function onColor(value: string) {
    const next = (value.startsWith("#") ? value : `#${value}`).toUpperCase();
    setPicked(next);
    const parsed = parseBorderColor(next);
    if (!parsed) return;
    if (colorTimer.current) clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(() => {
      saveBorder.mutate({ style: selected, color: parsed });
    }, 300);
  }

  return (
    <section
      id="post-border"
      data-testid="post-border-settings"
      className="mt-5 scroll-mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Frame className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold">Post border</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a frame for the Facebook and Instagram posts you generate.
            The top stays clear so phone captions do not cover your words.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div>
          <RadioGroup
            value={selected}
            onValueChange={value => choose(parseBorderStyle(value))}
            className="gap-2"
            aria-label="Post border"
          >
            {BORDER_PRESETS.map(preset => {
              const active = selected === preset.id;
              return (
                <label
                  key={preset.id}
                  htmlFor={`post-border-${preset.id}`}
                  data-testid={`post-border-option-${preset.id}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <RadioGroupItem
                    id={`post-border-${preset.id}`}
                    value={preset.id}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {preset.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {preset.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </RadioGroup>

          {borderUsesCustomColor(selected) && (
            <div className="mt-4">
              <Label htmlFor="post-border-color">Brand color</Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <input
                  id="post-border-color"
                  type="color"
                  value={validColor.toLowerCase()}
                  onChange={event => onColor(event.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
                />
                <Input
                  id="post-border-hex"
                  aria-label="Brand color hex"
                  value={picked}
                  onChange={event => onColor(event.target.value)}
                  spellCheck={false}
                  maxLength={7}
                  className="w-32 font-mono uppercase"
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pick the color customers should recognize. It is used for the
                brand-color frame and the name bar.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <BorderPreview
            testId="post-border-preview-square"
            label="Square"
            width={1080}
            height={1080}
            style={selected}
            color={validColor}
            businessName={savedName}
            suburb={savedCity}
            phone={phone}
            website={website}
          />
          <BorderPreview
            testId="post-border-preview-portrait"
            label="Portrait"
            width={1080}
            height={1350}
            style={selected}
            color={validColor}
            businessName={savedName}
            suburb={savedCity}
            phone={phone}
            website={website}
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {savedName
          ? "The name bar prints your business name. Phone and website go on the next line when you save them."
          : "Add your business name and the name bar will print it. This preview shows a sample until then."}
      </p>
      <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
        {saveBorder.isPending
          ? "Saving…"
          : saveBorder.isError
            ? "Could not save that border. Try again."
            : saveBorder.isSuccess
              ? "Saved. New posts will use this border."
              : "New posts use this border. Posts you already created stay as they are."}
      </p>
    </section>
  );
}

function BorderPreview({
  testId,
  label,
  width,
  height,
  style,
  color,
  businessName,
  suburb,
  phone,
  website,
}: {
  testId: string;
  label: string;
  width: number;
  height: number;
  style: BorderStyle;
  color: string;
  businessName: string;
  suburb: string;
  phone?: string | null;
  website?: string | null;
}) {
  const layout = layoutPostBorder({ width, height, style, color });
  const top = layout ? (layout.top / height) * 100 : 0;
  const bottom = layout ? (layout.bottom / height) * 100 : 0;
  const side = layout ? (layout.left / width) * 100 : 0;
  const ink = borderInk(layout?.background ?? color);
  const copy = nameBarCopy({ businessName, suburb, phone, website });
  const previewName = copy.name || "Your business";
  const previewDetail = copy.detail;
  const showBar = style === "bar";

  return (
    <figure>
      <div
        data-testid={testId}
        role="img"
        aria-label={`${label} preview, ${BORDER_PRESETS.find(preset => preset.id === style)?.label ?? "None"}`}
        className="relative overflow-hidden rounded-xl bg-muted ring-1 ring-border"
        style={{
          aspectRatio: `${width} / ${height}`,
          background: layout?.background ?? "transparent",
          containerType: "inline-size",
        }}
      >
        <div
          className="absolute overflow-hidden"
          style={{
            top: `${top}%`,
            right: `${side}%`,
            bottom: `${bottom}%`,
            left: `${side}%`,
          }}
        >
          <JobPhoto />
        </div>
        {layout && layout.stroke > 0 && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              borderStyle: "solid",
              borderColor: layout.strokeColor,
              borderWidth: `${(layout.stroke / width) * 100}%`,
            }}
          />
        )}
        {showBar && (
          <div
            className="absolute inset-x-0 flex flex-col items-center justify-center overflow-hidden px-[6%] text-center leading-none"
            style={{
              top: `${100 - bottom}%`,
              bottom: 0,
              color: ink,
              containerType: "size",
            }}
          >
            <span
              className="max-w-full truncate font-semibold"
              style={{ fontSize: previewDetail ? "34cqh" : "48cqh" }}
            >
              {previewName}
            </span>
            {previewDetail && (
              <span
                className="max-w-full truncate opacity-90"
                style={{ fontSize: "22cqh", marginTop: "6cqh" }}
              >
                {previewDetail}
              </span>
            )}
          </div>
        )}
      </div>
      <figcaption className="mt-1 text-center text-xs text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  );
}

function JobPhoto() {
  return (
    <svg
      viewBox="0 0 160 160"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden="true"
    >
      <rect width="160" height="160" fill="#8ec6ef" />
      <rect y="98" width="160" height="62" fill="#67a34d" />
      <rect x="16" y="62" width="74" height="48" fill="#f4efe4" />
      <polygon points="10,62 53,28 100,62" fill="#9a4e32" />
      <rect x="42" y="82" width="16" height="28" fill="#c9843d" />
      <rect x="104" y="86" width="42" height="18" fill="#d7b07a" />
      <rect x="112" y="78" width="10" height="8" fill="#efe3cf" />
    </svg>
  );
}
