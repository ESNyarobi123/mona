/** Public wa.me link for customer-facing UI */
export function whatsAppUrlFromPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 ? `https://wa.me/${digits}` : null;
}

export function defaultWhatsAppUrl(): string | null {
  return whatsAppUrlFromPhone(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
}
