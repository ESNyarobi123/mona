"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch } from "../../../../lib/admin-api";
import { AdminPageHeader } from "../../../../components/admin/AdminPageHeader";
import { AdminPanel } from "../../../../components/admin/dashboard/AdminPanel";
import { AdminKpiCard } from "../../../../components/admin/dashboard/AdminKpiCard";
import { AdminLoading } from "../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../components/admin/AdminLocaleProvider";

type MealSlot = "BREAKFAST" | "LUNCH" | "DINNER";

type LandingSettings = {
  showOrderCounts: boolean;
  orderBoostBySlot: Record<MealSlot, number>;
};

type TickerSlot = {
  slot: MealSlot;
  label: string;
  emoji: string;
  orderCount: number;
  realOrderCount?: number;
  status: "OPEN" | "CLOSED";
  orderWindow?: string;
};

type Payload = {
  settings: LandingSettings;
  ticker: {
    timeDisplay: string;
    showOrderCounts: boolean;
    slots: TickerSlot[];
  };
};

const SLOT_ORDER: MealSlot[] = ["BREAKFAST", "LUNCH", "DINNER"];

const SLOT_LABEL: Record<MealSlot, "slotBreakfast" | "slotLunch" | "slotDinner"> = {
  BREAKFAST: "slotBreakfast",
  LUNCH: "slotLunch",
  DINNER: "slotDinner",
};

const EMPTY_DRAFTS: Record<MealSlot, string> = {
  BREAKFAST: "0",
  LUNCH: "0",
  DINNER: "0",
};

function draftsFromSettings(settings: LandingSettings): Record<MealSlot, string> {
  return {
    BREAKFAST: String(settings.orderBoostBySlot.BREAKFAST ?? 0),
    LUNCH: String(settings.orderBoostBySlot.LUNCH ?? 0),
    DINNER: String(settings.orderBoostBySlot.DINNER ?? 0),
  };
}

function parseBoostValue(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(9999, n);
}

export default function AdminLandingPage() {
  const { t, tf, locale } = useAdminLocale();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [form, setForm] = useState<LandingSettings | null>(null);
  const [boostDrafts, setBoostDrafts] = useState<Record<MealSlot, string>>(EMPTY_DRAFTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<Payload>(`/api/admin/landing?locale=${locale}`);
      setPayload(data);
      setForm(data.settings);
      setBoostDrafts(draftsFromSettings(data.settings));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      apiGet<Payload>(`/api/admin/landing?locale=${locale}`)
        .then((data) => setPayload(data))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, [load, locale]);

  const previewRows = useMemo(() => {
    if (!payload || !form) return [];
    return SLOT_ORDER.map((slot) => {
      const live = payload.ticker.slots.find((s) => s.slot === slot);
      const real = live?.realOrderCount ?? 0;
      const boost = parseBoostValue(boostDrafts[slot]);
      const shown = form.showOrderCounts ? real + boost : 0;
      return { slot, real, boost, shown, live };
    });
  }, [payload, form, boostDrafts]);

  const stats = useMemo(() => {
    const totalShown = previewRows.reduce((sum, r) => sum + r.shown, 0);
    const totalReal = previewRows.reduce((sum, r) => sum + r.real, 0);
    const open = previewRows.filter((r) => r.live?.status === "OPEN").length;
    return { totalShown, totalReal, open };
  }, [previewRows]);

  function handleBoostChange(slot: MealSlot, raw: string) {
    if (raw !== "" && !/^\d+$/.test(raw)) return;
    if (raw.length > 4) return;
    setBoostDrafts((d) => ({ ...d, [slot]: raw }));
  }

  function commitBoost(slot: MealSlot) {
    const n = parseBoostValue(boostDrafts[slot]);
    setBoostDrafts((d) => ({ ...d, [slot]: String(n) }));
    setForm((f) =>
      f ? { ...f, orderBoostBySlot: { ...f.orderBoostBySlot, [slot]: n } } : f
    );
  }

  function buildSavePayload(): LandingSettings | null {
    if (!form) return null;
    return {
      showOrderCounts: form.showOrderCounts,
      orderBoostBySlot: {
        BREAKFAST: parseBoostValue(boostDrafts.BREAKFAST),
        LUNCH: parseBoostValue(boostDrafts.LUNCH),
        DINNER: parseBoostValue(boostDrafts.DINNER),
      },
    };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const toSave = buildSavePayload();
    if (!toSave) return;

    setBoostDrafts(draftsFromSettings(toSave));
    setForm(toSave);
    setSaving(true);
    setError("");
    try {
      await apiPatch("/api/admin/landing", toSave);
      await load();
      alert(t("landingSettingsSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !payload) {
    return <AdminLoading label={t("landingPage")} />;
  }

  return (
    <div className="admin-dash admin-landing-page">
      <AdminPageHeader
        title={t("landingPageTitle")}
        actions={
          <div className="admin-overview-quick">
            <Link href="/" className="admin-btn secondary sm" target="_blank" rel="noopener noreferrer">
              {t("landingViewSite")}
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={() => void load()}>
              {t("refresh")}
            </button>
          </div>
        }
      />

      <p className="admin-page-lead">{t("landingPageLead")}</p>

      {error ? <p className="admin-error">{error}</p> : null}

      {payload ? (
        <div className="admin-kitchen-banner is-active admin-landing-page__clock" role="status">
          🕐 {payload.ticker.timeDisplay} EAT · {t("landingPreview")}
        </div>
      ) : null}

      <div className="admin-kpi-grid">
        <AdminKpiCard
          label={t("landingTotalShown")}
          value={stats.totalShown}
          trend={tf("slotOrdersToday", { n: stats.totalReal }) + ` ${t("landingRealOrders").toLowerCase()}`}
          tone="accent"
          icon="📊"
        />
        <AdminKpiCard
          label={form?.showOrderCounts ? t("landingCountsVisible") : t("landingCountsHidden")}
          value={form?.showOrderCounts ? t("enable") : t("disable")}
          tone={form?.showOrderCounts ? "success" : "default"}
          icon={form?.showOrderCounts ? "👁️" : "🙈"}
        />
        <AdminKpiCard label={t("slotOpen")} value={stats.open} tone="success" icon="✅" />
      </div>

      <form onSubmit={save} className="admin-landing-page__form">
        <div className="admin-dash-row admin-dash-row--equal">
          <AdminPanel title={t("landingTickerSection")}>
            <div className="admin-landing-page__toggle">
              <div>
                <strong>{t("landingShowOrderCounts")}</strong>
                <p>{t("landingShowOrderCountsHint")}</p>
              </div>
              <div className="admin-landing-page__toggle-btns">
                <button
                  type="button"
                  className={`admin-btn sm${form?.showOrderCounts ? "" : " secondary"}`}
                  onClick={() => setForm((f) => (f ? { ...f, showOrderCounts: true } : f))}
                >
                  {t("enable")}
                </button>
                <button
                  type="button"
                  className={`admin-btn sm${form?.showOrderCounts === false ? "" : " secondary"}`}
                  onClick={() => setForm((f) => (f ? { ...f, showOrderCounts: false } : f))}
                >
                  {t("disable")}
                </button>
              </div>
            </div>

            <p className="admin-landing-page__formula-hint">{t("landingOrderBoostHint")}</p>

            <div className="admin-landing-page__slots">
              {SLOT_ORDER.map((slot) => {
                const meta = SLOT_LABEL[slot];
                const row = previewRows.find((r) => r.slot === slot);
                const isOpen = row?.live?.status === "OPEN";
                return (
                  <article
                    key={slot}
                    className={`admin-landing-slot${isOpen ? " admin-landing-slot--open" : ""}`}
                  >
                    <header className="admin-landing-slot__head">
                      <span className="admin-landing-slot__emoji" aria-hidden>
                        {row?.live?.emoji ?? (slot === "BREAKFAST" ? "🌅" : slot === "LUNCH" ? "☀️" : "🌙")}
                      </span>
                      <div>
                        <strong>{t(meta)}</strong>
                        <span
                          className={`admin-landing-slot__status admin-landing-slot__status--${isOpen ? "open" : "closed"}`}
                        >
                          {isOpen ? t("slotOpen") : t("slotClosed")}
                        </span>
                      </div>
                    </header>

                    <div className="admin-landing-slot__formula" aria-label={t("landingFormula")}>
                      <span className="admin-landing-slot__num">{row?.real ?? 0}</span>
                      <span className="admin-landing-slot__op">+</span>
                      <label className="admin-landing-slot__boost-field">
                        <span className="sr-only">{t("landingOrderBoost")}</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="admin-landing-slot__boost-input"
                          value={boostDrafts[slot]}
                          placeholder={t("landingBoostPlaceholder")}
                          onChange={(e) => handleBoostChange(slot, e.target.value)}
                          onBlur={() => commitBoost(slot)}
                        />
                      </label>
                      <span className="admin-landing-slot__op">=</span>
                      <span className="admin-landing-slot__result">{row?.shown ?? 0}</span>
                    </div>

                    <p className="admin-landing-slot__labels">
                      <span>{t("landingRealOrders")}</span>
                      <span>{t("landingBoostSet")}</span>
                      <span>{t("landingShownOnSite")}</span>
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="admin-crud-form__actions">
              <button type="submit" className="admin-btn" disabled={saving || !form}>
                {saving ? t("saving") : t("saveSettings")}
              </button>
            </div>
          </AdminPanel>

          <AdminPanel title={t("landingTickerPreview")}>
            <div className="admin-landing-ticker-preview">
              {previewRows.map((row) => {
                const live = row.live;
                if (!live) return null;
                return (
                  <div
                    key={row.slot}
                    className={`admin-landing-ticker-preview__pill admin-landing-ticker-preview__pill--${live.status.toLowerCase()}`}
                  >
                    <span>{live.emoji}</span>
                    <span className="admin-landing-ticker-preview__label">{live.label}</span>
                    {form?.showOrderCounts ? (
                      <span className="admin-landing-ticker-preview__orders">
                        {row.shown} {t("ordersToday").toLowerCase()}
                      </span>
                    ) : (
                      <span className="admin-landing-ticker-preview__orders admin-landing-ticker-preview__orders--off">
                        —
                      </span>
                    )}
                  </div>
                );
              })}
              <div className="admin-landing-ticker-preview__clock">
                🕐 {payload?.ticker.timeDisplay ?? "—"} EAT
              </div>
            </div>
            <p className="admin-landing-page__preview-note">{t("landingFormula")}</p>
          </AdminPanel>
        </div>
      </form>
    </div>
  );
}
