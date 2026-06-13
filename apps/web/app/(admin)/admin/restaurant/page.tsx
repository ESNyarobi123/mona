"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "../../../../lib/admin-api";
import { formatMoney } from "../../../../lib/format";
import { orderRef } from "../../../../lib/admin-dashboard";
import { AdminPageHeader } from "../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../components/admin/dashboard/AdminPanel";
import { AdminUserCell } from "../../../../components/admin/dashboard/AdminUserCell";
import { AdminLoading } from "../../../../components/admin/dashboard/AdminLoading";
import { AdminDonutChart } from "../../../../components/admin/dashboard/AdminDonutChart";
import { AdminVerticalBarChart } from "../../../../components/admin/dashboard/AdminVerticalBarChart";
import { AdminProgressBar } from "../../../../components/admin/dashboard/AdminProgressBar";
import { AdminKitchenQueueList } from "../../../../components/admin/dashboard/AdminKitchenQueueList";
import { AdminStatPills } from "../../../../components/admin/dashboard/AdminActionGrid";
import { AdminSlotStrip } from "../../../../components/admin/dashboard/AdminSlotStrip";
import { StatusBadge } from "../../../../components/admin/StatusBadge";
import { useAdminLocale } from "../../../../components/admin/AdminLocaleProvider";

type RestaurantStats = {
  menuItems: number;
  menus: number;
  kitchenActive: number;
  ordersToday: number;
  ordersPending: number;
  revenueToday: number;
  ordersInProgress: number;
  ordersDelivered: number;
  ordersBySlot: { BREAKFAST: number; LUNCH: number; DINNER: number };
  kitchenQueue: Array<{
    id: string;
    mealSlot: string;
    status: string;
    position: number;
    order: { id: string; user: { name: string | null; phone: string }; items: { name: string }[] };
  }>;
  recentOrders: Array<{
    id: string;
    status: string;
    total: string | number;
    mealSlot: string | null;
    user: { name: string | null; phone?: string };
  }>;
};

type SlotStatus = {
  timeDisplay: string;
  slots: Array<{
    slot: string;
    label: string;
    emoji: string;
    orderWindow: string;
    deliversFor: string;
    status: "OPEN" | "CLOSED";
  }>;
};

export default function RestaurantOverviewPage() {
  const { locale, t, tf, slotLabel } = useAdminLocale();
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [slots, setSlots] = useState<SlotStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiGet<RestaurantStats>("/api/admin/restaurant/stats"),
      apiGet<SlotStatus>(`/api/restaurant/slots/status?locale=${locale}`).catch(() => null),
    ])
      .then(([s, slotData]) => {
        setStats(s);
        setSlots(slotData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("error")));
  }, [locale]);

  if (error) return <p className="admin-error">{error}</p>;
  if (!stats) return <AdminLoading label={t("loadingRestaurant")} />;

  const queueBusy = stats.kitchenActive > 0;

  return (
    <div className="admin-dash admin-dash--restaurant">
      <AdminPageHeader
        title={t("navRestaurant")}
        actions={
          <>
            <Link href="/admin/restaurant/kitchen" className="admin-btn sm">
              {t("kitchen")}
            </Link>
            <Link href="/admin/restaurant/menu" className="admin-btn secondary sm">
              {t("menu")}
            </Link>
          </>
        }
      />

      {slots ? (
        <AdminSlotStrip
          slots={slots.slots}
          timeDisplay={slots.timeDisplay}
          ordersBySlot={stats.ordersBySlot}
        />
      ) : null}

      <div className="admin-insight-strip">
        <span className={`admin-insight-chip ${queueBusy ? "admin-insight-chip--warn" : "admin-insight-chip--ok"}`}>
          {queueBusy
            ? tf("kitchenActiveBanner", { n: stats.kitchenActive })
            : t("kitchenCalmBanner")}
        </span>
        {stats.ordersPending > 0 ? (
          <span className="admin-insight-chip admin-insight-chip--warn">
            {tf("pendingOrdersChip", { n: stats.ordersPending })}
          </span>
        ) : null}
        <span className="admin-insight-chip">
          {tf("menuInsight", { items: stats.menuItems, menus: stats.menus })}
        </span>
      </div>

      <div className="admin-kpi-grid">
        <AdminKpiCard
          label={t("ordersToday")}
          value={stats.ordersToday}
          trend={tf("deliveredTrend", { n: stats.ordersDelivered })}
          tone="restaurant"
        />
        <AdminKpiCard
          label={t("revenueToday")}
          value={formatMoney(stats.revenueToday)}
          trend={t("nonRefundable")}
          tone="success"
        />
        <AdminKpiCard
          label={t("pending")}
          value={stats.ordersPending}
          trend={t("needsAction")}
          tone="warning"
          trendUp={false}
        />
        <AdminKpiCard
          label={t("kitchenQueue")}
          value={stats.kitchenActive}
          trend={queueBusy ? t("inProgress") : t("calm")}
          tone="accent"
          trendUp={!queueBusy}
        />
      </div>

      <div className="admin-dash-row admin-dash-row--wide-left">
        <AdminVerticalBarChart
          title={t("ordersBySlotToday")}
          items={[
            { label: slotLabel("BREAKFAST"), value: stats.ordersBySlot.BREAKFAST, tone: "restaurant" },
            { label: slotLabel("LUNCH"), value: stats.ordersBySlot.LUNCH, tone: "restaurant" },
            { label: slotLabel("DINNER"), value: stats.ordersBySlot.DINNER, tone: "restaurant" },
          ]}
        />

        <AdminDonutChart
          title={t("orderStatusToday")}
          centerValue={stats.ordersToday}
          centerLabel={t("ordersToday")}
          segments={[
            { label: t("delivered"), value: stats.ordersDelivered, color: "var(--admin-success)" },
            { label: t("inProgress"), value: stats.ordersInProgress, color: "var(--mn-orange)" },
            {
              label: t("pending"),
              value: Math.max(0, stats.ordersPending),
              color: "rgba(245, 158, 11, 0.9)",
            },
          ]}
          actionLabel={t("viewAllOrders")}
          actionHref="/admin/orders"
        />
      </div>

      <div className="admin-dash-row admin-dash-row--wide-left">
        <AdminPanel title={t("kitchenQueue")} actionHref="/admin/restaurant/kitchen">
          <div className="admin-panel__body-pad">
            <AdminKitchenQueueList items={stats.kitchenQueue} />
          </div>
        </AdminPanel>

        <div className="admin-dash" style={{ gap: "1rem" }}>
          <AdminPanel title={t("menu")}>
            <div className="admin-panel__body-pad">
              <AdminStatPills
                items={[
                  { label: t("items"), value: stats.menuItems },
                  { label: t("menusActive"), value: stats.menus },
                  { label: t("ordersToday"), value: stats.ordersToday },
                  { label: t("revenue"), value: formatMoney(stats.revenueToday) },
                ]}
              />
            </div>
          </AdminPanel>
        </div>
      </div>

      <AdminPanel title={t("recentOrders")} actionHref="/admin/orders">
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--comfortable">
            <thead>
              <tr>
                <th>{t("order")}</th>
                <th>{t("customer")}</th>
                <th>{t("slot")}</th>
                <th>{t("status")}</th>
                <th>{t("progress")}</th>
                <th>{t("total")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    {t("noOrdersYet")}
                  </td>
                </tr>
              ) : (
                stats.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href="/admin/orders" className="admin-panel__action">
                        {orderRef(o.id)}
                      </Link>
                    </td>
                    <td>
                      <AdminUserCell name={o.user.name} phone={o.user.phone ?? ""} />
                    </td>
                    <td>
                      <span className="admin-kitchen-pill">
                        {o.mealSlot ? slotLabel(o.mealSlot) : "—"}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      <AdminProgressBar status={o.status} />
                    </td>
                    <td>{formatMoney(o.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </div>
  );
}
