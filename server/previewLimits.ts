const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type PreviewLimitConfig = {
  ipHourlyLimit: number;
  ipDailyLimit: number;
  globalDailyCap: number;
};

export type RateBucket = {
  hourlyStart: number;
  hourlyCount: number;
  dailyStart: number;
  dailyCount: number;
};

export type PreviewRateStore = Map<string, RateBucket>;

export type PreviewRateDecision =
  | { ok: true }
  | { ok: false; scope: "hourly" | "daily" };

const sharedStore: PreviewRateStore = new Map();

export function sharedPreviewRateStore() {
  return sharedStore;
}

export function readPreviewLimitConfig(
  env: Record<string, string | undefined> = process.env
): PreviewLimitConfig {
  return {
    ipHourlyLimit: readLimit(env.PREVIEW_IP_HOURLY_LIMIT, 4),
    ipDailyLimit: readLimit(env.PREVIEW_IP_DAILY_LIMIT, 8),
    globalDailyCap: readLimit(env.PREVIEW_GLOBAL_DAILY_CAP, 200),
  };
}

function readLimit(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100_000)
    return fallback;
  return parsed;
}

/** Prefer the first forwarded client address. Fall back to the socket address. */
export function previewClientKey(input: {
  headers: { [name: string]: string | string[] | undefined };
  ip?: string | null;
}) {
  const forwarded = input.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const client = raw?.split(",")[0]?.trim();
  if (client) return client.slice(0, 80);
  const ip = input.ip?.trim();
  return ip ? ip.slice(0, 80) : "unknown";
}

export function previewLimitMessage(
  scope: "hourly" | "daily" | "global",
  limits: PreviewLimitConfig
) {
  if (scope === "hourly") {
    return `You can create up to ${limits.ipHourlyLimit} free previews an hour. Please try again shortly.`;
  }
  if (scope === "daily") {
    return `You can create up to ${limits.ipDailyLimit} free previews a day from this network. Please try again tomorrow.`;
  }
  return "Free previews are paused until tomorrow so this tool stays available. Sign up for 3 free posts with no card, or try again tomorrow.";
}

function freshBucket(
  existing: RateBucket | undefined,
  now: number
): RateBucket {
  if (!existing) {
    return { hourlyStart: now, hourlyCount: 0, dailyStart: now, dailyCount: 0 };
  }
  const hourlyExpired = now - existing.hourlyStart >= HOUR_MS;
  const dailyExpired = now - existing.dailyStart >= DAY_MS;
  return {
    hourlyStart: hourlyExpired ? now : existing.hourlyStart,
    hourlyCount: hourlyExpired ? 0 : existing.hourlyCount,
    dailyStart: dailyExpired ? now : existing.dailyStart,
    dailyCount: dailyExpired ? 0 : existing.dailyCount,
  };
}

function pruneStore(store: PreviewRateStore, now: number) {
  if (store.size < 2000) return;
  store.forEach((bucket, key) => {
    if (
      now - bucket.hourlyStart >= HOUR_MS &&
      now - bucket.dailyStart >= DAY_MS
    ) {
      store.delete(key);
    }
  });
}

/** Count one anonymous preview attempt for this client. Denied attempts are not counted. */
export function consumePreviewAllowance(
  store: PreviewRateStore,
  key: string,
  now: number,
  limits: Pick<PreviewLimitConfig, "ipHourlyLimit" | "ipDailyLimit">
): PreviewRateDecision {
  pruneStore(store, now);
  const bucket = freshBucket(store.get(key), now);
  if (limits.ipHourlyLimit < 1 || bucket.hourlyCount >= limits.ipHourlyLimit) {
    store.set(key, bucket);
    return { ok: false, scope: "hourly" };
  }
  if (limits.ipDailyLimit < 1 || bucket.dailyCount >= limits.ipDailyLimit) {
    store.set(key, bucket);
    return { ok: false, scope: "daily" };
  }
  bucket.hourlyCount += 1;
  bucket.dailyCount += 1;
  store.set(key, bucket);
  return { ok: true };
}

/** Give back an allowance when the attempt stopped before the caption model ran. */
export function refundPreviewAllowance(store: PreviewRateStore, key: string) {
  const bucket = store.get(key);
  if (!bucket) return;
  bucket.hourlyCount = Math.max(0, bucket.hourlyCount - 1);
  bucket.dailyCount = Math.max(0, bucket.dailyCount - 1);
}
