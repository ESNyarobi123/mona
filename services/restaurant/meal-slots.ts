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

/** Minutes until this window opens; 0 when already open. */
export function minutesUntilSlotOpens(window: MealSlotWindow, nowMinutes: number): number {
  const start = window.startHour * 60 + window.startMinute;

  if (window.endsAtMidnight) {
    if (nowMinutes >= start) return 0;
    return start - nowMinutes;
  }

  const end = window.endHour * 60 + window.endMinute;
  if (nowMinutes >= start && nowMinutes < end) return 0;
  if (nowMinutes < start) return start - nowMinutes;
  return 24 * 60 - nowMinutes + start;
}

function minutesToClock(minutes: number) {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`;
}

export function getOpensAtTime(
  window: MealSlotWindow,
  date = new Date(),
  timeZone = TZ_EAT
): string | null {
  const nowMinutes = getLocalMinutes(date, timeZone);
  const minutes = minutesUntilSlotOpens(window, nowMinutes);
  if (minutes === 0) return null;
  return minutesToClock(nowMinutes + minutes);
}

export type NextMealSlotOpening = {
  slot: MealSlot;
  label: string;
  emoji: string;
  orderWindow: string;
  deliversFor: string;
  opensAtTime: string;
  opensInMinutes: number;
};

export function getNextMealSlotOpening(
  windows: MealSlotWindow[],
  locale: "en" | "sw" = "en",
  now = new Date(),
  timeZone = TZ_EAT
): NextMealSlotOpening | null {
  const nowMinutes = getLocalMinutes(now, timeZone);
  let best: { window: MealSlotWindow; minutes: number } | null = null;

  for (const window of windows) {
    const minutes = minutesUntilSlotOpens(window, nowMinutes);
    if (minutes === 0) return null;
    if (!best || minutes < best.minutes) {
      best = { window, minutes };
    }
  }

  if (!best) return null;

  const meta = SLOT_LABELS[best.window.slot];
  const delivers = DELIVERS_FOR[best.window.slot];

  return {
    slot: best.window.slot,
    label: locale === "sw" ? meta.sw : meta.en,
    emoji: meta.emoji,
    orderWindow: formatOrderWindow(best.window),
    deliversFor: locale === "sw" ? delivers.sw : delivers.en,
    opensAtTime: minutesToClock(nowMinutes + best.minutes),
    opensInMinutes: best.minutes,
  };
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
    const open = isSlotOpen(window, now);
    return {
      slot: window.slot,
      label: locale === "sw" ? meta.sw : meta.en,
      emoji: meta.emoji,
      hours: orderWindow,
      orderWindow,
      deliversFor: locale === "sw" ? delivers.sw : delivers.en,
      status: open ? "OPEN" : "CLOSED",
      opensAtTime: open ? null : getOpensAtTime(window, now),
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
  /** EAT clock time when this window opens next (only when status is CLOSED). */
  opensAtTime: string | null;
};

export type MealSlotsPayload = {
  slots: MealSlotDefinition[];
  allClosed: boolean;
  nextOpen: NextMealSlotOpening | null;
  timeDisplay: string;
};

export async function getMealSlotDefinitions(
  locale: "en" | "sw" = "en",
  now = new Date()
): Promise<MealSlotDefinition[]> {
  const windows = await getMealSlotWindows();
  return buildMealSlotDefinitions(windows, locale, now);
}

export async function getMealSlotsPayload(
  locale: "en" | "sw" = "en",
  now = new Date()
): Promise<MealSlotsPayload> {
  const windows = await getMealSlotWindows();
  const slots = buildMealSlotDefinitions(windows, locale, now);
  const allClosed = slots.every((slot) => slot.status === "CLOSED");
  const { display: timeDisplay } = getLocalTimeParts(now);
  return {
    slots,
    allClosed,
    nextOpen: allClosed ? getNextMealSlotOpening(windows, locale, now) : null,
    timeDisplay,
  };
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
