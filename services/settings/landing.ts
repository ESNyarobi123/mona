import { prisma } from "@monana/db";
import type { MealSlot } from "@monana/db";

export const LANDING_TICKER_KEY = "landing_ticker_settings";

export type LandingTickerSettings = {
  /** Show "N orders today" on the public landing ticker */
  showOrderCounts: boolean;
  /** Added to real orders per meal slot (social proof boost) */
  orderBoostBySlot: Record<MealSlot, number>;
};

const SLOT_KEYS: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER"];

export const DEFAULT_LANDING_TICKER_SETTINGS: LandingTickerSettings = {
  showOrderCounts: true,
  orderBoostBySlot: { BREAKFAST: 0, LUNCH: 0, DINNER: 0 },
};

function clampBoost(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(Math.floor(v), 9999);
}

function parseStored(raw: string | null): LandingTickerSettings {
  if (!raw?.trim()) return { ...DEFAULT_LANDING_TICKER_SETTINGS };
  try {
    const data = JSON.parse(raw) as Partial<LandingTickerSettings>;
    const boosts = (data.orderBoostBySlot ?? {}) as Partial<Record<MealSlot, number>>;
    return {
      showOrderCounts: data.showOrderCounts !== false,
      orderBoostBySlot: {
        BREAKFAST: clampBoost(boosts.BREAKFAST),
        LUNCH: clampBoost(boosts.LUNCH),
        DINNER: clampBoost(boosts.DINNER),
      },
    };
  } catch {
    return { ...DEFAULT_LANDING_TICKER_SETTINGS };
  }
}

export async function getLandingTickerSettings(): Promise<LandingTickerSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: LANDING_TICKER_KEY } });
  return parseStored(row?.value ?? null);
}

export async function updateLandingTickerSettings(
  input: Partial<{
    showOrderCounts: boolean;
    orderBoostBySlot: Partial<Record<MealSlot, number>>;
  }>
): Promise<LandingTickerSettings> {
  const current = await getLandingTickerSettings();
  const next: LandingTickerSettings = {
    showOrderCounts: input.showOrderCounts ?? current.showOrderCounts,
    orderBoostBySlot: { ...current.orderBoostBySlot },
  };

  if (input.orderBoostBySlot) {
    for (const slot of SLOT_KEYS) {
      if (input.orderBoostBySlot[slot] !== undefined) {
        next.orderBoostBySlot[slot] = clampBoost(input.orderBoostBySlot[slot]);
      }
    }
  }

  await prisma.systemSetting.upsert({
    where: { key: LANDING_TICKER_KEY },
    create: { key: LANDING_TICKER_KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });

  return next;
}

/** Public display count = real orders today + admin boost */
export function displayOrderCount(
  real: number,
  slot: MealSlot,
  settings: LandingTickerSettings
): number {
  if (!settings.showOrderCounts) return 0;
  return real + (settings.orderBoostBySlot[slot] ?? 0);
}
