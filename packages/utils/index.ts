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

/** Sum a list of cart-like items. */
export function calcTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, it) => sum + it.price * it.quantity, 0);
}

/** Generate a short human-friendly order reference. */
export function genOrderRef(): string {
  return "MNA-" + Date.now().toString(36).toUpperCase();
}
