import type { AppLocale } from "@monana/i18n";
import { dayOfWeekLabel } from "./subscription";

/** Grocery deliveries: Wednesday and Saturday only (0=Sun … 6=Sat). */
export const GROCERY_DELIVERY_DOW = [3, 6] as const;

const TZ = "Africa/Dar_es_Salaam";
const DEFAULT_DELIVERY_HOUR = 9;
const DEFAULT_CUTOFF_HOURS = 48;

export type GroceryDeliverySlot = {
  /** YYYY-MM-DD in Tanzania */
  date: string;
  dayOfWeek: number;
  label: string;
  deliveryAt: string;
  weekLabel: string;
};

export function isGroceryDeliveryDay(dow: number): boolean {
  return (GROCERY_DELIVERY_DOW as readonly number[]).includes(dow);
}

export function assertGroceryDeliveryDay(dow: number): void {
  if (!isGroceryDeliveryDay(dow)) {
    throw new Error("Utoaji wa grocery unapatikana Jumatano na Jumamosi pekee");
  }
}

/** Recurring weekly choice — "Kila Jumatano" / "Every Wednesday". */
export function groceryRecurringDeliveryDays(lang: AppLocale = "en") {
  return GROCERY_DELIVERY_DOW.map((dow) => ({
    value: dow,
    label: lang === "sw" ? `Kila ${dayOfWeekLabel(dow, "sw")}` : `Every ${dayOfWeekLabel(dow, "en")}`,
  }));
}

export function groceryDateInTz(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function dayOfWeekInTz(d: Date): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? d.getDay();
}

/** Delivery datetime at 09:00 Tanzania time. */
export function deliveryAtOnDate(isoDate: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new Error("Tarehe ya utoaji lazima iwe YYYY-MM-DD");
  }
  return new Date(`${isoDate}T0${DEFAULT_DELIVERY_HOUR}:00:00+03:00`);
}

export function isBeforeDeliveryCutoff(deliveryAt: Date, cutoffHours = DEFAULT_CUTOFF_HOURS): boolean {
  const cutoff = new Date(deliveryAt.getTime() - cutoffHours * 3_600_000);
  return new Date() < cutoff;
}

function startOfWeekSundayInTz(d: Date): string {
  const dow = dayOfWeekInTz(d);
  const anchor = deliveryAtOnDate(groceryDateInTz(d));
  anchor.setDate(anchor.getDate() - dow);
  return groceryDateInTz(anchor);
}

function weekLabelForDate(from: Date, targetDate: string, locale: AppLocale): string {
  const fromWeek = startOfWeekSundayInTz(from);
  const targetWeek = startOfWeekSundayInTz(deliveryAtOnDate(targetDate));
  if (fromWeek === targetWeek) {
    return locale === "sw" ? "Wiki hii" : "This week";
  }
  return locale === "sw" ? "Wiki ijayo" : "Next week";
}

export function formatGroceryDeliverySlotLabel(isoDate: string, locale: AppLocale = "en"): string {
  const deliveryAt = deliveryAtOnDate(isoDate);
  const dow = dayOfWeekInTz(deliveryAt);
  const day = dayOfWeekLabel(dow, locale);
  const datePart = deliveryAt.toLocaleDateString(locale === "sw" ? "sw-TZ" : "en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  });
  return `${day} ${datePart}`;
}

/** Upcoming Wed/Sat slots still open before cutoff (this week + next week). */
export function getUpcomingGroceryDeliverySlots(opts?: {
  from?: Date;
  cutoffHours?: number;
  locale?: AppLocale;
}): GroceryDeliverySlot[] {
  const from = opts?.from ?? new Date();
  const cutoffHours = opts?.cutoffHours ?? DEFAULT_CUTOFF_HOURS;
  const locale = opts?.locale ?? "en";
  const slots: GroceryDeliverySlot[] = [];
  const start = groceryDateInTz(from);

  for (let offset = 0; offset < 14; offset++) {
    const cursor = deliveryAtOnDate(start);
    cursor.setDate(cursor.getDate() + offset);
    const date = groceryDateInTz(cursor);
    const dow = dayOfWeekInTz(cursor);
    if (!isGroceryDeliveryDay(dow)) continue;

    const deliveryAt = deliveryAtOnDate(date);
    if (!isBeforeDeliveryCutoff(deliveryAt, cutoffHours)) continue;

    slots.push({
      date,
      dayOfWeek: dow,
      label: formatGroceryDeliverySlotLabel(date, locale),
      deliveryAt: deliveryAt.toISOString(),
      weekLabel: weekLabelForDate(from, date, locale),
    });
  }

  return slots;
}

/** Group consecutive slots by week label for picker UI (This week / Next week). */
export function groupGroceryDeliverySlotsByWeek<T extends { weekLabel: string }>(slots: T[]) {
  const groups: { weekLabel: string; slots: T[] }[] = [];
  for (const slot of slots) {
    const last = groups[groups.length - 1];
    if (last?.weekLabel === slot.weekLabel) {
      last.slots.push(slot);
    } else {
      groups.push({ weekLabel: slot.weekLabel, slots: [slot] });
    }
  }
  return groups;
}

export function validateGroceryScheduledFor(
  scheduledFor: string | Date,
  cutoffHours = DEFAULT_CUTOFF_HOURS
): Date {
  const deliveryAt = scheduledFor instanceof Date ? scheduledFor : new Date(scheduledFor);
  if (Number.isNaN(deliveryAt.getTime())) {
    throw new Error("Tarehe ya utoaji si sahihi");
  }
  const dow = dayOfWeekInTz(deliveryAt);
  assertGroceryDeliveryDay(dow);
  if (!isBeforeDeliveryCutoff(deliveryAt, cutoffHours)) {
    throw new Error("Muda wa kuagiza kwa siku hii ya utoaji umepita. Chagua Jumatano au Jumamosi nyingine.");
  }
  return deliveryAt;
}
