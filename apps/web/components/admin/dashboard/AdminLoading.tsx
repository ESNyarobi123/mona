"use client";

import { useAdminLocale } from "../AdminLocaleProvider";

export function AdminLoading({ label }: { label?: string }) {
  const { t } = useAdminLocale();
  return <div className="admin-loading">{label ?? t("loading")}</div>;
}
