"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "../../../lib/admin-api";
import { formatMoney } from "../../../lib/format";
import { orderRef, pct } from "../../../lib/admin-dashboard";
import { AdminPageHeader } from "../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../components/admin/dashboard/AdminPanel";
import { AdminUserCell } from "../../../components/admin/dashboard/AdminUserCell";
import { AdminLoading } from "../../../components/admin/dashboard/AdminLoading";
import { AdminDonutChart } from "../../../components/admin/dashboard/AdminDonutChart";
import { AdminVerticalBarChart } from "../../../components/admin/dashboard/AdminVerticalBarChart";
import { AdminProgressBar } from "../../../components/admin/dashboard/AdminProgressBar";
import { AdminModuleLaunchers } from "../../../components/admin/dashboard/AdminModuleLaunchers";
import { StatusBadge } from "../../../components/admin/StatusBadge";
import { useAdminLocale } from "../../../components/admin/AdminLocaleProvider";

type OverviewStats = {
  ordersTotal: number;
  ordersToday: number;
  ordersPending: number;
  paymentsAwaiting: number;
  paymentsPending: number;
  usersTotal: number;
  restaurantOrdersToday: number;
  groceryOrdersToday: number;
  revenueToday: number;
  recentOrders: Array<{
    id: string;
    module: string;
    status: string;
    total: string | number;
    createdAt: string;
    user: { name: string | null; phone: string };
  }>;
  recentPayments: Array<{
    id: string;
    status: string;
    amount: string | number;
    reference: string | null;
    order: { id: string };
    user: { name: string | null; phone: string };
  }>;
};

function formatOverviewDate(iso: string, locale: "en" | "sw") {
  const tag = locale === "sw" ? "sw-TZ" : "en-GB";
  return new Date(iso).toLocaleString(tag, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOverviewPage() {
  const { t, tf, locale } = useAdminLocale();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiGet<OverviewStats>("/api/admin/stats")
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="admin-dash">
        <AdminPageHeader title={t("overview")} />
        <p className="admin-error">{error}</p>
      </div>
    );
  }

  if (!stats || loading) {
    return (
      <div className="admin-dash">
        <AdminPageHeader title={t("overview")} />
        <AdminLoading label={t("loadingOverview")} />
      </div>
    );
  }

  const restShare = pct(stats.restaurantOrdersToday, stats.ordersToday);
  const grocShare = pct(stats.groceryOrdersToday, stats.ordersToday);
  const paymentsAction = stats.paymentsAwaiting + stats.paymentsPending;
  const needsAttention = stats.ordersPending > 0 || paymentsAction > 0;

  return (
    <div className="admin-dash">
      <AdminPageHeader
        title={t("overview")}
        actions={
          <div className="admin-overview-quick">
            <Link href="/admin/orders" className="admin-btn secondary sm">
              {t("orders")}
            </Link>
            <Link href="/admin/payments" className="admin-btn secondary sm">
              {t("payments")}
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
          </div>
        }
      />

      <AdminModuleLaunchers
        restaurantOrdersToday={stats.restaurantOrdersToday}
        groceryOrdersToday={stats.groceryOrdersToday}
        restaurantShare={restShare}
        groceryShare={grocShare}
      />

      <div className="admin-kpi-grid">
        <AdminKpiCard
          label={t("ordersToday")}
          value={stats.ordersToday}
          trend={tf("totalAllTime", { n: stats.ordersTotal })}
          tone="accent"
        />
        <AdminKpiCard
          label={t("revenueToday")}
          value={formatMoney(stats.revenueToday)}
          trend={t("nonRefundable")}
          tone="success"
        />
        <AdminKpiCard
          label={t("ordersPending")}
          value={stats.ordersPending}
          trend={t("needsAction")}
          tone="warning"
          trendUp={false}
        />
        <AdminKpiCard
          label={t("paymentsAwaiting")}
          value={paymentsAction}
          trend={tf("toConfirm", { n: stats.paymentsAwaiting })}
          tone="danger"
          trendUp={false}
        />
      </div>

      <div className="admin-insight-strip">
        {needsAttention ? (
          <>
            {stats.ordersPending > 0 ? (
              <Link href="/admin/orders" className="admin-insight-chip admin-insight-chip--warn">
                {tf("pendingOrdersChip", { n: stats.ordersPending })}
              </Link>
            ) : null}
            {paymentsAction > 0 ? (
              <Link href="/admin/payments" className="admin-insight-chip admin-insight-chip--warn">
                {tf("toConfirm", { n: stats.paymentsAwaiting })}
              </Link>
            ) : null}
          </>
        ) : (
          <span className="admin-insight-chip admin-insight-chip--ok">{t("allClearToday")}</span>
        )}
        <Link href="/admin/users" className="admin-insight-chip">
          {t("users")}: {stats.usersTotal}
        </Link>
        <span className="admin-insight-chip">
          {t("navRestaurant")} {stats.restaurantOrdersToday} · {t("navGrocery")} {stats.groceryOrdersToday}
        </span>
      </div>

      <div className="admin-dash-row admin-dash-row--wide-left">
        <AdminVerticalBarChart
          title={t("activityToday")}
          items={[
            { label: t("chartRest"), value: stats.restaurantOrdersToday, tone: "restaurant" },
            { label: t("chartGroc"), value: stats.groceryOrdersToday, tone: "grocery" },
            { label: t("chartPendingShort"), value: stats.ordersPending, tone: "accent" },
            { label: t("chartPayments"), value: stats.paymentsAwaiting, tone: "default" },
            { label: t("chartUsers"), value: Math.min(stats.usersTotal, 99), tone: "default" },
          ]}
        />

        <AdminDonutChart
          title={t("orderSplitToday")}
          centerValue={stats.ordersToday}
          centerLabel={t("ordersToday")}
          segments={[
            { label: t("navRestaurant"), value: stats.restaurantOrdersToday, color: "var(--mn-orange)" },
            { label: t("navGrocery"), value: stats.groceryOrdersToday, color: "var(--mn-navy-light)" },
            {
              label: t("pending"),
              value: stats.ordersPending,
              color: "rgba(245, 158, 11, 0.85)",
            },
          ]}
          actionLabel={t("viewAllOrders")}
          actionHref="/admin/orders"
        />
      </div>

      <AdminPanel
        title={t("recentOrders")}
        actionHref="/admin/orders"
        badge={tf("recentCount", { n: stats.recentOrders.length })}
      >
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--comfortable">
            <thead>
              <tr>
                <th>{t("order")}</th>
                <th>{t("customer")}</th>
                <th>{t("module")}</th>
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
                      <Link href="/admin/orders" className="admin-order-id">
                        <span className="admin-order-id__hash">#</span>
                        {orderRef(o.id).replace("#", "")}
                      </Link>
                      <span className="admin-order-date">{formatOverviewDate(o.createdAt, locale)}</span>
                    </td>
                    <td>
                      <AdminUserCell name={o.user.name} phone={o.user.phone} />
                    </td>
                    <td>
                      <StatusBadge status={o.module} />
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>
                      <AdminProgressBar status={o.status} />
                    </td>
                    <td>
                      <span className="admin-order-total">{formatMoney(o.total)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <AdminPanel
        title={t("paymentsNeedAction")}
        actionHref="/admin/payments"
        badge={paymentsAction > 0 ? String(paymentsAction) : undefined}
      >
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--comfortable">
            <thead>
              <tr>
                <th>{t("customer")}</th>
                <th>{t("reference")}</th>
                <th>{t("amount")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="admin-table-empty">
                    {t("noPaymentsPending")}
                  </td>
                </tr>
              ) : (
                stats.recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <AdminUserCell
                        name={p.user.name}
                        phone={p.user.phone}
                        sub={orderRef(p.order.id)}
                      />
                    </td>
                    <td>
                      {p.reference ? (
                        <code className="admin-payment-ref">{p.reference}</code>
                      ) : (
                        <span className="admin-payment-ref admin-payment-ref--empty">
                          {t("noReference")}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="admin-order-total">{formatMoney(p.amount)}</span>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
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
