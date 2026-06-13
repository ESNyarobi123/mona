"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../lib/admin-api";
import { unitLabel, type UnitDefinitionLike } from "@monana/utils";
import { useAdminLocale } from "./AdminLocaleProvider";

type UnitOption = UnitDefinitionLike & { id?: string; icon?: string | null };

export function UnitSelect({
  value,
  onChange,
  label,
  module = "GROCERY",
}: {
  value: string;
  onChange: (u: string) => void;
  label?: string;
  module?: "GROCERY" | "RESTAURANT";
}) {
  const { t, locale } = useAdminLocale();
  const [units, setUnits] = useState<UnitOption[]>([]);
  const resolvedLabel = label ?? t("unitLabel");

  useEffect(() => {
    apiGet<UnitOption[]>(`/api/admin/units?module=${module}&active=1`)
      .then(setUnits)
      .catch(() => setUnits([]));
  }, [module]);

  return (
    <label className="admin-crud-form__field">
      <span className="admin-crud-form__label">{resolvedLabel}</span>
      <select
        className="admin-select admin-unit-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        {units.length === 0 ? (
          <option value={value}>{unitLabel(value, locale)}</option>
        ) : (
          units.map((u) => (
            <option key={u.code} value={u.code}>
              {u.icon ? `${u.icon} ` : ""}
              {unitLabel(u.code, locale, [u])}
              {u.priceSuffix ? ` · / ${u.priceSuffix}` : ""}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
