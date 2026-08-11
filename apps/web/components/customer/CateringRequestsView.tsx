"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet, getStoredUser } from "../../lib/admin-api";
import { formatDate, formatMoney } from "../../lib/format";
import { ServiceCategoryToggle } from "../landing/ServiceCategoryToggle";
import { useAppLocale } from "../providers/AppLocaleProvider";

type CateringRequest = {
  id: string;
  kind: "PACKAGE" | "CUSTOM_QUOTE";
  eventType: string;
  eventAt: string;
  location: string;
  guestCount: number;
  status: string;
  quotedPrice: string | number | null;
  orderId: string | null;
  paymentStatus?: string | null;
  package?: { nameEn: string; nameSw: string } | null;
};

type ListResponse = { items: CateringRequest[] };

const EVENT_LABEL: Record<string, "cateringEventWedding" | "cateringEventSendOff" | "cateringEventCorporate" | "cateringEventBirthday" | "cateringEventFuneral" | "cateringEventOther"> = {
  WEDDING: "cateringEventWedding",
  SEND_OFF: "cateringEventSendOff",
  CORPORATE: "cateringEventCorporate",
  BIRTHDAY: "cateringEventBirthday",
  FUNERAL: "cateringEventFuneral",
  OTHER: "cateringEventOther",
};

function statusClass(status: string) {
  if (status === "CONFIRMED" || status === "PREPARING" || status === "COMPLETED") return "confirmed";
  if (status === "CANCELLED" || status === "REJECTED") return "cancelled";
  return "pending";
}

export function CateringRequestsView() {
  const router = useRouter();
  const { locale, t } = useAppLocale();
  const user = getStoredUser();
  const [rows, setRows] = useState<CateringRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiGet<ListResponse>(`/api/catering/requests?userId=${user.id}`)
      .then((data) => setRows(data.items))
      .catch((e) => setError(e instanceof Error ? e.message : t("orderFailed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent("/catering/requests")}`);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function cancelRequest(id: string) {
    setBusyId(id);
    setError("");
    try {
      await apiDelete(`/api/catering/requests/${id}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("orderFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="store-page catering-page">
      <ServiceCategoryToggle />

      <header className="store-page__head">
        <div>
          <p className="store-page__eyebrow">Monana Food</p>
          <h1 className="store-page__title">{t("cateringMyRequests")}</h1>
          <p className="store-page__sub">{t("cateringMyRequestsSub")}</p>
        </div>
        <Link href="/catering" className="landing-btn landing-btn--orange">
          {t("planCatering")}
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
          <p>{t("cateringMyRequestsEmpty")}</p>
          <Link href="/catering" className="landing-btn landing-btn--navy">
            {t("planCatering")}
          </Link>
        </div>
      ) : (
        <ul className="catering-request-list">
          {rows.map((row) => {
            const title = row.package
              ? locale === "sw"
                ? row.package.nameSw
                : row.package.nameEn
              : t("cateringKindQuote");
            const eventKey = EVENT_LABEL[row.eventType] ?? "cateringEventOther";
            const paymentLocked =
              row.paymentStatus === "PAID" || row.paymentStatus === "AWAITING_CONFIRMATION";
            const canPay = row.status === "QUOTED" && !!row.orderId && !paymentLocked;
            const canCancel =
              (row.status === "PENDING" || row.status === "QUOTED") && !paymentLocked;
            const statusLabel =
              row.paymentStatus === "AWAITING_CONFIRMATION"
                ? t("cateringStatusAwaitingPayConfirm")
                : row.paymentStatus === "PAID" || row.status === "CONFIRMED"
                  ? t("cateringStatusConfirmed")
                  : row.status === "QUOTED"
                    ? t("cateringStatusQuoted")
                    : row.status === "PENDING"
                      ? t("cateringStatusPending")
                      : row.status.replace(/_/g, " ");
            return (
              <li key={row.id} className="catering-request-card">
                <div className="catering-request-card__top">
                  <span className="catering-request-card__kind">
                    {row.kind === "PACKAGE" ? t("cateringKindPackage") : t("cateringKindQuote")}
                  </span>
                  <span className={`order-status order-status--${statusClass(row.status)}`}>
                    {statusLabel}
                  </span>
                </div>
                <strong>{title}</strong>
                <p>
                  {t(eventKey)} · {row.guestCount} {t("cateringGuests").toLowerCase()}
                </p>
                <p className="catering-request-card__meta">
                  {formatDate(row.eventAt)} · {row.location}
                </p>
                {row.quotedPrice != null ? (
                  <p className="catering-request-card__price">{formatMoney(Number(row.quotedPrice))}</p>
                ) : null}
                <div className="catering-request-card__actions">
                  {canPay ? (
                    <Link href={`/pay/${row.orderId}`} className="landing-btn landing-btn--orange">
                      {t("cateringPayNow")}
                    </Link>
                  ) : null}
                  {canCancel ? (
                    <button
                      type="button"
                      className="landing-btn landing-btn--ghost"
                      disabled={busyId === row.id}
                      onClick={() => cancelRequest(row.id)}
                    >
                      {t("cateringCancelRequest")}
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
