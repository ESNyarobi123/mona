"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiDelete, apiGet, apiPatch } from "../../../lib/admin-api";
import { formatMoney } from "../../../lib/format";
import { orderRef, userInitials } from "../../../lib/admin-dashboard";
import { orderStatusLabel } from "../../../lib/customer-i18n";
import { StatusBadge } from "../StatusBadge";
import { AdminLoading } from "../dashboard/AdminLoading";
import { useAdminLocale } from "../AdminLocaleProvider";
import { frequencyLabel, packageKindLabel } from "@monana/utils";

type UserDetail = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
  wallet: { id: string; balance: string | number; updatedAt: string } | null;
  orders: Array<{
    id: string;
    module: string;
    status: string;
    total: string | number;
    address: string | null;
    orderType: string | null;
    channel: string;
    createdAt: string;
    payment: { id: string; status: string; reference: string | null; amount: string | number } | null;
    _count: { items: number };
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    frequency: string;
    address: string;
    nextRunAt: string | null;
    preferredDayOfWeek: number | null;
    preferredDayOfMonth: number | null;
    createdAt: string;
    package: { id: string; name: string; price: string | number; kind: string };
  }>;
  payments: Array<{
    id: string;
    amount: string | number;
    status: string;
    reference: string | null;
    method: string;
    createdAt: string;
    order: { id: string; module: string; status: string };
  }>;
  _count: { orders: number; payments: number; subscriptions: number };
};

type Tab = "account" | "orders" | "subscriptions" | "activity";

type Props = {
  userId: string | null;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
};

const TAB_ICONS: Record<Tab, string> = {
  account: "👤",
  orders: "📋",
  subscriptions: "📦",
  activity: "💳",
};

function formatDate(iso: string, locale: "en" | "sw") {
  const tag = locale === "sw" ? "sw-TZ" : "en-GB";
  return new Date(iso).toLocaleString(tag, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function moduleIcon(module: string) {
  return module === "RESTAURANT" ? "🍽️" : "🛒";
}

export function AdminUserDetailModal({ userId, onClose, onUpdated, onDeleted }: Props) {
  const { locale, t, tf } = useAdminLocale();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("account");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "CUSTOMER",
    locale: "en",
    password: "",
  });

  function load(id: string) {
    setLoading(true);
    setError("");
    apiGet<UserDetail>(`/api/admin/users/${id}`)
      .then((data) => {
        setUser(data);
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          role: data.role,
          locale: data.locale,
          password: "",
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setTab("account");
      setEditing(false);
      return;
    }
    load(userId);
  }, [userId]);

  if (!userId) return null;

  function roleLabel(role: string) {
    if (role === "ADMIN") return t("roleAdmin");
    if (role === "RIDER") return t("roleRider");
    return t("roleCustomer");
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const body: Record<string, string> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        locale: form.locale,
      };
      if (form.password.trim()) body.password = form.password.trim();
      await apiPatch(`/api/admin/users/${user.id}`, body);
      setEditing(false);
      load(user.id);
      onUpdated();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!user) return;
    const label = user.name?.trim() || user.phone;
    if (!confirm(tf("deleteUserConfirm", { name: label, n: user._count.orders }))) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/admin/users/${user.id}`);
      onDeleted();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    } finally {
      setDeleting(false);
    }
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "account", label: t("accountTab") },
    { key: "orders", label: t("ordersTab"), count: user?._count.orders },
    { key: "subscriptions", label: t("subscriptionsTab"), count: user?._count.subscriptions },
    { key: "activity", label: t("activityTab"), count: user?._count.payments },
  ];

  return (
    <div className="admin-modal-overlay admin-modal-overlay--spacious" onClick={onClose}>
      <div
        className="admin-modal admin-modal--catalog admin-modal--user-detail"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`admin-user-detail__banner admin-user-detail__banner--${user?.role.toLowerCase() ?? "customer"}`}>
          <button type="button" className="admin-modal__close admin-user-detail__close" onClick={onClose} aria-label={t("close")}>
            ×
          </button>

          {user && !loading ? (
            <div className="admin-user-detail__profile">
              <span className="admin-user-detail__avatar" aria-hidden>
                {userInitials(user.name, user.phone)}
              </span>
              <div className="admin-user-detail__profile-copy">
                <h2>{user.name?.trim() || user.phone}</h2>
                <p>{user.phone}{user.email ? ` · ${user.email}` : ""}</p>
                <div className="admin-user-detail__badges">
                  <span className={`admin-user-role-pill admin-user-role-pill--${user.role.toLowerCase()}`}>
                    {roleLabel(user.role)}
                  </span>
                  <span className="admin-kitchen-pill">{user.locale === "sw" ? "🇹🇿 Kiswahili" : "🇬🇧 English"}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-user-detail__profile admin-user-detail__profile--loading">
              <h2>{t("userDetails")}</h2>
            </div>
          )}
        </div>

        <nav className="admin-user-detail__tabs" role="tablist">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`admin-user-detail__tab${tab === key ? " is-active" : ""}`}
              onClick={() => setTab(key)}
            >
              <span className="admin-user-detail__tab-icon" aria-hidden>{TAB_ICONS[key]}</span>
              <span>{label}</span>
              {count != null && count > 0 ? (
                <span className="admin-user-detail__tab-count">{count}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {error ? <p className="admin-error admin-user-detail__error">{error}</p> : null}

        <div className="admin-user-detail__body">
          {loading ? (
            <AdminLoading label={t("loadingUsers")} />
          ) : !user ? null : tab === "account" ? (
            <div className="admin-user-detail__account">
              {editing ? (
                <form
                  className="admin-crud-form admin-user-detail__form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save();
                  }}
                >
                  <div className="admin-user-detail__form-grid">
                    <label className="admin-crud-form__field">
                      <span>{t("customer")}</span>
                      <input
                        className="admin-crud-form__input"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="admin-crud-form__field">
                      <span>{t("phone")}</span>
                      <input className="admin-crud-form__input" value={user.phone} disabled />
                    </label>
                    <label className="admin-crud-form__field">
                      <span>{t("email")}</span>
                      <input
                        className="admin-crud-form__input"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="—"
                      />
                    </label>
                    <label className="admin-crud-form__field">
                      <span>{t("role")}</span>
                      <select
                        className="admin-select"
                        value={form.role}
                        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
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
                        value={form.locale}
                        onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}
                      >
                        <option value="en">English</option>
                        <option value="sw">Kiswahili</option>
                      </select>
                    </label>
                    <label className="admin-crud-form__field admin-user-detail__form-full">
                      <span>{t("resetPassword")}</span>
                      <input
                        className="admin-crud-form__input"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder={t("resetPasswordHint")}
                        autoComplete="new-password"
                      />
                    </label>
                  </div>
                  <div className="admin-user-detail__form-actions">
                    <button type="button" className="admin-btn secondary sm" onClick={() => setEditing(false)}>
                      {t("cancel")}
                    </button>
                    <button type="submit" className="admin-btn sm" disabled={saving}>
                      {saving ? t("saving") : t("saveChanges")}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="admin-user-detail__stats">
                    <div className="admin-user-stat-chip admin-user-stat-chip--orders">
                      <strong>{user._count.orders}</strong>
                      <span>{t("orders")}</span>
                    </div>
                    <div className="admin-user-stat-chip admin-user-stat-chip--subs">
                      <strong>{user._count.subscriptions}</strong>
                      <span>{t("subscriptions")}</span>
                    </div>
                    <div className="admin-user-stat-chip admin-user-stat-chip--pay">
                      <strong>{user._count.payments}</strong>
                      <span>{t("payments")}</span>
                    </div>
                    <div className="admin-user-stat-chip admin-user-stat-chip--wallet">
                      <strong>{user.wallet ? formatMoney(user.wallet.balance) : formatMoney(0)}</strong>
                      <span>{t("walletBalance")}</span>
                    </div>
                  </div>

                  <dl className="admin-user-detail__meta-grid">
                    <div className="admin-user-detail__meta-item">
                      <dt>{t("phone")}</dt>
                      <dd>{user.phone}</dd>
                    </div>
                    <div className="admin-user-detail__meta-item">
                      <dt>{t("email")}</dt>
                      <dd>{user.email || "—"}</dd>
                    </div>
                    <div className="admin-user-detail__meta-item">
                      <dt>{t("role")}</dt>
                      <dd>{roleLabel(user.role)}</dd>
                    </div>
                    <div className="admin-user-detail__meta-item">
                      <dt>{t("locale")}</dt>
                      <dd>{user.locale === "sw" ? "Kiswahili" : "English"}</dd>
                    </div>
                    <div className="admin-user-detail__meta-item">
                      <dt>{t("joined")}</dt>
                      <dd>{formatDate(user.createdAt, locale)}</dd>
                    </div>
                    <div className="admin-user-detail__meta-item">
                      <dt>{t("lastUpdated")}</dt>
                      <dd>{formatDate(user.updatedAt, locale)}</dd>
                    </div>
                  </dl>
                </>
              )}
            </div>
          ) : tab === "orders" ? (
            user.orders.length === 0 ? (
              <div className="admin-order-empty">
                <span aria-hidden>📋</span>
                <p>{t("noUserOrders")}</p>
              </div>
            ) : (
              <ul className="admin-user-activity-list">
                {user.orders.map((o) => (
                  <li key={o.id} className={`admin-user-activity-card admin-user-activity-card--${o.module.toLowerCase()}`}>
                    <div className="admin-user-activity-card__accent" aria-hidden />
                    <div className="admin-user-activity-card__top">
                      <div className="admin-user-activity-card__ref">
                        <span aria-hidden>{moduleIcon(o.module)}</span>
                        <div>
                          <strong>{orderRef(o.id)}</strong>
                          <small>{formatDate(o.createdAt, locale)}</small>
                        </div>
                      </div>
                      <span className={`admin-order-status-pill admin-order-status-pill--${o.status.toLowerCase()}`}>
                        {orderStatusLabel(locale, o.status)}
                      </span>
                    </div>
                    <div className="admin-user-activity-card__meta">
                      <StatusBadge status={o.module} />
                      <span className="admin-kitchen-pill">{tf("orderItemCount", { n: o._count.items })}</span>
                      {o.channel ? <span className="admin-kitchen-pill">{o.channel}</span> : null}
                    </div>
                    {o.address ? <p className="admin-user-activity-card__sub">{o.address}</p> : null}
                    <footer className="admin-user-activity-card__foot">
                      <strong className="admin-user-activity-card__amount">{formatMoney(o.total)}</strong>
                      {o.payment ? <StatusBadge status={o.payment.status} /> : null}
                    </footer>
                  </li>
                ))}
              </ul>
            )
          ) : tab === "subscriptions" ? (
            user.subscriptions.length === 0 ? (
              <div className="admin-order-empty">
                <span aria-hidden>📦</span>
                <p>{t("noUserSubscriptions")}</p>
              </div>
            ) : (
              <ul className="admin-user-activity-list">
                {user.subscriptions.map((s) => (
                  <li key={s.id} className="admin-user-activity-card admin-user-activity-card--grocery">
                    <div className="admin-user-activity-card__accent" aria-hidden />
                    <div className="admin-user-activity-card__top">
                      <div className="admin-user-activity-card__ref">
                        <span aria-hidden>📦</span>
                        <div>
                          <strong>{s.package.name}</strong>
                          <small>
                            {packageKindLabel(s.package.kind, locale).title} · {frequencyLabel(s.frequency, locale)}
                          </small>
                        </div>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="admin-user-activity-card__sub">{s.address}</p>
                    {s.nextRunAt ? (
                      <p className="admin-user-activity-card__sub">
                        {t("setNextRunAt")}: {formatDate(s.nextRunAt, locale)}
                      </p>
                    ) : null}
                    <footer className="admin-user-activity-card__foot">
                      <strong className="admin-user-activity-card__amount">{formatMoney(s.package.price)}</strong>
                      <Link
                        href={`/admin/grocery/subscriptions?q=${encodeURIComponent(user.phone)}`}
                        className="admin-btn secondary sm"
                      >
                        {t("manageSubscription")}
                      </Link>
                    </footer>
                  </li>
                ))}
              </ul>
            )
          ) : user.payments.length === 0 ? (
            <div className="admin-order-empty">
              <span aria-hidden>💳</span>
              <p>{t("noUserPayments")}</p>
            </div>
          ) : (
            <ul className="admin-user-activity-list">
              {user.payments.map((p) => (
                <li key={p.id} className="admin-user-activity-card">
                  <div className="admin-user-activity-card__top">
                    <div className="admin-user-activity-card__ref">
                      <span aria-hidden>💳</span>
                      <div>
                        <strong>{formatMoney(p.amount)}</strong>
                        <small>{formatDate(p.createdAt, locale)}</small>
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="admin-user-activity-card__meta">
                    <StatusBadge status={p.order.module} />
                    <span className="admin-kitchen-pill">{orderRef(p.order.id)}</span>
                  </div>
                  {p.reference ? (
                    <code className="admin-payment-ref admin-user-activity-card__sub">{p.reference}</code>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {user && !loading ? (
          <footer className="admin-user-detail__foot">
            {!editing ? (
              <>
                <button type="button" className="admin-btn secondary sm" onClick={() => setEditing(true)}>
                  ✏️ {t("editAccount")}
                </button>
                <button type="button" className="admin-btn sm danger" disabled={deleting} onClick={() => void remove()}>
                  {deleting ? t("saving") : t("deleteUser")}
                </button>
              </>
            ) : null}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
