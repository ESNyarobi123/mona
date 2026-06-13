import type { WAMessage } from "baileys";

/** Resolve real MSISDN from Baileys message (handles @lid vs @s.whatsapp.net). */
export function extractPhoneFromMessage(m: WAMessage): string | null {
  const key = m.key;
  const remoteJid = key.remoteJid ?? "";

  const pn = key.senderPn ?? key.participantPn;
  if (pn?.endsWith("@s.whatsapp.net")) {
    return normalizeDigits(pn.split("@")[0]);
  }

  if (remoteJid.endsWith("@s.whatsapp.net")) {
    return normalizeDigits(remoteJid.split("@")[0]);
  }

  // LID jid without phone metadata — cannot authenticate reliably
  if (remoteJid.endsWith("@lid")) {
    console.warn("[bot] message from LID without senderPn:", remoteJid);
    return null;
  }

  return normalizeDigits(remoteJid.split("@")[0]);
}

function normalizeDigits(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0") && d.length >= 10) d = `255${d.slice(1)}`;
  if (!d.startsWith("255") && d.length === 9) d = `255${d}`;
  return d;
}
