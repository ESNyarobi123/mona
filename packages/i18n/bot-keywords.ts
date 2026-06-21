import type { AppLocale } from "./locale";

export const BOT_KEYWORDS = {
  greetings: ["hi", "hello", "habari", "mambo", "start", "anza"],
  menu: ["menu", "menyu"],
  done: ["done", "finish", "maliza"],
  paid: [
    "paid",
    "i paid",
    "i have paid",
    "ive paid",
    "nimelipa",
    "nimeshalipa",
    "nimelipia",
    "nimetuma",
    "nimemaliza kulipa",
    "lipa",
  ],
  pause: ["pause", "sitisha"],
  edit: ["edit basket", "edit", "hariri kikapu", "hariri"],
  language: ["language", "lang", "lugha"],
  register: ["register", "jisajili", "sajili"],
  payDelivery: ["pay order", "lipa oda", "lipa oda yangu"],
  home: ["0", "rudi", "back", "home", "nyumbani", "mwanzo"],
} as const;

export function matchesKeyword(text: string, keys: readonly string[]): boolean {
  const lower = text.toLowerCase().trim();
  return keys.some((k) => lower === k || lower.startsWith(`${k} `));
}

export function matchPauseWeeks(text: string): number | null {
  const lower = text.toLowerCase().trim();
  const en = lower.match(/^pause(?:\s+(\d+))?$/);
  if (en) return Number(en[1] || 1);
  const sw = lower.match(/^sitisha(?:\s+(\d+))?$/);
  if (sw) return Number(sw[1] || 1);
  return null;
}

const PAYMENT_PREFIXES = [
  "nimeshalipa",
  "nimelipia",
  "nimemaliza kulipa",
  "nimelipa",
  "nimetuma",
  "i have paid",
  "ive paid",
  "i paid",
  "paid",
  "lipa",
];

/**
 * Detects "I have paid" with a trailing reference (e.g. "nimelipa QFG7H2K9").
 * Bare "nimelipa" / "paid" alone returns null — bot will ask for the M-Pesa code.
 */
export function extractPaymentReference(text: string, _locale: AppLocale): string | null {
  const lower = text.toLowerCase().trim();
  for (const p of PAYMENT_PREFIXES) {
    if (lower.startsWith(`${p} `)) {
      const ref = text.slice(text.toLowerCase().indexOf(p) + p.length).trim();
      return ref || null;
    }
  }
  return null;
}

/** Customer said they paid but did not include a reference code yet. */
export function isPaidWithoutReference(text: string): boolean {
  const lower = text.toLowerCase().trim();
  for (const p of PAYMENT_PREFIXES) {
    if (lower === p) return true;
  }
  return BOT_KEYWORDS.paid.some((k) => lower === k);
}

/**
 * Parse an M-Pesa / Lipa Namba proof reference from WhatsApp text.
 * Accepts "nimelipa CODE", a pasted code, or a short alphanumeric token.
 */
export function parseCustomerPaymentReference(text: string, locale: AppLocale = "sw"): string | null {
  const fromPrefix = extractPaymentReference(text, locale);
  if (fromPrefix) return fromPrefix;

  const mpesa = extractMpesaCode(text);
  if (mpesa) return mpesa;

  const trimmed = text.trim().replace(/\s+/g, "");
  if (/^[A-Za-z0-9.\-]{6,20}$/.test(trimmed) && /[0-9]/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

/**
 * Detects a pasted mobile-money confirmation code (e.g. M-Pesa "QFG7H2K9LM").
 * Codes are alphanumeric, 6–15 chars, and contain at least one letter and one
 * digit so plain words/numbers are not mistaken for a payment reference.
 */
export function extractMpesaCode(text: string): string | null {
  const token = text.trim();
  if (!/^[A-Za-z0-9.\-]{6,15}$/.test(token)) return null;
  const hasLetter = /[A-Za-z]/.test(token);
  const hasDigit = /[0-9]/.test(token);
  if (!hasLetter || !hasDigit) return null;
  return token.toUpperCase();
}
