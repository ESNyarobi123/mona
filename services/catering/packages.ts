import { prisma } from "@monana/db";

export type CateringPackageInput = {
  code: string;
  nameEn: string;
  nameSw: string;
  descriptionEn: string;
  descriptionSw: string;
  pricePerHead: number;
  minGuests: number;
  maxGuests?: number | null;
  featuresEn?: string[];
  featuresSw?: string[];
  imageUrl?: string | null;
  active?: boolean;
  sortOrder?: number;
};

export async function listCateringPackages(opts: { activeOnly?: boolean } = {}) {
  return prisma.cateringPackage.findMany({
    where: opts.activeOnly === false ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
}

export async function getCateringPackageById(id: string) {
  return prisma.cateringPackage.findUnique({ where: { id } });
}

export async function getCateringPackageByCode(code: string) {
  return prisma.cateringPackage.findUnique({ where: { code } });
}

export function calcCateringPackageTotal(pricePerHead: number, guestCount: number) {
  return Math.round(Number(pricePerHead) * guestCount);
}

export function assertGuestCountForPackage(
  guestCount: number,
  minGuests: number,
  maxGuests: number | null | undefined
) {
  if (!Number.isInteger(guestCount) || guestCount < 1) {
    throw new Error("Idadi ya watu si sahihi");
  }
  if (guestCount < minGuests) {
    throw new Error(`Kifurushi hiki ni kwa angalau watu ${minGuests}`);
  }
  if (maxGuests != null && guestCount > maxGuests) {
    throw new Error(`Kifurushi hiki ni kwa hadi watu ${maxGuests}`);
  }
}

export async function createCateringPackage(data: CateringPackageInput) {
  return prisma.cateringPackage.create({
    data: {
      code: data.code.trim().toUpperCase(),
      nameEn: data.nameEn.trim(),
      nameSw: data.nameSw.trim(),
      descriptionEn: data.descriptionEn.trim(),
      descriptionSw: data.descriptionSw.trim(),
      pricePerHead: data.pricePerHead,
      minGuests: data.minGuests,
      maxGuests: data.maxGuests ?? null,
      featuresEn: data.featuresEn ?? [],
      featuresSw: data.featuresSw ?? [],
      imageUrl: data.imageUrl ?? null,
      active: data.active ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export async function updateCateringPackage(id: string, data: Partial<CateringPackageInput>) {
  return prisma.cateringPackage.update({
    where: { id },
    data: {
      ...(data.code !== undefined ? { code: data.code.trim().toUpperCase() } : {}),
      ...(data.nameEn !== undefined ? { nameEn: data.nameEn.trim() } : {}),
      ...(data.nameSw !== undefined ? { nameSw: data.nameSw.trim() } : {}),
      ...(data.descriptionEn !== undefined ? { descriptionEn: data.descriptionEn.trim() } : {}),
      ...(data.descriptionSw !== undefined ? { descriptionSw: data.descriptionSw.trim() } : {}),
      ...(data.pricePerHead !== undefined ? { pricePerHead: data.pricePerHead } : {}),
      ...(data.minGuests !== undefined ? { minGuests: data.minGuests } : {}),
      ...(data.maxGuests !== undefined ? { maxGuests: data.maxGuests } : {}),
      ...(data.featuresEn !== undefined ? { featuresEn: data.featuresEn } : {}),
      ...(data.featuresSw !== undefined ? { featuresSw: data.featuresSw } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });
}

/** Soft-hide a package (keeps history on past bookings). */
export async function deactivateCateringPackage(id: string) {
  const existing = await prisma.cateringPackage.findUnique({ where: { id } });
  if (!existing) throw new Error("Kifurushi hakipatikani");
  return prisma.cateringPackage.update({
    where: { id },
    data: { active: false },
  });
}
