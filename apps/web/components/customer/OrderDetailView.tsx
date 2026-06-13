"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "../../lib/admin-api";
import { formatDate, formatMoney } from "../../lib/format";
import { orderStatusLabel, SLOT_I18N, t as translate } from "../../lib/customer-i18n";
import { useAppLocale } from "../providers/AppLocaleProvider";
import { buildOrderTimeline, isOrderActive } from "../../lib/order-timeline";

type OrderDetail = {
  id: string;
  module: string;
  status: string;
  total: string | number;
  createdAt: string;
  updatedAt: string;
  address?: string | null;
  mealSlot?: string | null;
  note?: string | null;
  items: { name: string; quantity: string | number; price: string | number }[];
  payment?: { id: string; status: string } | null;
  allowedNextStatuses?: string[];
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "order-status--pending",
  CONFIRMED: "order-status--confirmed",
  PREPARING: "order-status--preparing",
  ON_THE_WAY: "order-status--delivery",
  DELIVERED: "order-status--done",
  CANCELLED: "order-status--cancelled",
};

export function OrderDetailView() {
  const params = useParams();
  const orderId = typeof params.id === "string" ? params.id : "";
  const { locale, t } = useAppLocale();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    const data = await apiGet<OrderDetail>(`/api/orders/${orderId}`);
    setOrder(data);
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    load()
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!order || !isOrderActive(order.status)) return;
    const id = window.setInterval(() => {
      load().catch(() => {});
    }, 30000);
    return () => window.clearInterval(id);
  }, [order?.status, load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setRefreshing(false);
    }
  }

  const timeline = order ? buildOrderTimeline(order.module, order.status, locale) : [];
  const needsPay =
    order && order.status !== "CANCELLED" && (!order.payment || order.payment.status === "PENDING");

  return (
    <div className="order-detail-page">
      <header className="order-detail-page__head">
        <Link href="/account" className="order-detail-page__back">
          ← {t("backDashboard")}
        </Link>
        <div className="order-detail-page__title-row">
          <div>
            <p className="order-detail-page__eyebrow">{t("orderDetailEyebrow")}</p>
            <h1>#{orderId.slice(-6).toUpperCase()}</h1>
          </div>
          {order ? (
            <span className={`order-status ${STATUS_CLASS[order.status] ?? ""}`}>
              {orderStatusLabel(locale, order.status)}
            </span>
          ) : null}
        </div>
        {order ? (
          <p className="order-detail-page__meta">
            {formatDate(order.createdAt)} · {order.module === "RESTAURANT" ? "🍲" : "🛒"}{" "}
            {order.module}
          </p>
        ) : null}
      </header>

      {loading ? (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
        </div>
      ) : error ? (
        <p className="auth-form__error">{error}</p>
      ) : order ? (
        <>
          {order.status === "CANCELLED" ? (
            <p className="order-detail-page__cancelled">{t("cancelledNote")}</p>
          ) : null}

          <section className="order-detail-card">
            <div className="order-detail-card__head">
              <h2>{t("orderTimeline")}</h2>
              <button
                type="button"
                className="landing-btn landing-btn--ghost landing-btn--sm"
                onClick={onRefresh}
                disabled={refreshing}
              >
                {refreshing ? "…" : t("refreshStatus")}
              </button>
            </div>
            {isOrderActive(order.status) ? (
              <p className="order-detail-page__auto">{t("autoRefresh")}</p>
            ) : null}
            <ol className="order-timeline">
              {timeline.map((step, i) => (
                <li
                  key={step.id}
                  className={`order-timeline__step order-timeline__step--${step.state}`}
                >
                  <span className="order-timeline__dot" aria-hidden />
                  <div className="order-timeline__content">
                    <strong>{step.label}</strong>
                    {step.state === "active" ? (
                      <span className="order-timeline__now">
                        {t("now")}
                      </span>
                    ) : null}
                  </div>
                  {i < timeline.length - 1 ? <span className="order-timeline__line" aria-hidden /> : null}
                </li>
              ))}
            </ol>
          </section>

          {order.mealSlot ? (
            <section className="order-detail-card order-detail-card--compact">
              <h2>{t("orderSlot")}</h2>
              <p>🕐 {SLOT_I18N[order.mealSlot]?.[locale] ?? order.mealSlot}</p>
            </section>
          ) : null}

          {order.address ? (
            <section className="order-detail-card order-detail-card--compact">
              <h2>{t("orderAddress")}</h2>
              <p>📍 {order.address}</p>
            </section>
          ) : null}

          <section className="order-detail-card">
            <h2>{t("orderItems")}</h2>
            <ul className="order-detail-items">
              {order.items.map((item, idx) => (
                <li key={idx}>
                  <span>{item.name}</span>
                  <span>×{Number(item.quantity)}</span>
                  <span>{formatMoney(item.price)}</span>
                </li>
              ))}
            </ul>
            <div className="order-detail-card__total">
              <strong>{formatMoney(order.total)}</strong>
            </div>
          </section>

          <section className="order-detail-card order-detail-card--compact">
            <h2>{t("orderPayment")}</h2>
            <p>
              {order.payment
                ? order.payment.status.replace(/_/g, " ")
                : translate(locale, "statusPendingPay")}
            </p>
            {needsPay ? (
              <Link href={`/pay/${order.id}`} className="landing-btn landing-btn--orange">
                {t("payNow")}
              </Link>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
