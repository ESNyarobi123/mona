import { prisma, type BusinessModule, type HotPickMode } from "@monana/db";

export type HotItem = {
  id: string;
  source: "PRODUCT" | "MENU_ITEM";
  productId?: string;
  menuItemId?: string;
  name: string;
  description?: string | null;
  price: number;
  unit: string;
  imageUrl?: string | null;
  badge?: string | null;
  sortOrder: number;
  inStock?: boolean;
  /** AUTO only — order count in lookback window */
  orderCount?: number;
  /** AUTO only — total quantity sold */
  quantitySold?: number;
};

export type HotProductsConfigView = {
  module: BusinessModule;
  enabled: boolean;
  mode: HotPickMode;
  maxItems: number;
  lookbackDays: number;
  updatedAt: Date;
};

const DEFAULT_CONFIG = {
  enabled: false,
  mode: "AUTO" as HotPickMode,
  maxItems: 8,
  lookbackDays: 30,
};

async function ensureConfig(module: BusinessModule) {
  return prisma.hotProductsConfig.upsert({
    where: { module },
    create: { module, ...DEFAULT_CONFIG, updatedAt: new Date() },
    update: {},
  });
}

export async function getConfig(module: BusinessModule): Promise<HotProductsConfigView> {
  return ensureConfig(module);
}

export async function getAllConfigs(): Promise<HotProductsConfigView[]> {
  await Promise.all([ensureConfig("GROCERY"), ensureConfig("RESTAURANT")]);
  return prisma.hotProductsConfig.findMany({ orderBy: { module: "asc" } });
}

export async function updateConfig(
  module: BusinessModule,
  data: Partial<{
    enabled: boolean;
    mode: HotPickMode;
    maxItems: number;
    lookbackDays: number;
  }>
) {
  await ensureConfig(module);
  return prisma.hotProductsConfig.update({
    where: { module },
    data: { ...data, updatedAt: new Date() },
  });
}

/** Rank products/menu items by order frequency in the lookback window */
export async function computeAutoHotItems(module: BusinessModule, limit?: number) {
  const config = await ensureConfig(module);
  const max = limit ?? config.maxItems;
  const since = new Date();
  since.setDate(since.getDate() - config.lookbackDays);

  if (module === "GROCERY") {
    const rows = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        order: {
          module: "GROCERY",
          status: { not: "CANCELLED" },
          createdAt: { gte: since },
        },
      },
      _count: { orderId: true },
      _sum: { quantity: true },
      orderBy: { _count: { orderId: "desc" } },
      take: max * 3,
    });

    const productIds = rows.map((r) => r.productId!).filter(Boolean);
    if (!productIds.length) return [] as HotItem[];

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, available: true, module: "GROCERY" },
      include: { category: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    return rows
      .filter((r) => r.productId && byId.has(r.productId))
      .slice(0, max)
      .map((r, i) => {
        const p = byId.get(r.productId!)!;
        return {
          id: p.id,
          source: "PRODUCT" as const,
          productId: p.id,
          name: p.name,
          description: p.description,
          price: Number(p.price),
          unit: p.unit,
          imageUrl: p.imageUrl,
          badge: "🔥 Hot",
          sortOrder: i,
          inStock: p.inStock,
          orderCount: r._count.orderId,
          quantitySold: Number(r._sum.quantity ?? 0),
        };
      });
  }

  const rows = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: {
      menuItemId: { not: null },
      order: {
        module: "RESTAURANT",
        status: { not: "CANCELLED" },
        createdAt: { gte: since },
      },
    },
    _count: { orderId: true },
    _sum: { quantity: true },
    orderBy: { _count: { orderId: "desc" } },
    take: max * 3,
  });

  const menuItemIds = rows.map((r) => r.menuItemId!).filter(Boolean);
  if (!menuItemIds.length) return [] as HotItem[];

  const items = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, available: true },
    include: { category: true },
  });
  const byId = new Map(items.map((m) => [m.id, m]));

  return rows
    .filter((r) => r.menuItemId && byId.has(r.menuItemId))
    .slice(0, max)
    .map((r, i) => {
      const m = byId.get(r.menuItemId!)!;
      return {
        id: m.id,
        source: "MENU_ITEM" as const,
        menuItemId: m.id,
        name: m.name,
        description: m.description,
        price: Number(m.price),
        unit: m.unit,
        imageUrl: m.imageUrl,
        badge: "🔥 Hot",
        sortOrder: i,
        orderCount: r._count.orderId,
        quantitySold: Number(r._sum.quantity ?? 0),
      };
    });
}

export async function listManualPicks(module: BusinessModule) {
  return prisma.hotPickManual.findMany({
    where: { module },
    include: { product: { include: { category: true } }, menuItem: { include: { category: true } } },
    orderBy: { sortOrder: "asc" },
  });
}

function manualPickToHotItem(
  pick: Awaited<ReturnType<typeof listManualPicks>>[number],
  index: number
): HotItem | null {
  if (!pick.active) return null;
  if (pick.product) {
    return {
      id: pick.id,
      source: "PRODUCT",
      productId: pick.product.id,
      name: pick.product.name,
      description: pick.product.description,
      price: Number(pick.product.price),
      unit: pick.product.unit,
      imageUrl: pick.product.imageUrl,
      badge: pick.badge ?? "🔥 Hot",
      sortOrder: pick.sortOrder ?? index,
      inStock: pick.product.inStock,
    };
  }
  if (pick.menuItem) {
    return {
      id: pick.id,
      source: "MENU_ITEM",
      menuItemId: pick.menuItem.id,
      name: pick.menuItem.name,
      description: pick.menuItem.description,
      price: Number(pick.menuItem.price),
      unit: pick.menuItem.unit,
      imageUrl: pick.menuItem.imageUrl,
      badge: pick.badge ?? "🔥 Hot",
      sortOrder: pick.sortOrder ?? index,
    };
  }
  return null;
}

export async function getManualHotItems(module: BusinessModule, activeOnly = true) {
  const picks = await listManualPicks(module);
  const items = picks
    .map((p, i) => manualPickToHotItem(p, i))
    .filter((x): x is HotItem => x != null);
  return activeOnly ? items.filter((_, i) => picks[i]?.active) : items;
}

/** Public/customer: resolved hot list for a module */
export async function getHotProducts(module: BusinessModule) {
  const config = await ensureConfig(module);
  if (!config.enabled) {
    return { enabled: false, mode: config.mode, module, items: [] as HotItem[] };
  }

  const items =
    config.mode === "MANUAL"
      ? (await getManualHotItems(module)).slice(0, config.maxItems)
      : await computeAutoHotItems(module, config.maxItems);

  return {
    enabled: true,
    mode: config.mode,
    module,
    lookbackDays: config.mode === "AUTO" ? config.lookbackDays : undefined,
    items,
  };
}

/** Admin dashboard: config + manual picks + auto preview */
export async function getAdminHotProductsView(module: BusinessModule) {
  const config = await ensureConfig(module);
  const [manualPicks, autoPreview] = await Promise.all([
    listManualPicks(module),
    computeAutoHotItems(module, config.maxItems),
  ]);

  const resolved =
    config.enabled && config.mode === "MANUAL"
      ? (await getManualHotItems(module)).slice(0, config.maxItems)
      : config.enabled
        ? autoPreview
        : [];

  return {
    config,
    manualPicks,
    autoPreview,
    resolved,
  };
}

export async function addManualPick(data: {
  module: BusinessModule;
  productId?: string;
  menuItemId?: string;
  badge?: string;
  sortOrder?: number;
}) {
  if (data.module === "GROCERY") {
    if (!data.productId) throw new Error("productId is required for GROCERY");
    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product?.available) throw new Error("Product not found or unavailable");
  } else {
    if (!data.menuItemId) throw new Error("menuItemId is required for RESTAURANT");
    const item = await prisma.menuItem.findUnique({ where: { id: data.menuItemId } });
    if (!item?.available) throw new Error("Menu item not found or unavailable");
  }

  const maxOrder = await prisma.hotPickManual.aggregate({
    where: { module: data.module },
    _max: { sortOrder: true },
  });

  return prisma.hotPickManual.create({
    data: {
      module: data.module,
      productId: data.module === "GROCERY" ? data.productId : null,
      menuItemId: data.module === "RESTAURANT" ? data.menuItemId : null,
      badge: data.badge ?? "🔥 Hot",
      sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
    },
    include: { product: true, menuItem: true },
  });
}

export async function updateManualPick(
  id: string,
  data: Partial<{ badge: string | null; sortOrder: number; active: boolean }>
) {
  const pick = await prisma.hotPickManual.findUnique({ where: { id } });
  if (!pick) throw new Error("Hot pick not found");
  return prisma.hotPickManual.update({
    where: { id },
    data,
    include: { product: true, menuItem: true },
  });
}

export async function deleteManualPick(id: string) {
  return prisma.hotPickManual.delete({ where: { id } });
}

export async function reorderManualPicks(module: BusinessModule, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.hotPickManual.updateMany({
        where: { id, module },
        data: { sortOrder: index },
      })
    )
  );
  return listManualPicks(module);
}

export async function getHotPickForProduct(productId: string) {
  return prisma.hotPickManual.findUnique({ where: { productId } });
}

export async function getHotPickForMenuItem(menuItemId: string) {
  return prisma.hotPickManual.findUnique({ where: { menuItemId } });
}

/** Admin: mark/unmark an item as a manual hot pick (enables MANUAL mode when turning on). */
export async function setProductHotStatus(productId: string, hot: boolean, badge = "🔥 Hot") {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found");

  const existing = await getHotPickForProduct(productId);
  if (hot) {
    await updateConfig("GROCERY", { enabled: true, mode: "MANUAL" });
    if (existing) {
      return updateManualPick(existing.id, { active: true, badge });
    }
    return addManualPick({ module: "GROCERY", productId, badge });
  }

  if (existing) await deleteManualPick(existing.id);
  return null;
}

export async function setMenuItemHotStatus(menuItemId: string, hot: boolean, badge = "🔥 Hot") {
  const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!item) throw new Error("Menu item not found");

  const existing = await getHotPickForMenuItem(menuItemId);
  if (hot) {
    await updateConfig("RESTAURANT", { enabled: true, mode: "MANUAL" });
    if (existing) {
      return updateManualPick(existing.id, { active: true, badge });
    }
    return addManualPick({ module: "RESTAURANT", menuItemId, badge });
  }

  if (existing) await deleteManualPick(existing.id);
  return null;
}
