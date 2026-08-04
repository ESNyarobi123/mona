"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch, apiPost } from "../../../../lib/admin-api";
import { formatMoney } from "../../../../lib/format";
import { AdminPageHeader } from "../../../../components/admin/AdminPageHeader";
import { AdminLoading } from "../../../../components/admin/dashboard/AdminLoading";
import { AdminPanel } from "../../../../components/admin/dashboard/AdminPanel";
import { StatusBadge } from "../../../../components/admin/StatusBadge";
import { useAdminLocale } from "../../../../components/admin/AdminLocaleProvider";

type CateringRequest = {
  id: string;
  kind: "PACKAGE" | "CUSTOM_QUOTE";
  eventType: string;
  eventAt: string;
  location: string;
  guestCount: number;
  specialRequirements: string | null;
  status: string;
  quotedPrice: string | number | null;
  pricePerHead: string | number | null;
  orderId: string | null;
  package?: { nameEn: string; nameSw: string } | null;
  user: { name: string | null; phone: string };
};

type ListResponse = { items: CateringRequest[] };

export default function AdminCateringPage() {
  const { t, locale } = useAdminLocale();
  const [rows, setRows] = useState<CateringRequest[]>([]);
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [quoteDraft, setQuoteDraft] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (kind) params.set("kind", kind);
    const q = params.toString() ? `?${params}` : "";
    apiGet<ListResponse>(`/api/catering/requests${q}`)
      .then((data) => setRows(data.items))
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [status, kind]);

  async function sendPrice(id: string) {
    const raw = quoteDraft[id];
    const quotedPrice = Number(raw);
    if (!raw || !Number.isFinite(quotedPrice) || quotedPrice <= 0) {
      setError(t("socialOrderPriceRequired"));
      return;
    }
    setBusyId(id);
    setError("");
    setSuccess("");
    try {
      const result = await apiPost<CateringRequest & { priceLabel?: string }>(
        `/api/catering/requests/${id}/send-quote`,
        { quotedPrice }
      );
      setSuccess(
        t("socialOrderPriceSent")
          .replace("{price}", result.priceLabel ?? formatMoney(quotedPrice))
          .replace("{phone}", result.user.phone)
      );
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusyId(null);
    }
  }

  async function updateStatus(id: string, next: string) {
    setBusyId(id);
    try {
      await apiPatch(`/api/catering/requests/${id}`, { status: next });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusyId(null);
    }
  }

  function formatWhen(iso: string) {
    return new Date(iso).toLocaleString(locale === "sw" ? "sw-TZ" : "en-GB", {
      timeZone: "Africa/Dar_es_Salaam",
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="admin-dash">
      <AdminPageHeader
        title={t("navCatering")}
        actions={
          <>
            <Link href="/admin/catering/packages" className="admin-btn secondary sm">
              {t("packages")}
            </Link>
            <select className="admin-input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">{t("cateringKindAll")}</option>
              <option value="PACKAGE">{t("cateringKindPackage")}</option>
              <option value="CUSTOM_QUOTE">{t("cateringKindQuote")}</option>
            </select>
            <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t("allStatuses")}</option>
              {["PENDING", "QUOTED", "CONFIRMED", "PREPARING", "COMPLETED", "REJECTED", "CANCELLED"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                )
              )}
            </select>
          </>
        }
      />
      <p className="admin-lead">{t("cateringAdminDesc")}</p>
      {error ? <p className="admin-error">{error}</p> : null}
      {success ? <p className="admin-success">{success}</p> : null}
      {loading ? <AdminLoading label={t("loading")} /> : null}

      {!loading ? (
        <AdminPanel title={t("navCatering")} badge={`${rows.length}`}>
          {rows.length === 0 ? (
            <p className="admin-empty">{t("cateringEmpty")}</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("customer")}</th>
                    <th>{t("module")}</th>
                    <th>{t("customOrderReceive")}</th>
                    <th>{t("status")}</th>
                    <th>{t("customOrderQuote")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const canQuote = row.status === "PENDING" || row.status === "QUOTED";
                    const label = row.package
                      ? locale === "sw"
                        ? row.package.nameSw
                        : row.package.nameEn
                      : `${row.kind} · ${row.eventType}`;
                    return (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.user.name ?? "—"}</strong>
                          <br />
                          <small>{row.user.phone}</small>
                        </td>
                        <td>
                          <strong>{label}</strong>
                          <br />
                          <small>
                            {row.guestCount} guests · {row.location}
                          </small>
                          {row.specialRequirements ? (
                            <>
                              <br />
                              <small>{row.specialRequirements}</small>
                            </>
                          ) : null}
                        </td>
                        <td>{formatWhen(row.eventAt)}</td>
                        <td>
                          <StatusBadge status={row.status} />
                          {row.orderId ? (
                            <>
                              <br />
                              <Link className="admin-link" href={`/pay/${row.orderId}`} target="_blank">
                                Pay link
                              </Link>
                            </>
                          ) : null}
                        </td>
                        <td>
                          {canQuote && row.kind === "CUSTOM_QUOTE" ? (
                            <input
                              className="admin-input"
                              style={{ width: "8rem" }}
                              type="number"
                              min={1}
                              placeholder="850000"
                              value={
                                quoteDraft[row.id] ??
                                (row.quotedPrice != null ? String(Number(row.quotedPrice)) : "")
                              }
                              onChange={(e) =>
                                setQuoteDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                              }
                            />
                          ) : row.quotedPrice != null ? (
                            formatMoney(Number(row.quotedPrice))
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <div className="admin-inline-actions">
                            {canQuote && row.kind === "CUSTOM_QUOTE" ? (
                              <button
                                type="button"
                                className="admin-btn sm"
                                disabled={busyId === row.id}
                                onClick={() => sendPrice(row.id)}
                              >
                                {t("socialOrderSendPrice")}
                              </button>
                            ) : null}
                            {["REJECTED", "CANCELLED", "PREPARING", "COMPLETED"]
                              .filter((s) => s !== row.status)
                              .slice(0, 2)
                              .map((next) => (
                                <button
                                  key={next}
                                  type="button"
                                  className="admin-btn sm secondary"
                                  disabled={busyId === row.id}
                                  onClick={() => updateStatus(row.id, next)}
                                >
                                  {next}
                                </button>
                              ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      ) : null}
    </div>
  );
}
