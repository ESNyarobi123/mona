import { prisma, type BusinessModule } from "@monana/db";
import { slugifyUnitLabel, uniqueUnitCodeSuffix } from "@monana/utils";

export type UnitDefinitionRecord = {
  id: string;
  code: string;
  labelEn: string;
  labelSw: string;
  priceSuffix: string;
  quantitySuffixEn: string | null;
  quantitySuffixSw: string | null;
  icon: string | null;
  module: BusinessModule | null;
  isSystem: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type UnitWithUsage = UnitDefinitionRecord & {
  _count: { products: number; menuItems: number };
};

function moduleFilter(module?: BusinessModule | null) {
  if (!module) return {};
  return { OR: [{ module: null }, { module }] };
}

export async function listUnits(params?: {
  module?: BusinessModule;
  activeOnly?: boolean;
  includeUsage?: boolean;
}) {
  const where = {
    ...moduleFilter(params?.module),
    ...(params?.activeOnly ? { active: true } : {}),
  };

  if (params?.includeUsage) {
    const units = await prisma.unitDefinition.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
    });

    const usage = await Promise.all(
      units.map(async (unit) => {
        const [products, menuItems] = await Promise.all([
          prisma.product.count({ where: { unit: unit.code } }),
          prisma.menuItem.count({ where: { unit: unit.code } }),
        ]);
        return { ...unit, _count: { products, menuItems } };
      })
    );

    return usage;
  }

  return prisma.unitDefinition.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }],
  });
}

export async function getUnitById(id: string) {
  return prisma.unitDefinition.findUnique({ where: { id } });
}

export async function getUnitByCode(code: string) {
  return prisma.unitDefinition.findUnique({ where: { code } });
}

export async function assertActiveUnit(code: string, module: BusinessModule) {
  const unit = await prisma.unitDefinition.findFirst({
    where: {
      code,
      active: true,
      ...moduleFilter(module),
    },
  });
  if (!unit) throw new Error("Invalid or inactive unit");
  return unit;
}

export function slugifyUnitCode(input: string) {
  return slugifyUnitLabel(input);
}

async function listUnitCodes() {
  const rows = await prisma.unitDefinition.findMany({ select: { code: true } });
  return rows.map((r) => r.code);
}

export async function createUnit(data: {
  code?: string;
  labelEn: string;
  labelSw: string;
  priceSuffix: string;
  quantitySuffixEn?: string | null;
  quantitySuffixSw?: string | null;
  icon?: string | null;
  module?: BusinessModule | null;
  active?: boolean;
  sortOrder?: number;
}) {
  const taken = await listUnitCodes();

  if (data.code) {
    const code = slugifyUnitCode(data.code);
    if (taken.includes(code)) {
      const suggested = uniqueUnitCodeSuffix(code, taken);
      throw new Error(
        `Msimbo ${code} tayari unatumika. Tumia ${suggested} au acha msimbo wazi ili utengenezwe kiotomatiki.`
      );
    }
    return prisma.unitDefinition.create({
      data: {
        code,
        labelEn: data.labelEn.trim(),
        labelSw: data.labelSw.trim(),
        priceSuffix: data.priceSuffix.trim(),
        quantitySuffixEn: data.quantitySuffixEn?.trim() || null,
        quantitySuffixSw: data.quantitySuffixSw?.trim() || null,
        icon: data.icon?.trim() || null,
        module: data.module ?? null,
        active: data.active ?? true,
        sortOrder: data.sortOrder ?? ((await prisma.unitDefinition.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 10,
      },
    });
  }

  const code = uniqueUnitCodeSuffix(slugifyUnitCode(data.labelEn), taken);
  const maxOrder = await prisma.unitDefinition.aggregate({ _max: { sortOrder: true } });

  return prisma.unitDefinition.create({
    data: {
      code,
      labelEn: data.labelEn.trim(),
      labelSw: data.labelSw.trim(),
      priceSuffix: data.priceSuffix.trim(),
      quantitySuffixEn: data.quantitySuffixEn?.trim() || null,
      quantitySuffixSw: data.quantitySuffixSw?.trim() || null,
      icon: data.icon?.trim() || null,
      module: data.module ?? null,
      active: data.active ?? true,
      sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 10,
    },
  });
}

export async function updateUnit(
  id: string,
  data: Partial<{
    labelEn: string;
    labelSw: string;
    priceSuffix: string;
    quantitySuffixEn: string | null;
    quantitySuffixSw: string | null;
    icon: string | null;
    module: BusinessModule | null;
    active: boolean;
    sortOrder: number;
  }>
) {
  const unit = await prisma.unitDefinition.findUnique({ where: { id } });
  if (!unit) throw new Error("Unit not found");

  if (data.active === false) {
    const [products, menuItems] = await Promise.all([
      prisma.product.count({ where: { unit: unit.code } }),
      prisma.menuItem.count({ where: { unit: unit.code } }),
    ]);
    if (products + menuItems > 0) {
      throw new Error("Cannot deactivate a unit that is in use");
    }
  }

  return prisma.unitDefinition.update({
    where: { id },
    data: {
      ...(data.labelEn !== undefined ? { labelEn: data.labelEn.trim() } : {}),
      ...(data.labelSw !== undefined ? { labelSw: data.labelSw.trim() } : {}),
      ...(data.priceSuffix !== undefined ? { priceSuffix: data.priceSuffix.trim() } : {}),
      ...(data.quantitySuffixEn !== undefined
        ? { quantitySuffixEn: data.quantitySuffixEn?.trim() || null }
        : {}),
      ...(data.quantitySuffixSw !== undefined
        ? { quantitySuffixSw: data.quantitySuffixSw?.trim() || null }
        : {}),
      ...(data.icon !== undefined ? { icon: data.icon?.trim() || null } : {}),
      ...(data.module !== undefined ? { module: data.module } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });
}

export async function deleteUnit(id: string) {
  const unit = await prisma.unitDefinition.findUnique({ where: { id } });
  if (!unit) throw new Error("Unit not found");
  if (unit.isSystem) throw new Error("System units cannot be deleted");

  const [products, menuItems] = await Promise.all([
    prisma.product.count({ where: { unit: unit.code } }),
    prisma.menuItem.count({ where: { unit: unit.code } }),
  ]);
  if (products + menuItems > 0) {
    throw new Error("Unit is in use by products or menu items");
  }

  return prisma.unitDefinition.delete({ where: { id } });
}

export async function countUnits(module?: BusinessModule) {
  return prisma.unitDefinition.count({
    where: moduleFilter(module),
  });
}
