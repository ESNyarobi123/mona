import { botMessage } from "@monana/i18n";
import { getSession, patchSession, sessionLocale } from "../services/session.service";
import { api } from "../services/api.service";
import { msg } from "./auth.handler";
import { numberedList } from "../utils/formatter";

export function getRestaurantMenu(slot: "BREAKFAST" | "LUNCH" | "DINNER") {
  return api.listRestaurantMenu(slot);
}

type Reply = (text: string) => Promise<void>;

type SlotRow = Awaited<ReturnType<typeof api.listSlots>>["slots"][number];
type SlotsPayload = Awaited<ReturnType<typeof api.listSlots>>;

const SLOT_KEYS: Record<string, "BREAKFAST" | "LUNCH" | "DINNER"> = {
  "1": "BREAKFAST",
  "2": "LUNCH",
  "3": "DINNER",
};

function withBack(phone: string, body: string): string {
  return `${body}\n\n${msg(phone, "backHint")}`;
}

export function formatSlotPickerLines(slots: SlotRow[], locale: "en" | "sw") {
  return slots
    .map((s, i) => {
      const status =
        s.status === "OPEN"
          ? locale === "sw"
            ? "🟢 Wazi"
            : "🟢 Open"
          : locale === "sw"
            ? "🔴 Imefungwa"
            : "🔴 Closed";
      const opensHint =
        s.status === "CLOSED" && s.opensAtTime
          ? locale === "sw"
            ? ` · inafunguka ${s.opensAtTime}`
            : ` · opens ${s.opensAtTime}`
          : "";
      return `${i + 1}. ${s.label} — ${s.deliversFor}\n   ${locale === "sw" ? "Oda" : "Order"}: ${s.orderWindow} · ${status}${opensHint}`;
    })
    .join("\n");
}

function formatRestaurantSchedule(slots: SlotRow[]) {
  return slots
    .map((s) => `• ${s.emoji} ${s.label}: ${s.orderWindow} (${s.deliversFor})`)
    .join("\n");
}

export function formatAllWindowsClosedMessage(locale: "en" | "sw", payload: SlotsPayload) {
  const { slots, nextOpen, timeDisplay } = payload;
  if (!nextOpen) {
    const schedule = formatRestaurantSchedule(slots);
    return locale === "sw"
      ? `⛔ *Dirisha zote za ku-order zimefungwa kwa sasa.*\n\n🕒 Saa sasa (EAT): *${timeDisplay}*\n\n*Ratiba ya dirisha:*\n${schedule}`
      : `⛔ *All order windows are closed right now.*\n\n🕒 Current time (EAT): *${timeDisplay}*\n\n*Schedule:*\n${schedule}`;
  }
  return botMessage(locale, "restaurantAllWindowsClosed", {
    time: timeDisplay,
    schedule: formatRestaurantSchedule(slots),
    nextLabel: nextOpen.label,
    nextTime: nextOpen.opensAtTime,
    nextWindow: nextOpen.orderWindow,
    nextDelivers: nextOpen.deliversFor,
  });
}

export function formatSlotClosedMessage(locale: "en" | "sw", slot: SlotRow) {
  return botMessage(locale, "restaurantSlotClosed", {
    label: slot.label,
    orderWindow: slot.orderWindow,
    deliversFor: slot.deliversFor,
    opensAt: slot.opensAtTime ?? "—",
  });
}

export async function showRestaurantHub(phone: string, reply: Reply) {
  const locale = sessionLocale(phone);
  patchSession(phone, "CHOOSING_RESTAURANT_HUB", { module: "RESTAURANT", cart: [] });
  return reply(withBack(phone, botMessage(locale, "restaurantHubTitle")));
}

export async function handleRestaurantHub(phone: string, choice: string, reply: Reply) {
  const locale = sessionLocale(phone);
  if (choice === "1") {
    const payload = await api.listSlots(locale);
    if (payload.allClosed) {
      patchSession(phone, "CHOOSING_RESTAURANT_HUB", { module: "RESTAURANT", cart: [] });
      return reply(withBack(phone, formatAllWindowsClosedMessage(locale, payload)));
    }
    patchSession(phone, "CHOOSING_SLOT", { module: "RESTAURANT", cart: [] });
    return reply(
      withBack(
        phone,
        botMessage(locale, "restaurantChooseSlot", {
          slots: formatSlotPickerLines(payload.slots, locale),
        })
      )
    );
  }
  if (choice === "2") return startRestaurantMembership(phone, reply);
  if (choice === "3") return showRestaurantMembershipStatus(phone, reply);
  return reply(withBack(phone, botMessage(locale, "restaurantHubTitle")));
}

export async function startRestaurantMembership(phone: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const { userId } = getSession(phone).data;
  if (!userId) return reply(msg(phone, "fallback"));

  const existing = await api.getRestaurantMembership(userId).catch(() => []);
  const active = existing.find((s) => s.status === "ACTIVE" || s.status === "PAUSED");
  if (active) {
    return showRestaurantMembershipStatus(phone, reply);
  }

  patchSession(phone, "CHOOSING_RESTAURANT_MEMBERSHIP_SLOTS", { selectedMealSlots: [] });
  return reply(withBack(phone, botMessage(locale, "restaurantMembershipChooseSlots")));
}

export async function showRestaurantMembershipStatus(phone: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const { userId } = getSession(phone).data;
  if (!userId) return reply(msg(phone, "fallback"));

  const subs = await api.getRestaurantMembership(userId).catch(() => []);
  const active = subs.find((s) => s.status === "ACTIVE" || s.status === "PAUSED");
  if (!active) return reply(botMessage(locale, "restaurantMembershipNone"));

  const slotLabels = active.mealSlots
    .map((s) => {
      if (s === "BREAKFAST") return locale === "sw" ? "Asubuhi" : "Breakfast";
      if (s === "LUNCH") return locale === "sw" ? "Mchana" : "Lunch";
      return locale === "sw" ? "Usiku" : "Dinner";
    })
    .join(", ");

  patchSession(phone, "MANAGING_RESTAURANT_MEMBERSHIP", {
    restaurantMembershipId: active.id,
  });

  return reply(
    `${botMessage(locale, "restaurantMembershipStatus", {
      status: active.status,
      slots: slotLabels,
    })}\n\n${botMessage(locale, "restaurantMembershipManageMenu")}\n\n${msg(phone, "backHint")}`
  );
}

export async function handleRestaurantMembershipManage(phone: string, choice: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const session = getSession(phone);
  const membershipId = session.data.restaurantMembershipId;
  if (!membershipId) return reply(msg(phone, "fallback"));

  if (choice === "1") {
    try {
      await api.pauseRestaurantMembership(membershipId, 1);
      patchSession(phone, "MENU", { restaurantMembershipId: undefined });
      return reply(botMessage(locale, "restaurantMembershipPausedBot"));
    } catch (err) {
      const message = err instanceof Error ? err.message : botMessage(locale, "restaurantMembershipFailed");
      return reply(`❌ ${message}`);
    }
  }

  if (choice === "2") {
    try {
      await api.cancelRestaurantMembership(membershipId);
      patchSession(phone, "MENU", { restaurantMembershipId: undefined });
      return reply(botMessage(locale, "restaurantMembershipLeft"));
    } catch (err) {
      const message = err instanceof Error ? err.message : botMessage(locale, "restaurantMembershipFailed");
      return reply(`❌ ${message}`);
    }
  }

  if (choice === "3") {
    patchSession(phone, "CHOOSING_RESTAURANT_HUB", {
      module: "RESTAURANT",
      cart: [],
      restaurantMembershipId: undefined,
    });
    return handleRestaurantHub(phone, "1", reply);
  }

  return showRestaurantMembershipStatus(phone, reply);
}

function parseSlotChoices(input: string): ("BREAKFAST" | "LUNCH" | "DINNER")[] {
  const tokens = input
    .replace(/,/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const slots = new Set<"BREAKFAST" | "LUNCH" | "DINNER">();
  for (const t of tokens) {
    const slot = SLOT_KEYS[t];
    if (slot) slots.add(slot);
  }
  return [...slots];
}

export async function handleRestaurantMembershipSlots(phone: string, input: string, reply: Reply) {
  const locale = sessionLocale(phone);
  const slots = parseSlotChoices(input);
  if (!slots.length) {
    return reply(withBack(phone, botMessage(locale, "restaurantMembershipChooseSlots")));
  }

  patchSession(phone, "ASK_RESTAURANT_MEMBERSHIP_ADDRESS", { selectedMealSlots: slots });
  return reply(botMessage(locale, "restaurantMembershipAddressHint"));
}

export async function handleRestaurantMembershipAddress(phone: string, address: string, reply: Reply) {
  const session = getSession(phone);
  const locale = sessionLocale(phone);
  const { userId, selectedMealSlots } = session.data;
  if (!userId || !selectedMealSlots?.length) {
    return reply(msg(phone, "fallback"));
  }

  const trimmed = address.trim();
  const skip =
    trimmed === "-" || trimmed.toLowerCase() === "skip" || trimmed.toLowerCase() === "ruka";

  try {
    await api.enrollRestaurantMembership({
      userId,
      mealSlots: selectedMealSlots as ("BREAKFAST" | "LUNCH" | "DINNER")[],
      address: skip ? undefined : trimmed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : botMessage(locale, "restaurantMembershipFailed");
    return reply(`❌ ${message}`);
  }

  const slotLabels = (selectedMealSlots as string[])
    .map((s) => {
      if (s === "BREAKFAST") return locale === "sw" ? "Asubuhi" : "Breakfast";
      if (s === "LUNCH") return locale === "sw" ? "Mchana" : "Lunch";
      return locale === "sw" ? "Usiku" : "Dinner";
    })
    .join(", ");

  patchSession(phone, "MENU", { selectedMealSlots: undefined, cart: [] });
  return reply(botMessage(locale, "restaurantMembershipEnrolled", { slots: slotLabels }));
}

export function renderRestaurantMembershipSlotPicker(locale: "en" | "sw") {
  const lines = [
    { n: 1, label: locale === "sw" ? "Asubuhi" : "Breakfast", emoji: "🌅" },
    { n: 2, label: locale === "sw" ? "Mchana" : "Lunch", emoji: "☀️" },
    { n: 3, label: locale === "sw" ? "Usiku" : "Dinner", emoji: "🌙" },
  ];
  return numberedList(lines.map((l) => `${l.emoji} ${l.label}`));
}
