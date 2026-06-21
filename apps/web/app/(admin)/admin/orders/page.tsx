"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPatch, apiPost, normalizeApiList } from "../../../../lib/admin-api";
import { formatMoney } from "../../../../lib/format";
import { orderRef, userInitials } from "../../../../lib/admin-dashboard";
import { orderStatusLabel } from "../../../../lib/customer-i18n";
import type { AdminMessageKey } from "../../../../lib/admin-i18n";
import { StatusBadge } from "../../../../components/admin/StatusBadge";
import { AdminPageHeader } from "../../../../components/admin/AdminPageHeader";
import { AdminPanel } from "../../../../components/admin/dashboard/AdminPanel";
import { AdminKpiCard } from "../../../../components/admin/dashboard/AdminKpiCard";
import { AdminUserCell } from "../../../../components/admin/dashboard/AdminUserCell";
import { AdminOrderTimeline } from "../../../../components/admin/dashboard/AdminOrderTimeline";
import { AdminLoading } from "../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../components/admin/AdminLocaleProvider";
import { needsPayOnDeliveryApproval, orderFulfillmentBlockedReason } from "@monana/utils";

type OrderItem = {
  name: string;
  quantity: string | number;
  unit?: string;
  price?: string | number;
};

type Order = {
  id: string;
  module: string;
  status: string;
  total: string | number;
  address: string | null;
  note: string | null;
  mealSlot: string | null;
  createdAt: string;
  paymentTiming?: "PAY_NOW" | "PAY_ON_DELIVERY";
  submittedAt?: string | null;
  user: { name: string | null; phone: string };
  items: OrderItem[];
  payment?: { status: string; reference: string | null } | null;
};

type OrdersResponse = Order[] | { items: Order[]; meta: { total: number } };

const NEXT_STATUS: Record<string, string> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "ON_THE_WAY",
  ON_THE_WAY: "DELIVERED",
};

const PENDING_STATUSES = new Set(["PENDING", "CONFIRMED", "PREPARING", "ON_THE_WAY"]);

const STATUS_FILTERS = ["", "PENDING", "CONFIRMED", "PREPARING", "ON_THE_WAY", "DELIVERED", "CANCELLED"] as const;

function formatOrderDate(iso: string, locale: "en" | "sw") {
  const tag = locale === "sw" ? "sw-TZ" : "en-GB";
  return new Date(iso).toLocaleString(tag, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lineTotal(item: OrderItem) {
  const qty = Number(item.quantity);
  const price = Number(item.price ?? 0);
  return qty * price;
}

function moduleIcon(module: string) {
  return module === "RESTAURANT" ? "🍽️" : "🛒";
}

type OrderGridProps = {
  items: Order[];
  busyId: string | null;
  locale: "en" | "sw";
  t: (key: AdminMessageKey) => string;
  tf: (key: AdminMessageKey, vars: Record<string, string | number>) => string;
  slotLabel: (slot: string) => string;
  onSelect: (order: Order) => void;
  onAdvance: (id: string, status: string) => void;
  onCancel: (id: string) => void;
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
};

function OrderGrid({
  items,
  busyId,
  locale,
  t,
  tf,
  slotLabel,
  onSelect,
  onAdvance,
  onCancel,
  onApproveRequest,
  onRejectRequest,
}: OrderGridProps) {
  return (
    <ul className="admin-order-grid">
      {items.map((o) => {
        const next = NEXT_STATUS[o.status];
        const busy = busyId === o.id;
        const needsApproval = needsPayOnDeliveryApproval(o);
        const advanceBlocked = !needsApproval && next ? orderFulfillmentBlockedReason(o, locale) : null;
        const previewItems = o.items.slice(0, 3);
        const extraCount = Math.max(0, o.items.length - previewItems.length);

        return (
          <li
            key={o.id}
            className={`admin-order-card admin-order-card--${o.module.toLowerCase()} admin-order-card--${o.status.toLowerCase()}`}
          >
            <div className="admin-order-card__accent" aria-hidden />

            <header className="admin-order-card__head">
              <div className="admin-order-card__ref">
                <span className="admin-order-card__module-icon" aria-hidden>
                  {moduleIcon(o.module)}
                </span>
                <div>
                  <strong>{orderRef(o.id)}</strong>
                  <span className="admin-order-date">{formatOrderDate(o.createdAt, locale)}</span>
                </div>
              </div>
              <span className={`admin-order-status-pill admin-order-status-pill--${o.status.toLowerCase()}`}>
                {orderStatusLabel(locale, o.status)}
              </span>
            </header>

            <div className="admin-order-card__customer">
              <span className="admin-order-card__avatar" aria-hidden>
                {userInitials(o.user.name, o.user.phone)}
              </span>
              <div className="admin-order-card__customer-copy">
                <strong>{o.user.name?.trim() || o.user.phone}</strong>
                <small>{o.user.phone}</small>
                {o.address ? <small className="admin-order-card__address">{o.address}</small> : null}
                {o.note ? <small className="admin-order-card__note">{o.note}</small> : null}
              </div>
            </div>

            <div className="admin-order-card__meta">
              <StatusBadge status={o.module} />
              {o.mealSlot ? <span className="admin-kitchen-pill">{slotLabel(o.mealSlot)}</span> : null}
              <span className="admin-kitchen-pill">{tf("orderItemCount", { n: o.items.length })}</span>
            </div>

            {previewItems.length > 0 ? (
              <ul className="admin-order-card__items">
                {previewItems.map((item, idx) => (
                  <li key={`${item.name}-${idx}`}>
                    <span>{item.name}</span>
                    <small>× {item.quantity}</small>
                  </li>
                ))}
                {extraCount > 0 ? <li className="admin-order-card__items-more">+{extraCount}</li> : null}
              </ul>
            ) : null}

            <AdminOrderTimeline status={o.status} locale={locale} compact />

            {needsApproval ? (
              <div className="admin-payment-card__alert">
                <span aria-hidden>⏳</span>
                {t("payLaterRequestAwaiting")}
              </div>
            ) : advanceBlocked ? (
              <div className="admin-payment-card__alert">
                <span aria-hidden>💳</span>
                {advanceBlocked}
              </div>
            ) : null}

            <footer className="admin-order-card__foot">
              <div className="admin-order-card__total-wrap">
                <span className="admin-order-card__total-label">{t("total")}</span>
                <span className="admin-order-total">{formatMoney(o.total)}</span>
              </div>
              <div className="admin-order-card__actions">
                <button type="button" className="admin-btn secondary sm" onClick={() => onSelect(o)}>
                  {t("viewOrderDetails")}
                </button>
                {needsApproval ? (
                  <>
                    <button
                      type="button"
                      className="admin-btn sm"
                      disabled={busy}
                      onClick={() => onApproveRequest(o.id)}
                    >
                      {t("confirm")}
                    </button>
                    <button
                      type="button"
                      className="admin-btn sm danger"
                      disabled={busy}
                      onClick={() => onRejectRequest(o.id)}
                    >
                      {t("reject")}
                    </button>
                  </>
                ) : next ? (
                  <button
                    type="button"
                    className="admin-btn sm"
                    disabled={busy || !!advanceBlocked}
                    title={advanceBlocked ?? undefined}
                    onClick={() => onAdvance(o.id, o.status)}
                  >
                    {tf("advanceTo", { status: orderStatusLabel(locale, next) })}
                  </button>
                ) : null}
                {o.status !== "CANCELLED" && o.status !== "DELIVERED" ? (
                  <button
                    type="button"
                    className="admin-btn sm danger"
                    disabled={busy}
                    onClick={() => onCancel(o.id)}
                  >
                    {t("cancel")}
                  </button>
                ) : null}
              </div>
            </footer>
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminOrdersPage() {
  const { t, tf, locale, slotLabel } = useAdminLocale();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  function load() {
    setLoading(true);
    const q = new URLSearchParams({ limit: "100" });
    if (filter) q.set("status", filter);
    if (search.trim()) q.set("q", search.trim());
    apiGet<OrdersResponse>(`/api/orders?${q}`)
      .then((data) => setOrders(normalizeApiList(data)))
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [filter, search]);

  const stats = useMemo(() => {
    const pending = orders.filter((o) => PENDING_STATUSES.has(o.status)).length;
    const payLaterPending = orders.filter((o) => needsPayOnDeliveryApproval(o)).length;
    const restaurant = orders.filter((o) => o.module === "RESTAURANT").length;
    const grocery = orders.filter((o) => o.module === "GROCERY").length;
    const value = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const delivered = orders.filter((o) => o.status === "DELIVERED").length;
    return { pending, payLaterPending, restaurant, grocery, value, delivered };
  }, [orders]);

  const restaurantOrders = useMemo(
    () => orders.filter((o) => o.module === "RESTAURANT"),
    [orders]
  );
  const groceryOrders = useMemo(() => orders.filter((o) => o.module === "GROCERY"), [orders]);

  async function advance(id: string, status: string) {
    const next = NEXT_STATUS[status];
    if (!next) return;
    setBusyId(id);
    try {
      await apiPatch(`/api/orders/${id}`, { status: next });
      load();
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status: next } : null));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(id: string) {
    if (!confirm(t("cancelOrderConfirm"))) return;
    setBusyId(id);
    try {
      await apiPatch(`/api/orders/${id}`, { status: "CANCELLED" });
      load();
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status: "CANCELLED" } : null));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusyId(null);
    }
  }

  async function approveRequest(id: string) {
    if (!confirm(t("approvePayLaterRequestPrompt"))) return;
    setBusyId(id);
    try {
      const updated = await apiPost<Order>(`/api/orders/${id}/approve-request`, {});
      load();
      if (selected?.id === id) setSelected(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusyId(null);
    }
  }

  async function rejectRequest(id: string) {
    if (!confirm(t("rejectPayLaterRequestPrompt"))) return;
    setBusyId(id);
    try {
      const updated = await apiPost<Order>(`/api/orders/${id}/reject-request`, {});
      load();
      if (selected?.id === id) setSelected(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusyId(null);
    }
  }

  function statusLabel(status: string) {
    if (!status) return t("allStatuses");
    return orderStatusLabel(locale, status);
  }

  return (
    <div className="admin-dash admin-dash--orders">
      <AdminPageHeader
        title={t("orders")}
        actions={
          <button type="button" className="admin-btn secondary sm" onClick={load}>
            {t("refresh")}
          </button>
        }
      />

      <div className="admin-kpi-grid">
        <AdminKpiCard
          label={t("orders")}
          value={orders.length}
          trend={tf("shownCount", { n: orders.length })}
          tone="accent"
        />
        <AdminKpiCard
          label={t("pendingShort")}
          value={stats.pending}
          trend={
            stats.payLaterPending
              ? tf("payLaterRequestsCount", { n: stats.payLaterPending })
              : t("needsAction")
          }
          tone="warning"
          trendUp={false}
        />
        <AdminKpiCard
          label={t("restaurantOrders")}
          value={stats.restaurant}
          trend={tf("groceryCount", { n: stats.grocery })}
          tone="restaurant"
        />
        <AdminKpiCard
          label={t("totalValue")}
          value={formatMoney(stats.value)}
          trend={tf("deliveredCount", { n: stats.delivered })}
          tone="success"
        />
      </div>

      <AdminPanel title={t("filter")} badge={tf("shownCount", { n: orders.length })}>
        <div className="admin-panel__body-pad">
          <div className="admin-order-filters">
            <div className="admin-order-filters__search">
              <input
                type="search"
                className="admin-crud-form__input"
                placeholder={t("searchOrders")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t("searchOrdersAria")}
              />
            </div>
          </div>

          <div className="admin-order-status-chips" role="group" aria-label={t("filterStatusAria")}>
            {STATUS_FILTERS.map((status) => (
              <button
                key={status || "all"}
                type="button"
                className={`admin-order-status-chip${filter === status ? " is-active" : ""}`}
                onClick={() => setFilter(status)}
              >
                {statusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </AdminPanel>

      {error && <p className="admin-error">{error}</p>}

      {loading ? (
        <AdminPanel title={t("ordersList")}>
          <AdminLoading label={t("loadingOrders")} />
        </AdminPanel>
      ) : orders.length === 0 ? (
        <AdminPanel title={t("ordersList")}>
          <div className="admin-order-empty">
            <span aria-hidden>📋</span>
            <p>{t("noOrdersMatch")}</p>
          </div>
        </AdminPanel>
      ) : (
        <div className="admin-orders-sections">
          <AdminPanel
            title={t("restaurantOrdersSection")}
            badge={tf("shownCount", { n: restaurantOrders.length })}
            className="admin-orders-section admin-orders-section--restaurant"
          >
            {restaurantOrders.length === 0 ? (
              <div className="admin-order-empty admin-order-empty--section">
                <span aria-hidden>🍽️</span>
                <p>{t("noRestaurantOrders")}</p>
              </div>
            ) : (
              <OrderGrid
                items={restaurantOrders}
                busyId={busyId}
                locale={locale}
                t={t}
                tf={tf}
                slotLabel={slotLabel}
                onSelect={setSelected}
                onAdvance={advance}
                onCancel={cancel}
                onApproveRequest={approveRequest}
                onRejectRequest={rejectRequest}
              />
            )}
          </AdminPanel>

          <AdminPanel
            title={t("groceryOrdersSection")}
            badge={tf("shownCount", { n: groceryOrders.length })}
            className="admin-orders-section admin-orders-section--grocery"
          >
            {groceryOrders.length === 0 ? (
              <div className="admin-order-empty admin-order-empty--section">
                <span aria-hidden>🛒</span>
                <p>{t("noGroceryOrders")}</p>
              </div>
            ) : (
              <OrderGrid
                items={groceryOrders}
                busyId={busyId}
                locale={locale}
                t={t}
                tf={tf}
                slotLabel={slotLabel}
                onSelect={setSelected}
                onAdvance={advance}
                onCancel={cancel}
                onApproveRequest={approveRequest}
                onRejectRequest={rejectRequest}
              />
            )}
          </AdminPanel>
        </div>
      )}

      {selected ? (
        <div className="admin-modal-overlay admin-modal-overlay--spacious" onClick={() => setSelected(null)}>
          <div
            className="admin-modal admin-modal--catalog admin-modal--order-detail"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-modal__head">
              <div className="admin-order-detail__head">
                <span className="admin-order-detail__icon" aria-hidden>
                  {moduleIcon(selected.module)}
                </span>
                <div>
                  <h2>{t("orderDetails")}</h2>
                  <p className="admin-modal__sub">
                    {orderRef(selected.id)} · {formatOrderDate(selected.createdAt, locale)}
                  </p>
                </div>
                <span
                  className={`admin-order-status-pill admin-order-status-pill--${selected.status.toLowerCase()}`}
                >
                  {orderStatusLabel(locale, selected.status)}
                </span>
              </div>
            </header>

            <div className="admin-order-detail">
              <section className="admin-order-detail__section">
                <h3 className="admin-form-section__title">{t("customer")}</h3>
                <AdminUserCell
                  name={selected.user.name}
                  phone={selected.user.phone}
                  sub={selected.address ?? t("noAddress")}
                />
                <div className="admin-order-detail__chips">
                  <StatusBadge status={selected.module} />
                  {selected.mealSlot ? (
                    <span className="admin-kitchen-pill">{slotLabel(selected.mealSlot)}</span>
                  ) : null}
                </div>
              </section>

              <section className="admin-order-detail__section">
                <h3 className="admin-form-section__title">{t("deliveryAddress")}</h3>
                <p className="admin-order-detail__text">{selected.address ?? t("noAddress")}</p>
                <h3 className="admin-form-section__title">{t("deliveryExtraDetails")}</h3>
                <p className="admin-order-detail__text">{selected.note ?? t("noExtraDetails")}</p>
              </section>

              <section className="admin-order-detail__section">
                <h3 className="admin-form-section__title">{t("progress")}</h3>
                <AdminOrderTimeline status={selected.status} locale={locale} />
              </section>

              <section className="admin-order-detail__section">
                <h3 className="admin-form-section__title">{t("itemsInOrder")}</h3>
                <ul className="admin-order-detail__items">
                  {selected.items.map((item, idx) => (
                    <li key={`${item.name}-${idx}`}>
                      <span className="admin-order-detail__item-icon" aria-hidden>
                        {selected.module === "RESTAURANT" ? "🍽️" : "🏷️"}
                      </span>
                      <span className="admin-order-detail__item-copy">
                        <strong>{item.name}</strong>
                        <small>
                          × {item.quantity}
                          {item.unit ? ` ${item.unit}` : ""}
                          {item.price != null ? ` · ${formatMoney(item.price)} each` : ""}
                        </small>
                      </span>
                      {item.price != null ? (
                        <span className="admin-order-detail__item-total">{formatMoney(lineTotal(item))}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>

              {selected.payment ? (
                <section className="admin-order-detail__section">
                  <h3 className="admin-form-section__title">{t("paymentStatus")}</h3>
                  <div className="admin-order-detail__payment">
                    <StatusBadge status={selected.payment.status} />
                    {selected.payment.reference ? (
                      <code className="admin-payment-ref">{selected.payment.reference}</code>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {!needsPayOnDeliveryApproval(selected) &&
              NEXT_STATUS[selected.status] &&
              orderFulfillmentBlockedReason(selected, locale) ? (
                <div className="admin-payment-card__alert">
                  <span aria-hidden>💳</span>
                  {orderFulfillmentBlockedReason(selected, locale)}
                </div>
              ) : null}

              <footer className="admin-order-detail__foot">
                <div className="admin-order-detail__total">
                  <span>{t("total")}</span>
                  <strong>{formatMoney(selected.total)}</strong>
                </div>
                <div className="admin-order-detail__actions">
                  {needsPayOnDeliveryApproval(selected) ? (
                    <>
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={busyId === selected.id}
                        onClick={() => approveRequest(selected.id)}
                      >
                        {t("confirm")}
                      </button>
                      <button
                        type="button"
                        className="admin-btn danger"
                        disabled={busyId === selected.id}
                        onClick={() => rejectRequest(selected.id)}
                      >
                        {t("reject")}
                      </button>
                    </>
                  ) : NEXT_STATUS[selected.status] ? (
                    <button
                      type="button"
                      className="admin-btn"
                      disabled={
                        busyId === selected.id ||
                        !!orderFulfillmentBlockedReason(selected, locale)
                      }
                      title={orderFulfillmentBlockedReason(selected, locale) ?? undefined}
                      onClick={() => advance(selected.id, selected.status)}
                    >
                      {tf("advanceTo", {
                        status: orderStatusLabel(locale, NEXT_STATUS[selected.status]),
                      })}
                    </button>
                  ) : null}
                  {selected.status !== "CANCELLED" && selected.status !== "DELIVERED" ? (
                    <button
                      type="button"
                      className="admin-btn danger"
                      disabled={busyId === selected.id}
                      onClick={() => cancel(selected.id)}
                    >
                      {t("cancel")}
                    </button>
                  ) : null}
                  <button type="button" className="admin-btn secondary" onClick={() => setSelected(null)}>
                    {t("closeDetails")}
                  </button>
                </div>
              </footer>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
