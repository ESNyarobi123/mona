/** Notification template IDs for admin test sends */
export const NOTIFICATION_TEMPLATES = [
  { id: "admin_new_user", label: "👤 Mtumiaji mpya (admin)" },
  { id: "admin_new_order_restaurant", label: "🆕 Oda mpya — Restaurant (admin)" },
  { id: "admin_new_order_grocery", label: "🆕 Oda mpya — Grocery (admin)" },
  { id: "admin_payment_submitted", label: "💰 Malipo yanasubiri (admin)" },
  { id: "admin_payment_confirmed", label: "✅ Malipo yamethibitishwa (admin)" },
  { id: "customer_order_received", label: "🧾 Oda imepokelewa (mteja)" },
  { id: "customer_payment_confirmed", label: "✅ Malipo yamethibitishwa (mteja)" },
  { id: "customer_payment_rejected", label: "❌ Malipo yamekataliwa (mteja)" },
] as const;

export type NotificationTemplateId = (typeof NOTIFICATION_TEMPLATES)[number]["id"];
