"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "../../../../lib/admin-api";
import { formatMoney } from "../../../../lib/format";
import { orderRef } from "../../../../lib/admin-dashboard";
import { frequencyLabel } from "@monana/utils";
import { AdminPageHeader } from "../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../components/admin/dashboard/AdminPanel";
import { AdminBarChart } from "../../../../components/admin/dashboard/AdminBarChart";
import { AdminUserCell } from "../../../../components/admin/dashboard/AdminUserCell";
import { AdminLoading } from "../../../../components/admin/dashboard/AdminLoading";
import { AdminGrocerySectionNav } from "../../../../components/admin/dashboard/AdminGrocerySectionNav";
import { StatusBadge } from "../../../../components/admin/StatusBadge";
import { useAdminLocale } from "../../../../components/admin/AdminLocaleProvider";

type GroceryStats = {
  products: number;
  packages: number;
  categories: number;
  units: number;
  membershipMembers: number;
  subscriptionsActive: number;
  subscriptionsDue: number;
  ordersToday: number;
  ordersOnDemandToday: number;
  ordersSubscriptionToday: number;
  ordersPending: number;
  revenueToday: number;
  recentOrders: Array<{
    id: string;
    status: string;
    total: string | number;
    user: { name: string | null; phone: string };
  }>;
  recentSubscriptions: Array<{
    id: string;
    status: string;
    frequency: string;
    user: { name: string | null; phone: string };
    package: { name: string };
  }>;
};

export default function GroceryOverviewPage() {
  const { locale, t, tf } = useAdminLocale();
  const [stats, setStats] = useState<GroceryStats | null>(null);
  const [hotCount, setHotCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiGet<GroceryStats>("/api/admin/grocery/stats"),
      apiGet<{ resolved: unknown[] }>("/api/admin/hot-products?module=GROCERY"),
    ])
      .then(([s, hot]) => {
        setStats(s);
        setHotCount(hot.resolved?.length ?? 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="admin-dash admin-dash--grocery">
        <AdminPageHeader title={t("navGrocery")} />
        <p className="admin-error">{error}</p>
      </div>
    );
  }

  if (!stats || loading) {
    return (
      <div className="admin-dash admin-dash--grocery">
        <AdminPageHeader title={t("navGrocery")} />
        <AdminLoading label={t("loadingGrocery")} />
      </div>
    );
  }

  return (
    <div className="admin-dash admin-dash--grocery">
      <AdminPageHeader
        title={t("navGrocery")}
        actions={
          <div className="admin-overview-quick">
            <Link href="/admin/orders?module=GROCERY" className="admin-btn secondary sm">
              {t("orders")}
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
          </div>
        }
      />

      <AdminGrocerySectionNav
        products={stats.products}
        packages={stats.packages}
        subscriptions={stats.subscriptionsActive}
        categories={stats.categories ?? 0}
        units={stats.units ?? 0}
        hotCount={hotCount}
        membershipCount={stats.membershipMembers ?? 0}
      />

      {(stats.subscriptionsDue > 0 || stats.ordersPending > 0) && (
        <div className="admin-insight-strip">
          {stats.subscriptionsDue > 0 ? (
            <Link href="/admin/grocery/subscriptions" className="admin-insight-chip admin-insight-chip--warn">
              {tf("subsDueChip", { n: stats.subscriptionsDue })}
            </Link>
          ) : null}
          {stats.ordersPending > 0 ? (
            <Link href="/admin/orders?module=GROCERY" className="admin-insight-chip admin-insight-chip--warn">
              {tf("pendingOrdersChip", { n: stats.ordersPending })}
            </Link>
          ) : null}
        </div>
      )}

      <div className="admin-kpi-grid">
        <AdminKpiCard icon="📦" tone="grocery" label={t("ordersToday")} value={stats.ordersToday} />
        <AdminKpiCard icon="💰" tone="success" label={t("revenueToday")} value={formatMoney(stats.revenueToday)} />
        <AdminKpiCard icon="⏳" tone="warning" label={t("ordersPending")} value={stats.ordersPending} />
        <AdminKpiCard
          icon="🔄"
          tone="accent"
          label={t("activeSubs")}
          value={stats.subscriptionsActive}
          hint={tf("subsDueHint", { n: stats.subscriptionsDue })}
        />
      </div>

      <div className="admin-dash-row">
        <AdminBarChart
          title={t("orderTypeToday")}
          items={[
            { label: t("onDemand"), value: stats.ordersOnDemandToday, tone: "grocery" },
            { label: t("subscriptions"), value: stats.ordersSubscriptionToday, tone: "accent" },
          ]}
        />
        <AdminBarChart
          title={t("subsAndProducts")}
          items={[
            { label: t("activeSubs"), value: stats.subscriptionsActive, tone: "grocery" },
            { label: t("subsDueForDelivery"), value: stats.subscriptionsDue, tone: "accent" },
            { label: t("products"), value: stats.products, tone: "default" },
          ]}
        />
      </div>

      <div className="admin-dash-row admin-dash-row--wide-left">
        <AdminPanel title={t("recentOrders")} actionHref="/admin/orders?module=GROCERY">
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--comfortable">
              <thead>
                <tr>
                  <th>{t("order")}</th>
                  <th>{t("customer")}</th>
                  <th>{t("total")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-table-empty">
                      {t("noOrdersYet")}
                    </td>
                  </tr>
                ) : (
                  stats.recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href="/admin/orders?module=GROCERY" className="admin-order-id">
                          {orderRef(o.id)}
                        </Link>
                      </td>
                      <td>
                        <AdminUserCell name={o.user.name} phone={o.user.phone} />
                      </td>
                      <td>
                        <span className="admin-order-total">{formatMoney(o.total)}</span>
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel title={t("recentSubs")} actionHref="/admin/grocery/subscriptions">
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--comfortable">
              <thead>
                <tr>
                  <th>{t("customer")}</th>
                  <th>{t("frequency")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="admin-table-empty">
                      {t("noSubsYet")}
                    </td>
                  </tr>
                ) : (
                  stats.recentSubscriptions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <AdminUserCell name={s.user.name} phone={s.user.phone} sub={s.package.name} />
                      </td>
                      <td>{frequencyLabel(s.frequency, locale)}</td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
