"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { matchesAdminSearch } from "../../../../../lib/admin-search";
import { apiGet, apiPatch } from "../../../../../lib/admin-api";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import {
  AdminKitchenQueueCard,
  type KitchenQueueItem,
} from "../../../../../components/admin/dashboard/AdminKitchenQueueCard";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

const STATUS_FLOW: Record<string, string> = {
  WAITING: "COOKING",
  COOKING: "READY",
  READY: "SERVED",
};

const KITCHEN_COLUMNS = ["WAITING", "COOKING", "READY"] as const;
const SLOT_OPTIONS = ["BREAKFAST", "LUNCH", "DINNER"] as const;

type StatusFilter = "" | (typeof KITCHEN_COLUMNS)[number];

const COLUMN_TONE: Record<(typeof KITCHEN_COLUMNS)[number], string> = {
  WAITING: "waiting",
  COOKING: "cooking",
  READY: "ready",
};

export default function RestaurantKitchenPage() {
  const { t, tf, locale, slotLabel, kitchenLabel } = useAdminLocale();
  const searchParams = useSearchParams();
  const [queue, setQueue] = useState<KitchenQueueItem[]>([]);
  const [slot, setSlot] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  function load(silent = false) {
    if (!silent) setLoading(true);
    const q = slot ? `?slot=${slot}` : "";
    apiGet<KitchenQueueItem[]>(`/api/restaurant/kitchen${q}`)
      .then((data) => {
        setQueue(data);
        setLastUpdated(new Date());
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 15000);
    return () => clearInterval(timer);
  }, [slot]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const activeQueue = useMemo(
    () => queue.filter((q) => q.status !== "SERVED"),
    [queue]
  );

  const filteredQueue = useMemo(
    () =>
      activeQueue.filter((q) =>
        matchesAdminSearch(search, [
          q.order.id,
          q.order.user.name,
          q.order.user.phone,
          ...q.order.items.map((i) => i.name),
        ])
      ),
    [activeQueue, search]
  );

  const stats = useMemo(() => {
    const waiting = filteredQueue.filter((q) => q.status === "WAITING").length;
    const cooking = filteredQueue.filter((q) => q.status === "COOKING").length;
    const ready = filteredQueue.filter((q) => q.status === "READY").length;
    const dishes = filteredQueue.reduce(
      (sum, q) => sum + q.order.items.reduce((s, i) => s + Number(i.quantity), 0),
      0
    );
    return { waiting, cooking, ready, total: filteredQueue.length, dishes };
  }, [filteredQueue]);

  const columns = useMemo(() => {
    return KITCHEN_COLUMNS.map((status) => ({
      status,
      items: filteredQueue
        .filter((q) => q.status === status)
        .sort((a, b) => a.position - b.position),
    }));
  }, [filteredQueue]);

  const visibleColumns = statusFilter
    ? columns.filter((col) => col.status === statusFilter)
    : columns;

  async function advance(item: KitchenQueueItem) {
    const next = STATUS_FLOW[item.status];
    if (!next) return;
    setBusyId(item.id);
    try {
      await apiPatch("/api/restaurant/kitchen", { queueId: item.id, status: next });
      load(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusyId(null);
    }
  }

  const updatedLabel = lastUpdated
    ? tf("kitchenLastUpdated", {
        time: lastUpdated.toLocaleTimeString(locale === "sw" ? "sw-TZ" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      })
    : null;

  if (loading && queue.length === 0) {
    return <AdminLoading label={t("kitchenQueue")} />;
  }

  return (
    <div className="admin-dash admin-dash--restaurant admin-dash--kitchen">
      <AdminPageHeader
        title={t("kitchen")}
        actions={
          <div className="admin-overview-quick">
            {updatedLabel ? <span className="admin-kitchen-updated">{updatedLabel}</span> : null}
            <button type="button" className="admin-btn secondary sm" onClick={() => load()}>
              {t("refresh")}
            </button>
            <Link href="/admin/restaurant/menu" className="admin-btn secondary sm">
              {t("menu")}
            </Link>
          </div>
        }
      />

      <p className="admin-page-lead">{t("kitchenDesc")}</p>

      <div
        className={`admin-kitchen-banner${stats.total > 0 ? " is-active" : ""}`}
        role="status"
      >
        {stats.total > 0
          ? tf("kitchenActiveBanner", { n: stats.total })
          : t("kitchenCalmBanner")}
      </div>

      <div className="admin-kpi-grid">
        <AdminKpiCard label={kitchenLabel("WAITING")} value={stats.waiting} tone="restaurant" icon="⏳" />
        <AdminKpiCard label={kitchenLabel("COOKING")} value={stats.cooking} tone="accent" icon="🔥" />
        <AdminKpiCard label={kitchenLabel("READY")} value={stats.ready} tone="success" icon="✅" />
        <AdminKpiCard label={t("kitchenDishesInQueue")} value={stats.dishes} tone="default" icon="🍽️" />
      </div>

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("queue")} badge={tf("shownCount", { n: filteredQueue.length })}>
        <div className="admin-kitchen-toolbar">
          <div className="admin-kitchen-toolbar__search">
            <input
              type="search"
              className="admin-crud-form__input"
              placeholder={t("searchKitchen")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("searchKitchenAria")}
            />
          </div>

          <div className="admin-kitchen-toolbar__filters">
            <div className="admin-kitchen-filter-row">
              <span className="admin-kitchen-filter-row__label">{t("filterSlotAria")}</span>
              <div className="admin-kitchen-filter-chips" role="group" aria-label={t("filterSlotAria")}>
                <button
                  type="button"
                  className={`admin-kitchen-filter-chip${slot === "" ? " is-active" : ""}`}
                  onClick={() => setSlot("")}
                >
                  {t("allSlots")}
                </button>
                {SLOT_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`admin-kitchen-filter-chip${slot === s ? " is-active" : ""}`}
                    onClick={() => setSlot(s)}
                  >
                    {slotLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-kitchen-filter-row">
              <span className="admin-kitchen-filter-row__label">{t("filterStatusAria")}</span>
              <div className="admin-kitchen-filter-chips" role="group" aria-label={t("filterStatusAria")}>
                <button
                  type="button"
                  className={`admin-kitchen-filter-chip${statusFilter === "" ? " is-active" : ""}`}
                  onClick={() => setStatusFilter("")}
                >
                  {t("all")} ({stats.total})
                </button>
                {KITCHEN_COLUMNS.map((status) => {
                  const count =
                    status === "WAITING"
                      ? stats.waiting
                      : status === "COOKING"
                        ? stats.cooking
                        : stats.ready;
                  return (
                    <button
                      key={status}
                      type="button"
                      className={`admin-kitchen-filter-chip admin-kitchen-filter-chip--${COLUMN_TONE[status]}${statusFilter === status ? " is-active" : ""}`}
                      onClick={() => setStatusFilter(status)}
                    >
                      {kitchenLabel(status)} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {activeQueue.length === 0 ? (
          <div className="admin-kitchen-empty admin-kitchen-empty--board">
            <span className="admin-kitchen-empty__icon" aria-hidden>
              👨‍🍳
            </span>
            <p>{t("noQueue")}</p>
            <small>{t("kitchenEmptyHint")}</small>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="admin-kitchen-empty admin-kitchen-empty--board">
            <span className="admin-kitchen-empty__icon" aria-hidden>
              🔍
            </span>
            <p>{t("noQueueMatch")}</p>
          </div>
        ) : (
          <div
            className={`admin-kitchen-board${statusFilter ? " admin-kitchen-board--single" : ""}`}
          >
            {visibleColumns.map((col) => (
              <section
                key={col.status}
                className={`admin-kitchen-column admin-kitchen-column--${COLUMN_TONE[col.status]}`}
              >
                <header className="admin-kitchen-column__head">
                  <span className="admin-kitchen-column__title">{kitchenLabel(col.status)}</span>
                  <span className="admin-kitchen-column__count">{col.items.length}</span>
                </header>
                {col.items.length === 0 ? (
                  <div className="admin-kitchen-column__empty">
                    <span aria-hidden>—</span>
                    <small>{t("calm")}</small>
                  </div>
                ) : (
                  <ul className="admin-kitchen-column__list">
                    {col.items.map((item) => (
                      <AdminKitchenQueueCard
                        key={item.id}
                        item={item}
                        busy={busyId === item.id}
                        slotLabel={slotLabel}
                        kitchenLabel={kitchenLabel}
                        advanceLabel={(key) =>
                          key === "WAITING"
                            ? t("kitchenStartCooking")
                            : key === "COOKING"
                              ? t("kitchenMarkReady")
                              : t("kitchenMarkServed")
                        }
                        itemsLabel={(n) => tf("kitchenTotalItems", { n })}
                        onAdvance={advance}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
