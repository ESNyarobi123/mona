import { prisma, type MealSlot } from "@monana/db";
import {
  DEFAULT_MEAL_SLOT_WINDOWS,
  getMealSlotWindows,
  TZ_EAT,
  type MealSlotWindow,
} from "./meal-slot-settings";
import { displayOrderCount, getLandingTickerSettings } from "@monana/settings";

export { DEFAULT_MEAL_SLOT_WINDOWS, TZ_EAT, type MealSlotWindow } from "./meal-slot-settings";
export {
  getMealSlotWindows,
  updateMealSlotWindows,
  getMealSlotSettingsPayload,
  validateMealSlotWindows,
  invalidateMealSlotWindowsCache,
} from "./meal-slot-settings";

/** @deprecated use DEFAULT_MEAL_SLOT_WINDOWS or getMealSlotWindows() */
export const MEAL_SLOT_WINDOWS = DEFAULT_MEAL_SLOT_WINDOWS;

export type MealSlotStatus = "OPEN" | "CLOSED";

const SLOT_LABELS: Record<MealSlot, { en: string; sw: string; emoji: string }> = {
  BREAKFAST: { en: "Breakfast", sw: "Asubuhi", emoji: "🌅" },
  LUNCH: { en: "Lunch", sw: "Mchana", emoji: "☀️" },
  DINNER: { en: "Dinner", sw: "Usiku", emoji: "🌙" },
};

const DELIVERS_FOR: Record<MealSlot, { en: string; sw: string }> = {
  BREAKFAST: { en: "Tomorrow morning", sw: "Kesho asubuhi" },
  LUNCH: { en: "Today lunch", sw: "Mchana leo" },
  DINNER: { en: "Tonight", sw: "Usiku wa leo" },
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatOrderWindow(window: MealSlotWindow) {
  const start = `${pad2(window.startHour)}:${pad2(window.startMinute)}`;
  if (window.endsAtMidnight) return `${start} – 00:00`;
  return `${start} – ${pad2(window.endHour)}:${pad2(window.endMinute)}`;
}

export function getLocalTimeParts(date = new Date(), timeZone = TZ_EAT) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { hour, minute, display: `${pad2(hour)}:${pad2(minute)}` };
}

export function getLocalMinutes(date = new Date(), timeZone = TZ_EAT) {
  const { hour, minute } = getLocalTimeParts(date, timeZone);
  return hour * 60 + minute;
}

export function isSlotOpen(window: MealSlotWindow, date = new Date(), timeZone = TZ_EAT): boolean {
  const now = getLocalMinutes(date, timeZone);
  const start = window.startHour * 60 + window.startMinute;

  if (window.endsAtMidnight) {
    return now >= start;
  }

  const end = window.endHour * 60 + window.endMinute;
  return now >= start && now < end;
}

export function buildMealSlotDefinitions(
  windows: MealSlotWindow[],
  locale: "en" | "sw" = "en",
  now = new Date()
): MealSlotDefinition[] {
  return windows.map((window) => {
    const meta = SLOT_LABELS[window.slot];
    const delivers = DELIVERS_FOR[window.slot];
    const orderWindow = formatOrderWindow(window);
    return {
      slot: window.slot,
      label: locale === "sw" ? meta.sw : meta.en,
      emoji: meta.emoji,
      hours: orderWindow,
      orderWindow,
      deliversFor: locale === "sw" ? delivers.sw : delivers.en,
      status: isSlotOpen(window, now) ? "OPEN" : "CLOSED",
    };
  });
}

export async function getMealSlotStatus(
  slot: MealSlot,
  date = new Date(),
  timeZone = TZ_EAT
): Promise<MealSlotStatus> {
  const windows = await getMealSlotWindows();
  const window = windows.find((w) => w.slot === slot);
  if (!window) return "CLOSED";
  return isSlotOpen(window, date, timeZone) ? "OPEN" : "CLOSED";
}

export type MealSlotDefinition = {
  slot: MealSlot;
  label: string;
  emoji: string;
  hours: string;
  orderWindow: string;
  deliversFor: string;
  status: MealSlotStatus;
};

export async function getMealSlotDefinitions(
  locale: "en" | "sw" = "en",
  now = new Date()
): Promise<MealSlotDefinition[]> {
  const windows = await getMealSlotWindows();
  return buildMealSlotDefinitions(windows, locale, now);
}

export async function assertMealSlotOpen(slot: MealSlot, now = new Date()) {
  const windows = await getMealSlotWindows();
  const window = windows.find((w) => w.slot === slot);
  if (!window || !isSlotOpen(window, now)) {
    const hours = window ? formatOrderWindow(window) : "";
    throw new Error(`Dirisha la ku-order limefungwa (${slot}). Saa: ${hours}`);
  }
}

function startOfTodayEat(date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_EAT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return new Date(`${y}-${m}-${d}T00:00:00+03:00`);
}

export type RestaurantSlotTickerItem = MealSlotDefinition & {
  orderCount: number;
  /** Real orders today — only when requested (admin breakdown) */
  realOrderCount?: number;
};

export type RestaurantSlotTickerData = {
  timeDisplay: string;
  timezone: string;
  slots: RestaurantSlotTickerItem[];
  /** Whether landing ticker shows order counts */
  showOrderCounts: boolean;
};

export async function getRestaurantSlotTicker(
  locale: "en" | "sw" = "en",
  now = new Date(),
  opts?: { applyLandingBoost?: boolean; includeBreakdown?: boolean }
): Promise<RestaurantSlotTickerData> {
  const applyBoost = opts?.applyLandingBoost !== false;
  const includeBreakdown = opts?.includeBreakdown === true;
  const landingSettings = applyBoost ? await getLandingTickerSettings() : null;

  const todayStart = startOfTodayEat(now);
  const { display: timeDisplay } = getLocalTimeParts(now);
  const windows = await getMealSlotWindows();

  const orders = await prisma.order.groupBy({
    by: ["mealSlot"],
    where: {
      module: "RESTAURANT",
      createdAt: { gte: todayStart },
      status: { not: "CANCELLED" },
      mealSlot: { not: null },
    },
    _count: { _all: true },
  });

  const countBySlot = new Map<MealSlot, number>();
  for (const row of orders) {
    if (row.mealSlot) countBySlot.set(row.mealSlot, row._count._all);
  }

  const slots = buildMealSlotDefinitions(windows, locale, now).map((def) => {
    const real = countBySlot.get(def.slot) ?? 0;
    const orderCount =
      applyBoost && landingSettings
        ? displayOrderCount(real, def.slot, landingSettings)
        : real;
    return {
      ...def,
      orderCount,
      ...(includeBreakdown ? { realOrderCount: real } : {}),
    };
  });

  return {
    timeDisplay,
    timezone: TZ_EAT,
    slots,
    showOrderCounts: landingSettings?.showOrderCounts ?? true,
  };
}
