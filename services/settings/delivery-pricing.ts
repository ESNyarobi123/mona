import { prisma, type BusinessModule } from "@monana/db";

export type DeliveryPricingMode = "FLAT_RATE" | "MIN_ORDER_FREE" | "ZONE";

export type DeliveryPricingConfig = {
  mode: DeliveryPricingMode;
  /** Flat delivery fee (FLAT_RATE, or charge below MOV threshold) */
  flatRateFee: number;
  /** Minimum order subtotal for free delivery (MIN_ORDER_FREE) */
  minOrderForFreeDelivery: number;
  /** Fee when address does not match any zone (ZONE mode) */
  unmatchedZoneFee: number;
};

export type DeliveryQuote = {
  subtotal: number;
  deliveryFee: number;
  total: number;
  freeDelivery: boolean;
  mode: DeliveryPricingMode;
  zoneId: string | null;
  zoneName: string | null;
  /** TZS still needed for free delivery (MIN_ORDER_FREE only) */
  amountToFreeDelivery: number | null;
};

export const DEFAULT_DELIVERY_PRICING: DeliveryPricingConfig = {
  mode: "FLAT_RATE",
  flatRateFee: 3000,
  minOrderForFreeDelivery: 80_000,
  unmatchedZoneFee: 5000,
};

const SETTING_KEY: Record<BusinessModule, string> = {
  GROCERY: "delivery_pricing_grocery",
  RESTAURANT: "delivery_pricing_restaurant",
};

function parseKeywords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
}

function normalizeAddress(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ZoneRow = {
  id: string;
  name: string;
  nameSw: string | null;
  keywords: string[];
  deliveryFee: { toString(): string };
  sortOrder: number;
  active: boolean;
};

function matchZone(
  address: string | null | undefined,
  zones: ZoneRow[]
): { id: string; name: string; deliveryFee: number } | null {
  const haystack = normalizeAddress(address);
  if (!haystack) return null;

  let best: { zone: ZoneRow; score: number } | null = null;

  for (const zone of zones.filter((z) => z.active)) {
    for (const keyword of zone.keywords) {
      if (!keyword) continue;
      if (haystack.includes(keyword)) {
        const score = keyword.length * 1000 - zone.sortOrder;
        if (!best || score > best.score) {
          best = { zone, score };
        }
      }
    }
  }

  if (!best) return null;
  return {
    id: best.zone.id,
    name: best.zone.nameSw ?? best.zone.name,
    deliveryFee: Number(best.zone.deliveryFee),
  };
}

function parseConfig(raw: string | null): DeliveryPricingConfig {
  if (!raw) return { ...DEFAULT_DELIVERY_PRICING };
  try {
    const data = JSON.parse(raw) as Partial<DeliveryPricingConfig>;
    return {
      mode: data.mode ?? DEFAULT_DELIVERY_PRICING.mode,
      flatRateFee: Math.max(0, Number(data.flatRateFee ?? DEFAULT_DELIVERY_PRICING.flatRateFee)),
      minOrderForFreeDelivery: Math.max(
        0,
        Number(data.minOrderForFreeDelivery ?? DEFAULT_DELIVERY_PRICING.minOrderForFreeDelivery)
      ),
      unmatchedZoneFee: Math.max(
        0,
        Number(data.unmatchedZoneFee ?? DEFAULT_DELIVERY_PRICING.unmatchedZoneFee)
      ),
    };
  } catch {
    return { ...DEFAULT_DELIVERY_PRICING };
  }
}

export async function getDeliveryPricingConfig(module: BusinessModule): Promise<DeliveryPricingConfig> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY[module] } });
  return parseConfig(row?.value ?? null);
}

export async function updateDeliveryPricingConfig(
  module: BusinessModule,
  input: Partial<DeliveryPricingConfig>
): Promise<DeliveryPricingConfig> {
  const current = await getDeliveryPricingConfig(module);
  const next: DeliveryPricingConfig = {
    mode: input.mode ?? current.mode,
    flatRateFee: input.flatRateFee ?? current.flatRateFee,
    minOrderForFreeDelivery: input.minOrderForFreeDelivery ?? current.minOrderForFreeDelivery,
    unmatchedZoneFee: input.unmatchedZoneFee ?? current.unmatchedZoneFee,
  };

  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY[module] },
    create: { key: SETTING_KEY[module], value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });

  return next;
}

export async function computeDeliveryQuote(params: {
  module: BusinessModule;
  address?: string | null;
  subtotal: number;
  /** Subscription / package benefit — skips delivery charge */
  forceFreeDelivery?: boolean;
}): Promise<DeliveryQuote> {
  const subtotal = Math.round(Math.max(0, params.subtotal));
  const config = await getDeliveryPricingConfig(params.module);

  if (params.forceFreeDelivery) {
    return {
      subtotal,
      deliveryFee: 0,
      total: subtotal,
      freeDelivery: true,
      mode: config.mode,
      zoneId: null,
      zoneName: null,
      amountToFreeDelivery: null,
    };
  }

  let deliveryFee = 0;
  let zoneId: string | null = null;
  let zoneName: string | null = null;
  let amountToFreeDelivery: number | null = null;

  switch (config.mode) {
    case "FLAT_RATE":
      deliveryFee = config.flatRateFee;
      break;

    case "MIN_ORDER_FREE":
      if (subtotal >= config.minOrderForFreeDelivery) {
        deliveryFee = 0;
      } else {
        deliveryFee = config.flatRateFee;
        amountToFreeDelivery = Math.max(0, config.minOrderForFreeDelivery - subtotal);
      }
      break;

    case "ZONE": {
      const rows = await prisma.deliveryZone.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      const zones: ZoneRow[] = rows.map((z) => ({
        ...z,
        keywords: parseKeywords(z.keywords),
      }));
      const matched = matchZone(params.address, zones);
      if (matched) {
        zoneId = matched.id;
        zoneName = matched.name;
        deliveryFee = matched.deliveryFee;
      } else {
        deliveryFee = config.unmatchedZoneFee;
      }
      break;
    }
  }

  deliveryFee = Math.round(Math.max(0, deliveryFee));

  return {
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    freeDelivery: deliveryFee === 0,
    mode: config.mode,
    zoneId,
    zoneName,
    amountToFreeDelivery,
  };
}
