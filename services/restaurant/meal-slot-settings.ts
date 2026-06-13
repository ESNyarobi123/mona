import { prisma, type MealSlot } from "@monana/db";

export const TZ_EAT = "Africa/Dar_es_Salaam";

/** When customers can place orders (not meal serving times). */
export type MealSlotWindow = {
  slot: MealSlot;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  /** Window ends at midnight (00:00) the same evening — e.g. 17:00–00:00 */
  endsAtMidnight?: boolean;
};

export const DEFAULT_MEAL_SLOT_WINDOWS: MealSlotWindow[] = [
  { slot: "BREAKFAST", startHour: 17, startMinute: 0, endHour: 0, endMinute: 0, endsAtMidnight: true },
  { slot: "LUNCH", startHour: 6, startMinute: 0, endHour: 10, endMinute: 0 },
  { slot: "DINNER", startHour: 11, startMinute: 0, endHour: 15, endMinute: 0 },
];

const SETTING_KEY = "restaurant_meal_slot_windows";
const REQUIRED_SLOTS: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER"];

let cachedWindows: MealSlotWindow[] | null = null;

export function invalidateMealSlotWindowsCache() {
  cachedWindows = null;
}

function validateWindow(window: MealSlotWindow) {
  if (window.startHour < 0 || window.startHour > 23) throw new Error("Saa ya kuanza si sahihi");
  if (window.startMinute < 0 || window.startMinute > 59) throw new Error("Dakika ya kuanza si sahihi");
  if (!window.endsAtMidnight) {
    if (window.endHour < 0 || window.endHour > 23) throw new Error("Saa ya mwisho si sahihi");
    if (window.endMinute < 0 || window.endMinute > 59) throw new Error("Dakika ya mwisho si sahihi");
    const start = window.startHour * 60 + window.startMinute;
    const end = window.endHour * 60 + window.endMinute;
    if (start >= end) throw new Error("Saa ya kuanza lazima iwe kabla ya mwisho");
  }
}

export function validateMealSlotWindows(windows: MealSlotWindow[]) {
  if (windows.length !== 3) throw new Error("Dirisha tatu zinahitajika (asubuhi, mchana, usiku)");
  for (const slot of REQUIRED_SLOTS) {
    const row = windows.find((w) => w.slot === slot);
    if (!row) throw new Error(`Dirisha la ${slot} halipo`);
    validateWindow(row);
  }
}

export async function getMealSlotWindows(): Promise<MealSlotWindow[]> {
  if (cachedWindows) return cachedWindows;

  const row = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row?.value) {
    cachedWindows = DEFAULT_MEAL_SLOT_WINDOWS;
    return cachedWindows;
  }

  try {
    const parsed = JSON.parse(row.value) as MealSlotWindow[];
    validateMealSlotWindows(parsed);
    cachedWindows = parsed;
    return cachedWindows;
  } catch {
    cachedWindows = DEFAULT_MEAL_SLOT_WINDOWS;
    return cachedWindows;
  }
}

export async function updateMealSlotWindows(windows: MealSlotWindow[]) {
  validateMealSlotWindows(windows);
  const ordered = REQUIRED_SLOTS.map(
    (slot) => windows.find((w) => w.slot === slot) as MealSlotWindow
  );
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: JSON.stringify(ordered) },
    update: { value: JSON.stringify(ordered) },
  });
  cachedWindows = ordered;
  return ordered;
}

export async function getMealSlotSettingsPayload() {
  const windows = await getMealSlotWindows();
  return { windows, timezone: TZ_EAT };
}
