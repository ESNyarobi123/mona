"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../../lib/admin-api";
import { AdminPageHeader } from "../AdminPageHeader";
import { AdminKpiCard } from "../dashboard/AdminKpiCard";
import { AdminLoading } from "../dashboard/AdminLoading";
import { useAdminLocale } from "../AdminLocaleProvider";
import {
  dateIsoOffset,
  formatDeliveryDay,
  openAuthenticatedExport,
  tomorrowIso,
} from "./reports-utils";

type Tab = "procurement" | "packing" | "routes";

type Dashboard = {
  deliveryDate: string;
  source: "saved" | "live" | "empty";
  cutoff: { due: boolean; reason?: string; deliveryDate?: string | null };
  recentRuns: Array<{
    id: string;
    deliveryDate: string;
    status: "OPEN" | "LOCKED" | "COMPLETED";
    orderCount: number;
  }>;
  run: {
    id: string;
    status: "OPEN" | "LOCKED" | "COMPLETED";
    deliveryDate: string;
  } | null;
  bundle: {
    procurement: {
      lines: Array<{ name: string; unit: string; totalQuantity: number; orderCount: number }>;
    };
    packing: {
      sheets: Array<{
        orderId: string;
        orderRef: string;
        customer: { name: string | null; phone: string };
        address: string;
        zoneName: string | null;
        total: number;
        completedAt: string | null;
        lines: Array<{ key: string; name: string; unit: string; quantity: number; checked: boolean }>;
      }>;
    };
    routes: {
      groups: Array<{
        zoneName: string;
        stops: Array<{
          sequence: number;
          orderRef: string;
          customer: { name: string | null; phone: string };
          address: string;
        }>;
      }>;
      unassigned: Array<{
        sequence: number;
        orderRef: string;
        customer: { name: string | null; phone: string };
        address: string;
      }>;
    };
  } | null;
  stats: {
    orderCount: number;
    customerCount: number;
    skuCount: number;
    zoneCount: number;
    unassignedCount: number;
    packingDone: number;
    packingTotal: number;
  };
};

const TAB_META: Record<Tab, { icon: string; key: "shop" | "pack" | "deliver" }> = {
  procurement: { icon: "🛒", key: "shop" },
  packing: { icon: "📦", key: "pack" },
  routes: { icon: "🚚", key: "deliver" },
};

export function AdminReportsView() {
  const { t, tf, locale } = useAdminLocale();
  const [deliveryDate, setDeliveryDate] = useState(tomorrowIso);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState<Tab>("procurement");
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [packSearch, setPackSearch] = useState("");
  const [lockOnSave, setLockOnSave] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const loadDashboard = useCallback(
    async (date: string, silent = false) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const data = await apiGet<Dashboard>(
          `/api/admin/grocery/reports/dashboard?deliveryDate=${date}`
        );
        setDash(data);
        setSelectedSheet(0);
        setPackSearch("");
      } catch (e) {
        setError(e instanceof Error ? e.message : t("error"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDashboard(deliveryDate);
    }, 280);
    return () => clearTimeout(timer);
  }, [deliveryDate, loadDashboard]);

  const bundle = dash?.bundle ?? null;
  const run = dash?.run ?? null;
  const stats = dash?.stats;
  const canSave = dash?.source === "live" || run?.status === "OPEN";
  const packingLocked = run?.status === "COMPLETED";

  const dayLabel = formatDeliveryDay(deliveryDate, locale);

  const statusMessage = useMemo(() => {
    if (!dash) return "";
    if (dash.source === "empty") return tf("reportsStatusEmpty", { date: dayLabel });
    if (dash.source === "live") return tf("reportsStatusLive", { n: stats?.orderCount ?? 0 });
    if (run?.status === "OPEN") return t("reportsStatusSavedOpen");
    if (run?.status === "LOCKED") return t("reportsStatusSavedLocked");
    return t("reportsStatusSavedDone");
  }, [dash, dayLabel, run?.status, stats?.orderCount, t, tf]);

  const packingPct = stats?.packingTotal
    ? Math.round((stats.packingDone / stats.packingTotal) * 100)
    : 0;

  const filteredSheets = useMemo(() => {
    const sheets = bundle?.packing.sheets ?? [];
    const q = packSearch.trim().toLowerCase();
    if (!q) return sheets;
    return sheets.filter(
      (s) =>
        s.orderRef.toLowerCase().includes(q) ||
        s.customer.name?.toLowerCase().includes(q) ||
        s.customer.phone.includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [bundle?.packing.sheets, packSearch]);

  const currentSheet = filteredSheets[selectedSheet] ?? filteredSheets[0];

  async function handleSave() {
    setBusy("save");
    setError("");
    try {
      await apiPost("/api/admin/grocery/reports", {
        deliveryDate,
        lock: lockOnSave,
      });
      await loadDashboard(deliveryDate, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy("");
    }
  }

  async function handleLock() {
    if (!run) return;
    setBusy("lock");
    try {
      await apiPost(`/api/admin/grocery/reports/${run.id}/lock`, {});
      await loadDashboard(deliveryDate, true);
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy("");
    }
  }

  async function handleTickLine(
    orderId: string,
    lines: Array<{ key: string; name: string; unit: string; quantity: number; checked: boolean }>,
    lineKey: string,
    checked: boolean
  ) {
    if (!run) return;
    const next = (lines as Array<{ key: string; checked: boolean }>).map((l) =>
      l.key === lineKey ? { ...l, checked } : l
    );
    setBusy(lineKey);
    try {
      await apiPatch(`/api/admin/grocery/reports/${run.id}/packing/${orderId}`, { lines: next });
      await loadDashboard(deliveryDate, true);
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy("");
    }
  }

  async function handleExport(type: Tab, format: "html" | "csv" = "html") {
    if (!run) return;
    const orderId = type === "packing" ? currentSheet?.orderId : undefined;
    const q = new URLSearchParams({ type, format });
    if (orderId) q.set("orderId", orderId);
    const name = type === "procurement" ? `procurement-${deliveryDate}.csv` : undefined;
    await openAuthenticatedExport(
      `/api/admin/grocery/reports/${run.id}/export?${q}`,
      format === "csv" ? name : undefined
    );
  }

  const quickDays = [
    { offset: 0, label: t("reportsToday") },
    { offset: 1, label: t("reportsTomorrow") },
    { offset: 2, label: tf("reportsInDays", { n: 2 }) },
  ];

  return (
    <div className="admin-dash admin-dash--reports">
      <AdminPageHeader
        title={t("reports")}
        actions={
          <button
            type="button"
            className="admin-btn secondary sm"
            disabled={loading || !!busy}
            onClick={() => loadDashboard(deliveryDate)}
          >
            {t("refresh")}
          </button>
        }
      />
      <p className="admin-page-lead">{t("reportsPageLead")}</p>

      {dash?.cutoff.due ? (
        <div className="admin-reports-alert" role="status">
          <span aria-hidden>⏰</span>
          <span>{tf("reportsCutoffHint", { date: dayLabel })}</span>
        </div>
      ) : null}

      {error ? <p className="admin-error admin-reports-error">{error}</p> : null}

      {/* Day picker */}
      <section className="admin-reports-daybar">
        <div className="admin-reports-daybar__main">
          <label className="admin-crud-form__label" htmlFor="reports-delivery-date">
            {t("marketDeliveryDate")}
          </label>
          <div className="admin-reports-daybar__row">
            <input
              id="reports-delivery-date"
              type="date"
              className="admin-crud-form__input admin-reports-daybar__input"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
            <div className="admin-reports-quick-days">
              {quickDays.map(({ offset, label }) => {
                const iso = dateIsoOffset(offset);
                return (
                  <button
                    key={offset}
                    type="button"
                    className={`admin-reports-quick-day${deliveryDate === iso ? " is-active" : ""}`}
                    onClick={() => setDeliveryDate(iso)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {dash?.recentRuns.length ? (
          <div className="admin-reports-recent">
            <span className="admin-reports-recent__label">{t("reportsRecentDays")}</span>
            <div className="admin-reports-recent__chips">
              {dash.recentRuns.slice(0, 6).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`admin-reports-recent__chip${deliveryDate === r.deliveryDate ? " is-active" : ""}`}
                  onClick={() => setDeliveryDate(r.deliveryDate)}
                >
                  {formatDeliveryDay(r.deliveryDate, locale)}
                  <small>{r.orderCount}</small>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {loading && !dash ? (
        <AdminLoading label={t("loadingReports")} />
      ) : (
        <>
          {/* KPIs */}
          <div className="admin-kpi-grid admin-reports-kpis">
            <AdminKpiCard
              label={t("orders")}
              value={stats?.orderCount ?? 0}
              trend={tf("reportsCustomers", { n: stats?.customerCount ?? 0 })}
              tone={stats?.orderCount ? "accent" : "default"}
            />
            <AdminKpiCard
              label={t("reportsKpiShop")}
              value={stats?.skuCount ?? 0}
              trend={t("reportsKpiShopHint")}
              tone="default"
            />
            <AdminKpiCard
              label={t("reportsKpiZones")}
              value={stats?.zoneCount ?? 0}
              trend={
                stats?.unassignedCount
                  ? tf("reportsUnassignedShort", { n: stats.unassignedCount })
                  : t("reportsAllAssigned")
              }
              tone={stats?.unassignedCount ? "warning" : "success"}
            />
            <AdminKpiCard
              label={t("reportsKpiPacked")}
              value={`${stats?.packingDone ?? 0}/${stats?.packingTotal ?? 0}`}
              trend={tf("reportsPackingProgress", {
                done: stats?.packingDone ?? 0,
                total: stats?.packingTotal ?? 0,
              })}
              tone={packingPct === 100 && stats?.packingTotal ? "success" : "default"}
              trendUp={packingPct > 0}
            />
          </div>

          {/* Status + actions */}
          <section className="admin-reports-hero">
            <div className="admin-reports-hero__body">
              <p className="admin-reports-hero__msg">{statusMessage}</p>
              <details className="admin-reports-how">
                <summary>{t("reportsHowItWorks")}</summary>
                <ol>
                  <li>{t("reportsHowStep1")}</li>
                  <li>{t("reportsHowStep2")}</li>
                  <li>{t("reportsHowStep3")}</li>
                </ol>
              </details>
            </div>
            <div className="admin-reports-hero__actions">
              {canSave && dash?.source !== "empty" ? (
                <>
                  <button
                    type="button"
                    className="admin-btn primary"
                    disabled={!!busy}
                    onClick={handleSave}
                  >
                    {busy === "save"
                      ? t("saving")
                      : dash?.source === "live"
                        ? tf("reportsSaveFor", { date: dayLabel })
                        : t("reportsUpdateBtn")}
                  </button>
                  <label className="admin-reports-lock-opt">
                    <input
                      type="checkbox"
                      checked={lockOnSave}
                      onChange={(e) => setLockOnSave(e.target.checked)}
                    />
                    {t("reportsLockOnSaveHint")}
                  </label>
                </>
              ) : null}
              {run?.status === "OPEN" ? (
                <button
                  type="button"
                  className="admin-btn secondary sm"
                  disabled={!!busy}
                  onClick={handleLock}
                >
                  {busy === "lock" ? t("saving") : t("reportsLockNow")}
                </button>
              ) : null}
              {run ? (
                <span
                  className={`admin-reports-badge admin-reports-badge--${run.status.toLowerCase()}`}
                >
                  {t(`marketStatus_${run.status}` as "marketStatus_OPEN")}
                </span>
              ) : dash?.source === "live" ? (
                <span className="admin-reports-badge admin-reports-badge--live">
                  {t("marketPreviewMode")}
                </span>
              ) : null}
            </div>
          </section>

          {/* Empty state */}
          {dash?.source === "empty" ? (
            <div className="admin-reports-empty">
              <span className="admin-reports-empty__icon" aria-hidden>
                📋
              </span>
              <h2>{t("reportsEmptyTitle")}</h2>
              <p>{tf("reportsStatusEmpty", { date: dayLabel })}</p>
              <p className="admin-reports-empty__hint">{t("reportsEmptyHint")}</p>
            </div>
          ) : (
            <>
              {/* Tab picker — card style */}
              <div className="admin-reports-tabs" role="tablist">
                {(["procurement", "packing", "routes"] as Tab[]).map((key) => {
                  const meta = TAB_META[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={tab === key}
                      className={`admin-reports-tab${tab === key ? " is-active" : ""}`}
                      onClick={() => setTab(key)}
                    >
                      <span className="admin-reports-tab__icon" aria-hidden>
                        {meta.icon}
                      </span>
                      <span className="admin-reports-tab__text">
                        <strong>{t(`reportsTab_${meta.key}` as "reportsTab_shop")}</strong>
                        <small>{t(`reportsTab_${meta.key}Desc` as "reportsTab_shopDesc")}</small>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="admin-reports-panel">
                {run ? (
                  <div className="admin-reports-panel__toolbar">
                    <button
                      type="button"
                      className="admin-btn ghost sm"
                      onClick={() => handleExport(tab, "html")}
                    >
                      🖨 {t("marketPrint")}
                    </button>
                    {tab !== "packing" ? (
                      <button
                        type="button"
                        className="admin-btn ghost sm"
                        onClick={() => handleExport(tab, "csv")}
                      >
                        ⬇ CSV
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="admin-reports-panel__note">{t("marketTickAfterGenerate")}</p>
                )}

                {tab === "procurement" && bundle ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table admin-table--comfortable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t("products")}</th>
                          <th>{t("units")}</th>
                          <th>{t("marketTotalQty")}</th>
                          <th>{t("orders")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bundle.procurement.lines.map((line, i) => (
                          <tr key={`${line.name}-${line.unit}`}>
                            <td className="admin-reports-num">{i + 1}</td>
                            <td>
                              <strong>{line.name}</strong>
                            </td>
                            <td>{line.unit}</td>
                            <td>
                              <strong>{line.totalQuantity}</strong>
                            </td>
                            <td>{line.orderCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {tab === "packing" && bundle ? (
                  <div className="admin-reports-packing">
                    {stats?.packingTotal ? (
                      <div className="admin-reports-pack-progress">
                        <div className="admin-reports-pack-progress__bar">
                          <span style={{ width: `${packingPct}%` }} />
                        </div>
                        <span>
                          {tf("reportsPackingProgress", {
                            done: stats.packingDone,
                            total: stats.packingTotal,
                          })}
                        </span>
                      </div>
                    ) : null}

                    <input
                      type="search"
                      className="admin-crud-form__input admin-reports-pack-search"
                      placeholder={t("reportsPackingSearch")}
                      value={packSearch}
                      onChange={(e) => {
                        setPackSearch(e.target.value);
                        setSelectedSheet(0);
                      }}
                    />

                    {filteredSheets.length === 0 ? (
                      <p className="admin-table-empty">{t("marketNoOrdersForDay")}</p>
                    ) : (
                      <div className="admin-reports-packing-layout">
                        <div className="admin-reports-sheet-list">
                          {filteredSheets.map((s, i) => (
                            <button
                              key={s.orderId}
                              type="button"
                              className={`admin-reports-sheet-item${selectedSheet === i ? " is-active" : ""}${
                                s.completedAt ? " is-done" : ""
                              }`}
                              onClick={() => setSelectedSheet(i)}
                            >
                              <span className="admin-reports-sheet-item__ref">{s.orderRef}</span>
                              <span className="admin-reports-sheet-item__meta">
                                {s.customer.name ?? s.customer.phone}
                                {s.zoneName ? ` · ${s.zoneName}` : ""}
                              </span>
                              {s.completedAt ? <span className="admin-reports-sheet-item__done">✓</span> : null}
                            </button>
                          ))}
                        </div>

                        {currentSheet ? (
                          <div className="admin-reports-sheet-detail">
                            <header className="admin-reports-sheet-detail__head">
                              <div>
                                <strong>{currentSheet.orderRef}</strong>
                                <p>
                                  {currentSheet.customer.name ?? currentSheet.customer.phone} ·{" "}
                                  {currentSheet.address}
                                </p>
                              </div>
                              <span>{currentSheet.total.toLocaleString()} TZS</span>
                            </header>
                            <ul className="admin-market-checklist">
                              {currentSheet.lines.map((line) => (
                                <li key={line.key}>
                                  <label className="admin-market-check">
                                    <input
                                      type="checkbox"
                                      checked={line.checked}
                                      disabled={!run || packingLocked || busy === line.key}
                                      onChange={(e) =>
                                        handleTickLine(
                                          currentSheet.orderId,
                                          currentSheet.lines,
                                          line.key,
                                          e.target.checked
                                        )
                                      }
                                    />
                                    <span>
                                      {line.name} — {line.quantity} {line.unit}
                                    </span>
                                  </label>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}

                {tab === "routes" && bundle ? (
                  <div className="admin-reports-routes">
                    {bundle.routes.groups.map((group) => (
                      <section key={group.zoneName} className="admin-market-route-group">
                        <h3 className="admin-market-route-group__title">
                          🗺 {group.zoneName}
                          <span className="admin-reports-zone-count">{group.stops.length}</span>
                        </h3>
                        <ol className="admin-market-route-stops">
                          {group.stops.map((stop) => (
                            <li key={stop.orderRef}>
                              <span className="admin-market-route-seq">{stop.sequence}</span>
                              <div>
                                <strong>{stop.customer.name ?? stop.customer.phone}</strong>
                                <p>{stop.address}</p>
                              </div>
                              <span className="admin-market-route-ref">{stop.orderRef}</span>
                            </li>
                          ))}
                        </ol>
                      </section>
                    ))}
                    {bundle.routes.unassigned.length > 0 ? (
                      <section className="admin-market-route-group admin-market-route-group--warn">
                        <h3 className="admin-market-route-group__title">
                          ⚠ {t("marketUnassigned")}
                        </h3>
                        <ol className="admin-market-route-stops">
                          {bundle.routes.unassigned.map((stop) => (
                            <li key={stop.orderRef}>
                              <span className="admin-market-route-seq">{stop.sequence}</span>
                              <div>
                                <strong>{stop.customer.name ?? stop.customer.phone}</strong>
                                <p>{stop.address}</p>
                              </div>
                              <span className="admin-market-route-ref">{stop.orderRef}</span>
                            </li>
                          ))}
                        </ol>
                      </section>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
