import { whatsAppUrlFromPhone } from "@monana/utils";

/** Public wa.me link for customer-facing UI */
export { whatsAppUrlFromPhone };

export function defaultWhatsAppUrl(): string | null {
  return whatsAppUrlFromPhone(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
}
