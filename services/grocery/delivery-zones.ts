import { prisma } from "@monana/db";

export type DeliveryZoneRecord = {
  id: string;
  name: string;
  nameSw: string | null;
  keywords: string[];
  deliveryFee: number;
  sortOrder: number;
  active: boolean;
};

function parseKeywords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
}

export function normalizeAddress(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Match address text to a zone (longest keyword wins, then zone sortOrder). */
export function matchDeliveryZone(
  address: string | null | undefined,
  zones: DeliveryZoneRecord[],
  explicitZoneId?: string | null
): DeliveryZoneRecord | null {
  if (explicitZoneId) {
    const found = zones.find((z) => z.id === explicitZoneId && z.active);
    if (found) return found;
  }

  const haystack = normalizeAddress(address);
  if (!haystack) return null;

  let best: { zone: DeliveryZoneRecord; score: number } | null = null;

  for (const zone of zones.filter((z) => z.active)) {
    for (const keyword of zone.keywords) {
      if (!keyword) continue;
      if (haystack.includes(keyword)) {
        const score = keyword.length * 1000 - zone.sortOrder;
        if (!best || score > best.score) {
          best = { zone, score };
        }
      }
    }
  }

  return best?.zone ?? null;
}

export async function listDeliveryZones(activeOnly = false) {
  const rows = await prisma.deliveryZone.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((z) => ({
    ...z,
    keywords: parseKeywords(z.keywords),
    deliveryFee: Number(z.deliveryFee),
  }));
}

export async function getDeliveryZoneById(id: string) {
  const z = await prisma.deliveryZone.findUnique({ where: { id } });
  if (!z) return null;
  return { ...z, keywords: parseKeywords(z.keywords), deliveryFee: Number(z.deliveryFee) };
}

export async function createDeliveryZone(data: {
  name: string;
  nameSw?: string;
  keywords: string[];
  deliveryFee?: number;
  sortOrder?: number;
  active?: boolean;
}) {
  const keywords = data.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (!keywords.length) throw new Error("Ongeza angalau neno moja la kutambua eneo");
  return prisma.deliveryZone.create({
    data: {
      name: data.name.trim(),
      nameSw: data.nameSw?.trim() || null,
      keywords,
      deliveryFee: data.deliveryFee ?? 0,
      sortOrder: data.sortOrder ?? 0,
      active: data.active ?? true,
    },
  });
}

export async function updateDeliveryZone(
  id: string,
  data: Partial<{
    name: string;
    nameSw: string | null;
    keywords: string[];
    deliveryFee: number;
    sortOrder: number;
    active: boolean;
  }>
) {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.nameSw !== undefined) patch.nameSw = data.nameSw?.trim() || null;
  if (data.keywords !== undefined) {
    const keywords = data.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
    if (!keywords.length) throw new Error("Ongeza angalau neno moja la kutambua eneo");
    patch.keywords = keywords;
  }
  if (data.deliveryFee !== undefined) patch.deliveryFee = data.deliveryFee;
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  if (data.active !== undefined) patch.active = data.active;
  return prisma.deliveryZone.update({ where: { id }, data: patch });
}

export async function deleteDeliveryZone(id: string) {
  await prisma.order.updateMany({ where: { deliveryZoneId: id }, data: { deliveryZoneId: null } });
  return prisma.deliveryZone.delete({ where: { id } });
}

export async function seedDefaultDeliveryZones() {
  const defaults = [
    {
      name: "Kinondoni",
      nameSw: "Kinondoni",
      keywords: ["kinondoni", "kunduchi", "mbezi", "wazo", "makumbusho", "mabibo", "sinza"],
      deliveryFee: 3000,
      sortOrder: 10,
    },
    {
      name: "Masaki",
      nameSw: "Masaki",
      keywords: ["masaki", "slipway", "msasani", " oyster", "oysterbay", "ada estate"],
      deliveryFee: 5000,
      sortOrder: 20,
    },
    {
      name: "Tabata",
      nameSw: "Tabata",
      keywords: ["tabata", "segerea", "buguruni", "gongolamboto", "kivukoni", "kigogo"],
      deliveryFee: 3500,
      sortOrder: 30,
    },
    {
      name: "City Centre",
      nameSw: "Kati ya Jiji",
      keywords: ["kariakoo", "posta", "city centre", "city center", "kivukoni", "magomeni mapya"],
      deliveryFee: 2500,
      sortOrder: 40,
    },
  ];

  for (const d of defaults) {
    const existing = await prisma.deliveryZone.findFirst({ where: { name: d.name } });
    if (existing) continue;
    await prisma.deliveryZone.create({ data: { ...d, active: true } });
  }
}
