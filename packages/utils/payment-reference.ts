/** Tanzania mobile-money proof references (M-Pesa, Mixx/Tigo, Airtel, Halopesa, etc.). */
export const PAYMENT_REF_MIN = 8;
export const PAYMENT_REF_MAX = 16;
export const PAYMENT_REF_NUMERIC_MIN = 10;
export const PAYMENT_REF_NUMERIC_MAX = 14;

const PAYMENT_PREFIXES = [
  "nimeshalipa",
  "nimemaliza kulipa",
  "nimelipia",
  "nimelipa",
  "nimetuma",
  "i have paid",
  "ive paid",
  "i paid",
  "paid",
  "lipa",
] as const;

const SMS_LABEL_PATTERNS = [
  /(?:confirmation\s*code|transaction\s*(?:id|no|number)?|receipt\s*(?:no|number)?|reference(?:\s*no)?|msimbo|uthibitisho|namba\s*ya\s*muamala)[:\s#-]*([A-Za-z0-9]{8,16})/i,
  /\b([A-Za-z]{2,5}[0-9]{6,12})\b/,
] as const;

function compactReferenceToken(value: string): string {
  return value.replace(/[\s.\-_]/g, "").toUpperCase();
}

function stripPaymentPrefix(text: string): string {
  const lower = text.toLowerCase().trim();
  for (const prefix of PAYMENT_PREFIXES) {
    if (lower.startsWith(`${prefix} `)) {
      return text.slice(text.toLowerCase().indexOf(prefix) + prefix.length).trim();
    }
  }
  return text.trim();
}

function extractFromSms(text: string): string | null {
  for (const pattern of SMS_LABEL_PATTERNS) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim();
    if (!candidate) continue;
    const normalized = compactReferenceToken(candidate);
    if (isValidPaymentProofReference(normalized)) return normalized;
  }
  return null;
}

function collectReferenceCandidates(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const candidates: string[] = [];
  const withoutPrefix = stripPaymentPrefix(trimmed);
  candidates.push(withoutPrefix);

  const fromSms = extractFromSms(trimmed);
  if (fromSms) candidates.push(fromSms);

  const compact = trimmed.replace(/\s+/g, "");
  if (compact !== withoutPrefix) candidates.push(compact);

  return candidates;
}

/**
 * True when a normalized reference looks like a real mobile-money transaction code.
 * Supports numeric-only refs (common on Airtel / some Halopesa) and alphanumeric mixes (M-Pesa, Mixx/Tigo).
 */
export function isValidPaymentProofReference(normalized: string): boolean {
  if (!normalized || /^MANUAL$/i.test(normalized)) return false;

  const len = normalized.length;
  if (len < PAYMENT_REF_MIN || len > PAYMENT_REF_MAX) return false;
  if (!/^[A-Z0-9]+$/.test(normalized)) return false;

  if (/^[0-9]+$/.test(normalized)) {
    return len >= PAYMENT_REF_NUMERIC_MIN && len <= PAYMENT_REF_NUMERIC_MAX;
  }

  return /[A-Z]/.test(normalized) && /[0-9]/.test(normalized);
}

/**
 * Normalize a customer-submitted Lipa Namba / mobile-money proof reference for storage and dedup.
 * Accepts pasted SMS, "nimelipa CODE", or the bare code. Returns empty string when invalid.
 */
export function normalizePaymentProofReference(reference: string): string {
  const trimmed = reference.trim();
  if (!trimmed || /^manual$/i.test(trimmed)) return "";

  for (const candidate of collectReferenceCandidates(trimmed)) {
    const normalized = compactReferenceToken(candidate);
    if (isValidPaymentProofReference(normalized)) return normalized;
  }

  return "";
}

/** Parse proof reference from WhatsApp / free-form customer text. */
export function parseCustomerPaymentReference(text: string): string | null {
  const normalized = normalizePaymentProofReference(text);
  return normalized || null;
}

export function paymentReferenceInvalidMessage(locale: "en" | "sw" = "sw"): string {
  if (locale === "en") {
    return "Enter a valid payment reference from your M-Pesa / mobile money SMS (usually 10–14 letters and numbers).";
  }
  return "Andika reference sahihi kutoka SMS ya M-Pesa / Tigo / Airtel / Halopesa (kawaida herufi na namba 10–14).";
}
