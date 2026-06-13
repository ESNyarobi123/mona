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

// ——— Customer alerts ———

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
