/**
 * Tuma templates zote za admin notifications kwa ADMIN_WHATSAPP_NUMBER.
 * Run: npx tsx scripts/test-admin-notifications.ts
 */
import {
  notifyAdminNewUser,
  notifyAdminNewOrder,
  notifyAdminPaymentSubmitted,
  notifyCustomerOrderReceived,
  notifyCustomerPaymentConfirmed,
} from "../services/notifications/index";

const ADMIN = process.env.ADMIN_WHATSAPP_NUMBER ?? "not-set";

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`📱 Admin alerts → ${ADMIN}\n`);

  const tests: { name: string; fn: () => Promise<boolean> }[] = [
    {
      name: "1️⃣  Mtumiaji mpya (WhatsApp)",
      fn: () =>
        notifyAdminNewUser({
          name: "Eric Kimaro",
          phone: "255712345678",
          channel: "WHATSAPP",
        }),
    },
    {
      name: "2️⃣  Oda mpya (Restaurant)",
      fn: () =>
        notifyAdminNewOrder({
          id: "cmpxtest000001",
          module: "RESTAURANT",
          channel: "WHATSAPP",
          total: 7000,
          address: "Dar es Salaam, Temboni",
          mealSlot: "BREAKFAST",
          customer: { name: "Eric Kimaro", phone: "255712345678" },
          items: [
            { name: "Chai na Mandazi", quantity: 2, price: 2500 },
            { name: "Maji 1L", quantity: 1, price: 1000 },
          ],
        }),
    },
    {
      name: "3️⃣  Oda mpya (Grocery)",
      fn: () =>
        notifyAdminNewOrder({
          id: "cmpxtest000002",
          module: "GROCERY",
          channel: "WHATSAPP",
          total: 8500,
          address: "Mwanza",
          customer: { name: "Amina Test", phone: "255799887766" },
          items: [
            { name: "Mchele kg 1", quantity: 2, price: 3000 },
            { name: "Sukari kg 1", quantity: 1, price: 3200 },
          ],
        }),
    },
    {
      name: "4️⃣  Malipo yanasubiri uthibitisho",
      fn: () =>
        notifyAdminPaymentSubmitted({
          orderId: "cmpxtest000001",
          amount: 7000,
          reference: "REF-TEST-12345",
          customer: { name: "Eric Kimaro", phone: "255712345678" },
        }),
    },
    {
      name: "5️⃣  (Mteja) Oda imepokelewa",
      fn: () =>
        notifyCustomerOrderReceived({
          phone: ADMIN,
          orderId: "cmpxtest000001",
          total: 7000,
        }),
    },
    {
      name: "6️⃣  (Mteja) Malipo yamethibitishwa",
      fn: () =>
        notifyCustomerPaymentConfirmed({
          phone: ADMIN,
          orderId: "cmpxtest000001",
        }),
    },
  ];

  for (const t of tests) {
    const ok = await t.fn();
    console.log(ok ? "✅" : "❌", t.name);
    await wait(2500);
  }

  console.log("\nDone — angalia WhatsApp ya admin:", ADMIN);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
