"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "../../../../../lib/admin-api";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type SlotRow = {
  slot: string;
  label: string;
  emoji: string;
  orderWindow: string;
  deliversFor: string;
  status: "OPEN" | "CLOSED";
  orderCount: number;
};

type SlotPayload = {
  timeDisplay: string;
  timezone: string;
  slots: SlotRow[];
};

const SLOT_ORDER = ["BREAKFAST", "LUNCH", "DINNER"] as const;

export default function RestaurantSlotsPage() {
  const { t, tf, locale } = useAdminLocale();
  const [data, setData] = useState<SlotPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load(silent = false) {
    if (!silent) setLoading(true);
    apiGet<SlotPayload>(`/api/restaurant/slots/status?locale=${locale}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 30000);
    return () => clearInterval(timer);
  }, [locale]);

  const orderedSlots = useMemo(() => {
    if (!data) return [];
    return SLOT_ORDER.map((key) => data.slots.find((s) => s.slot === key)).filter(
      (s): s is SlotRow => !!s
    );
  }, [data]);

  const stats = useMemo(() => {
    const open = orderedSlots.filter((s) => s.status === "OPEN").length;
    const orders = orderedSlots.reduce((sum, s) => sum + s.orderCount, 0);
    return { open, orders, total: orderedSlots.length };
  }, [orderedSlots]);

  if (loading && !data) {
    return <AdminLoading label={t("slots")} />;
  }

  return (
    <div className="admin-dash admin-dash--restaurant">
      <AdminPageHeader
        title={t("slots")}
        actions={
          <div className="admin-overview-quick">
            <Link href="/admin/restaurant/settings" className="admin-btn secondary sm">
              {t("slotEditTimes")}
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={() => load()}>
              {t("refresh")}
            </button>
            <Link href="/admin/orders?module=RESTAURANT" className="admin-btn secondary sm">
              {t("orders")}
            </Link>
          </div>
        }
      />

      <p className="admin-page-lead">{t("slotsDesc")}</p>

      {data ? (
        <div className="admin-kitchen-banner is-active" role="status">
          🕐 {data.timeDisplay} · {data.timezone.replace("_", " ")}
        </div>
      ) : null}

      <div className="admin-kpi-grid">
        <AdminKpiCard label={t("slotOpen")} value={stats.open} tone="success" icon="✅" />
        <AdminKpiCard
          label={t("slotClosed")}
          value={stats.total - stats.open}
          tone="default"
          icon="🔒"
        />
        <AdminKpiCard label={t("ordersToday")} value={stats.orders} tone="restaurant" icon="📦" />
        <AdminKpiCard label={t("slots")} value={stats.total} tone="accent" icon="🕐" />
      </div>

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("ordersBySlotToday")}>
        {!data || orderedSlots.length === 0 ? (
          <div className="admin-kitchen-empty admin-kitchen-empty--board">
            <span className="admin-kitchen-empty__icon" aria-hidden>
              🕐
            </span>
            <p>{t("error")}</p>
          </div>
        ) : (
          <div className="admin-slots-page-grid">
            {orderedSlots.map((slot) => {
              const isOpen = slot.status === "OPEN";
              return (
                <article
                  key={slot.slot}
                  className={`admin-slots-page-card admin-slots-page-card--${isOpen ? "open" : "closed"}`}
                >
                  <div className="admin-slots-page-card__head">
                    <span className="admin-slots-page-card__emoji">{slot.emoji}</span>
                    <div className="admin-slots-page-card__title">
                      <strong>{slot.label}</strong>
                      <span
                        className={`admin-slots-page-card__badge admin-slots-page-card__badge--${isOpen ? "open" : "closed"}`}
                      >
                        {isOpen ? t("slotOpen") : t("slotClosed")}
                      </span>
                    </div>
                  </div>

                  <dl className="admin-slots-page-card__meta">
                    <div>
                      <dt>{t("slotOrderWindow")}</dt>
                      <dd>{slot.orderWindow}</dd>
                    </div>
                    <div>
                      <dt>{t("slotDeliversFor")}</dt>
                      <dd>{slot.deliversFor}</dd>
                    </div>
                    <div>
                      <dt>{t("ordersToday")}</dt>
                      <dd>{tf("slotOrdersToday", { n: slot.orderCount })}</dd>
                    </div>
                  </dl>

                  <Link
                    href={`/admin/orders?module=RESTAURANT`}
                    className="admin-slots-page-card__link"
                  >
                    {t("viewAllOrders")} →
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <p className="admin-slots-page-note">{t("slotsHoursNote")}</p>
      </AdminPanel>
    </div>
  );
}
