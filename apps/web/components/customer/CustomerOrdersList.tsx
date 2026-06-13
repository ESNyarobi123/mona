"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppLocale } from "../providers/AppLocaleProvider";
import { apiGet, getStoredUser } from "../../lib/admin-api";
import { formatDate, formatMoney } from "../../lib/format";
import { orderStatusLabel, SLOT_I18N } from "../../lib/customer-i18n";

type OrderItem = { name: string; quantity: string | number };
type Payment = { id?: string; status: string } | null;

type OrderRow = {
  id: string;
  module: string;
  status: string;
  total: string | number;
  createdAt: string;
  mealSlot?: string | null;
  address?: string | null;
  items?: OrderItem[];
  payment?: Payment;
};

type OrdersResponse = OrderRow[] | { items: OrderRow[]; meta: { total: number } };

function normalize(data: OrdersResponse) {
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: data.items, total: data.meta.total };
}

const STATUS_CLASS: Record<string, string> = {
  PENDING: "order-status--pending",
  CONFIRMED: "order-status--confirmed",
  PREPARING: "order-status--preparing",
  ON_THE_WAY: "order-status--delivery",
  DELIVERED: "order-status--done",
  CANCELLED: "order-status--cancelled",
};

const FILTER_IDS = ["ALL", "PENDING", "CONFIRMED", "PREPARING", "ON_THE_WAY", "DELIVERED"] as const;
type FilterId = (typeof FILTER_IDS)[number];

function itemsSummary(items: OrderItem[] | undefined, moreLabel: string) {
  if (!items?.length) return null;
  const preview = items.slice(0, 2).map((i) => `${i.name} ×${Number(i.quantity)}`);
  const more = items.length > 2 ? ` +${items.length - 2} ${moreLabel}` : "";
  return preview.join(", ") + more;
}

export function CustomerOrdersList({ module }: { module: "RESTAURANT" | "GROCERY" }) {
  const { locale, t } = useAppLocale();
  const cfg = useMemo(
    () =>
      module === "RESTAURANT"
        ? {
            title: t("ordersRestTitle"),
            subtitle: t("ordersRestSub"),
            icon: "🍲",
            shopHref: "/restaurant/menu",
            shopLabel: t("orderAgainRest"),
            accent: "orange" as const,
          }
        : {
            title: t("ordersGrocTitle"),
            subtitle: t("ordersGrocSub"),
            icon: "🛒",
            shopHref: "/grocery/products",
            shopLabel: t("orderAgainGroc"),
            accent: "navy" as const,
          },
    [module, locale, t]
  );

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterId>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;

    apiGet<OrdersResponse>(`/api/orders?userId=${user.id}&module=${module}&limit=50`)
      .then((data) => {
        const norm = normalize(data);
        setOrders(norm.items);
        setTotal(norm.total);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("loadFailed")))
      .finally(() => setLoading(false));
  }, [module, t]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const activeCount = useMemo(() => {
    return orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length;
  }, [orders]);

  function filterLabel(id: FilterId) {
    if (id === "ALL") return t("filterAll");
    return orderStatusLabel(locale, id);
  }

  return (
    <div className={`orders-page orders-page--${cfg.accent}`}>
      <header className="orders-page__hero">
        <div className="orders-page__hero-icon" aria-hidden>
          {cfg.icon}
        </div>
        <div className="orders-page__hero-text">
          <p className="orders-page__eyebrow">{t("ordersEyebrow")}</p>
          <h1 className="orders-page__title">{cfg.title}</h1>
          <p className="orders-page__sub">{cfg.subtitle}</p>
        </div>
        <Link href={cfg.shopHref} className="landing-btn landing-btn--orange orders-page__cta">
          {cfg.shopLabel}
        </Link>
      </header>

      {!loading && !error && orders.length > 0 ? (
        <div className="orders-page__stats">
          <div className="orders-stat">
            <strong>{total}</strong>
            <span>{t("statTotal")}</span>
          </div>
          <div className="orders-stat">
            <strong>{activeCount}</strong>
            <span>{t("statActive")}</span>
          </div>
          <div className="orders-stat">
            <strong>{orders.filter((o) => o.status === "DELIVERED").length}</strong>
            <span>{t("statDelivered")}</span>
          </div>
        </div>
      ) : null}

      {!loading && orders.length > 0 ? (
        <div className="orders-filters" role="tablist" aria-label={t("filterByStatus")}>
          {FILTER_IDS.map((f) => {
            const count = f === "ALL" ? orders.length : orders.filter((o) => o.status === f).length;
            if (f !== "ALL" && count === 0) return null;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                className={`orders-filter ${filter === f ? "orders-filter--active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {filterLabel(f)}
                <span className="orders-filter__count">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
          <p>{t("loadingOrders")}</p>
        </div>
      ) : error ? (
        <p className="auth-form__error">{error}</p>
      ) : orders.length === 0 ? (
        <div className="orders-empty">
          <span className="orders-empty__icon" aria-hidden>
            {cfg.icon}
          </span>
          <h2>{t("noOrdersYet")}</h2>
          <p>{t("noOrdersYetSub")}</p>
          <Link href={cfg.shopHref} className="landing-btn landing-btn--orange">
            {cfg.shopLabel}
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="orders-empty orders-empty--compact">
          <p>{t("noOrdersFilter")}</p>
          <button type="button" className="landing-btn landing-btn--ghost" onClick={() => setFilter("ALL")}>
            {t("showAll")}
          </button>
        </div>
      ) : (
        <ul className="order-cards">
          {filtered.map((o) => {
            const summary = itemsSummary(o.items, t("more"));
            const slotLabel = o.mealSlot ? SLOT_I18N[o.mealSlot]?.[locale] : null;
            const statusLabel = orderStatusLabel(locale, o.status);
            return (
              <li key={o.id} className="order-card">
                <Link href={`/account/orders/${o.id}`} className="order-card__link-overlay" aria-label={`Order ${o.id.slice(-6)}`} />
                <div className="order-card__top">
                  <div className="order-card__id">
                    <span className="order-card__id-icon" aria-hidden>
                      {cfg.icon}
                    </span>
                    <div>
                      <strong>#{o.id.slice(-6).toUpperCase()}</strong>
                      <small>{formatDate(o.createdAt)}</small>
                    </div>
                  </div>
                  <span className={`order-status ${STATUS_CLASS[o.status] ?? ""}`}>{statusLabel}</span>
                </div>

                {slotLabel ? (
                  <span className="order-card__slot">
                    🕐 {t("orderSlot")}: <strong>{slotLabel}</strong>
                  </span>
                ) : null}

                {summary ? <p className="order-card__items">{summary}</p> : null}

                {o.address ? <p className="order-card__address">📍 {o.address}</p> : null}

                <div className="order-card__foot">
                  <div className="order-card__meta">
                    {o.payment ? (
                      <span className="order-card__payment">
                        {t("payment")}: {o.payment.status.replace(/_/g, " ")}
                      </span>
                    ) : (
                      <span className="order-card__payment order-card__payment--due">{t("paymentPending")}</span>
                    )}
                    <span className="order-card__items-count">
                      {o.items?.length ?? 0} {t("items")}
                    </span>
                  </div>
                  <div className="order-card__foot-right">
                    <strong className="order-card__total">{formatMoney(o.total)}</strong>
                    {(!o.payment || o.payment.status === "PENDING") && o.status !== "CANCELLED" ? (
                      <Link href={`/pay/${o.id}`} className="order-card__pay-btn landing-btn landing-btn--orange" onClick={(e) => e.stopPropagation()}>
                        {t("payNow")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
