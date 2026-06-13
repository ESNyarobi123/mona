"use client";

import { useAdminLocale } from "./AdminLocaleProvider";

type Props = {
  checked: boolean;
  onChange: (hot: boolean) => void;
  badge: string;
  onBadgeChange: (badge: string) => void;
  disabled?: boolean;
};

export function AdminHotToggle({ checked, onChange, badge, onBadgeChange, disabled }: Props) {
  const { t } = useAdminLocale();

  return (
    <div className={`admin-hot-toggle${checked ? " admin-hot-toggle--on" : ""}`}>
      <label className="admin-hot-toggle__head">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="admin-hot-toggle__icon" aria-hidden>
          🔥
        </span>
        <span className="admin-hot-toggle__copy">
          <strong>{t("markAsHot")}</strong>
          <small>{t("markAsHotHint")}</small>
        </span>
      </label>

      {checked ? (
        <label className="admin-hot-toggle__badge">
          {t("hotBadgeLabel")}
          <input
            className="admin-crud-form__input"
            value={badge}
            disabled={disabled}
            onChange={(e) => onBadgeChange(e.target.value)}
            placeholder="🔥 Hot"
            maxLength={32}
          />
        </label>
      ) : null}
    </div>
  );
}
