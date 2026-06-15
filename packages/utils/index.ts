// Shared helpers and formatters.
export * from "./labels";
export * from "./units";
export * from "./serialize";
export * from "./pagination";
export * from "./subscription";

/** Format a number as Tanzanian Shillings, e.g. 1500 -> "TZS 1,500". */
export function formatTZS(amount: number): string {
  return `TZS ${Math.round(amount).toLocaleString("en-US")}`;
}

/** Normalize a phone number to digits only (basic). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Tanzania: 0712… → 255712…, consistent across web + WhatsApp bot. */
export function normalizeTanzaniaPhone(phone: string): string {
  let digits = normalizePhone(phone);
  if (digits.startsWith("0") && digits.length >= 10) {
    digits = `255${digits.slice(1)}`;
  }
  if (!digits.startsWith("255") && digits.length === 9) {
    digits = `255${digits}`;
  }
  return digits;
}

/** Extract MSISDN from Baileys JID (e.g. 255712…:12@s.whatsapp.net → 255712…). */
export function jidToMsisdn(jid: string | null | undefined): string | null {
  if (!jid?.trim()) return null;
  const userPart = jid.split("@")[0]?.split(":")[0] ?? "";
  const digits = normalizeTanzaniaPhone(userPart);
  return digits.length >= 12 ? digits : null;
}

/** Customer-facing wa.me link — digits only, Tanzania-normalized. */
export function whatsAppUrlFromPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = normalizeTanzaniaPhone(phone);
  return digits.length >= 12 ? `https://wa.me/${digits}` : null;
}

/** Sum a list of cart-like items. */
export function calcTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, it) => sum + it.price * it.quantity, 0);
}

/** Generate a short human-friendly order reference. */
export function genOrderRef(): string {
  return "MNA-" + Date.now().toString(36).toUpperCase();
}

/**
 * Normalize a customer-submitted Lipa Namba / M-Pesa proof reference for storage and dedup.
 * Returns empty string when input is not usable as a proof reference.
 */
export function normalizePaymentProofReference(reference: string): string {
  const trimmed = reference.trim();
  if (!trimmed) return "";
  if (/^manual$/i.test(trimmed)) return "MANUAL";
  return trimmed.replace(/\s+/g, "").toUpperCase();
}

export function paymentReferenceDuplicateMessage(
  sameUser: boolean,
  locale: "en" | "sw" = "sw"
): string {
  if (locale === "en") {
    return sameUser
      ? "You already used this payment reference on another order. Send the reference for this transaction only."
      : "This payment reference was already used by another customer. Use your own transaction reference.";
  }
  return sameUser
    ? "Reference hii tayari umetumia kwenye oda nyingine. Tuma reference ya muamala huu pekee."
    : "Reference hii tayari imetumika na mteja mwingine. Tumia reference ya muamala wako pekee.";
}
