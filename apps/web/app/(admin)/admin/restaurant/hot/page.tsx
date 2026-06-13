"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch } from "../../../../../lib/admin-api";
import { formatMoney } from "../../../../../lib/format";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type HotItem = {
  id: string;
  name: string;
  price: number;
  unit: string;
  badge?: string | null;
  orderCount?: number;
  quantitySold?: number;
};

type HotView = {
  config: {
    enabled: boolean;
    mode: "AUTO" | "MANUAL";
    maxItems: number;
    lookbackDays: number;
  };
  manualPicks: Array<{
    id: string;
    menuItemId: string | null;
    badge: string | null;
    active: boolean;
  }>;
  autoPreview: HotItem[];
  resolved: HotItem[];
};

export default function RestaurantHotPage() {
  const { t } = useAdminLocale();
  const [view, setView] = useState<HotView | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [maxItems, setMaxItems] = useState(8);
  const [lookbackDays, setLookbackDays] = useState(30);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    apiGet<HotView>("/api/admin/hot-products?module=RESTAURANT")
      .then((data) => {
        setView(data);
        setEnabled(data.config.enabled);
        setMode(data.config.mode);
        setMaxItems(data.config.maxItems);
        setLookbackDays(data.config.lookbackDays);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiPatch<HotView>("/api/admin/hot-products", {
        module: "RESTAURANT",
        enabled,
        mode,
        maxItems,
        lookbackDays,
      });
      setView(updated);
      alert(t("hotSaved"));
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !view) {
    return <AdminLoading label={t("hotPick")} />;
  }

  const preview = view?.resolved ?? [];
  const autoList = view?.autoPreview ?? [];
  const manualCount = view?.manualPicks.filter((p) => p.active).length ?? 0;

  return (
    <div className="admin-dash admin-dash--restaurant">
      <AdminPageHeader
        title={t("hotPick")}
        actions={
          <div className="admin-overview-quick">
            <Link href="/admin/restaurant/menu" className="admin-btn secondary sm">
              {t("menuItems")}
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
          </div>
        }
      />

      <p className="admin-page-lead">{t("hotProductsDesc")}</p>

      <div className="admin-kpi-grid">
        <AdminKpiCard
          label={t("hotEnabled")}
          value={enabled ? t("statusOn") : t("statusOff")}
          tone={enabled ? "success" : "default"}
          icon="🔥"
        />
        <AdminKpiCard
          label={t("hotMode")}
          value={mode === "AUTO" ? t("hotModeAuto") : t("hotModeManual")}
          tone="restaurant"
        />
        <AdminKpiCard label={t("hotManualPicks")} value={manualCount} tone="accent" />
        <AdminKpiCard label={t("hotAutoPreview")} value={autoList.length} tone="default" />
      </div>

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("hotSettings")}>
        <div className="admin-panel__body-pad">
          <form className="admin-crud-form admin-crud-form--grid" onSubmit={save}>
            <label className="admin-crud-form__field admin-crud-form__field--row">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              {t("hotEnabled")}
            </label>

            <label className="admin-crud-form__field">
              {t("hotMode")}
              <select
                className="admin-crud-form__input"
                value={mode}
                onChange={(e) => setMode(e.target.value as "AUTO" | "MANUAL")}
              >
                <option value="AUTO">{t("hotModeAuto")}</option>
                <option value="MANUAL">{t("hotModeManual")}</option>
              </select>
            </label>

            <label className="admin-crud-form__field">
              {t("hotMaxItems")}
              <input
                type="number"
                min={1}
                max={20}
                className="admin-crud-form__input"
                value={maxItems}
                onChange={(e) => setMaxItems(Number(e.target.value))}
              />
            </label>

            <label className="admin-crud-form__field">
              {t("hotLookbackDays")}
              <input
                type="number"
                min={7}
                max={365}
                className="admin-crud-form__input"
                value={lookbackDays}
                onChange={(e) => setLookbackDays(Number(e.target.value))}
                disabled={mode !== "AUTO"}
              />
            </label>

            <div className="admin-crud-form__actions admin-crud-form__actions--full">
              <button type="submit" className="admin-btn" disabled={saving}>
                {saving ? t("saving") : t("saveChanges")}
              </button>
            </div>
          </form>

          <p className="admin-crud-form__hint">{t("hotSetOnMenuPage")}</p>
        </div>
      </AdminPanel>

      <AdminPanel title={enabled ? t("hotAutoPreview") : t("hotPick")} badge={`${preview.length}`}>
        {preview.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🔥</span>
            <p>{t("hotSetOnMenuPage")}</p>
            <Link href="/admin/restaurant/menu" className="admin-btn secondary sm">
              {t("menuItems")} →
            </Link>
          </div>
        ) : (
          <ul className="admin-hot-preview-grid">
            {preview.map((item) => (
              <li key={item.id} className="admin-hot-preview-card">
                <span className="admin-hot-preview-card__badge">
                  {item.badge ?? "🔥 Hot"}
                </span>
                <strong>{item.name}</strong>
                <small>
                  {formatMoney(item.price)} · {item.unit}
                  {item.orderCount != null ? ` · ${item.orderCount} orders` : ""}
                </small>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}
