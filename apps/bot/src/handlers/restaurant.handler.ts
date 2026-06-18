import { botMessage } from "@monana/i18n";
import { getSession, patchSession, sessionLocale } from "../services/session.service";
import { api } from "../services/api.service";
import { msg } from "./auth.handler";
import { numberedList } from "../utils/formatter";

export function getRestaurantMenu(slot: "BREAKFAST" | "LUNCH" | "DINNER") {
  return api.listRestaurantMenu(slot);
}

type Reply = (text: string) => Promise<void>;

const SLOT_KEYS: Record<string, "BREAKFAST" | "LUNCH" | "DINNER"> = {
  "1": "BREAKFAST",
  "2": "LUNCH",
  "3": "DINNER",
};

function withBack(phone: string, body: string): string {
  return `${body}\n\n${msg(phone, "backHint")}`;
}

export async function showRestaurantHub(phone: string, reply: Reply) {
  const locale = sessionLocale(phone);
  patchSession(phone, "CHOOSING_RESTAURANT_HUB", { module: "RESTAURANT", cart: [] });
  return reply(withBack(phone, botMessage(locale, "restaurantHubTitle")));
}

export async function handleRestaurantHub(phone: string, choice: string, reply: Reply) {
  const locale = sessionLocale(phone);
  if (choice === "1") {
    const slots = await api.listSlots(locale);
    patchSession(phone, "CHOOSING_SLOT", { module: "RESTAURANT", cart: [] });
    const lines = slots.map((s, i) => {
      const status =
        s.status === "OPEN"
          ? locale === "sw"
            ? "🟢 Wazi"
            : "🟢 Open"
          : locale === "sw"
            ? "🔴 Imefungwa"
            : "🔴 Closed";
      return `${i + 1}. ${s.label} — ${s.deliversFor}\n   ${locale === "sw" ? "Oda" : "Order"}: ${s.orderWindow} · ${status}`;
    });
    return reply(
      withBack(
        phone,
        `${locale === "sw" ? "👉 Chagua namba ya dirisha." : "👉 Reply with a slot number."}\n${lines.join("\n")}`
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
    return reply(botMessage(locale, "restaurantMembershipActive", { slots: active.mealSlots.join(", ") }));
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

  return reply(
    botMessage(locale, "restaurantMembershipStatus", {
      status: active.status,
      slots: slotLabels,
    })
  );
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
