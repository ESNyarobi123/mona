"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost, normalizeApiList } from "../../../../lib/admin-api";
import { formatMoney } from "../../../../lib/format";
import { orderRef, userInitials } from "../../../../lib/admin-dashboard";
import { paymentStatusLabel } from "../../../../lib/admin-i18n";
import type { AdminMessageKey } from "../../../../lib/admin-i18n";
import { StatusBadge } from "../../../../components/admin/StatusBadge";
import { AdminPageHeader } from "../../../../components/admin/AdminPageHeader";
import { AdminPanel } from "../../../../components/admin/dashboard/AdminPanel";
import { AdminKpiCard } from "../../../../components/admin/dashboard/AdminKpiCard";
import { AdminUserCell } from "../../../../components/admin/dashboard/AdminUserCell";
import { AdminLoading } from "../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../components/admin/AdminLocaleProvider";

type Payment = {
  id: string;
  status: string;
  amount: string | number;
  reference: string | null;
  orderId: string;
  createdAt: string;
  user: { name: string | null; phone: string };
  order: {
    id: string;
    module: string;
    total: string | number;
    paymentTiming?: string;
    submittedAt?: string | null;
  };
};

type PaymentsResponse = Payment[] | { items: Payment[]; meta: { total: number } };

const STATUS_FILTERS = ["", "AWAITING_CONFIRMATION", "PENDING", "PAID", "FAILED"] as const;

function formatPaymentDate(iso: string, locale: "en" | "sw") {
  const tag = locale === "sw" ? "sw-TZ" : "en-GB";
  return new Date(iso).toLocaleString(tag, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentRef(id: string) {
  return `#${id.slice(-6).toUpperCase()}`;
}

function moduleIcon(module: string) {
  return module === "RESTAURANT" ? "🍽️" : "🛒";
}

function statusPillClass(status: string) {
  return status.toLowerCase().replace(/_/g, "-");
}

type PaymentGridProps = {
  items: Payment[];
  busyId: string | null;
  locale: "en" | "sw";
  t: (key: AdminMessageKey) => string;
  onSelect: (payment: Payment) => void;
  onConfirm: (paymentId: string, action: "confirm" | "reject", payOnDelivery?: boolean) => void;
};

function PaymentGrid({ items, busyId, locale, t, onSelect, onConfirm }: PaymentGridProps) {
  return (
    <ul className="admin-payment-grid">
      {items.map((p) => {
        const busy = busyId === p.id;
        const needsAction = p.status === "AWAITING_CONFIRMATION";
        const payOnDelivery = p.order.paymentTiming === "PAY_ON_DELIVERY" && !p.order.submittedAt;

        return (
          <li
            key={p.id}
            className={`admin-payment-card admin-payment-card--${statusPillClass(p.status)} admin-payment-card--${p.order.module.toLowerCase()}`}
          >
            <div className="admin-payment-card__accent" aria-hidden />

            <header className="admin-payment-card__head">
              <div className="admin-payment-card__ref">
                <span className="admin-payment-card__icon" aria-hidden>
                  💳
                </span>
                <div>
                  <strong>{paymentRef(p.id)}</strong>
                  <span className="admin-order-date">{formatPaymentDate(p.createdAt, locale)}</span>
                </div>
              </div>
              <span className={`admin-payment-status-pill admin-payment-status-pill--${statusPillClass(p.status)}`}>
                {paymentStatusLabel(locale, p.status)}
              </span>
            </header>

            <div className="admin-payment-card__reference">
              <span className="admin-payment-card__reference-label">{t("reference")}</span>
              {p.reference ? (
                <code className="admin-payment-ref admin-payment-ref--card">{p.reference}</code>
              ) : (
                <span className="admin-payment-ref admin-payment-ref--empty">{t("noReference")}</span>
              )}
            </div>

            <div className="admin-payment-card__customer">
              <span className="admin-order-card__avatar" aria-hidden>
                {userInitials(p.user.name, p.user.phone)}
              </span>
              <div className="admin-order-card__customer-copy">
                <strong>{p.user.name?.trim() || p.user.phone}</strong>
                <small>{p.user.phone}</small>
              </div>
            </div>

            <div className="admin-payment-card__order">
              <span className="admin-payment-card__order-icon" aria-hidden>
                {moduleIcon(p.order.module)}
              </span>
              <div className="admin-payment-card__order-copy">
                <span className="admin-payment-card__order-label">{t("linkedOrder")}</span>
                <strong>{orderRef(p.order.id)}</strong>
              </div>
              <StatusBadge status={p.order.module} />
            </div>

            <div className="admin-payment-card__amount">
              <span>{t("amount")}</span>
              <strong>{formatMoney(p.amount)}</strong>
              {Number(p.order.total) !== Number(p.amount) ? (
                <small>
                  {t("order")}: {formatMoney(p.order.total)}
                </small>
              ) : null}
            </div>

            {needsAction ? (
              <div className="admin-payment-card__alert">
                <span aria-hidden>⏳</span>
                {payOnDelivery ? t("payOnDeliveryAwaiting") : t("needsAction")}
              </div>
            ) : null}

            <footer className="admin-payment-card__foot">
              <div className="admin-payment-card__actions">
                <button type="button" className="admin-btn secondary sm" onClick={() => onSelect(p)}>
                  {t("viewPaymentDetails")}
                </button>
                {needsAction ? (
                  <>
                    <button
                      type="button"
                      className="admin-btn sm"
                      disabled={busy}
                      onClick={() => onConfirm(p.id, "confirm", payOnDelivery)}
                    >
                      {t("confirm")}
                    </button>
                    <button
                      type="button"
                      className="admin-btn sm danger"
                      disabled={busy}
                      onClick={() => onConfirm(p.id, "reject", payOnDelivery)}
                    >
                      {t("reject")}
                    </button>
                  </>
                ) : null}
              </div>
            </footer>
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminPaymentsPage() {
  const { t, tf, locale } = useAdminLocale();
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState("AWAITING_CONFIRMATION");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Payment | null>(null);
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
    apiGet<PaymentsResponse>(`/api/payments?${q}`)
      .then((data) => setPayments(normalizeApiList(data)))
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [filter, search]);

  const stats = useMemo(() => {
    const awaiting = payments.filter((p) => p.status === "AWAITING_CONFIRMATION").length;
    const paid = payments.filter((p) => p.status === "PAID").length;
    const failed = payments.filter((p) => p.status === "FAILED").length;
    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const restaurant = payments.filter((p) => p.order.module === "RESTAURANT").length;
    const grocery = payments.filter((p) => p.order.module === "GROCERY").length;
    return { awaiting, paid, failed, total, restaurant, grocery };
  }, [payments]);

  const restaurantPayments = useMemo(
    () => payments.filter((p) => p.order.module === "RESTAURANT"),
    [payments]
  );
  const groceryPayments = useMemo(
    () => payments.filter((p) => p.order.module === "GROCERY"),
    [payments]
  );

  async function confirmPayment(paymentId: string, action: "confirm" | "reject", payOnDelivery?: boolean) {
    const prompt =
      action === "confirm"
        ? payOnDelivery
          ? t("confirmPayOnDeliveryPrompt")
          : t("confirmPaymentPrompt")
        : payOnDelivery
          ? t("rejectPayOnDeliveryPrompt")
          : t("rejectPaymentPrompt");
    if (!confirm(prompt)) return;

    setBusyId(paymentId);
    try {
      await apiPost("/api/payments/confirm", { paymentId, action });
      load();
      if (selected?.id === paymentId) {
        setSelected((prev) =>
          prev ? { ...prev, status: action === "confirm" ? "PAID" : "FAILED" } : null
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusyId(null);
    }
  }

  function filterLabel(status: string) {
    if (!status) return t("all");
    return paymentStatusLabel(locale, status);
  }

  return (
    <div className="admin-dash admin-dash--payments">
      <AdminPageHeader
        title={t("payments")}
        actions={
          <button type="button" className="admin-btn secondary sm" onClick={load}>
            {t("refresh")}
          </button>
        }
      />

      <div className="admin-kpi-grid">
        <AdminKpiCard
          label={t("payments")}
          value={payments.length}
          trend={tf("shownCount", { n: payments.length })}
          tone="accent"
        />
        <AdminKpiCard
          label={t("awaitingConfirmation")}
          value={stats.awaiting}
          trend={t("needsAction")}
          tone="warning"
          trendUp={false}
        />
        <AdminKpiCard
          label={t("restaurantPayments")}
          value={stats.restaurant}
          trend={tf("groceryCount", { n: stats.grocery })}
          tone="restaurant"
        />
        <AdminKpiCard
          label={t("totalAmount")}
          value={formatMoney(stats.total)}
          trend={tf("paidCount", { n: stats.paid })}
          tone="default"
        />
      </div>

      <AdminPanel title={t("filter")} badge={tf("shownCount", { n: payments.length })}>
        <div className="admin-panel__body-pad">
          <div className="admin-order-filters">
            <div className="admin-order-filters__search">
              <input
                type="search"
                className="admin-crud-form__input"
                placeholder={t("searchPayments")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t("searchPaymentsAria")}
              />
            </div>
          </div>

          <div className="admin-order-status-chips" role="group" aria-label={t("filterPaymentStatusAria")}>
            {STATUS_FILTERS.map((status) => (
              <button
                key={status || "all"}
                type="button"
                className={`admin-order-status-chip${filter === status ? " is-active" : ""}`}
                onClick={() => setFilter(status)}
              >
                {filterLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </AdminPanel>

      {error && <p className="admin-error">{error}</p>}

      {loading ? (
        <AdminPanel title={t("paymentsList")}>
          <AdminLoading label={t("loadingPayments")} />
        </AdminPanel>
      ) : payments.length === 0 ? (
        <AdminPanel title={t("paymentsList")}>
          <div className="admin-order-empty">
            <span aria-hidden>💳</span>
            <p>
              {filter === "AWAITING_CONFIRMATION" && !search
                ? t("noPaymentsPending")
                : t("noPaymentsMatch")}
            </p>
          </div>
        </AdminPanel>
      ) : (
        <div className="admin-payments-sections">
          <AdminPanel
            title={t("restaurantPayments")}
            badge={tf("shownCount", { n: restaurantPayments.length })}
            className="admin-payments-section admin-payments-section--restaurant"
          >
            {restaurantPayments.length === 0 ? (
              <div className="admin-order-empty admin-order-empty--section">
                <span aria-hidden>🍽️</span>
                <p>{t("noRestaurantPayments")}</p>
              </div>
            ) : (
              <PaymentGrid
                items={restaurantPayments}
                busyId={busyId}
                locale={locale}
                t={t}
                onSelect={setSelected}
                onConfirm={confirmPayment}
              />
            )}
          </AdminPanel>

          <AdminPanel
            title={t("groceryPayments")}
            badge={tf("shownCount", { n: groceryPayments.length })}
            className="admin-payments-section admin-payments-section--grocery"
          >
            {groceryPayments.length === 0 ? (
              <div className="admin-order-empty admin-order-empty--section">
                <span aria-hidden>🛒</span>
                <p>{t("noGroceryPayments")}</p>
              </div>
            ) : (
              <PaymentGrid
                items={groceryPayments}
                busyId={busyId}
                locale={locale}
                t={t}
                onSelect={setSelected}
                onConfirm={confirmPayment}
              />
            )}
          </AdminPanel>
        </div>
      )}

      {selected ? (
        <div className="admin-modal-overlay admin-modal-overlay--spacious" onClick={() => setSelected(null)}>
          <div
            className="admin-modal admin-modal--catalog admin-modal--payment-detail"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-modal__head">
              <div className="admin-payment-detail__head">
                <span className="admin-payment-detail__icon" aria-hidden>
                  💳
                </span>
                <div>
                  <h2>{t("paymentDetails")}</h2>
                  <p className="admin-modal__sub">
                    {paymentRef(selected.id)} · {formatPaymentDate(selected.createdAt, locale)}
                  </p>
                </div>
                <span
                  className={`admin-payment-status-pill admin-payment-status-pill--${statusPillClass(selected.status)}`}
                >
                  {paymentStatusLabel(locale, selected.status)}
                </span>
              </div>
            </header>

            <div className="admin-payment-detail">
              <section className="admin-order-detail__section">
                <h3 className="admin-form-section__title">{t("reference")}</h3>
                {selected.reference ? (
                  <code className="admin-payment-ref admin-payment-ref--hero">{selected.reference}</code>
                ) : (
                  <p className="admin-crud-form__hint">{t("noReference")}</p>
                )}
              </section>

              <section className="admin-order-detail__section">
                <h3 className="admin-form-section__title">{t("customer")}</h3>
                <AdminUserCell name={selected.user.name} phone={selected.user.phone} />
              </section>

              <section className="admin-order-detail__section">
                <h3 className="admin-form-section__title">{t("linkedOrder")}</h3>
                <div className="admin-payment-detail__order-box">
                  <div className="admin-payment-detail__order-row">
                    <span>{t("order")}</span>
                    <strong>{orderRef(selected.order.id)}</strong>
                  </div>
                  <div className="admin-payment-detail__order-row">
                    <span>{t("module")}</span>
                    <StatusBadge status={selected.order.module} />
                  </div>
                  <div className="admin-payment-detail__order-row">
                    <span>{t("order")} {t("total")}</span>
                    <strong>{formatMoney(selected.order.total)}</strong>
                  </div>
                </div>
              </section>

              <section className="admin-order-detail__section">
                <h3 className="admin-form-section__title">{t("paymentId")}</h3>
                <code className="admin-payment-ref">{selected.id}</code>
              </section>

              <footer className="admin-payment-detail__foot">
                <div className="admin-payment-detail__total">
                  <span>{t("amount")}</span>
                  <strong>{formatMoney(selected.amount)}</strong>
                </div>
                <div className="admin-payment-detail__actions">
                  {selected.status === "AWAITING_CONFIRMATION" ? (
                    <>
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={busyId === selected.id}
                        onClick={() =>
                          confirmPayment(
                            selected.id,
                            "confirm",
                            selected.order.paymentTiming === "PAY_ON_DELIVERY" && !selected.order.submittedAt
                          )
                        }
                      >
                        {t("confirm")}
                      </button>
                      <button
                        type="button"
                        className="admin-btn danger"
                        disabled={busyId === selected.id}
                        onClick={() =>
                          confirmPayment(
                            selected.id,
                            "reject",
                            selected.order.paymentTiming === "PAY_ON_DELIVERY" && !selected.order.submittedAt
                          )
                        }
                      >
                        {t("reject")}
                      </button>
                    </>
                  ) : null}
                  <Link href={`/admin/orders?q=${selected.order.id.slice(-6)}`} className="admin-btn secondary">
                    {t("viewOrderDetails")}
                  </Link>
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
