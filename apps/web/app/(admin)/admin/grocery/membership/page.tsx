"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "../../../../../lib/admin-api";
import { formatMoney } from "../../../../../lib/format";
import { dayOfWeekLabel, frequencyLabel } from "@monana/utils";
import { StatusBadge } from "../../../../../components/admin/StatusBadge";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminUserCell } from "../../../../../components/admin/dashboard/AdminUserCell";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { GroceryMembershipEnrollModal } from "../../../../../components/admin/grocery/GroceryMembershipEnrollModal";
import { GrocerySubscriptionManageModal } from "../../../../../components/admin/grocery/GrocerySubscriptionManageModal";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type Sub = {
  id: string;
  status: string;
  frequency: string;
  address: string;
  nextRunAt: string | null;
  preferredDayOfWeek: number | null;
  preferredDayOfMonth: number | null;
  secondaryDayOfMonth: number | null;
  deliveriesPerMonth: number;
  user: { id: string; name: string | null; phone: string };
  package: { id: string; name: string; kind: string; price: string | number };
};

type Product = { id: string; name: string; available: boolean };
type Package = { id: string; name: string; kind: string; active: boolean };

type Plan = {
  id: "WEEKLY" | "MONTHLY";
  title: string;
  label: string;
  discountPercent: number;
  freeDelivery: boolean;
  badge: string | null;
};

type Setup = { plans: Plan[] };

function isMembershipSub(s: Sub) {
  return s.package.name.includes("Uanachama");
}

function formatSubDate(iso: string | null, locale: "en" | "sw") {
  if (!iso) return "—";
  const tag = locale === "sw" ? "sw-TZ" : "en-GB";
  return new Date(iso).toLocaleDateString(tag, { day: "2-digit", month: "short", year: "numeric" });
}

export default function GroceryMembershipPage() {
  const { locale, t, tf } = useAdminLocale();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [managing, setManaging] = useState<Sub | null>(null);
  const [search, setSearch] = useState("");

  function load() {
    setLoading(true);
    Promise.all([
      apiGet<Sub[]>("/api/grocery/subscriptions?all=1"),
      apiGet<Setup>(`/api/grocery/store/membership?locale=${locale}`),
      apiGet<Package[]>("/api/grocery/packages?all=1"),
      apiGet<Product[]>("/api/grocery/products?all=1"),
    ])
      .then(([s, setup, p, pr]) => {
        setSubs(s.filter(isMembershipSub));
        setPlans(setup.plans);
        setPackages(p.filter((x) => x.active));
        setProducts(pr);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [locale]);

  const stats = useMemo(() => {
    const weekly = subs.filter((s) => s.frequency === "WEEKLY").length;
    const monthly = subs.filter((s) => s.frequency === "MONTHLY").length;
    const active = subs.filter((s) => s.status === "ACTIVE").length;
    const pending = subs.filter((s) => s.status === "PENDING_PAYMENT").length;
    return { total: subs.length, weekly, monthly, active, pending };
  }, [subs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter(
      (s) =>
        s.user.name?.toLowerCase().includes(q) ||
        s.user.phone.includes(q) ||
        s.package.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [subs, search]);

  function scheduleLabel(s: Sub) {
    if (s.frequency === "WEEKLY" && s.preferredDayOfWeek != null) {
      return tf("scheduleEveryWeek", { day: dayOfWeekLabel(s.preferredDayOfWeek, locale) });
    }
    if (s.preferredDayOfMonth != null) {
      return tf("scheduleMonthlyDay", { n: s.preferredDayOfMonth });
    }
    return frequencyLabel(s.frequency, locale);
  }

  if (loading && subs.length === 0 && plans.length === 0) {
    return <AdminLoading label={t("loadingMembership")} />;
  }

  return (
    <div className="admin-dash admin-dash--grocery">
      <AdminPageHeader
        title={t("membership")}
        actions={
          <>
            <button type="button" className="admin-btn sm" onClick={() => setShowEnroll(true)}>
              {t("enrollMembershipAdmin")}
            </button>
            <Link href="/admin/grocery/subscriptions" className="admin-btn secondary sm">
              {t("viewInSubscriptions")}
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
          </>
        }
      />

      <p className="admin-page-lead">{t("membershipPageLead")}</p>

      <div className="admin-kpi-grid">
        <AdminKpiCard label={t("membershipMembers")} value={stats.total} tone="grocery" icon="🎫" />
        <AdminKpiCard label={t("membershipWeekly")} value={stats.weekly} tone="accent" />
        <AdminKpiCard label={t("membershipMonthly")} value={stats.monthly} tone="default" />
        <AdminKpiCard label={t("activeSubs")} value={stats.active} tone="success" />
        <AdminKpiCard label={t("subStatusPendingPayment")} value={stats.pending} tone="warning" trendUp={false} />
      </div>

      {plans.length > 0 ? (
        <AdminPanel title={t("membershipPlan")}>
          <div className="admin-membership-plan-grid admin-panel__body-pad">
            {plans.map((p) => (
              <div key={p.id} className="admin-membership-plan-card admin-membership-plan-card--static">
                {p.badge ? <span className="admin-membership-plan-card__badge">{p.badge}</span> : null}
                <strong>{p.title}</strong>
                <small>{p.label}</small>
                <span className="admin-membership-plan-card__meta">
                  {p.discountPercent > 0 ? `${p.discountPercent}%` : ""}
                  {p.freeDelivery ? ` · ${t("freeDeliveryOffer")}` : ""}
                </span>
              </div>
            ))}
          </div>
        </AdminPanel>
      ) : null}

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("membershipMembers")} badge={tf("shownCount", { n: filtered.length })}>
        <div className="admin-category-toolbar">
          <div className="admin-category-toolbar__search">
            <input
              type="search"
              className="admin-crud-form__input"
              placeholder={t("searchSubscriptions")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("searchSubscriptionsAria")}
            />
          </div>
        </div>

        {subs.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🎫</span>
            <p>{t("noMembershipYet")}</p>
            <button type="button" className="admin-btn sm" onClick={() => setShowEnroll(true)}>
              {t("enrollMembershipAdmin")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🔍</span>
            <p>{t("noSubscriptionsMatch")}</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--comfortable">
              <thead>
                <tr>
                  <th>{t("customer")}</th>
                  <th>{t("membershipPlan")}</th>
                  <th>{t("schedule")}</th>
                  <th>{t("subStatus")}</th>
                  <th>{t("nextDelivery")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <AdminUserCell name={s.user.name} phone={s.user.phone} sub={s.address} />
                    </td>
                    <td>
                      <strong>{s.package.name}</strong>
                      <div className="admin-table-sub">{frequencyLabel(s.frequency, locale)}</div>
                    </td>
                    <td>{scheduleLabel(s)}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>{formatSubDate(s.nextRunAt, locale)}</td>
                    <td>
                      <button type="button" className="admin-btn sm" onClick={() => setManaging(s)}>
                        {t("manageSubscription")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      {showEnroll ? (
        <GroceryMembershipEnrollModal onClose={() => setShowEnroll(false)} onEnrolled={load} />
      ) : null}

      {managing ? (
        <GrocerySubscriptionManageModal
          sub={managing}
          packages={packages}
          products={products}
          onClose={() => setManaging(null)}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}
