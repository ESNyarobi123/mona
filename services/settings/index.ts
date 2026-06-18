import { prisma } from "@monana/db";
import { normalizeTanzaniaPhone } from "@monana/utils";

export const SETTING_KEYS = {
  ADMIN_WHATSAPP: "admin_whatsapp_number",
  /** Customer-facing bot number — auto-saved when QR is scanned */
  BOT_WHATSAPP: "bot_whatsapp_number",
  LIPA_NAMBA: "lipa_namba",
  LIPA_NAMBA_NAME: "lipa_namba_name",
} as const;

export type PlatformSettings = {
  adminWhatsappNumber: string;
  botWhatsappNumber: string;
  lipaNamba: string;
  lipaNambaName: string;
  botUrl: string;
};

async function getDbValue(key: string): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

/** Merged: DB overrides, then .env fallback */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const [adminDb, botDb, lipaDb, lipaNameDb] = await Promise.all([
    getDbValue(SETTING_KEYS.ADMIN_WHATSAPP),
    getDbValue(SETTING_KEYS.BOT_WHATSAPP),
    getDbValue(SETTING_KEYS.LIPA_NAMBA),
    getDbValue(SETTING_KEYS.LIPA_NAMBA_NAME),
  ]);

  return {
    adminWhatsappNumber:
      adminDb ?? process.env.ADMIN_WHATSAPP_NUMBER ?? "",
    botWhatsappNumber:
      botDb ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
    lipaNamba: lipaDb ?? process.env.LIPA_NAMBA ?? "",
    lipaNambaName: lipaNameDb ?? process.env.LIPA_NAMBA_NAME ?? "MONANA",
    botUrl: process.env.BOT_URL ?? "http://localhost:4000",
  };
}

/** Persist linked bot number so customer links work even when bot restarts. */
export async function syncBotWhatsappNumber(phone: string | null | undefined): Promise<void> {
  const normalized = phone?.trim() ? normalizeTanzaniaPhone(phone) : "";
  if (!normalized || normalized.length < 12) return;

  const current = await getDbValue(SETTING_KEYS.BOT_WHATSAPP);
  if (current === normalized) return;

  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEYS.BOT_WHATSAPP },
    create: { key: SETTING_KEYS.BOT_WHATSAPP, value: normalized },
    update: { value: normalized },
  });
}

export async function getAdminWhatsappNumber(): Promise<string | null> {
  const s = await getPlatformSettings();
  const phone = s.adminWhatsappNumber?.trim();
  if (!phone || phone.includes("XXXX")) return null;
  return normalizeTanzaniaPhone(phone);
}

export async function updatePlatformSettings(input: {
  adminWhatsappNumber?: string;
  lipaNamba?: string;
  lipaNambaName?: string;
}) {
  const upserts: Promise<unknown>[] = [];

  if (input.adminWhatsappNumber !== undefined) {
    upserts.push(
      prisma.systemSetting.upsert({
        where: { key: SETTING_KEYS.ADMIN_WHATSAPP },
        create: {
          key: SETTING_KEYS.ADMIN_WHATSAPP,
          value: normalizeTanzaniaPhone(input.adminWhatsappNumber),
        },
        update: { value: normalizeTanzaniaPhone(input.adminWhatsappNumber) },
      })
    );
  }
  if (input.lipaNamba !== undefined) {
    upserts.push(
      prisma.systemSetting.upsert({
        where: { key: SETTING_KEYS.LIPA_NAMBA },
        create: { key: SETTING_KEYS.LIPA_NAMBA, value: input.lipaNamba.trim() },
        update: { value: input.lipaNamba.trim() },
      })
    );
  }
  if (input.lipaNambaName !== undefined) {
    upserts.push(
      prisma.systemSetting.upsert({
        where: { key: SETTING_KEYS.LIPA_NAMBA_NAME },
        create: { key: SETTING_KEYS.LIPA_NAMBA_NAME, value: input.lipaNambaName.trim() },
        update: { value: input.lipaNambaName.trim() },
      })
    );
  }

  await Promise.all(upserts);
  return getPlatformSettings();
}

export {
  DEFAULT_LANDING_TICKER_SETTINGS,
  LANDING_TICKER_KEY,
  displayOrderCount,
  getLandingTickerSettings,
  updateLandingTickerSettings,
  type LandingTickerSettings,
} from "./landing";

export {
  DEFAULT_DELIVERY_PRICING,
  computeDeliveryQuote,
  getDeliveryPricingConfig,
  updateDeliveryPricingConfig,
  type DeliveryPricingConfig,
  type DeliveryPricingMode,
  type DeliveryQuote,
} from "./delivery-pricing";
