"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost, normalizeApiList } from "../../../../lib/admin-api";
import { userInitials } from "../../../../lib/admin-dashboard";
import { AdminPageHeader } from "../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../components/admin/dashboard/AdminLoading";
import { AdminUserDetailModal } from "../../../../components/admin/users/AdminUserDetailModal";
import { useAdminLocale } from "../../../../components/admin/AdminLocaleProvider";

type UserRow = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
  _count: { orders: number; subscriptions: number; payments: number };
};

type UsersResponse = { items: UserRow[]; meta: { total: number; page: number; limit: number; totalPages: number } };

const ROLES = ["", "CUSTOMER", "ADMIN", "RIDER"] as const;

const emptyCreateForm = {
  name: "",
  phone: "",
  email: "",
  role: "CUSTOMER",
  locale: "en",
  password: "",
};

function formatJoined(iso: string, locale: "en" | "sw") {
  const tag = locale === "sw" ? "sw-TZ" : "en-GB";
  return new Date(iso).toLocaleDateString(tag, { day: "2-digit", month: "short", year: "numeric" });
}

function roleIcon(role: string) {
  if (role === "ADMIN") return "🛡️";
  if (role === "RIDER") return "🛵";
  return "👤";
}

export default function AdminUsersPage() {
  const { locale, t, tf } = useAdminLocale();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  useEffect(() => {
    const q = searchParams.get("q") ?? searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  function load() {
    setLoading(true);
    const q = new URLSearchParams({ limit: "100" });
    if (search.trim()) q.set("search", search.trim());
    if (roleFilter) q.set("role", roleFilter);

    apiGet<UsersResponse | UserRow[]>(`/api/admin/users?${q}`)
      .then((data) => {
        const rows = normalizeApiList(data);
        setUsers(rows);
        setTotal(
          data && typeof data === "object" && "meta" in data && data.meta
            ? (data.meta as UsersResponse["meta"]).total
            : rows.length
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [search, roleFilter]);

  const stats = useMemo(() => {
    const customers = users.filter((u) => u.role === "CUSTOMER").length;
    const staff = users.filter((u) => u.role !== "CUSTOMER").length;
    const withOrders = users.filter((u) => u._count.orders > 0).length;
    return { customers, staff, withOrders };
  }, [users]);

  function roleLabel(role: string) {
    if (role === "ADMIN") return t("roleAdmin");
    if (role === "RIDER") return t("roleRider");
    return t("roleCustomer");
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await apiPost("/api/admin/users", {
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim() || undefined,
        role: createForm.role,
        locale: createForm.locale,
        password: createForm.password.trim() || undefined,
      });
      setShowCreate(false);
      setCreateForm(emptyCreateForm);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="admin-dash admin-dash--users">
      <AdminPageHeader
        title={t("users")}
        actions={
          <>
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
            <button type="button" className="admin-btn sm" onClick={() => setShowCreate(true)}>
              + {t("addUser")}
            </button>
          </>
        }
      />

      <p className="admin-page-lead">{t("usersPageLead")}</p>

      <div className="admin-kpi-grid">
        <AdminKpiCard
          label={t("users")}
          value={total}
          trend={tf("shownCount", { n: users.length })}
          tone="accent"
        />
        <AdminKpiCard label={t("customersCount")} value={stats.customers} trend={t("roleCustomer")} tone="default" />
        <AdminKpiCard label={t("staffCount")} value={stats.staff} trend={t("roleAdmin")} tone="restaurant" />
        <AdminKpiCard label={t("withOrders")} value={stats.withOrders} trend={t("orders")} tone="success" />
      </div>

      <AdminPanel title={t("filter")} badge={tf("shownCount", { n: users.length })}>
        <div className="admin-panel__body-pad">
          <div className="admin-order-filters">
            <div className="admin-order-filters__search">
              <input
                type="search"
                className="admin-crud-form__input"
                placeholder={t("searchUsers")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t("searchUsers")}
              />
            </div>
          </div>

          <div className="admin-order-status-chips" role="group" aria-label={t("role")}>
            {ROLES.map((role) => (
              <button
                key={role || "all"}
                type="button"
                className={`admin-order-status-chip${roleFilter === role ? " is-active" : ""}`}
                onClick={() => setRoleFilter(role)}
              >
                {role ? `${roleIcon(role)} ${roleLabel(role)}` : t("all")}
              </button>
            ))}
          </div>
        </div>
      </AdminPanel>

      {error ? <p className="admin-error">{error}</p> : null}

      <AdminPanel title={t("usersList")} badge={tf("shownCount", { n: users.length })}>
        {loading ? (
          <AdminLoading label={t("loadingUsers")} />
        ) : users.length === 0 ? (
          <div className="admin-order-empty">
            <span aria-hidden>👥</span>
            <p>{t("noUsersMatch")}</p>
            <button type="button" className="admin-btn sm" onClick={() => setShowCreate(true)}>
              + {t("addUser")}
            </button>
          </div>
        ) : (
          <ul className="admin-user-grid">
            {users.map((u) => {
              const display = u.name?.trim() || u.phone;
              const active = u._count.orders > 0 || u._count.subscriptions > 0;

              return (
                <li
                  key={u.id}
                  className={`admin-user-card admin-user-card--${u.role.toLowerCase()}${active ? " admin-user-card--active" : ""}`}
                >
                  <div className="admin-user-card__accent" aria-hidden />

                  <button
                    type="button"
                    className="admin-user-card__open"
                    onClick={() => setSelectedId(u.id)}
                  >
                    <header className="admin-user-card__head">
                      <span className="admin-user-card__avatar" aria-hidden>
                        {userInitials(u.name, u.phone)}
                      </span>
                      <div className="admin-user-card__identity">
                        <strong>{display}</strong>
                        <small>{u.phone}</small>
                        {u.email ? <small className="admin-user-card__email">{u.email}</small> : null}
                      </div>
                      <span className={`admin-user-role-pill admin-user-role-pill--${u.role.toLowerCase()}`}>
                        {roleLabel(u.role)}
                      </span>
                    </header>

                    <div className="admin-user-card__metrics">
                      <div className="admin-user-card__metric">
                        <span className="admin-user-card__metric-value">{u._count.orders}</span>
                        <span className="admin-user-card__metric-label">{t("orders")}</span>
                      </div>
                      <div className="admin-user-card__metric">
                        <span className="admin-user-card__metric-value">{u._count.subscriptions}</span>
                        <span className="admin-user-card__metric-label">{t("subscriptions")}</span>
                      </div>
                      <div className="admin-user-card__metric">
                        <span className="admin-user-card__metric-value">{u._count.payments}</span>
                        <span className="admin-user-card__metric-label">{t("payments")}</span>
                      </div>
                    </div>

                    <footer className="admin-user-card__foot">
                      <span className="admin-user-card__joined">
                        {tf("memberSince", { date: formatJoined(u.createdAt, locale) })}
                      </span>
                      <span className="admin-user-card__cta">{t("viewUser")} →</span>
                    </footer>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>

      <AdminUserDetailModal
        userId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={load}
        onDeleted={load}
      />

      {showCreate ? (
        <div className="admin-modal-overlay admin-modal-overlay--spacious" onClick={() => setShowCreate(false)}>
          <div
            className="admin-modal admin-modal--catalog admin-modal--user-create"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-modal__head admin-user-create__head">
              <div>
                <h2>{t("addUser")}</h2>
                <p className="admin-modal__sub">{t("usersPageLead")}</p>
              </div>
              <button
                type="button"
                className="admin-modal__close"
                onClick={() => setShowCreate(false)}
                aria-label={t("close")}
              >
                ×
              </button>
            </header>

            <form className="admin-user-create__form" onSubmit={createUser}>
              <div className="admin-user-create__grid">
                <section className="admin-user-create__section">
                  <h3 className="admin-form-section__title">{t("accountTab")}</h3>
                  <label className="admin-crud-form__field">
                    <span>{t("customer")}</span>
                    <input
                      className="admin-crud-form__input"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      minLength={2}
                      autoFocus
                    />
                  </label>
                  <label className="admin-crud-form__field">
                    <span>{t("phone")}</span>
                    <input
                      className="admin-crud-form__input"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="0712 345 678"
                      required
                    />
                  </label>
                  <label className="admin-crud-form__field">
                    <span>{t("email")}</span>
                    <input
                      className="admin-crud-form__input"
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="optional@email.com"
                    />
                  </label>
                </section>

                <section className="admin-user-create__section admin-user-create__aside">
                  <h3 className="admin-form-section__title">{t("role")} & {t("locale")}</h3>
                  <label className="admin-crud-form__field">
                    <span>{t("role")}</span>
                    <select
                      className="admin-select"
                      value={createForm.role}
                      onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                    >
                      <option value="CUSTOMER">{t("roleCustomer")}</option>
                      <option value="RIDER">{t("roleRider")}</option>
                      <option value="ADMIN">{t("roleAdmin")}</option>
                    </select>
                  </label>
                  <label className="admin-crud-form__field">
                    <span>{t("locale")}</span>
                    <select
                      className="admin-select"
                      value={createForm.locale}
                      onChange={(e) => setCreateForm((f) => ({ ...f, locale: e.target.value }))}
                    >
                      <option value="en">English</option>
                      <option value="sw">Kiswahili</option>
                    </select>
                  </label>
                  <label className="admin-crud-form__field">
                    <span>{t("passwordOptional")}</span>
                    <input
                      className="admin-crud-form__input"
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                      autoComplete="new-password"
                      placeholder={t("resetPasswordHint")}
                    />
                  </label>
                </section>
              </div>

              <footer className="admin-modal__foot admin-user-create__foot">
                <button type="button" className="admin-btn secondary sm" onClick={() => setShowCreate(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="admin-btn sm" disabled={creating}>
                  {creating ? t("saving") : t("addUser")}
                </button>
              </footer>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
