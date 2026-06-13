import { prisma } from "@monana/db";
import { normalizeTanzaniaPhone } from "@monana/utils";

export const SETTING_KEYS = {
  ADMIN_WHATSAPP: "admin_whatsapp_number",
  LIPA_NAMBA: "lipa_namba",
  LIPA_NAMBA_NAME: "lipa_namba_name",
} as const;

export type PlatformSettings = {
  adminWhatsappNumber: string;
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
  const [adminDb, lipaDb, lipaNameDb] = await Promise.all([
    getDbValue(SETTING_KEYS.ADMIN_WHATSAPP),
    getDbValue(SETTING_KEYS.LIPA_NAMBA),
    getDbValue(SETTING_KEYS.LIPA_NAMBA_NAME),
  ]);

  return {
    adminWhatsappNumber:
      adminDb ?? process.env.ADMIN_WHATSAPP_NUMBER ?? "",
    lipaNamba: lipaDb ?? process.env.LIPA_NAMBA ?? "",
    lipaNambaName: lipaNameDb ?? process.env.LIPA_NAMBA_NAME ?? "MONANA",
    botUrl: process.env.BOT_URL ?? "http://localhost:4000",
  };
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
