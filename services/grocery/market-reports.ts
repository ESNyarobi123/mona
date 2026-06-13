import { prisma, type MarketRunTrigger } from "@monana/db";
import { listDeliveryZones, matchDeliveryZone, type DeliveryZoneRecord } from "./delivery-zones";
import {
  deliveryDayBounds,
  formatDateTz,
  getMarketSettings,
  isMarketCutoffDue,
  markAutoRunComplete,
  parseDeliveryDate,
} from "./market-settings";
import type {
  MarketReportBundle,
  MarketRunSummary,
  PackingLine,
  PackingReport,
  PackingSheet,
  ProcurementLine,
  ProcurementReport,
  ReportsDashboard,
  ReportsDashboardStats,
  RouteGroup,
  RouteReport,
  RouteStop,
} from "./market-types";

type OrderRow = Awaited<ReturnType<typeof fetchDeliveryOrders>>[number];

function orderRef(id: string) {
  return `#${id.slice(-6).toUpperCase()}`;
}

/** Paid grocery orders scheduled (or placed) for the delivery day. */
export async function fetchDeliveryOrders(deliveryDate: string) {
  const { start, end } = deliveryDayBounds(deliveryDate);

  return prisma.order.findMany({
    where: {
      module: "GROCERY",
      status: { not: "CANCELLED" },
      payment: { status: "PAID" },
      OR: [
        { scheduledFor: { gte: start, lte: end } },
        {
          scheduledFor: null,
          createdAt: { gte: start, lte: end },
        },
      ],
    },
    include: {
      items: true,
      payment: true,
      user: { select: { id: true, name: true, phone: true } },
      deliveryZone: true,
    },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
  });
}

function buildProcurement(deliveryDate: string, orders: OrderRow[], generatedAt: Date): ProcurementReport {
  const map = new Map<string, ProcurementLine & { orderIds: Set<string> }>();

  for (const order of orders) {
    for (const item of order.items) {
      const key = `${item.productId ?? item.name}|${item.unit}`;
      const qty = Number(item.quantity);
      const existing = map.get(key);
      if (existing) {
        existing.totalQuantity += qty;
        existing.orderIds.add(order.id);
      } else {
        map.set(key, {
          productId: item.productId,
          name: item.name,
          unit: item.unit,
          totalQuantity: qty,
          orderCount: 0,
          orderIds: new Set([order.id]),
        });
      }
    }
  }

  const lines = [...map.values()]
    .map(({ orderIds, ...line }) => ({
      ...line,
      totalQuantity: Math.round(line.totalQuantity * 1000) / 1000,
      orderCount: orderIds.size,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const customerIds = new Set(orders.map((o) => o.userId));

  return {
    deliveryDate,
    generatedAt: generatedAt.toISOString(),
    lines,
    summary: {
      totalOrders: orders.length,
      totalCustomers: customerIds.size,
      totalSkus: lines.length,
    },
  };
}

function initialPackingLines(order: OrderRow): PackingLine[] {
  return order.items.map((item, idx) => ({
    key: item.id ?? `${order.id}-${idx}`,
    productId: item.productId,
    name: item.name,
    unit: item.unit,
    quantity: Number(item.quantity),
    checked: false,
  }));
}

function buildPacking(
  deliveryDate: string,
  orders: OrderRow[],
  zones: DeliveryZoneRecord[],
  existingChecks: Map<string, { lines: PackingLine[]; completedAt: Date | null }>
): PackingReport {
  const sheets: PackingSheet[] = orders.map((order) => {
    const zone =
      order.deliveryZone ??
      matchDeliveryZone(order.address, zones, order.deliveryZoneId);
    const saved = existingChecks.get(order.id);
    const lines = saved?.lines ?? initialPackingLines(order);
    const allChecked = lines.length > 0 && lines.every((l) => l.checked);

    return {
      orderId: order.id,
      orderRef: orderRef(order.id),
      customer: order.user,
      address: order.address ?? "—",
      zoneId: zone?.id ?? order.deliveryZoneId ?? null,
      zoneName: zone?.name ?? null,
      orderType: order.orderType,
      status: order.status,
      total: Number(order.total),
      lines,
      completedAt:
        saved?.completedAt?.toISOString() ??
        (allChecked ? new Date().toISOString() : null),
    };
  });

  return { deliveryDate, sheets };
}

function buildRoutes(
  deliveryDate: string,
  orders: OrderRow[],
  zones: DeliveryZoneRecord[]
): RouteReport {
  const groupsMap = new Map<string, RouteGroup>();
  const unassigned: RouteStop[] = [];

  for (const zone of zones.filter((z) => z.active)) {
    groupsMap.set(zone.id, {
      zoneId: zone.id,
      zoneName: zone.name,
      zoneNameSw: zone.nameSw,
      sortOrder: zone.sortOrder,
      stops: [],
    });
  }

  for (const order of orders) {
    const zone =
      order.deliveryZone ??
      matchDeliveryZone(order.address, zones, order.deliveryZoneId);
    const stop: RouteStop = {
      orderId: order.id,
      orderRef: orderRef(order.id),
      customer: { name: order.user.name, phone: order.user.phone },
      address: order.address ?? "—",
      sequence: 0,
      itemCount: order.items.length,
      total: Number(order.total),
    };

    if (zone && groupsMap.has(zone.id)) {
      groupsMap.get(zone.id)!.stops.push(stop);
    } else {
      unassigned.push(stop);
    }
  }

  const groups = [...groupsMap.values()]
    .filter((g) => g.stops.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const group of groups) {
    group.stops.sort((a, b) => a.address.localeCompare(b.address, "sw"));
    group.stops.forEach((s, i) => {
      s.sequence = i + 1;
    });
  }

  unassigned.sort((a, b) => a.address.localeCompare(b.address, "sw"));
  unassigned.forEach((s, i) => {
    s.sequence = i + 1;
  });

  const totalStops = orders.length;

  return {
    deliveryDate,
    groups,
    unassigned,
    summary: {
      totalStops,
      zoneCount: groups.length,
      unassignedCount: unassigned.length,
    },
  };
}

export async function buildMarketReportBundle(
  deliveryDate: string,
  existingChecks?: Map<string, { lines: PackingLine[]; completedAt: Date | null }>
): Promise<MarketReportBundle> {
  const [orders, zones] = await Promise.all([
    fetchDeliveryOrders(deliveryDate),
    listDeliveryZones(true),
  ]);
  const generatedAt = new Date();
  const procurement = buildProcurement(deliveryDate, orders, generatedAt);
  const packing = buildPacking(deliveryDate, orders, zones, existingChecks ?? new Map());
  const routes = buildRoutes(deliveryDate, orders, zones);

  return {
    deliveryDate,
    generatedAt: generatedAt.toISOString(),
    procurement,
    packing,
    routes,
    includedOrderIds: orders.map((o) => o.id),
  };
}

function runToSummary(run: {
  id: string;
  deliveryDate: Date;
  generatedAt: Date;
  trigger: string;
  status: string;
  lockedAt: Date | null;
  orderCount: number;
  customerCount: number;
}): MarketRunSummary {
  return {
    id: run.id,
    deliveryDate: formatDateTz(run.deliveryDate),
    generatedAt: run.generatedAt.toISOString(),
    trigger: run.trigger as MarketRunSummary["trigger"],
    status: run.status as MarketRunSummary["status"],
    lockedAt: run.lockedAt?.toISOString() ?? null,
    orderCount: run.orderCount,
    customerCount: run.customerCount,
  };
}

export async function previewMarketReport(deliveryDate: string) {
  return buildMarketReportBundle(deliveryDate);
}

function statsFromBundle(bundle: MarketReportBundle | null): ReportsDashboardStats {
  if (!bundle) {
    return {
      orderCount: 0,
      customerCount: 0,
      skuCount: 0,
      zoneCount: 0,
      unassignedCount: 0,
      packingDone: 0,
      packingTotal: 0,
    };
  }
  const sheets = bundle.packing.sheets;
  return {
    orderCount: bundle.procurement.summary.totalOrders,
    customerCount: bundle.procurement.summary.totalCustomers,
    skuCount: bundle.procurement.summary.totalSkus,
    zoneCount: bundle.routes.summary.zoneCount,
    unassignedCount: bundle.routes.summary.unassignedCount,
    packingDone: sheets.filter((s) => s.completedAt).length,
    packingTotal: sheets.length,
  };
}

/** One call for the admin Reports page — run, preview, stats, history, cutoff. */
export async function getReportsDashboard(deliveryDate: string): Promise<ReportsDashboard> {
  const [recentRuns, settings, savedRun] = await Promise.all([
    listMarketRuns(12),
    getMarketSettings(),
    getMarketRunByDate(deliveryDate),
  ]);
  const cutoff = isMarketCutoffDue(settings);

  if (savedRun) {
    const bundle: MarketReportBundle = {
      deliveryDate,
      generatedAt: savedRun.generatedAt,
      procurement: savedRun.procurement,
      packing: savedRun.packing,
      routes: savedRun.routes,
      includedOrderIds: savedRun.includedOrderIds,
    };
    return {
      deliveryDate,
      source: "saved",
      cutoff,
      recentRuns,
      run: savedRun,
      bundle,
      stats: statsFromBundle(bundle),
      settings: {
        cutoffWeekday: settings.cutoffWeekday,
        cutoffHour: settings.cutoffHour,
        autoGenerateEnabled: settings.autoGenerateEnabled,
      },
    };
  }

  const bundle = await previewMarketReport(deliveryDate);
  const hasOrders = bundle.procurement.summary.totalOrders > 0;

  return {
    deliveryDate,
    source: hasOrders ? "live" : "empty",
    cutoff,
    recentRuns,
    run: null,
    bundle: hasOrders ? bundle : null,
    stats: statsFromBundle(hasOrders ? bundle : null),
    settings: {
      cutoffWeekday: settings.cutoffWeekday,
      cutoffHour: settings.cutoffHour,
      autoGenerateEnabled: settings.autoGenerateEnabled,
    },
  };
}

export async function generateMarketRun(input: {
  deliveryDate: string;
  trigger?: MarketRunTrigger;
  lock?: boolean;
}) {
  const deliveryDate = input.deliveryDate;
  const dateValue = parseDeliveryDate(deliveryDate);

  const existing = await prisma.groceryMarketRun.findUnique({
    where: { deliveryDate: dateValue },
    include: { packingChecks: true },
  });

  if (existing?.status === "LOCKED" || existing?.status === "COMPLETED") {
    throw new Error("Ripoti ya siku hii imefungwa — haiwezi kubadilishwa");
  }

  const checkMap = new Map<string, { lines: PackingLine[]; completedAt: Date | null }>();
  if (existing) {
    for (const c of existing.packingChecks) {
      checkMap.set(c.orderId, {
        lines: c.lines as PackingLine[],
        completedAt: c.completedAt,
      });
    }
  }

  const bundle = await buildMarketReportBundle(deliveryDate, checkMap);
  const trigger = input.trigger ?? "MANUAL";
  const lock = input.lock ?? false;

  const data = {
    deliveryDate: dateValue,
    generatedAt: new Date(),
    trigger,
    status: lock ? ("LOCKED" as const) : ("OPEN" as const),
    lockedAt: lock ? new Date() : null,
    orderCount: bundle.procurement.summary.totalOrders,
    customerCount: bundle.procurement.summary.totalCustomers,
    procurement: bundle.procurement,
    packing: bundle.packing,
    routes: bundle.routes,
    includedOrderIds: bundle.includedOrderIds,
  };

  const run = existing
    ? await prisma.groceryMarketRun.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.groceryMarketRun.create({ data });

  await syncPackingChecks(run.id, bundle.packing.sheets, checkMap);

  return getMarketRunById(run.id);
}

async function syncPackingChecks(
  runId: string,
  sheets: PackingSheet[],
  preserved: Map<string, { lines: PackingLine[]; completedAt: Date | null }>
) {
  const orderIds = sheets.map((s) => s.orderId);
  await prisma.groceryPackingCheck.deleteMany({
    where: { runId, orderId: { notIn: orderIds } },
  });

  for (const sheet of sheets) {
    const prev = preserved.get(sheet.orderId);
    const lines = sheet.lines;
    const allChecked = lines.length > 0 && lines.every((l) => l.checked);
    await prisma.groceryPackingCheck.upsert({
      where: { runId_orderId: { runId, orderId: sheet.orderId } },
      create: {
        runId,
        orderId: sheet.orderId,
        lines,
        completedAt: allChecked ? new Date() : prev?.completedAt ?? null,
      },
      update: {
        lines,
        completedAt: allChecked ? new Date() : prev?.completedAt ?? null,
      },
    });
  }
}

export async function listMarketRuns(limit = 30) {
  const rows = await prisma.groceryMarketRun.findMany({
    orderBy: { deliveryDate: "desc" },
    take: limit,
  });
  return rows.map(runToSummary);
}

export async function getMarketRunById(id: string) {
  const run = await prisma.groceryMarketRun.findUnique({
    where: { id },
    include: { packingChecks: true },
  });
  if (!run) return null;

  return {
    ...runToSummary(run),
    procurement: run.procurement as ProcurementReport,
    packing: run.packing as PackingReport,
    routes: run.routes as RouteReport,
    includedOrderIds: run.includedOrderIds,
    packingChecks: run.packingChecks.map((c) => ({
      orderId: c.orderId,
      lines: c.lines as PackingLine[],
      completedAt: c.completedAt?.toISOString() ?? null,
      updatedAt: c.updatedAt.toISOString(),
    })),
  };
}

export async function getMarketRunByDate(deliveryDate: string) {
  const run = await prisma.groceryMarketRun.findUnique({
    where: { deliveryDate: parseDeliveryDate(deliveryDate) },
    include: { packingChecks: true },
  });
  if (!run) return null;
  return getMarketRunById(run.id);
}

export async function lockMarketRun(id: string) {
  const run = await prisma.groceryMarketRun.findUnique({ where: { id } });
  if (!run) throw new Error("Ripoti haipatikani");
  if (run.status === "COMPLETED") throw new Error("Ripoti tayari imekamilika");

  await prisma.groceryMarketRun.update({
    where: { id },
    data: { status: "LOCKED", lockedAt: new Date() },
  });
  return getMarketRunById(id);
}

export async function completeMarketRun(id: string) {
  await prisma.groceryMarketRun.update({
    where: { id },
    data: { status: "COMPLETED" },
  });
  return getMarketRunById(id);
}

export async function updatePackingCheck(input: {
  runId: string;
  orderId: string;
  lines: PackingLine[];
}) {
  const run = await prisma.groceryMarketRun.findUnique({ where: { id: input.runId } });
  if (!run) throw new Error("Ripoti haipatikani");
  if (run.status === "COMPLETED") {
    throw new Error("Ripoti imekamilika — huwezi kubadilisha checklist");
  }

  const allChecked = input.lines.length > 0 && input.lines.every((l) => l.checked);
  await prisma.groceryPackingCheck.upsert({
    where: { runId_orderId: { runId: input.runId, orderId: input.orderId } },
    create: {
      runId: input.runId,
      orderId: input.orderId,
      lines: input.lines,
      completedAt: allChecked ? new Date() : null,
    },
    update: {
      lines: input.lines,
      completedAt: allChecked ? new Date() : null,
    },
  });

  const packing = run.packing as PackingReport;
  const sheets = packing.sheets.map((s) =>
    s.orderId === input.orderId
      ? {
          ...s,
          lines: input.lines,
          completedAt: allChecked ? new Date().toISOString() : s.completedAt,
        }
      : s
  );

  await prisma.groceryMarketRun.update({
    where: { id: input.runId },
    data: { packing: { ...packing, sheets } },
  });

  return getMarketRunById(input.runId);
}

/** Cron: generate + lock when cutoff evening reached (Friday 18:00 → Saturday delivery). */
export async function autoGenerateMarketRunIfDue() {
  const settings = await getMarketSettings();
  const check = isMarketCutoffDue(settings);
  if (!check.due) {
    return { generated: false, reason: check.reason, deliveryDate: check.deliveryDate ?? null };
  }

  const run = await generateMarketRun({
    deliveryDate: check.deliveryDate,
    trigger: "CRON",
    lock: true,
  });
  await markAutoRunComplete(check.deliveryDate);

  return {
    generated: true,
    deliveryDate: check.deliveryDate,
    runId: run?.id ?? null,
    cutoffDate: check.cutoffDate,
  };
}

export async function assignOrderDeliveryZone(orderId: string, deliveryZoneId: string | null) {
  if (deliveryZoneId) {
    const zone = await prisma.deliveryZone.findUnique({ where: { id: deliveryZoneId } });
    if (!zone?.active) throw new Error("Eneo halipatikani");
  }
  return prisma.order.update({
    where: { id: orderId },
    data: { deliveryZoneId },
  });
}
