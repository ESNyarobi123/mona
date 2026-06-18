"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../../../../lib/admin-api";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { AdminUserCell } from "../../../../../components/admin/dashboard/AdminUserCell";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";
import { SLOT_I18N } from "../../../../../lib/customer-i18n";

type Row = {
  id: string;
  status: string;
  mealSlots: string[];
  address: string | null;
  createdAt: string;
  user: { name: string | null; phone: string };
};

export default function AdminRestaurantMembershipPage() {
  const { t, tf, locale } = useAdminLocale();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<Row[]>("/api/restaurant/store/membership?all=1")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-dash">
      <AdminPageHeader title={t("membership")} />
      <p className="admin-page-lead">{t("restaurantMembershipAdminLead")}</p>
      {error ? <p className="admin-error">{error}</p> : null}

      <AdminPanel title={t("membership")} badge={tf("shownCount", { n: rows.length })}>
        {loading ? (
          <AdminLoading label={t("loading")} />
        ) : rows.length === 0 ? (
          <p className="admin-panel__body-pad">{t("noPaymentsMatch")}</p>
        ) : (
          <div className="admin-table-wrap admin-panel__body-pad">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("customer")}</th>
                  <th>{t("slots")}</th>
                  <th>{t("status")}</th>
                  <th>{t("deliveryAddress")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <AdminUserCell name={row.user.name} phone={row.user.phone} />
                    </td>
                    <td>
                      {row.mealSlots.map((s) => SLOT_I18N[s]?.[locale] ?? s).join(", ")}
                    </td>
                    <td>{row.status}</td>
                    <td>{row.address ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
