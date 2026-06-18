import { prisma, type MealSlot } from "@monana/db";
import { formatPricePerUnit } from "@monana/utils";
import { notifyRestaurantMembershipSlotOpen } from "@monana/notifications";
import { getMealSlotWindows, isSlotOpen, TZ_EAT } from "./meal-slots";

const SLOT_OPEN_STATE_KEY = "restaurant_slot_open_state";

function getEatDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_EAT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function readOpenState(): Promise<{ eatDate: string; openSlots: MealSlot[] }> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SLOT_OPEN_STATE_KEY } });
  if (!row) return { eatDate: "", openSlots: [] };
  try {
    return JSON.parse(row.value) as { eatDate: string; openSlots: MealSlot[] };
  } catch {
    return { eatDate: "", openSlots: [] };
  }
}

async function writeOpenState(eatDate: string, openSlots: MealSlot[]) {
  await prisma.systemSetting.upsert({
    where: { key: SLOT_OPEN_STATE_KEY },
    create: { key: SLOT_OPEN_STATE_KEY, value: JSON.stringify({ eatDate, openSlots }) },
    update: { value: JSON.stringify({ eatDate, openSlots }) },
  });
}

async function getNewlyOpenedSlots(now = new Date()): Promise<MealSlot[]> {
  const windows = await getMealSlotWindows();
  const currentlyOpen = windows.filter((w) => isSlotOpen(w, now)).map((w) => w.slot);
  const eatDate = getEatDateString(now);

  const prev = await readOpenState();
  const prevOpen = prev.eatDate === eatDate ? prev.openSlots : [];
  const newlyOpened = currentlyOpen.filter((s) => !prevOpen.includes(s));

  await writeOpenState(eatDate, currentlyOpen);
  return newlyOpened;
}

function formatMenuLines(
  items: { id: string; name: string; price: unknown; unit?: string }[],
  locale: "en" | "sw"
) {
  return items
    .slice(0, 15)
    .map((item, i) => {
      const price = formatPricePerUnit(Number(item.price), item.unit ?? "PIECE", locale);
      return `${i + 1}. ${item.name} — ${price}`;
    })
    .join("\n");
}

export async function processRestaurantSlotReminders(now = new Date()) {
  const newlyOpened = await getNewlyOpenedSlots(now);
  if (!newlyOpened.length) {
    return { notified: 0, slots: [] as MealSlot[] };
  }

  const eatDate = getEatDateString(now);
  let notified = 0;

  for (const slot of newlyOpened) {
    const items = await prisma.menuItem.findMany({
      where: { available: true, mealSlots: { has: slot } },
      orderBy: { name: "asc" },
      take: 15,
    });
    const subs = await prisma.restaurantSubscription.findMany({
      where: {
        status: "ACTIVE",
        mealSlots: { has: slot },
        user: { phone: { not: "" } },
      },
      include: { user: { select: { id: true, phone: true, locale: true } } },
    });

    for (const sub of subs) {
      const already = await prisma.restaurantSlotReminderLog.findUnique({
        where: { userId_slot_eatDate: { userId: sub.userId, slot, eatDate } },
      });
      if (already) continue;

      const locale = sub.user.locale === "sw" ? "sw" : "en";
      const menuLines =
        items.length > 0
          ? formatMenuLines(items, locale)
          : locale === "sw"
            ? "(Hakuna menyu kwa sasa)"
            : "(No menu items right now)";

      const menuPayload = items.slice(0, 15).map((item) => ({
        id: item.id,
        name: item.name,
        price: String(item.price),
        unit: item.unit,
      }));

      const sent = await notifyRestaurantMembershipSlotOpen({
        phone: sub.user.phone,
        userId: sub.userId,
        slot,
        menuLines,
        locale,
        menuItems: menuPayload,
      });

      if (sent) {
        await prisma.restaurantSlotReminderLog.create({
          data: { userId: sub.userId, slot, eatDate },
        });
        notified += 1;
      }
    }
  }

  return { notified, slots: newlyOpened };
}
