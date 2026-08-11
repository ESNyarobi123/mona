"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet, getStoredUser } from "../../lib/admin-api";
import { formatDate, formatMoney } from "../../lib/format";
import { useAppLocale } from "../providers/AppLocaleProvider";

type CustomOrderRow = {
  id: string;
  dishName: string;
  specialRequirements: string | null;
  requestedFor: string;
  address: string | null;
  status: string;
  quotedPrice: string | number | null;
  orderId: string | null;
  paymentStatus?: string | null;
  adminNote: string | null;
  createdAt: string;
};

type ListResponse = { items: CustomOrderRow[] };

function customStatusClass(status: string, paymentStatus?: string | null) {
  if (paymentStatus === "PAID" || status === "ACCEPTED" || status === "PREPARING" || status === "READY" || status === "COMPLETED") {
    return "confirmed";
  }
  if (status === "REJECTED" || status === "CANCELLED") return "cancelled";
  return "pending";
}

function customStatusLabel(
  status: string,
  paymentStatus: string | null | undefined,
  t: ReturnType<typeof useAppLocale>["t"]
) {
  if (paymentStatus === "AWAITING_CONFIRMATION") return t("customOrderStatusAwaitingPayConfirm");
  if (paymentStatus === "PAID") return t("customOrderStatusPaid");
  switch (status) {
    case "PENDING":
      return t("customOrderStatusPending");
    case "QUOTED":
      return t("customOrderStatusQuoted");
    case "ACCEPTED":
      return t("customOrderStatusAccepted");
    case "PREPARING":
      return t("customOrderStatusPreparing");
    case "READY":
      return t("customOrderStatusReady");
    case "COMPLETED":
      return t("customOrderStatusCompleted");
    case "REJECTED":
      return t("customOrderStatusRejected");
    case "CANCELLED":
      return t("customOrderStatusCancelled");
    default:
      return status.replace(/_/g, " ");
  }
}

export function CustomOrderRequestsView() {
  const router = useRouter();
  const { t } = useAppLocale();
  const user = getStoredUser();

  const [rows, setRows] = useState<CustomOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiGet<ListResponse>(`/api/restaurant/social-orders?userId=${user.id}`)
      .then((data) => setRows(data.items))
      .catch((e) => setError(e instanceof Error ? e.message : t("orderFailed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/restaurant/social-order/requests")}`);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function cancelRequest(id: string) {
    if (!window.confirm(t("customOrderCancelConfirm"))) return;
    setBusyId(id);
    setError("");
    try {
      await apiDelete(`/api/restaurant/social-orders/${id}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("orderFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="store-page custom-order-requests-page">
      <header className="store-page__head">
        <div>
          <p className="store-page__eyebrow">Monana Food</p>
          <h1 className="store-page__title">{t("customOrderRequestsTitle")}</h1>
          <p className="store-page__sub">{t("customOrderRequestsSub")}</p>
        </div>
        <Link href="/restaurant/social-order" className="landing-btn landing-btn--orange">
          {t("customOrderSubmit")}
        </Link>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      {loading ? (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
          <p>{t("loading")}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="catering-empty">
          <p>{t("customOrderRequestsEmpty")}</p>
          <Link href="/restaurant/social-order" className="landing-btn landing-btn--orange">
            {t("customOrderCtaButton")}
          </Link>
        </div>
      ) : (
        <ul className="custom-order-request-list">
          {rows.map((row) => {
            const paymentLocked =
              row.paymentStatus === "PAID" || row.paymentStatus === "AWAITING_CONFIRMATION";
            const canCancel =
              (row.status === "PENDING" || row.status === "QUOTED") && !paymentLocked;
            const canPay = row.status === "QUOTED" && !!row.orderId && !paymentLocked;
            return (
              <li key={row.id} className="custom-order-request-card">
                <div className="custom-order-request-card__top">
                  <span className="custom-order-request-card__kind">{t("customOrderPageTitle")}</span>
                  <span
                    className={`order-status order-status--${customStatusClass(row.status, row.paymentStatus)}`}
                  >
                    {customStatusLabel(row.status, row.paymentStatus, t)}
                  </span>
                </div>
                <strong>{row.dishName}</strong>
                <p className="custom-order-request-card__meta">
                  {t("customOrderTimeLabel")}: {formatDate(row.requestedFor)}
                </p>
                {row.specialRequirements ? (
                  <p className="custom-order-request-card__meta">💬 {row.specialRequirements}</p>
                ) : null}
                {row.address ? <p className="custom-order-request-card__meta">📍 {row.address}</p> : null}
                {row.adminNote ? <p className="custom-order-request-card__meta">📝 {row.adminNote}</p> : null}
                {row.quotedPrice != null ? (
                  <p className="custom-order-request-card__price">
                    {t("customOrderQuotedPrice")}: {formatMoney(Number(row.quotedPrice))}
                  </p>
                ) : null}
                <div className="custom-order-request-card__actions">
                  {canPay ? (
                    <Link href={`/pay/${row.orderId}`} className="landing-btn landing-btn--orange">
                      {t("payNow")}
                    </Link>
                  ) : null}
                  {canCancel ? (
                    <button
                      type="button"
                      className="landing-btn landing-btn--ghost"
                      disabled={busyId === row.id}
                      onClick={() => cancelRequest(row.id)}
                    >
                      {t("cancelOrder")}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
