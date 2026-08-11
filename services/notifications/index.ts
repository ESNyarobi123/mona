// Notifications via WhatsApp bot bridge (POST BOT_URL/send).
import { formatTZS, normalizeTanzaniaPhone, moduleLabel } from "@monana/utils";
import { getAdminWhatsappNumber } from "@monana/settings";

const BOT_URL = process.env.BOT_URL ?? "http://localhost:4000";

export { NOTIFICATION_TEMPLATES } from "./templates";
export type { NotificationTemplateId } from "./templates";

function shortId(id: string): string {
  return id.slice(-6).toUpperCase();
}

/** Send WhatsApp text. Returns true if bot accepted the message. */
export async function sendMessage(phone: string, text: string): Promise<boolean> {
  const to = normalizeTanzaniaPhone(phone);
  try {
    const res = await fetch(`${BOT_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: to, text }),
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
    if (!res.ok || !json.success) {
      console.error("[notifications] send failed:", to, json.error ?? res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notifications] sendMessage failed:", err);
    return false;
  }
}

export async function notifyCustomer(phone: string, text: string): Promise<boolean> {
  return sendMessage(phone, text);
}

/** WhatsApp OTP for web password reset / set. */
export async function notifyPasswordResetCode(params: {
  phone: string;
  code: string;
  locale?: "en" | "sw";
  expiresMinutes?: number;
  name?: string | null;
}): Promise<boolean> {
  const mins = params.expiresMinutes ?? 15;
  const greeting = params.name?.trim() ? `${params.name.trim()}, ` : "";
  const text =
    params.locale === "sw"
      ? `${greeting}Msimbo wako wa kubadilisha nywila ya Monana ni: *${params.code}*\n\nMsimbo unaisha baada ya dakika ${mins}. Usishiriki msimbo na mtu yeyote.`
      : `${greeting}Your Monana password reset code is: *${params.code}*\n\nThis code expires in ${mins} minutes. Do not share it with anyone.`;
  return sendMessage(params.phone, text);
}

export async function notifyAdmin(text: string): Promise<boolean> {
  const admin = await getAdminWhatsappNumber();
  if (!admin) {
    console.warn("[notifications] Admin WhatsApp haijasanidi (settings au .env)");
    return false;
  }
  return sendMessage(admin, text);
}

// ——— Admin alerts (kwenda namba ya admin kwenye .env) ———

export async function notifyAdminNewUser(user: {
  name?: string | null;
  phone: string;
  channel?: "WEB" | "WHATSAPP";
}) {
  const ch = user.channel === "WHATSAPP" ? "WhatsApp Bot" : "Web";
  return notifyAdmin(
    `👤 *Mtumiaji mpya*\n` +
      `Jina: ${user.name ?? "—"}\n` +
      `Simu: ${user.phone}\n` +
      `Channel: ${ch}\n` +
      `Wakati: ${new Date().toLocaleString("sw-TZ")}`
  );
}

export async function notifyAdminNewOrder(params: {
  id: string;
  module: string;
  channel: string;
  total: number | string;
  address?: string | null;
  note?: string | null;
  mealSlot?: string | null;
  customer?: { name?: string | null; phone: string } | null;
  items?: Array<{ name: string; quantity: number; price: number | string }>;
}) {
  const brand = moduleLabel(params.module as "RESTAURANT" | "GROCERY").title;
  const lines =
    params.items?.map((i) => `  • ${i.quantity}x ${i.name}`).join("\n") ?? "  (hakuna items)";
  return notifyAdmin(
    `🆕 *Oda mpya* #${shortId(params.id)}\n` +
      `Huduma: ${brand}\n` +
      `Mteja: ${params.customer?.name ?? "—"} (${params.customer?.phone ?? "?"})\n` +
      `Bidhaa:\n${lines}\n` +
      `Jumla: *${formatTZS(Number(params.total))}*\n` +
      `Anwani: ${params.address ?? "—"}\n` +
      `${params.note ? `Maelezo: ${params.note}\n` : ""}` +
      `${params.mealSlot ? `Slot: ${params.mealSlot}\n` : ""}` +
      `Channel: ${params.channel}\n` +
      `Thibitisha malipo baada ya mteja kulipa.`
  );
}

export async function notifyAdminPaymentSubmitted(params: {
  orderId: string;
  amount: number | string;
  reference: string;
  customer?: { name?: string | null; phone: string } | null;
}) {
  return notifyAdmin(
    `💰 *Malipo yanasubiri uthibitisho*\n` +
      `Oda: #${shortId(params.orderId)}\n` +
      `Mteja: ${params.customer?.name ?? "—"} (${params.customer?.phone ?? "?"})\n` +
      `Kiasi: *${formatTZS(Number(params.amount))}*\n` +
      `Ref: ${params.reference}\n\n` +
      `👉 Ingia admin na thibitishe malipo.`
  );
}

export async function notifyAdminPayOnDeliveryOrder(params: {
  id: string;
  module: string;
  channel: string;
  total: number | string;
  address?: string | null;
  note?: string | null;
  mealSlot?: string | null;
  customer?: { name?: string | null; phone: string } | null;
  items?: Array<{ name: string; quantity: number; price: number | string }>;
}) {
  const brand = moduleLabel(params.module as "RESTAURANT" | "GROCERY").title;
  const lines =
    params.items?.map((i) => `  • ${i.quantity}x ${i.name}`).join("\n") ?? "  (hakuna items)";
  return notifyAdmin(
    `📋 *Ombi la kulipia ukifika* #${shortId(params.id)}\n` +
      `Huduma: ${brand}\n` +
      `Mteja: ${params.customer?.name ?? "—"} (${params.customer?.phone ?? "?"})\n` +
      `Bidhaa:\n${lines}\n` +
      `Jumla: *${formatTZS(Number(params.total))}*\n` +
      `Anwani: ${params.address ?? "—"}\n` +
      `${params.note ? `Maelezo: ${params.note}\n` : ""}` +
      `${params.mealSlot ? `Slot: ${params.mealSlot}\n` : ""}` +
      `Channel: ${params.channel}\n\n` +
      `⚠️ Oda haijawasilishwa — kubali au kataa ombi kwenye admin (Oda).`
  );
}

export async function notifyCustomerPayOnDeliveryApproved(params: {
  phone: string;
  orderId: string;
}) {
  return notifyCustomer(
    params.phone,
    `✅ Ombi lako la kulipia ukifika #${shortId(params.orderId)} limekubaliwa!\n` +
      `Oda yako sasa imeingia mfumoni — tunaandaa.`
  );
}

export async function notifyCustomerPayOnDeliveryRejected(params: {
  phone: string;
  orderId: string;
}) {
  return notifyCustomer(
    params.phone,
    `❌ Ombi lako la kulipia ukifika #${shortId(params.orderId)} limekataliwa.\n` +
      `Unaweza *kulipa sasa* au *kufuta oda* kwenye akaunti yako — huwezi kuomba kulipia baadaye tena kwa oda hii.`
  );
}

export async function notifyAdminPayOnDeliveryPaymentRequest(params: {
  orderId: string;
  amount: number | string;
  reference: string;
  customer?: { name?: string | null; phone: string } | null;
}) {
  return notifyAdmin(
    `💳 *Ombi la malipo (lipa ukifika)*\n` +
      `Oda: #${shortId(params.orderId)}\n` +
      `Mteja: ${params.customer?.name ?? "—"} (${params.customer?.phone ?? "?"})\n` +
      `Kiasi: *${formatTZS(Number(params.amount))}*\n` +
      `Ref: ${params.reference}\n\n` +
      `👉 Kukubali kuthibitisha oda. Kukataa = oda haitawasilishwa.`
  );
}

export async function notifyAdminPaymentConfirmed(params: {
  orderId: string;
  amount: number | string;
  customer?: { name?: string | null; phone: string } | null;
}) {
  return notifyAdmin(
    `✅ *Malipo yamethibitishwa*\n` +
      `Oda: #${shortId(params.orderId)}\n` +
      `Mteja: ${params.customer?.name ?? "—"}\n` +
      `Kiasi: ${formatTZS(Number(params.amount))}\n` +
      `Oda sasa CONFIRMED — anza kuandaa.`
  );
}

export async function notifyAdminCustomOrder(params: {
  id: string;
  dishName: string;
  specialRequirements?: string | null;
  requestedFor: Date | string;
  mealSlot?: string | null;
  channel?: string;
  address?: string | null;
  customer?: { name?: string | null; phone: string } | null;
}) {
  const when = new Date(params.requestedFor).toLocaleString("sw-TZ", {
    timeZone: "Africa/Dar_es_Salaam",
  });
  return notifyAdmin(
    `🍲 *Special Orders mpya* #${shortId(params.id)}\n` +
      `Huduma: Monana Food (Request for Quote)\n` +
      `Mteja: ${params.customer?.name ?? "—"} (${params.customer?.phone ?? "?"})\n` +
      `Chakula: *${params.dishName}*\n` +
      `${params.specialRequirements ? `Mahitaji: ${params.specialRequirements}\n` : ""}` +
      `Kupokea: ${when}\n` +
      `${params.mealSlot ? `Slot: ${params.mealSlot}\n` : ""}` +
      `Anwani: ${params.address ?? "—"}\n` +
      `Channel: ${params.channel ?? "WEB"}\n\n` +
      `👉 Weka bei: /admin/restaurant/social-orders`
  );
}

/** Customer: quote ready — must pay before cooking (no COD). */
export async function notifyCustomerSocialOrderQuote(params: {
  phone: string;
  dishName: string;
  quotedPrice: number | string;
  payUrl: string;
  locale?: string | null;
}) {
  const amount = formatTZS(Number(params.quotedPrice));
  const locale = params.locale === "en" ? "en" : "sw";
  const text =
    locale === "en"
      ? `🍲 *Special Orders*\nYour order for *${params.dishName}* has been received and will cost *${amount}*.\nTap here to pay so we can start cooking:\n${params.payUrl}\n\nCash on delivery is not available for Special Orders.`
      : `🍲 *Special Orders*\nOda yako ya *${params.dishName}* imepokelewa na itagharimu *${amount}*. Bonyeza hapa kulipia ili kuanza kupikiwa:\n${params.payUrl}\n\nHuduma hii hairuhusu Cash on Delivery — lipa kabla ya kupika.`;
  return notifyCustomer(params.phone, text);
}

export async function notifyAdminCateringRequest(params: {
  id: string;
  kind: "PACKAGE" | "CUSTOM_QUOTE";
  eventType: string;
  eventAt: Date | string;
  location: string;
  guestCount: number;
  packageName?: string | null;
  quotedPrice?: number | string | null;
  specialRequirements?: string | null;
  customer?: { name?: string | null; phone: string } | null;
}) {
  const when = new Date(params.eventAt).toLocaleString("sw-TZ", {
    timeZone: "Africa/Dar_es_Salaam",
  });
  const priceLine =
    params.quotedPrice != null ? `Bei: *${formatTZS(Number(params.quotedPrice))}*\n` : "Bei: inasubiri nukuu\n";
  return notifyAdmin(
    `🍽️ *Catering ${params.kind === "PACKAGE" ? "Package" : "Quote Request"}* #${shortId(params.id)}\n` +
      `Mteja: ${params.customer?.name ?? "—"} (${params.customer?.phone ?? "?"})\n` +
      `${params.packageName ? `Kifurushi: ${params.packageName}\n` : ""}` +
      `Aina: ${params.eventType}\n` +
      `Tukio: ${when}\n` +
      `Eneo: ${params.location}\n` +
      `Watu: ${params.guestCount}\n` +
      priceLine +
      `${params.specialRequirements ? `Mahitaji: ${params.specialRequirements}\n` : ""}` +
      `\n👉 /admin/catering`
  );
}

export async function notifyCustomerCateringQuote(params: {
  phone: string;
  label: string;
  quotedPrice: number | string;
  payUrl: string;
  locale?: string | null;
}) {
  const amount = formatTZS(Number(params.quotedPrice));
  const locale = params.locale === "en" ? "en" : "sw";
  const text =
    locale === "en"
      ? `🍽️ *Monana Catering*\nYour catering request (*${params.label}*) has been priced at *${amount}*.\nPay here to confirm your order:\n${params.payUrl}\n\nCatering orders are confirmed only after payment (no cash on delivery).`
      : `🍽️ *Monana Catering*\nOmbi lako la catering (*${params.label}*) limepokelewa na litagharimu *${amount}*.\nBonyeza hapa kulipia ili oda ithibitishwe:\n${params.payUrl}\n\nCatering inathibitishwa baada tu ya malipo (hakuna Cash on Delivery).`;
  return notifyCustomer(params.phone, text);
}

// ——— Customer alerts ———

const SLOT_REMINDER_HEAD: Record<
  "BREAKFAST" | "LUNCH" | "DINNER",
  { en: string; sw: string; emoji: string }
> = {
  BREAKFAST: { en: "Breakfast", sw: "Asubuhi", emoji: "🌅" },
  LUNCH: { en: "Lunch", sw: "Mchana", emoji: "☀️" },
  DINNER: { en: "Dinner", sw: "Usiku", emoji: "🌙" },
};

/** WhatsApp reminder when a meal-slot window opens for restaurant members. */
export async function notifyRestaurantMembershipSlotOpen(params: {
  phone: string;
  userId: string;
  slot: "BREAKFAST" | "LUNCH" | "DINNER";
  menuLines: string;
  locale?: "en" | "sw";
  menuItems: { id: string; name: string; price: string; unit?: string }[];
}): Promise<boolean> {
  const locale = params.locale === "sw" ? "sw" : "en";
  const head = SLOT_REMINDER_HEAD[params.slot];
  const title =
    locale === "sw"
      ? `${head.emoji} *Dirisha la ${head.sw} limefunguka!*`
      : `${head.emoji} *${head.en} order window is open!*`;
  const intro =
    locale === "sw"
      ? "Chagua chakula unachotaka kula muda huu:"
      : "Pick what you'd like to eat for this meal:";
  const footer =
    locale === "sw"
      ? "Andika *namba* ya chakula (mf. `1` au `2 x2`), kisha *maliza* ✅\nAu order kwenye tovuti yetu."
      : "Reply with the *item number* (e.g. `1` or `2 x2`), then *done* ✅\nOr order on our website.";

  const text = `${title}\n\n${intro}\n\n${params.menuLines}\n\n${footer}`;

  try {
    const res = await fetch(`${BOT_URL}/membership-reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: params.phone,
        text,
        userId: params.userId,
        mealSlot: params.slot,
        menuItems: params.menuItems,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean };
    if (res.ok && json.success) return true;
  } catch (err) {
    console.error("[notifications] membership-reminder bridge failed:", err);
  }
  return sendMessage(params.phone, text);
}

export async function notifyCustomerOrderReceived(params: {
  phone: string;
  orderId: string;
  total: number | string;
}) {
  return notifyCustomer(
    params.phone,
    `🧾 Oda yako #${shortId(params.orderId)} imepokelewa.\n` +
      `Jumla: ${formatTZS(Number(params.total))}.\n` +
      `Tafadhali lipa kisha tuma *nimelipa <reference>*`
  );
}

export async function notifyCustomerPaymentConfirmed(params: {
  phone: string;
  orderId: string;
}) {
  return notifyCustomer(
    params.phone,
    `✅ Malipo ya oda #${shortId(params.orderId)} yamethibitishwa!\nTunaandaa oda yako.`
  );
}

export async function notifyCustomerPaymentRejected(params: {
  phone: string;
  orderId: string;
}) {
  return notifyCustomer(
    params.phone,
    `❌ Malipo ya oda #${shortId(params.orderId)} hayajathibitishwa.\nTafadhali wasiliana nasi.`
  );
}

/** Admin dashboard: send a sample notification template */
export async function sendNotificationTest(
  templateId: import("./templates").NotificationTemplateId
): Promise<boolean> {
  const adminPhone = await getAdminWhatsappNumber();

  switch (templateId) {
    case "admin_new_user":
      return notifyAdminNewUser({ name: "Test User", phone: "255712000001", channel: "WHATSAPP" });
    case "admin_new_order_restaurant":
      return notifyAdminNewOrder({
        id: "test-order-rest",
        module: "RESTAURANT",
        channel: "WHATSAPP",
        total: 7000,
        address: "Dar — Test",
        mealSlot: "LUNCH",
        customer: { name: "Test Mteja", phone: "255712000002" },
        items: [{ name: "Wali wa Nyama", quantity: 1, price: 7000 }],
      });
    case "admin_new_order_grocery":
      return notifyAdminNewOrder({
        id: "test-order-groc",
        module: "GROCERY",
        channel: "WHATSAPP",
        total: 6000,
        address: "Mwanza — Test",
        customer: { name: "Test Mteja", phone: "255712000003" },
        items: [{ name: "Mchele", quantity: 2, price: 3000 }],
      });
    case "admin_payment_submitted":
      return notifyAdminPaymentSubmitted({
        orderId: "test-order-rest",
        amount: 7000,
        reference: "TEST-REF-001",
        customer: { name: "Test Mteja", phone: "255712000002" },
      });
    case "admin_payment_confirmed":
      return notifyAdminPaymentConfirmed({
        orderId: "test-order-rest",
        amount: 7000,
        customer: { name: "Test Mteja", phone: "255712000002" },
      });
    case "customer_order_received":
      return adminPhone
        ? notifyCustomerOrderReceived({ phone: adminPhone, orderId: "test-order-rest", total: 7000 })
        : false;
    case "customer_payment_confirmed":
      return adminPhone
        ? notifyCustomerPaymentConfirmed({ phone: adminPhone, orderId: "test-order-rest" })
        : false;
    case "customer_payment_rejected":
      return adminPhone
        ? notifyCustomerPaymentRejected({ phone: adminPhone, orderId: "test-order-rest" })
        : false;
    default:
      return false;
  }
}
