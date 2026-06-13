"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiDelete, apiGet, apiPost, normalizeApiList } from "../../../../../lib/admin-api";
import { matchesAdminSearch } from "../../../../../lib/admin-search";
import { formatMoney } from "../../../../../lib/format";
import { StatusBadge } from "../../../../../components/admin/StatusBadge";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminUserCell } from "../../../../../components/admin/dashboard/AdminUserCell";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";
import { GrocerySubscriptionManageModal } from "../../../../../components/admin/grocery/GrocerySubscriptionManageModal";
import { dayOfWeekLabel, frequencyLabel, packageKindLabel } from "@monana/utils";

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
  package: { id: string; name: string; price: string | number; kind: string };
};

type Package = { id: string; name: string; kind: string; active: boolean };
type User = { id: string; name: string | null; phone: string };
type Product = { id: string; name: string; available: boolean };

const WEEKDAY_VALUES = [6, 5, 4, 3, 2, 1, 0] as const;

const emptyForm = {
  userId: "",
  packageId: "",
  address: "",
  preferredDayOfWeek: "6",
  preferredDayOfMonth: "1",
  secondaryDayOfMonth: "15",
  status: "ACTIVE",
  startNow: false,
};

function formatSubDate(iso: string | null, locale: "en" | "sw") {
  if (!iso) return "—";
  const tag = locale === "sw" ? "sw-TZ" : "en-GB";
  return new Date(iso).toLocaleDateString(tag, { day: "2-digit", month: "short", year: "numeric" });
}

export default function GrocerySubscriptionsPage() {
  const { locale, t, tf } = useAdminLocale();
  const searchParams = useSearchParams();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningDue, setRunningDue] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [managing, setManaging] = useState<Sub | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  function load() {
    setLoading(true);
    Promise.all([
      apiGet<Sub[]>("/api/grocery/subscriptions?all=1"),
      apiGet<Package[]>("/api/grocery/packages?all=1"),
      apiGet<Product[]>("/api/grocery/products?all=1"),
      apiGet<User[] | { items: User[] }>("/api/admin/users?limit=100"),
    ])
      .then(([s, p, pr, u]) => {
        setSubs(s);
        setPackages(p.filter((x) => x.active));
        setProducts(pr);
        setUsers(normalizeApiList(u));
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const stats = useMemo(
    () => ({
      total: subs.length,
      active: subs.filter((s) => s.status === "ACTIVE").length,
      paused: subs.filter((s) => s.status === "PAUSED").length,
      due: subs.filter((s) => s.status === "ACTIVE" && s.nextRunAt && new Date(s.nextRunAt) <= new Date()).length,
    }),
    [subs]
  );

  const filteredSubs = useMemo(() => {
    return subs.filter((s) => {
      if (filterStatus && s.status !== filterStatus) return false;
      return matchesAdminSearch(search, [
        s.user.name ?? "",
        s.user.phone,
        s.package.name,
        s.address,
        s.status,
      ]);
    });
  }, [subs, search, filterStatus]);

  const selectedPkg = packages.find((p) => p.id === form.packageId);

  function scheduleLabel(s: Sub) {
    if (s.frequency === "WEEKLY" && s.preferredDayOfWeek != null) {
      return tf("scheduleEveryWeek", { day: dayOfWeekLabel(s.preferredDayOfWeek, locale) });
    }
    if (s.preferredDayOfMonth != null) {
      if (s.deliveriesPerMonth >= 2 && s.secondaryDayOfMonth) {
        return tf("scheduleMonthlyDays", {
          a: s.preferredDayOfMonth,
          b: s.secondaryDayOfMonth,
        });
      }
      return tf("scheduleMonthlyDay", { n: s.preferredDayOfMonth });
    }
    return frequencyLabel(s.frequency, locale);
  }

  function closeCreateModal() {
    setShowForm(false);
    setForm(emptyForm);
  }

  function openCreate() {
    setForm(emptyForm);
    setShowForm(true);
  }

  function openManage(s: Sub) {
    setManaging(s);
  }

  async function createSub(e: React.FormEvent) {
    e.preventDefault();
    const pkg = packages.find((p) => p.id === form.packageId);
    if (!pkg) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      userId: form.userId,
      packageId: form.packageId,
      address: form.address.trim(),
      startNow: form.startNow,
    };
    if (pkg.kind === "WEEKLY_BASKET") {
      body.preferredDayOfWeek = Number(form.preferredDayOfWeek);
    } else {
      body.preferredDayOfMonth = Number(form.preferredDayOfMonth);
      if (pkg.kind === "MONTHLY_PANTRY") {
        body.secondaryDayOfMonth = Number(form.secondaryDayOfMonth);
      }
    }
    try {
      await apiPost("/api/grocery/subscriptions", body);
      closeCreateModal();
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function runDue() {
    if (!window.confirm(t("runDueConfirm"))) return;
    setRunningDue(true);
    try {
      const result = await apiPost<{ processed: number; results: Array<{ error?: string }> }>(
        "/api/grocery/subscriptions/run-due",
        {}
      );
      const errors = result.results.filter((r) => r.error).length;
      alert(
        `${tf("runDueResult", { n: result.processed })}${
          errors ? ` · ${tf("runDueErrors", { n: errors })}` : ""
        }`
      );
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    } finally {
      setRunningDue(false);
    }
  }

  async function cancelSub(s: Sub) {
    const name = s.user.name ?? s.user.phone;
    if (!window.confirm(tf("cancelSubscriptionConfirm", { name }))) return;
    try {
      await apiDelete(`/api/grocery/subscriptions/${s.id}`);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    }
  }

  async function deliverNow(s: Sub) {
    try {
      await apiPost(`/api/grocery/subscriptions/${s.id}/deliver`, {});
      alert(t("deliveryOrderCreated"));
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    }
  }

  const isWeekly = selectedPkg?.kind === "WEEKLY_BASKET";
  const isMonthly = selectedPkg?.kind === "MONTHLY_PANTRY";

  if (loading && subs.length === 0) {
    return <AdminLoading label={t("loadingSubscriptions")} />;
  }

  return (
    <div className="admin-dash admin-dash--grocery">
      <AdminPageHeader
        title={t("subscriptions")}
        actions={
          <>
            <button type="button" className="admin-btn sm" onClick={openCreate}>
              {t("addSubscription")}
            </button>
            <Link href="/admin/grocery/packages" className="admin-btn secondary sm">
              {t("packages")}
            </Link>
            <button
              type="button"
              className="admin-btn secondary sm"
              onClick={runDue}
              disabled={runningDue}
            >
              {runningDue ? t("saving") : t("runDueSubscriptions")}
            </button>
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
          </>
        }
      />

      <p className="admin-page-lead">{t("grocerySubsDesc")}</p>

      <div className="admin-kpi-grid">
        <AdminKpiCard label={t("subscriptions")} value={stats.total} tone="grocery" icon="🔄" />
        <AdminKpiCard label={t("activeSubs")} value={stats.active} tone="success" />
        <AdminKpiCard label={t("paused")} value={stats.paused} tone="warning" trendUp={false} />
        <AdminKpiCard label={t("subsDueForDelivery")} value={stats.due} tone="accent" />
      </div>

      <AdminPanel title={t("filter")} badge={tf("shownCount", { n: filteredSubs.length })}>
        <div className="admin-menu-toolbar admin-panel__body-pad">
          <div className="admin-menu-toolbar__search">
            <input
              type="search"
              className="admin-crud-form__input"
              placeholder={t("searchSubscriptions")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("searchSubscriptionsAria")}
            />
          </div>
          <select
            className="admin-select admin-menu-toolbar__select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label={t("subStatus")}
          >
            <option value="">{t("allStatuses")}</option>
            <option value="ACTIVE">{t("subStatusActive")}</option>
            <option value="PAUSED">{t("subStatusPaused")}</option>
            <option value="PENDING_PAYMENT">{t("subStatusPendingPayment")}</option>
            <option value="CANCELLED">{t("subStatusCancelled")}</option>
          </select>
        </div>
      </AdminPanel>

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("subscriptions")} badge={`${filteredSubs.length}`}>
        {subs.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🔄</span>
            <p>{t("noSubsYet")}</p>
            <small>{t("clickAddHint")}</small>
          </div>
        ) : filteredSubs.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🔍</span>
            <p>{t("noSubscriptionsMatch")}</p>
            <small>{t("changeFiltersHint")}</small>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--comfortable">
              <thead>
                <tr>
                  <th>{t("customer")}</th>
                  <th>{t("packages")}</th>
                  <th>{t("schedule")}</th>
                  <th>{t("subStatus")}</th>
                  <th>{t("nextDelivery")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <AdminUserCell name={s.user.name} phone={s.user.phone} sub={s.address} />
                    </td>
                    <td>
                      <strong>{s.package.name}</strong>
                      <div className="admin-table-sub">
                        {formatMoney(s.package.price)} · {packageKindLabel(s.package.kind, locale).title}
                      </div>
                    </td>
                    <td>
                      <span>{scheduleLabel(s)}</span>
                      <div className="admin-table-sub">{frequencyLabel(s.frequency, locale)}</div>
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>{formatSubDate(s.nextRunAt, locale)}</td>
                    <td>
                      <div className="admin-table-actions">
                        <button type="button" className="admin-btn sm" onClick={() => openManage(s)}>
                          {t("manageSubscription")}
                        </button>
                        {s.status === "ACTIVE" ? (
                          <button type="button" className="admin-btn sm secondary" onClick={() => deliverNow(s)}>
                            {t("deliverNow")}
                          </button>
                        ) : null}
                        <button type="button" className="admin-btn sm danger" onClick={() => cancelSub(s)}>
                          {t("cancelSubscription")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      {managing ? (
        <GrocerySubscriptionManageModal
          sub={managing}
          packages={packages}
          products={products}
          onClose={() => setManaging(null)}
          onSaved={load}
        />
      ) : null}

      {showForm ? (
        <div className="admin-modal-overlay" onClick={closeCreateModal}>
          <div className="admin-modal admin-modal--wide" onClick={(ev) => ev.stopPropagation()}>
            <header className="admin-modal__head">
              <h2>{t("newSubscription")}</h2>
            </header>

            <form
              className="admin-crud-form admin-crud-form--grid admin-panel__body-pad"
              onSubmit={createSub}
            >
              <>
                  <div className="admin-crud-form__field admin-crud-form__field--full">
                    <label className="admin-crud-form__label" htmlFor="sub-user">
                      {t("customer")}
                    </label>
                    <select
                      id="sub-user"
                      className="admin-select"
                      value={form.userId}
                      onChange={(e) => setForm({ ...form, userId: e.target.value })}
                      required
                    >
                      <option value="">{t("selectCustomer")}</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name ?? u.phone} ({u.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-crud-form__field admin-crud-form__field--full">
                    <label className="admin-crud-form__label" htmlFor="sub-package">
                      {t("packages")}
                    </label>
                    <select
                      id="sub-package"
                      className="admin-select"
                      value={form.packageId}
                      onChange={(e) => setForm({ ...form, packageId: e.target.value })}
                      required
                    >
                      <option value="">{t("selectPackage")}</option>
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {packageKindLabel(p.kind, locale).title}
                        </option>
                      ))}
                    </select>
                  </div>
              </>

              <div className="admin-crud-form__field admin-crud-form__field--full">
                <label className="admin-crud-form__label" htmlFor="sub-address">
                  {t("deliveryAddress")}
                </label>
                <input
                  id="sub-address"
                  className="admin-crud-form__input"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                />
              </div>

              {isWeekly ? (
                <div className="admin-crud-form__field admin-crud-form__field--full">
                  <label className="admin-crud-form__label" htmlFor="sub-weekday">
                    {t("deliveryDayWeekly")}
                  </label>
                  <select
                    id="sub-weekday"
                    className="admin-select"
                    value={form.preferredDayOfWeek}
                    onChange={(e) => setForm({ ...form, preferredDayOfWeek: e.target.value })}
                  >
                    {WEEKDAY_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {dayOfWeekLabel(v, locale)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {isMonthly ? (
                <>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="sub-day1">
                      {t("firstDayOfMonth")}
                    </label>
                    <input
                      id="sub-day1"
                      className="admin-crud-form__input"
                      type="number"
                      min={1}
                      max={28}
                      value={form.preferredDayOfMonth}
                      onChange={(e) => setForm({ ...form, preferredDayOfMonth: e.target.value })}
                    />
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="sub-day2">
                      {t("secondDayOfMonth")}
                    </label>
                    <input
                      id="sub-day2"
                      className="admin-crud-form__input"
                      type="number"
                      min={1}
                      max={28}
                      value={form.secondaryDayOfMonth}
                      onChange={(e) => setForm({ ...form, secondaryDayOfMonth: e.target.value })}
                    />
                  </div>
                </>
              ) : null}

              <div className="admin-crud-form__field admin-crud-form__field--full">
                <label className="admin-hot-toggle__head" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.startNow}
                    onChange={(e) => setForm({ ...form, startNow: e.target.checked })}
                  />
                  <span>{t("startFirstOrderNow")}</span>
                </label>
              </div>

              <div className="admin-crud-form__actions admin-crud-form__field--full">
                <button type="submit" className="admin-btn" disabled={saving}>
                  {saving ? t("saving") : t("saveSubscription")}
                </button>
                <button type="button" className="admin-btn secondary" onClick={closeCreateModal}>
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
