const PROMOTION_CODE_PATTERN = /^[A-Za-z0-9-]{1,100}$/;

export function normalizePromotionCode(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !PROMOTION_CODE_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/**
 * Stripe rejects Checkout Sessions that set both allow_promotion_codes and discounts.
 * Pre-apply a looked-up code, otherwise let the customer enter one.
 */
export async function findActivePromotionCode(
  stripe: {
    promotionCodes: {
      list: (params: { code: string; active: boolean; limit: number }) => Promise<{
        data: Array<{ id: string; code: string; active: boolean }>;
      }>;
    };
  },
  code: string | null | undefined,
): Promise<{ id: string; code: string } | null> {
  const normalized = normalizePromotionCode(code);
  if (!normalized) return null;
  const list = await stripe.promotionCodes.list({
    code: normalized,
    active: true,
    limit: 1,
  });
  const match = list.data.find(
    item => item.active && item.code.toLowerCase() === normalized.toLowerCase(),
  );
  return match ? { id: match.id, code: match.code } : null;
}

export function checkoutPromotionParams(promotionCodeId: string | null):
  | { allow_promotion_codes: true }
  | { discounts: [{ promotion_code: string }] } {
  if (promotionCodeId) return { discounts: [{ promotion_code: promotionCodeId }] };
  return { allow_promotion_codes: true };
}

export function promotionCodeFromEventMetadata(metadata: string | null | undefined): string | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { promotionCode?: unknown };
    return normalizePromotionCode(
      typeof parsed.promotionCode === "string" ? parsed.promotionCode : null,
    );
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readPromotionCode(value: unknown): { id?: string; code?: string } | null {
  if (typeof value === "string" && value.trim()) return { id: value };
  const record = asRecord(value);
  if (!record) return null;
  const id = typeof record.id === "string" && record.id.trim() ? record.id : undefined;
  const code = normalizePromotionCode(typeof record.code === "string" ? record.code : null) ?? undefined;
  if (!id && !code) return null;
  return { id, code };
}

function promotionCodeFromDiscountEntry(entry: unknown): { id?: string; code?: string } | null {
  const record = asRecord(entry);
  if (!record) return null;
  const direct = readPromotionCode(record.promotion_code);
  if (direct) return direct;
  const nested = asRecord(record.discount);
  if (!nested) return null;
  return readPromotionCode(nested.promotion_code);
}

/** Read a customer-facing code, or the Stripe promotion code id, from a Checkout payload. */
export function findPromotionCodeReference(input: {
  session?: unknown;
  subscription?: unknown;
}): { id?: string; code?: string } | null {
  const session = asRecord(input.session);
  const subscription = asRecord(input.subscription);
  const totalDetails = asRecord(session?.total_details);
  const breakdown = asRecord(totalDetails?.breakdown);
  const candidates = [
    session?.discounts,
    breakdown?.discounts,
    subscription?.discounts,
    subscription?.discount,
  ];
  for (const candidate of candidates) {
    const entries = Array.isArray(candidate) ? candidate : candidate ? [candidate] : [];
    for (const entry of entries) {
      const found = promotionCodeFromDiscountEntry(entry);
      if (found?.code || found?.id) return found;
    }
  }
  return null;
}

type PromotionCodeLookup = {
  promotionCodes: {
    retrieve: (id: string) => Promise<{ code?: string | null }>;
  };
  checkout: {
    sessions: {
      retrieve: (
        id: string,
        params: { expand: string[] },
      ) => Promise<unknown>;
    };
  };
};

export async function promotionCodeUsedOnCheckout(
  stripe: PromotionCodeLookup,
  input: { session: { id?: string | null }; subscription?: unknown },
): Promise<string | null> {
  let found = findPromotionCodeReference(input);
  if (!found?.code && !found?.id && input.session.id) {
    try {
      const expanded = await stripe.checkout.sessions.retrieve(input.session.id, {
        expand: ["discounts.promotion_code"],
      });
      found = findPromotionCodeReference({
        session: expanded,
        subscription: input.subscription,
      });
    } catch {
      found = found ?? null;
    }
  }
  if (found?.code) return found.code;
  if (!found?.id) return null;
  try {
    const promo = await stripe.promotionCodes.retrieve(found.id);
    return normalizePromotionCode(promo.code);
  } catch {
    return null;
  }
}
