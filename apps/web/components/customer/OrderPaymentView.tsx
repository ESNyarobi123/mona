"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, isApiNotFoundError } from "../../lib/admin-api";
import { formatMoney } from "../../lib/format";
import {
  canCustomerPayOrder,
  isWaitingForDeliveryBeforePayment,
} from "@monana/utils";
import { useAppLocale } from "../providers/AppLocaleProvider";

type PaymentInfo = {
  kind?: "CHECKOUT_INTENT" | "ORDER";
  intentId?: string;
  payment: {
    id: string;
    status: string;
    reference: string;
    amount: string | number;
  };
  instructions: {
    lipaNamba: string;
    name: string;
    amount: string;
    reference: string;
    steps: string;
  };
  qrDataUrl: string;
};

type CheckoutInfo = {
  id: string;
  kind: "CHECKOUT_INTENT";
  module: "RESTAURANT" | "GROCERY";
  total: string | number;
  status: string;
  paymentToken: string;
};

type OrderInfo = {
  id: string;
  module: "RESTAURANT" | "GROCERY";
  status: string;
  total: string | number;
  paymentTiming?: "PAY_NOW" | "PAY_ON_DELIVERY";
  submittedAt?: string | null;
  payment?: { id: string; status: string; reference: string } | null;
};

const MODULE_UI = {
  GROCERY: {
    icon: "🛒",
    theme: "green" as const,
    ordersHref: "/grocery/orders",
    label: "Grocery",
  },
  RESTAURANT: {
    icon: "🍲",
    theme: "navy" as const,
    ordersHref: "/restaurant/orders",
    label: "Restaurant",
  },
};

export function OrderPaymentView({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { locale, t } = useAppLocale();
  const [checkout, setCheckout] = useState<CheckoutInfo | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [payInfo, setPayInfo] = useState<PaymentInfo | null>(null);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);

  const isIntent = !!checkout;
  const module = checkout?.module ?? order?.module ?? "GROCERY";
  const total = checkout?.total ?? order?.total ?? 0;
  const cfg = MODULE_UI[module];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setPayInfo(null);
    try {
      try {
        const o = await apiGet<OrderInfo>(`/api/orders/${orderId}`);
        setOrder(o);
        setCheckout(null);

        if (o.status === "CANCELLED") {
          return;
        }

        if (o.payment?.status === "PAID" || o.payment?.status === "AWAITING_CONFIRMATION") {
          setDone(true);
          return;
        }

        if (isWaitingForDeliveryBeforePayment(o)) {
          return;
        }

        if (!canCustomerPayOrder(o)) {
          setError(t("paymentUnavailable"));
          return;
        }

        try {
          const pay = await apiPost<PaymentInfo>(`/api/payments?locale=${locale}`, { orderId: o.id });
          setPayInfo(pay);
        } catch (payErr) {
          setError(payErr instanceof Error ? payErr.message : t("paymentUnavailable"));
        }
        return;
      } catch (orderErr) {
        if (!isApiNotFoundError(orderErr)) {
          throw orderErr;
        }
        // order not found — try checkout intent below
      }

      const intent = await apiGet<CheckoutInfo>(`/api/checkout-intents/${orderId}`);
      setCheckout(intent);
      setOrder(null);
      const pay = await apiPost<PaymentInfo>(`/api/payments?locale=${locale}`, { intentId: intent.id });
      setPayInfo(pay);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [orderId, locale, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCopy() {
    if (!payInfo?.instructions.lipaNamba) return;
    try {
      await navigator.clipboard.writeText(payInfo.instructions.lipaNamba);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Imeshindwa kunakili — nakili kwa mkono.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payInfo) return;
    const ref = reference.trim();
    if (!ref) {
      setError("Andika reference ya malipo (ujumbe kutoka M-Pesa).");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await apiPost<{ orderId: string }>("/api/payments/submit", isIntent
        ? { intentId: orderId, reference: ref }
        : { paymentId: payInfo.payment.id, reference: ref });
      setDone(true);
      setTimeout(() => {
        router.push(cfg.ordersHref);
      }, 2500);
      void result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imeshindwa kutuma");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="payment-page">
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
          <p>{t("loadingPayment")}</p>
        </div>
      </div>
    );
  }

  if (!order && !checkout) {
    return (
      <div className="payment-page">
        <div className="account-empty">
          <p>{error || t("orderNotFound")}</p>
          <Link href="/account" className="landing-btn landing-btn--navy">
            {t("backToAccount")}
          </Link>
        </div>
      </div>
    );
  }

  const orderRef = orderId.slice(-6).toUpperCase();
  const isCancelled = order?.status === "CANCELLED";
  const payOnDeliveryTooEarly = !!order && isWaitingForDeliveryBeforePayment(order);
  const alreadySubmitted =
    done &&
    (isIntent ||
      order?.payment?.status === "AWAITING_CONFIRMATION" ||
      order?.payment?.status === "PAID");
  const fullyPaid = order?.payment?.status === "PAID";

  return (
    <div className={`payment-page payment-page--${cfg.theme}`}>
      <header className="payment-page__hero">
        <div className={`payment-page__hero-icon payment-page__hero-icon--${cfg.theme}`} aria-hidden>
          <span>💳</span>
        </div>
        <div>
          <p className="payment-page__eyebrow">{t("payment")} · {cfg.label}</p>
          <h1 className="payment-page__title">{t("payTitle")}</h1>
          <p className="payment-page__sub">
            {isIntent ? t("payBeforeOrderSaved") : `${t("orderLabel")} #${orderRef}`} · {formatMoney(total)}
          </p>
        </div>
      </header>

      {isCancelled ? (
        <div className="payment-done">
          <span className="payment-done__icon" aria-hidden>
            ❌
          </span>
          <h2>{t("cancelledNote")}</h2>
          <Link href={cfg.ordersHref} className="landing-btn landing-btn--navy">
            {t("viewYourOrders")}
          </Link>
        </div>
      ) : fullyPaid ? (
        <div className="payment-done">
          <span className="payment-done__icon" aria-hidden>
            ✅
          </span>
          <h2>{t("paymentConfirmed")}</h2>
          <p>{t("paymentThankYou")}</p>
          <Link href={cfg.ordersHref} className="landing-btn landing-btn--navy">
            {t("viewYourOrders")}
          </Link>
        </div>
      ) : alreadySubmitted && !payInfo ? (
        <div className="payment-done">
          <span className="payment-done__icon" aria-hidden>
            ✅
          </span>
          <h2>{t("paymentReceived")}</h2>
          <p>
            {t("paymentReview")}{" "}
            <strong>{order?.payment?.status?.replace(/_/g, " ") ?? t("awaiting")}</strong>
          </p>
          <Link href={cfg.ordersHref} className="landing-btn landing-btn--navy">
            {t("viewYourOrders")}
          </Link>
        </div>
      ) : payOnDeliveryTooEarly ? (
        <div className="payment-done">
          <span className="payment-done__icon" aria-hidden>
            📦
          </span>
          <h2>{t("payOnDeliveryWaitTitle")}</h2>
          <p>{t("payOnDeliveryWaitHint")}</p>
          <Link href={`/account/orders/${orderId}`} className="landing-btn landing-btn--navy">
            {t("trackOrderStatus")}
          </Link>
        </div>
      ) : payInfo ? (
        <>
          <section className="payment-card payment-card--qr">
            <h2 className="payment-card__title">{t("payStep1")}</h2>
            <p className="payment-card__hint">{payInfo.instructions.steps}</p>

            <div className="payment-qr-wrap">
              {payInfo.qrDataUrl ? (
                <img
                  src={payInfo.qrDataUrl}
                  alt={`QR Lipa Namba ${payInfo.instructions.lipaNamba}`}
                  className="payment-qr"
                  width={280}
                  height={280}
                />
              ) : null}
              <p className="payment-qr__scan">{t("scanHint")}</p>
            </div>

            <div className="payment-lipa">
              <div className="payment-lipa__row">
                <span className="payment-lipa__label">Lipa Namba</span>
                <strong className="payment-lipa__number">{payInfo.instructions.lipaNamba}</strong>
              </div>
              <div className="payment-lipa__row">
                <span className="payment-lipa__label">{t("lipaName")}</span>
                <strong>{payInfo.instructions.name}</strong>
              </div>
              <div className="payment-lipa__row">
                <span className="payment-lipa__label">{t("amount")}</span>
                <strong className="payment-lipa__amount">{payInfo.instructions.amount}</strong>
              </div>
              <button type="button" className="payment-lipa__copy" onClick={handleCopy}>
                {copied ? t("copied") : t("copyLipaNumber")}
              </button>
            </div>
          </section>

          <section className="payment-card payment-card--confirm">
            <h2 className="payment-card__title">{t("payStep2")}</h2>
            <p className="payment-card__hint">{t("afterPayHint")}</p>

            {done ? (
              <div className="payment-done payment-done--inline">
                <p className="auth-toast auth-toast--success">{t("paymentSuccessToast")}</p>
                <p className="payment-done__redirect">{t("redirectingOrders")}</p>
              </div>
            ) : (
              <form className="payment-confirm-form" onSubmit={handleSubmit}>
                <label className="checkout-field">
                  <span className="checkout-field__label">
                    {t("paymentRefLabel")} <em className="checkout-field__req">*</em>
                  </span>
                  <div className="checkout-field__wrap">
                    <span className="checkout-field__icon" aria-hidden>
                      🧾
                    </span>
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={t("paymentRefPlaceholder")}
                      required
                      autoComplete="off"
                    />
                  </div>
                </label>
                <p className="payment-confirm-form__ref-hint">
                  {t("checkoutRefHint")}
                </p>
                {error ? <p className="auth-form__error">{error}</p> : null}
                <button
                  type="submit"
                  className={`landing-btn landing-btn--${cfg.theme === "green" ? "orange" : "navy"} payment-confirm-form__btn`}
                  disabled={submitting}
                >
                  {submitting ? t("paymentSubmitting") : t("paymentSubmit")}
                </button>
              </form>
            )}
          </section>

          <Link href={cfg.ordersHref} className="payment-page__skip">
            {t("payLater")}
          </Link>
        </>
      ) : (
        <div className="account-empty">
          <p>{error || t("paymentUnavailable")}</p>
          <button type="button" className="landing-btn landing-btn--ghost" onClick={load}>
            {t("tryAgain")}
          </button>
        </div>
      )}
    </div>
  );
}
