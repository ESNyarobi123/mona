import { prisma } from "@monana/db";
import { DEFAULT_MARKET_SETTINGS, type GroceryMarketSettings } from "./market-types";

const KEYS = {
  AUTO: "grocery_market_auto_enabled",
  CUTOFF_WEEKDAY: "grocery_market_cutoff_weekday",
  CUTOFF_HOUR: "grocery_market_cutoff_hour",
  LAST_AUTO: "grocery_market_last_auto_run",
} as const;

const TZ = "Africa/Dar_es_Salaam";

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** Calendar date YYYY-MM-DD in Tanzania. */
export function formatDateTz(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Parse YYYY-MM-DD to UTC midnight reference for @db.Date storage. */
export function parseDeliveryDate(isoDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new Error("deliveryDate lazima iwe YYYY-MM-DD");
  }
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** Start/end of delivery day in UTC for querying scheduledFor. */
export function deliveryDayBounds(isoDate: string) {
  const start = new Date(`${isoDate}T00:00:00.000+03:00`);
  const end = new Date(`${isoDate}T23:59:59.999+03:00`);
  return { start, end };
}

export function nowInTz(): Date {
  return new Date();
}

export function getTzParts(d = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    hour: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    weekday: weekdayMap[parts.weekday] ?? 0,
    hour: Number(parts.hour),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export async function getMarketSettings(): Promise<GroceryMarketSettings> {
  const [auto, weekday, hour, lastAuto] = await Promise.all([
    getSetting(KEYS.AUTO),
    getSetting(KEYS.CUTOFF_WEEKDAY),
    getSetting(KEYS.CUTOFF_HOUR),
    getSetting(KEYS.LAST_AUTO),
  ]);

  return {
    autoGenerateEnabled: auto === null ? DEFAULT_MARKET_SETTINGS.autoGenerateEnabled : auto === "true",
    cutoffWeekday: weekday === null ? DEFAULT_MARKET_SETTINGS.cutoffWeekday : Number(weekday),
    cutoffHour: hour === null ? DEFAULT_MARKET_SETTINGS.cutoffHour : Number(hour),
    lastAutoRunDate: lastAuto,
  };
}

export async function updateMarketSettings(input: Partial<GroceryMarketSettings>) {
  if (input.autoGenerateEnabled !== undefined) {
    await setSetting(KEYS.AUTO, input.autoGenerateEnabled ? "true" : "false");
  }
  if (input.cutoffWeekday !== undefined) {
    const w = Math.max(0, Math.min(6, input.cutoffWeekday));
    await setSetting(KEYS.CUTOFF_WEEKDAY, String(w));
  }
  if (input.cutoffHour !== undefined) {
    const h = Math.max(0, Math.min(23, input.cutoffHour));
    await setSetting(KEYS.CUTOFF_HOUR, String(h));
  }
  if (input.lastAutoRunDate !== undefined) {
    if (input.lastAutoRunDate) await setSetting(KEYS.LAST_AUTO, input.lastAutoRunDate);
  }
  return getMarketSettings();
}

/** Next calendar day after `isoDate`. */
export function nextCalendarDay(isoDate: string): string {
  const d = parseDeliveryDate(isoDate);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** True when cron should generate reports (cutoff evening → tomorrow's delivery). */
export function isMarketCutoffDue(settings: GroceryMarketSettings, now = new Date()) {
  if (!settings.autoGenerateEnabled) return { due: false as const, reason: "auto_disabled" };

  const parts = getTzParts(now);
  if (parts.weekday !== settings.cutoffWeekday) {
    return { due: false as const, reason: "wrong_weekday" };
  }
  if (parts.hour < settings.cutoffHour) {
    return { due: false as const, reason: "before_cutoff_hour" };
  }

  const deliveryDate = nextCalendarDay(parts.date);
  if (settings.lastAutoRunDate === deliveryDate) {
    return { due: false as const, reason: "already_ran", deliveryDate };
  }

  return { due: true as const, deliveryDate, cutoffDate: parts.date };
}

export async function markAutoRunComplete(deliveryDate: string) {
  await setSetting(KEYS.LAST_AUTO, deliveryDate);
}
