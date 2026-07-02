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
