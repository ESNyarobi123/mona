/** Shared JSON shapes for grocery market reports (API + admin UI). */

export type ProcurementLine = {
  productId: string | null;
  name: string;
  unit: string;
  totalQuantity: number;
  orderCount: number;
};

export type ProcurementReport = {
  deliveryDate: string;
  generatedAt: string;
  lines: ProcurementLine[];
  summary: {
    totalOrders: number;
    totalCustomers: number;
    totalSkus: number;
  };
};

export type PackingLine = {
  key: string;
  productId: string | null;
  name: string;
  unit: string;
  quantity: number;
  checked: boolean;
};

export type PackingSheet = {
  orderId: string;
  orderRef: string;
  customer: { id: string; name: string | null; phone: string };
  address: string;
  zoneId: string | null;
  zoneName: string | null;
  orderType: string | null;
  status: string;
  total: number;
  lines: PackingLine[];
  completedAt: string | null;
};

export type PackingReport = {
  deliveryDate: string;
  sheets: PackingSheet[];
};

export type RouteStop = {
  orderId: string;
  orderRef: string;
  customer: { name: string | null; phone: string };
  address: string;
  sequence: number;
  itemCount: number;
  total: number;
};

export type RouteGroup = {
  zoneId: string | null;
  zoneName: string;
  zoneNameSw: string | null;
  sortOrder: number;
  stops: RouteStop[];
};

export type RouteReport = {
  deliveryDate: string;
  groups: RouteGroup[];
  unassigned: RouteStop[];
  summary: {
    totalStops: number;
    zoneCount: number;
    unassignedCount: number;
  };
};

export type MarketReportBundle = {
  deliveryDate: string;
  generatedAt: string;
  procurement: ProcurementReport;
  packing: PackingReport;
  routes: RouteReport;
  includedOrderIds: string[];
};

export type MarketRunSummary = {
  id: string;
  deliveryDate: string;
  generatedAt: string;
  trigger: "MANUAL" | "CRON";
  status: "OPEN" | "LOCKED" | "COMPLETED";
  lockedAt: string | null;
  orderCount: number;
  customerCount: number;
};

export type GroceryMarketSettings = {
  autoGenerateEnabled: boolean;
  /** 0=Sun … 6=Sat — day orders close (e.g. 5 = Friday) */
  cutoffWeekday: number;
  /** 0–23 local Tanzania time */
  cutoffHour: number;
  /** ISO date of last successful cron run */
  lastAutoRunDate: string | null;
};

export const DEFAULT_MARKET_SETTINGS: GroceryMarketSettings = {
  autoGenerateEnabled: true,
  cutoffWeekday: 5,
  cutoffHour: 18,
  lastAutoRunDate: null,
};

export type ReportsDashboardStats = {
  orderCount: number;
  customerCount: number;
  skuCount: number;
  zoneCount: number;
  unassignedCount: number;
  packingDone: number;
  packingTotal: number;
};

export type ReportsDashboard = {
  deliveryDate: string;
  /** saved = run in DB · live = preview only · empty = no orders */
  source: "saved" | "live" | "empty";
  cutoff: { due: boolean; reason?: string; deliveryDate?: string | null };
  recentRuns: MarketRunSummary[];
  run: (MarketRunSummary & {
    procurement: ProcurementReport;
    packing: PackingReport;
    routes: RouteReport;
    includedOrderIds: string[];
  }) | null;
  bundle: MarketReportBundle | null;
  stats: ReportsDashboardStats;
  settings: Pick<GroceryMarketSettings, "cutoffWeekday" | "cutoffHour" | "autoGenerateEnabled">;
};
