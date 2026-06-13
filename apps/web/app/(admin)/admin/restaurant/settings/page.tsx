"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch } from "../../../../../lib/admin-api";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type MealSlotWindow = {
  slot: "BREAKFAST" | "LUNCH" | "DINNER";
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  endsAtMidnight?: boolean;
};

type SlotFormRow = {
  slot: MealSlotWindow["slot"];
  label: string;
  emoji: string;
  deliversHint: string;
  start: string;
  end: string;
  endsAtMidnight: boolean;
};

type SettingsPayload = {
  windows: MealSlotWindow[];
  timezone: string;
};

const SLOT_META: Record<
  MealSlotWindow["slot"],
  { labelKey: "slotBreakfast" | "slotLunch" | "slotDinner"; emoji: string; deliversKey: "slotDeliversBreakfast" | "slotDeliversLunch" | "slotDeliversDinner" }
> = {
  BREAKFAST: { labelKey: "slotBreakfast", emoji: "🌅", deliversKey: "slotDeliversBreakfast" },
  LUNCH: { labelKey: "slotLunch", emoji: "☀️", deliversKey: "slotDeliversLunch" },
  DINNER: { labelKey: "slotDinner", emoji: "🌙", deliversKey: "slotDeliversDinner" },
};

const SLOT_ORDER: MealSlotWindow["slot"][] = ["BREAKFAST", "LUNCH", "DINNER"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toTimeInput(hour: number, minute: number) {
  return `${pad2(hour)}:${pad2(minute)}`;
}

function parseTimeInput(value: string) {
  const [h, m] = value.split(":").map(Number);
  return { hour: h ?? 0, minute: m ?? 0 };
}

function windowToForm(w: MealSlotWindow, labels: { label: string; deliversHint: string; emoji: string }): SlotFormRow {
  return {
    slot: w.slot,
    label: labels.label,
    emoji: labels.emoji,
    deliversHint: labels.deliversHint,
    start: toTimeInput(w.startHour, w.startMinute),
    end: toTimeInput(w.endHour, w.endMinute),
    endsAtMidnight: !!w.endsAtMidnight,
  };
}

function formToWindow(row: SlotFormRow): MealSlotWindow {
  const start = parseTimeInput(row.start);
  const end = parseTimeInput(row.end);
  return {
    slot: row.slot,
    startHour: start.hour,
    startMinute: start.minute,
    endHour: end.hour,
    endMinute: end.minute,
    endsAtMidnight: row.endsAtMidnight,
  };
}

function previewWindow(row: SlotFormRow) {
  if (row.endsAtMidnight) return `${row.start} – 00:00`;
  return `${row.start} – ${row.end}`;
}

export default function RestaurantSettingsPage() {
  const { t } = useAdminLocale();
  const [rows, setRows] = useState<SlotFormRow[]>([]);
  const [timezone, setTimezone] = useState("Africa/Dar_es_Salaam");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<SettingsPayload>("/api/admin/restaurant/slots/settings");
      const ordered = SLOT_ORDER.map(
        (slot) => data.windows.find((w) => w.slot === slot) ?? data.windows[0]
      ).filter(Boolean);
      setRows(
        ordered.map((w) => {
          const meta = SLOT_META[w.slot];
          return windowToForm(w, {
            label: t(meta.labelKey),
            deliversHint: t(meta.deliversKey),
            emoji: meta.emoji,
          });
        })
      );
      setTimezone(data.timezone);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const previews = useMemo(() => rows.map(previewWindow), [rows]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await apiPatch("/api/admin/restaurant/slots/settings", {
        windows: rows.map(formToWindow),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  function updateRow(slot: MealSlotWindow["slot"], patch: Partial<SlotFormRow>) {
    setRows((prev) => prev.map((r) => (r.slot === slot ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  if (loading && rows.length === 0) {
    return <AdminLoading label={t("restaurantSettings")} />;
  }

  return (
    <div className="admin-dash admin-dash--restaurant">
      <AdminPageHeader
        title={t("restaurantSettings")}
        actions={
          <div className="admin-overview-quick">
            <Link href="/admin/restaurant/slots" className="admin-btn secondary sm">
              {t("slotsNavDesc")} →
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={() => load()}>
              {t("refresh")}
            </button>
          </div>
        }
      />

      <p className="admin-page-lead">{t("restaurantSettingsLead")}</p>

      <div className="admin-kitchen-banner is-active" role="status">
        🕐 {t("slotTimezoneNote")}: {timezone.replace("_", " ")}
      </div>

      {error ? <p className="admin-error">{error}</p> : null}
      {saved ? <p className="admin-reports-cutoff admin-reports-cutoff--success">{t("settingsSaved")}</p> : null}

      <form onSubmit={handleSave}>
        <AdminPanel title={t("slotSettingsTitle")}>
          <div className="admin-panel__body-pad">
            <p className="admin-slots-settings-intro">{t("slotSettingsIntro")}</p>

            <div className="admin-slots-settings-grid">
              {rows.map((row, i) => (
                <article key={row.slot} className="admin-slots-settings-card">
                  <header className="admin-slots-settings-card__head">
                    <span aria-hidden>{row.emoji}</span>
                    <div>
                      <strong>{row.label}</strong>
                      <small>{row.deliversHint}</small>
                    </div>
                    <span className="admin-slots-settings-card__preview">{previews[i]}</span>
                  </header>

                  <div className="admin-slots-settings-card__fields">
                    <label className="admin-crud-form__field">
                      <span className="admin-crud-form__label">{t("slotStartTime")}</span>
                      <input
                        type="time"
                        className="admin-crud-form__input"
                        value={row.start}
                        required
                        onChange={(e) => updateRow(row.slot, { start: e.target.value })}
                      />
                    </label>

                    {!row.endsAtMidnight ? (
                      <label className="admin-crud-form__field">
                        <span className="admin-crud-form__label">{t("slotEndTime")}</span>
                        <input
                          type="time"
                          className="admin-crud-form__input"
                          value={row.end}
                          required
                          onChange={(e) => updateRow(row.slot, { end: e.target.value })}
                        />
                      </label>
                    ) : (
                      <p className="admin-slots-settings-midnight">{t("slotUntilMidnight")}</p>
                    )}

                    {row.slot === "BREAKFAST" ? (
                      <label className="admin-slots-settings-check">
                        <input
                          type="checkbox"
                          checked={row.endsAtMidnight}
                          onChange={(e) =>
                            updateRow(row.slot, { endsAtMidnight: e.target.checked })
                          }
                        />
                        {t("slotUntilMidnightCheck")}
                      </label>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="admin-crud-form__actions">
              <button type="submit" className="admin-btn primary" disabled={saving}>
                {saving ? t("saving") : t("saveSettings")}
              </button>
            </div>
          </div>
        </AdminPanel>
      </form>
    </div>
  );
}
