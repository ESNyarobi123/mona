"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../lib/admin-api";
import { formatMoney } from "../../lib/format";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminPanel } from "./dashboard/AdminPanel";
import { AdminLoading } from "./dashboard/AdminLoading";
import { useAdminLocale } from "./AdminLocaleProvider";

type Module = "GROCERY" | "RESTAURANT";

type PricingConfig = {
  mode: "FLAT_RATE" | "MIN_ORDER_FREE" | "ZONE";
  flatRateFee: number;
  minOrderForFreeDelivery: number;
  unmatchedZoneFee: number;
};

type DeliveryZone = {
  id: string;
  name: string;
  nameSw: string | null;
  keywords: string[];
  deliveryFee: number | string;
  sortOrder: number;
  active: boolean;
};

function zoneSwahiliLabel(zone: DeliveryZone) {
  const sw = zone.nameSw?.trim();
  if (!sw) return null;
  if (sw.toLowerCase() === zone.name.trim().toLowerCase()) return null;
  return sw;
}

const MODES: PricingConfig["mode"][] = ["FLAT_RATE", "MIN_ORDER_FREE", "ZONE"];

type Props = {
  module: Module;
  titleKey: "deliveryPricingGrocery" | "deliveryPricingRestaurant";
  leadKey: "deliveryPricingGroceryLead" | "deliveryPricingRestaurantLead";
};

export function DeliveryPricingAdmin({ module, titleKey, leadKey }: Props) {
  const { t } = useAdminLocale();
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [zoneForm, setZoneForm] = useState({
    name: "",
    nameSw: "",
    keywords: "",
    deliveryFee: "3000",
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiGet<PricingConfig>(`/api/admin/delivery-pricing?module=${module}`),
      module === "GROCERY" ? apiGet<DeliveryZone[]>("/api/admin/grocery/delivery-zones") : Promise.resolve([]),
    ])
      .then(([pricing, zoneRows]) => {
        setConfig(pricing);
        setZones(zoneRows);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("loadFailed")))
      .finally(() => setLoading(false));
  }, [module, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiPatch<PricingConfig>(`/api/admin/delivery-pricing?module=${module}`, config);
      setConfig(updated);
      setSuccess(t("saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function saveZone(zone: DeliveryZone) {
    setSaving(true);
    setError("");
    try {
      await apiPatch(`/api/admin/grocery/delivery-zones/${zone.id}`, {
        deliveryFee: Number(zone.deliveryFee),
        active: zone.active,
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function createZone(e: React.FormEvent) {
    e.preventDefault();
    const keywords = zoneForm.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (!zoneForm.name.trim() || !keywords.length) {
      setError(t("deliveryZoneKeywordsRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiPost("/api/admin/grocery/delivery-zones", {
        name: zoneForm.name.trim(),
        nameSw: zoneForm.nameSw.trim() || undefined,
        keywords,
        deliveryFee: Number(zoneForm.deliveryFee) || 0,
      });
      setZoneForm({ name: "", nameSw: "", keywords: "", deliveryFee: "3000" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function seedZones() {
    setSaving(true);
    try {
      await apiPost("/api/admin/grocery/delivery-zones?seed=1", {});
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) return <AdminLoading label={t("loading")} />;

  return (
    <div className="admin-delivery-pricing">
      <AdminPageHeader title={t(titleKey)} />
      <p className="admin-page-lead">{t(leadKey)}</p>

      {error ? <p className="admin-alert admin-alert--error">{error}</p> : null}
      {success ? <p className="admin-alert admin-alert--success">{success}</p> : null}

      <AdminPanel title={t("deliveryPricingModeTitle")}>
        <div className="admin-delivery-pricing__modes">
          {MODES.map((mode) => (
            <label
              key={mode}
              className={`admin-delivery-pricing__mode ${config.mode === mode ? "is-active" : ""}`}
            >
              <input
                type="radio"
                name="deliveryMode"
                checked={config.mode === mode}
                onChange={() => setConfig({ ...config, mode })}
              />
              <div>
                <strong>{t(`deliveryMode_${mode}`)}</strong>
                <span>{t(`deliveryMode_${mode}_desc`)}</span>
              </div>
            </label>
          ))}
        </div>

        <div className="admin-form-grid admin-delivery-pricing__fields">
          {(config.mode === "FLAT_RATE" || config.mode === "MIN_ORDER_FREE") && (
            <label className="admin-field">
              <span>{t("deliveryFlatRateFee")}</span>
              <input
                type="number"
                min={0}
                value={config.flatRateFee}
                onChange={(e) => setConfig({ ...config, flatRateFee: Number(e.target.value) })}
              />
            </label>
          )}
          {config.mode === "MIN_ORDER_FREE" && (
            <label className="admin-field">
              <span>{t("deliveryMinOrderFree")}</span>
              <input
                type="number"
                min={0}
                value={config.minOrderForFreeDelivery}
                onChange={(e) =>
                  setConfig({ ...config, minOrderForFreeDelivery: Number(e.target.value) })
                }
              />
            </label>
          )}
          {config.mode === "ZONE" && (
            <label className="admin-field">
              <span>{t("deliveryUnmatchedZoneFee")}</span>
              <input
                type="number"
                min={0}
                value={config.unmatchedZoneFee}
                onChange={(e) => setConfig({ ...config, unmatchedZoneFee: Number(e.target.value) })}
              />
            </label>
          )}
        </div>

        <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={saveConfig}>
          {saving ? t("saving") : t("saveChanges")}
        </button>
      </AdminPanel>

      {module === "GROCERY" && config.mode === "ZONE" ? (
        <AdminPanel title={t("deliveryZonesTitle")}>
          <p className="admin-panel__lead">{t("deliveryZonesLead")}</p>
          {zones.length === 0 ? (
            <div className="admin-delivery-pricing__empty">
              <p>{t("deliveryZonesEmpty")}</p>
              <button type="button" className="admin-btn" disabled={saving} onClick={seedZones}>
                {t("deliveryZonesSeed")}
              </button>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("name")}</th>
                    <th>{t("deliveryFee")}</th>
                    <th>{t("status")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => {
                    const swLabel = zoneSwahiliLabel(zone);
                    return (
                    <tr key={zone.id}>
                      <td>
                        <div className="admin-delivery-pricing__zone-name">
                          <strong>{zone.name}</strong>
                          {swLabel ? <div className="admin-table-sub">{swLabel}</div> : null}
                          <div className="admin-delivery-pricing__keywords">{zone.keywords.join(", ")}</div>
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          className="admin-input admin-input--compact"
                          value={Number(zone.deliveryFee)}
                          onChange={(e) =>
                            setZones((rows) =>
                              rows.map((z) =>
                                z.id === zone.id ? { ...z, deliveryFee: Number(e.target.value) } : z
                              )
                            )
                          }
                        />
                      </td>
                      <td>
                        <label className="admin-checkbox">
                          <input
                            type="checkbox"
                            checked={zone.active}
                            onChange={(e) =>
                              setZones((rows) =>
                                rows.map((z) =>
                                  z.id === zone.id ? { ...z, active: e.target.checked } : z
                                )
                              )
                            }
                          />
                          {zone.active ? t("active") : t("inactive")}
                        </label>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          disabled={saving}
                          onClick={() => saveZone(zone)}
                        >
                          {t("save")}
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <form className="admin-delivery-pricing__zone-form" onSubmit={createZone}>
            <h3>{t("deliveryZoneAdd")}</h3>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t("name")}</span>
                <input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} />
              </label>
              <label className="admin-field">
                <span>{t("nameSw")}</span>
                <input
                  value={zoneForm.nameSw}
                  onChange={(e) => setZoneForm({ ...zoneForm, nameSw: e.target.value })}
                />
              </label>
              <label className="admin-field admin-field--wide">
                <span>{t("deliveryZoneKeywords")}</span>
                <input
                  value={zoneForm.keywords}
                  onChange={(e) => setZoneForm({ ...zoneForm, keywords: e.target.value })}
                  placeholder="kinondoni, sinza, mbezi"
                />
              </label>
              <label className="admin-field">
                <span>{t("deliveryFee")}</span>
                <input
                  type="number"
                  min={0}
                  value={zoneForm.deliveryFee}
                  onChange={(e) => setZoneForm({ ...zoneForm, deliveryFee: e.target.value })}
                />
              </label>
            </div>
            <button type="submit" className="admin-btn" disabled={saving}>
              {t("deliveryZoneAdd")}
            </button>
          </form>
        </AdminPanel>
      ) : null}
    </div>
  );
}
