import { prisma, type BusinessModule, type SubscriptionStatus } from "@monana/db";
import { paginatedResult } from "@monana/utils";
import { assertActiveUnit } from "./units";
import {
  enrollSubscription,
  processDueSubscriptions,
  createSubscriptionDelivery,
  computeNextRunAt,
} from "./subscription-engine";

export {
  enrollSubscription,
  processDueSubscriptions,
  createSubscriptionDelivery,
  createSubscriptionPrepayOrder,
  activateSubscriptionAfterPayment,
  pauseSubscription,
  updateSubscriptionBasket,
  getUpcomingDelivery,
  computeNextRunAt,
  computeSubscriptionPrice,
  isBeforeOrderCutoff,
  parsePackageItems,
  pricingForSubscription,
  pricingForPackageBasket,
  assertBasketMeetsPackageMinimums,
  resolveLineItemsWithTotal,
} from "./subscription-engine";

export {
  getGroceryStoreEntry,
  getMembershipSetup,
  getOnDemandCatalog,
  getStorePackages,
  getGroceryStoreHome,
  previewMembershipBasket,
  deliveryDayLabel,
} from "./customer-store";

export { enrollCustomerMembership } from "./membership-enroll";

export type {
  ProcurementLine,
  ProcurementReport,
  PackingLine,
  PackingSheet,
  PackingReport,
  RouteStop,
  RouteGroup,
  RouteReport,
  MarketReportBundle,
  MarketRunSummary,
  GroceryMarketSettings,
  ReportsDashboard,
  ReportsDashboardStats,
} from "./market-types";

export { DEFAULT_MARKET_SETTINGS } from "./market-types";

export {
  listDeliveryZones,
  getDeliveryZoneById,
  createDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
  seedDefaultDeliveryZones,
  matchDeliveryZone,
  normalizeAddress,
} from "./delivery-zones";

export {
  getMarketSettings,
  updateMarketSettings,
  formatDateTz,
  parseDeliveryDate,
  deliveryDayBounds,
  isMarketCutoffDue,
} from "./market-settings";

export {
  fetchDeliveryOrders,
  previewMarketReport,
  generateMarketRun,
  listMarketRuns,
  getMarketRunById,
  getMarketRunByDate,
  getReportsDashboard,
  lockMarketRun,
  completeMarketRun,
  updatePackingCheck,
  autoGenerateMarketRunIfDue,
  assignOrderDeliveryZone,
  buildMarketReportBundle,
} from "./market-reports";

export {
  procurementToHtml,
  packingSheetToHtml,
  routesToHtml,
  procurementToCsv,
  routesToCsv,
} from "./report-documents";

export {
  listUnits,
  getUnitById,
  getUnitByCode,
  assertActiveUnit,
  slugifyUnitCode,
  createUnit,
  updateUnit,
  deleteUnit,
  countUnits,
  type UnitDefinitionRecord,
  type UnitWithUsage,
} from "./units";

// Grocery module (Monana Market): products, packages, subscriptions, on-demand orders.

export async function listProducts(categoryId?: string) {
  return prisma.product.findMany({
    where: { module: "GROCERY", available: true, ...(categoryId ? { categoryId } : {}) },
    include: { category: true },
    orderBy: { name: "asc" },
  });
}

/** Admin: all grocery products including unavailable */
export async function listAllProducts(categoryId?: string) {
  return prisma.product.findMany({
    where: { module: "GROCERY", ...(categoryId ? { categoryId } : {}) },
    include: { category: true },
    orderBy: { name: "asc" },
  });
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    categoryId: string | null;
    available: boolean;
    unit: string;
  }>
) {
  if (data.unit) await assertActiveUnit(data.unit, "GROCERY");
  return prisma.product.update({ where: { id }, data });
}

export async function listCategories(module: BusinessModule = "GROCERY") {
  return prisma.category.findMany({
    where: { module },
    include: { _count: { select: { products: true, menuItems: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(data: { name: string; module: BusinessModule }) {
  return prisma.category.create({ data });
}

export async function updateCategory(id: string, data: { name?: string }) {
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await tx.menuItem.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    return tx.category.delete({ where: { id } });
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({ where: { id }, include: { category: true } });
}

type PackageItem = { productId: string; quantity: number };

function stripProductFromItems(items: unknown, productId: string): PackageItem[] | null {
  if (!Array.isArray(items)) return null;
  const next = (items as PackageItem[]).filter((row) => row?.productId !== productId);
  return next.length === (items as PackageItem[]).length ? null : next;
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new Error("Bidhaa haipatikani");

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.updateMany({ where: { productId: id }, data: { productId: null } });

    const packages = await tx.groceryPackage.findMany({ select: { id: true, items: true } });
    for (const pkg of packages) {
      const nextItems = stripProductFromItems(pkg.items, id);
      if (!nextItems) continue;
      await tx.groceryPackage.update({
        where: { id: pkg.id },
        data: {
          items: nextItems,
          ...(nextItems.length === 0 ? { active: false } : {}),
        },
      });
    }

    const subs = await tx.grocerySubscription.findMany({
      select: { id: true, defaultBasket: true, nextDeliveryItems: true },
    });
    for (const sub of subs) {
      const defaultBasket = stripProductFromItems(sub.defaultBasket, id);
      const nextDeliveryItems = stripProductFromItems(sub.nextDeliveryItems, id);
      if (!defaultBasket && !nextDeliveryItems) continue;
      await tx.grocerySubscription.update({
        where: { id: sub.id },
        data: {
          ...(defaultBasket ? { defaultBasket } : {}),
          ...(nextDeliveryItems ? { nextDeliveryItems } : {}),
        },
      });
    }

    await tx.product.delete({ where: { id } });
  });

  return { deleted: true };
}

export async function getPackageById(id: string) {
  return prisma.groceryPackage.findUnique({ where: { id } });
}

export async function createProduct(data: {
  name: string;
  description?: string;
  price: number;
  unit?: string;
  imageUrl?: string;
  categoryId?: string;
  available?: boolean;
}) {
  const unit = data.unit ?? "PIECE";
  await assertActiveUnit(unit, "GROCERY");
  return prisma.product.create({
    data: { ...data, unit, module: "GROCERY" },
  });
}

export async function listPackages() {
  const rows = await prisma.groceryPackage.findMany({
    where: { active: true, price: { gt: 0 } },
    orderBy: { name: "asc" },
  });
  return rows.filter((p) => Array.isArray(p.items) && p.items.length > 0);
}

export async function listAllPackages() {
  return prisma.groceryPackage.findMany({ orderBy: { name: "asc" } });
}

export async function updatePackage(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    kind: "WEEKLY_BASKET" | "MONTHLY_PANTRY";
    price: number;
    active: boolean;
    items: { productId: string; quantity: number }[];
    deliveriesPerMonth: number;
    discountPercent: number;
    freeDelivery: boolean;
    orderCutoffHours: number;
  }>
) {
  const { items, ...rest } = data;
  return prisma.groceryPackage.update({
    where: { id },
    data: {
      ...rest,
      ...(items !== undefined ? { items } : {}),
    },
  });
}

export async function createPackage(data: {
  name: string;
  description?: string;
  kind?: "WEEKLY_BASKET" | "MONTHLY_PANTRY";
  price: number;
  items: { productId: string; quantity: number }[];
  deliveriesPerMonth?: number;
  discountPercent?: number;
  freeDelivery?: boolean;
  orderCutoffHours?: number;
  active?: boolean;
}) {
  return prisma.groceryPackage.create({
    data: {
      name: data.name,
      description: data.description,
      kind: data.kind ?? "WEEKLY_BASKET",
      price: data.price,
      items: data.items,
      deliveriesPerMonth: data.deliveriesPerMonth ?? 1,
      discountPercent: data.discountPercent ?? 0,
      freeDelivery: data.freeDelivery ?? false,
      orderCutoffHours: data.orderCutoffHours ?? 48,
      active: data.active ?? true,
    },
  });
}

export async function deletePackage(id: string) {
  const activeSubs = await prisma.grocerySubscription.count({
    where: { packageId: id, status: "ACTIVE" },
  });
  if (activeSubs > 0) {
    return prisma.groceryPackage.update({ where: { id }, data: { active: false } });
  }
  return prisma.groceryPackage.delete({ where: { id } });
}

/** @deprecated use enrollSubscription */
export async function createSubscription(data: {
  userId: string;
  packageId: string;
  frequency: "WEEKLY" | "MONTHLY";
  address?: string;
}) {
  const result = await enrollSubscription({
    ...data,
    address: data.address ?? "Anwani haijasajiliwa",
    startNow: false,
  });
  return result.subscription;
}

export async function listUserSubscriptions(userId: string) {
  return prisma.grocerySubscription.findMany({
    where: { userId },
    include: { package: true, orders: { take: 3, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSubscriptionById(id: string) {
  return prisma.grocerySubscription.findUnique({
    where: { id },
    include: {
      package: true,
      user: { select: { id: true, name: true, phone: true } },
      orders: { take: 10, orderBy: { createdAt: "desc" }, include: { payment: true } },
    },
  });
}

export async function listAllSubscriptions(status?: SubscriptionStatus) {
  return prisma.grocerySubscription.findMany({
    where: status ? { status } : undefined,
    include: { package: true, user: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateSubscription(
  id: string,
  data: Partial<{
    status: SubscriptionStatus;
    nextRunAt: Date | null;
    address?: string;
    note?: string | null;
    preferredDayOfWeek?: number | null;
    preferredDayOfMonth?: number | null;
    secondaryDayOfMonth?: number | null;
    packageId?: string;
  }>
) {
  const sub = await prisma.grocerySubscription.findUnique({
    where: { id },
    include: { package: true },
  });
  if (!sub) throw new Error("Usajili haupatikani");

  const patch: typeof data = { ...data };

  if (data.packageId && data.packageId !== sub.packageId) {
    const pkg = await prisma.groceryPackage.findUnique({ where: { id: data.packageId } });
    if (!pkg?.active) throw new Error("Kifurushi kipya haipatikani");
    patch.packageId = data.packageId;
  }

  const merged = {
    frequency: sub.frequency,
    preferredDayOfWeek: data.preferredDayOfWeek !== undefined ? data.preferredDayOfWeek : sub.preferredDayOfWeek,
    preferredDayOfMonth: data.preferredDayOfMonth !== undefined ? data.preferredDayOfMonth : sub.preferredDayOfMonth,
    secondaryDayOfMonth: data.secondaryDayOfMonth !== undefined ? data.secondaryDayOfMonth : sub.secondaryDayOfMonth,
    deliveriesPerMonth: sub.deliveriesPerMonth,
  };

  if (
    data.preferredDayOfWeek !== undefined ||
    data.preferredDayOfMonth !== undefined ||
    data.secondaryDayOfMonth !== undefined ||
    (data.status === "ACTIVE" && sub.status !== "ACTIVE" && !data.nextRunAt && !sub.nextRunAt)
  ) {
    patch.nextRunAt = computeNextRunAt({ ...merged, from: new Date() });
  }

  if (data.status === "CANCELLED") {
    patch.nextRunAt = null;
  }

  return prisma.grocerySubscription.update({ where: { id }, data: patch });
}

export async function cancelSubscription(id: string) {
  return updateSubscription(id, { status: "CANCELLED", nextRunAt: null });
}

export async function listSubscriptionsPaginated(params: {
  page?: number;
  limit?: number;
  status?: SubscriptionStatus;
}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  const where = params.status ? { status: params.status } : {};

  const [items, total] = await Promise.all([
    prisma.grocerySubscription.findMany({
      where,
      skip,
      take: limit,
      include: { package: true, user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.grocerySubscription.count({ where }),
  ]);

  return paginatedResult(items, total, page, limit);
}

export async function countDueSubscriptions() {
  return prisma.grocerySubscription.count({
    where: { status: "ACTIVE", nextRunAt: { lte: new Date() } },
  });
}
