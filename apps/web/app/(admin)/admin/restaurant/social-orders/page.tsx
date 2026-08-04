"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch, apiPost } from "../../../../../lib/admin-api";
import { formatMoney } from "../../../../../lib/format";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { StatusBadge } from "../../../../../components/admin/StatusBadge";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type SocialOrder = {
  id: string;
  dishName: string;
  specialRequirements: string | null;
  requestedFor: string;
  mealSlot: string | null;
  status: string;
  quotedPrice: string | number | null;
  adminNote: string | null;
  address: string | null;
  orderId: string | null;
  user: { name: string | null; phone: string };
};

type ListResponse = {
  items: SocialOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const NEXT_STATUS: Record<string, string[]> = {
  PENDING: ["REJECTED", "CANCELLED"],
  QUOTED: ["REJECTED", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
};

export default function AdminSocialOrdersPage() {
  const { t, locale } = useAdminLocale();
  const [rows, setRows] = useState<SocialOrder[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [quoteDraft, setQuoteDraft] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    const q = status ? `?status=${status}` : "";
    apiGet<ListResponse>(`/api/restaurant/social-orders${q}`)
      .then((data) => setRows(data.items))
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [status]);

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
      const result = await apiPost<SocialOrder & { payPath?: string; priceLabel?: string }>(
        `/api/restaurant/social-orders/${id}/send-quote`,
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
    setError("");
    try {
      await apiPatch(`/api/restaurant/social-orders/${id}`, { status: next });
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
        title={t("socialOrders")}
        actions={
          <select
            className="admin-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label={t("status")}
          >
            <option value="">{t("allStatuses")}</option>
            {["PENDING", "QUOTED", "PREPARING", "READY", "COMPLETED", "REJECTED", "CANCELLED"].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              )
            )}
          </select>
        }
      />

      <p className="admin-lead">{t("socialOrdersDesc")}</p>

      {error ? <p className="admin-error">{error}</p> : null}
      {success ? <p className="admin-success">{success}</p> : null}
      {loading ? <AdminLoading label={t("loading")} /> : null}

      {!loading ? (
        <AdminPanel title={t("socialOrders")} badge={`${rows.length}`}>
          {rows.length === 0 ? (
            <p className="admin-empty">{t("socialOrdersEmpty")}</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("customer")}</th>
                    <th>{t("customOrderDish")}</th>
                    <th>{t("customOrderReceive")}</th>
                    <th>{t("status")}</th>
                    <th>{t("customOrderQuote")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const canQuote = row.status === "PENDING" || row.status === "QUOTED";
                    return (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.user.name ?? "—"}</strong>
                          <br />
                          <small>{row.user.phone}</small>
                        </td>
                        <td>
                          <strong>{row.dishName}</strong>
                          {row.specialRequirements ? (
                            <>
                              <br />
                              <small>{row.specialRequirements}</small>
                            </>
                          ) : null}
                          {row.address ? (
                            <>
                              <br />
                              <small>{row.address}</small>
                            </>
                          ) : null}
                        </td>
                        <td>
                          {formatWhen(row.requestedFor)}
                          {row.mealSlot ? (
                            <>
                              <br />
                              <small>{row.mealSlot}</small>
                            </>
                          ) : null}
                        </td>
                        <td>
                          <StatusBadge status={row.status} />
                          {row.orderId ? (
                            <>
                              <br />
                              <Link href={`/admin/orders?q=${row.orderId}`} className="admin-link">
                                {t("orders")} →
                              </Link>
                            </>
                          ) : null}
                        </td>
                        <td>
                          {canQuote ? (
                            <input
                              className="admin-input"
                              style={{ width: "8rem" }}
                              type="number"
                              min={1}
                              step={500}
                              placeholder="18500"
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
                            {canQuote ? (
                              <button
                                type="button"
                                className="admin-btn sm"
                                disabled={busyId === row.id}
                                onClick={() => sendPrice(row.id)}
                              >
                                {t("socialOrderSendPrice")}
                              </button>
                            ) : null}
                            {row.orderId && row.status === "QUOTED" ? (
                              <Link href={`/pay/${row.orderId}`} className="admin-btn sm secondary" target="_blank">
                                {t("socialOrderPayLink")}
                              </Link>
                            ) : null}
                            {(NEXT_STATUS[row.status] ?? []).map((next) => (
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
