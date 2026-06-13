"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../../../lib/admin-api";
import { AdminPageHeader } from "../../../../components/admin/AdminPageHeader";
import { AdminPanel } from "../../../../components/admin/dashboard/AdminPanel";
import { AdminKpiCard } from "../../../../components/admin/dashboard/AdminKpiCard";
import { AdminLoading } from "../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../components/admin/AdminLocaleProvider";
import type { AdminMessageKey } from "../../../../lib/admin-i18n";

type SettingsPayload = {
  settings: {
    adminWhatsappNumber: string;
    lipaNamba: string;
    lipaNambaName: string;
    botUrl: string;
  };
  bot: {
    online: boolean;
    status: {
      state: string;
      connected: boolean;
      needsQr: boolean;
      phone: string | null;
    } | null;
  };
};

type Template = { id: string; label: string };

const STATE_KEYS: Record<string, AdminMessageKey> = {
  starting: "botStateStarting",
  qr: "botStateQr",
  connected: "botStateConnected",
  disconnected: "botStateDisconnected",
  logged_out: "botStateLoggedOut",
};

export default function AdminWhatsAppPage() {
  const { t } = useAdminLocale();
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [form, setForm] = useState({ adminWhatsappNumber: "", lipaNamba: "", lipaNambaName: "" });
  const [formDirty, setFormDirty] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const applyPayload = useCallback(async (data: SettingsPayload, syncForm: boolean) => {
    setPayload(data);
    if (syncForm) {
      setForm({
        adminWhatsappNumber: data.settings.adminWhatsappNumber,
        lipaNamba: data.settings.lipaNamba,
        lipaNambaName: data.settings.lipaNambaName,
      });
      setFormDirty(false);
    }

    if (data.bot.status?.needsQr || data.bot.status?.state === "qr") {
      const qr = await apiGet<{ dataUrl: string | null }>("/api/admin/whatsapp/qr");
      setQrUrl(qr?.dataUrl ?? null);
    } else {
      setQrUrl(null);
    }
  }, []);

  const load = useCallback(
    async (syncForm = true) => {
      try {
        const data = await apiGet<SettingsPayload>("/api/admin/settings");
        await applyPayload(data, syncForm && !formDirty);
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : t("error"));
      } finally {
        setLoading(false);
      }
    },
    [applyPayload, formDirty, t]
  );

  const refreshBotStatus = useCallback(async () => {
    try {
      const data = await apiGet<SettingsPayload>("/api/admin/settings");
      await applyPayload(data, false);
    } catch {
      /* keep polling quiet — manual refresh shows errors */
    }
  }, [applyPayload]);

  useEffect(() => {
    void load(true);
    apiGet<Template[]>("/api/admin/notifications/test").then(setTemplates).catch(() => {});
    const timer = setInterval(() => {
      void refreshBotStatus();
    }, 8000);
    return () => clearInterval(timer);
  }, [load, refreshBotStatus]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPatch("/api/admin/settings", form);
      setFormDirty(false);
      await load(true);
      alert(t("settingsSaved"));
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function sendTest(templateId: string) {
    setTesting(templateId);
    try {
      await apiPost("/api/admin/notifications/test", { templateId });
      alert(t("testSent"));
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setTesting(null);
    }
  }

  const bot = payload?.bot;
  const status = bot?.status;
  const connected = !!status?.connected;
  const online = !!bot?.online;

  const stateLabel = useMemo(() => {
    if (!online) return t("botOffline");
    const key = STATE_KEYS[status?.state ?? ""];
    return key ? t(key) : status?.state ?? t("offline");
  }, [online, status?.state, t]);

  const statusTone = connected ? "success" : online ? "warning" : "danger";
  const statusIcon = connected ? "✅" : online ? "📱" : "⚠️";

  if (loading && !payload) {
    return <AdminLoading label={t("loading")} />;
  }

  return (
    <div className="admin-dash">
      <AdminPageHeader
        title={t("whatsappPageTitle")}
        actions={
          <button
            type="button"
            className="admin-btn secondary sm"
            onClick={() => {
              setFormDirty(false);
              void load(true);
            }}
          >
            {t("refresh")}
          </button>
        }
      />

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-kpi-grid">
        <AdminKpiCard
          label={t("botStatus")}
          value={connected ? t("online") : t("offline")}
          trend={stateLabel}
          tone={statusTone}
          trendUp={connected}
        />
        <AdminKpiCard
          label={t("linkedNumber")}
          value={status?.phone ?? t("notLinked")}
          tone={status?.phone ? "accent" : "default"}
        />
        <AdminKpiCard
          label={t("bridgeUrl")}
          value={online ? t("online") : t("offline")}
          trend={payload?.settings.botUrl ?? "—"}
          tone={online ? "success" : "warning"}
          trendUp={online}
        />
      </div>

      <div className="admin-dash-row admin-dash-row--equal">
        <AdminPanel title={t("botStatus")}>
          <div className="admin-wa-status">
            {!online ? (
              <div className="admin-wa-status__hero">
                <span className="admin-wa-status__dot admin-wa-status__dot--offline" aria-hidden>
                  ⚠️
                </span>
                <div className="admin-wa-status__text">
                  <strong>{t("botOffline")}</strong>
                  <small>
                    {t("botOfflineHint")}: <code>npm run dev:bot</code>
                  </small>
                </div>
              </div>
            ) : (
              <>
                <div className="admin-wa-status__hero">
                  <span
                    className={`admin-wa-status__dot admin-wa-status__dot--${connected ? "online" : "pending"}`}
                    aria-hidden
                  >
                    {statusIcon}
                  </span>
                  <div className="admin-wa-status__text">
                    <strong>{stateLabel}</strong>
                    <small>
                      {connected
                        ? t("botConnectedNoQr")
                        : qrUrl
                          ? t("botStateQr")
                          : t("waitingQr")}
                    </small>
                  </div>
                </div>

                <div className="admin-wa-meta">
                  <div className="admin-wa-meta__row">
                    <span>{t("linkedNumber")}</span>
                    <strong>{status?.phone ?? t("notLinked")}</strong>
                  </div>
                  <div className="admin-wa-meta__row">
                    <span>{t("bridgeUrl")}</span>
                    <code>{payload?.settings.botUrl ?? "—"}</code>
                  </div>
                </div>
              </>
            )}
          </div>
        </AdminPanel>

        <AdminPanel title={t("qrCode")}>
          <div className="admin-wa-qr">
            {qrUrl ? (
              <>
                <div className="admin-wa-qr__frame">
                  <img src={qrUrl} alt={t("qrCode")} />
                </div>
                <p className="admin-wa-qr__hint">{t("qrScanHint")}</p>
              </>
            ) : connected ? (
              <div className="admin-wa-qr__empty">
                <span className="admin-wa-qr__empty-icon" aria-hidden>
                  ✅
                </span>
                <p>{t("botConnectedNoQr")}</p>
              </div>
            ) : (
              <div className="admin-wa-qr__empty">
                <span className="admin-wa-qr__empty-icon" aria-hidden>
                  📱
                </span>
                <p>{online ? t("waitingQr") : t("startBotFirst")}</p>
              </div>
            )}
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title={t("settingsAdminLipa")}>
        <form className="admin-crud-form admin-crud-form--grid admin-wa-settings" onSubmit={saveSettings}>
          <div className="admin-crud-form__field admin-crud-form__field--full">
            <label className="admin-crud-form__label" htmlFor="wa-admin-number">
              {t("adminNumberLabel")}
            </label>
            <input
              id="wa-admin-number"
              className="admin-crud-form__input"
              value={form.adminWhatsappNumber}
              onChange={(e) => {
                setFormDirty(true);
                setForm({ ...form, adminWhatsappNumber: e.target.value });
              }}
              placeholder="2557XXXXXXXX"
            />
          </div>

          <div className="admin-crud-form__field">
            <label className="admin-crud-form__label" htmlFor="wa-lipa">
              {t("lipaNambaLabel")}
            </label>
            <input
              id="wa-lipa"
              className="admin-crud-form__input"
              value={form.lipaNamba}
              onChange={(e) => {
                setFormDirty(true);
                setForm({ ...form, lipaNamba: e.target.value });
              }}
              placeholder="123456"
            />
          </div>

          <div className="admin-crud-form__field">
            <label className="admin-crud-form__label" htmlFor="wa-lipa-name">
              {t("lipaNambaNameLabel")}
            </label>
            <input
              id="wa-lipa-name"
              className="admin-crud-form__input"
              value={form.lipaNambaName}
              onChange={(e) => {
                setFormDirty(true);
                setForm({ ...form, lipaNambaName: e.target.value });
              }}
              placeholder="MONANA"
            />
          </div>

          <div className="admin-crud-form__actions admin-crud-form__field--full">
            <button type="submit" className="admin-btn" disabled={saving}>
              {saving ? t("saving") : t("saveSettings")}
            </button>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title={t("testNotifications")} badge={`${templates.length}`}>
        <p className="admin-wa-panel-note">{t("testNotificationsHint")}</p>
        {templates.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>💬</span>
            <p>{t("testNotifications")}</p>
          </div>
        ) : (
          <div className="admin-wa-templates">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="admin-wa-template"
                disabled={!!testing || !connected}
                onClick={() => sendTest(tpl.id)}
              >
                <span className="admin-wa-template__icon" aria-hidden>
                  💬
                </span>
                <span>{testing === tpl.id ? t("sending") : tpl.label}</span>
              </button>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
