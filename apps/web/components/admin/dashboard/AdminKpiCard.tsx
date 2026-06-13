import { IconMore } from "../AdminIcons";

type Tone = "default" | "accent" | "restaurant" | "grocery" | "success" | "warning" | "danger";

type Props = {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon?: string;
  tone?: Tone;
  /** @deprecated use trend */
  hint?: string;
};

export function AdminKpiCard({ label, value, trend, trendUp, icon, tone = "default", hint }: Props) {
  const trendText = trend ?? hint;

  return (
    <article className={`admin-kpi admin-kpi--${tone}`}>
      <div className="admin-kpi__head">
        <span className="admin-kpi__label">{label}</span>
        <button type="button" className="admin-kpi__menu" aria-label="Chaguo">
          <IconMore />
        </button>
      </div>
      <div className="admin-kpi__body">
        {icon ? (
          <span className="admin-kpi__icon" aria-hidden>
            {icon}
          </span>
        ) : null}
        <strong className="admin-kpi__value">{value}</strong>
      </div>
      {trendText ? (
        <p className={`admin-kpi__trend${trendUp === false ? " admin-kpi__trend--down" : ""}`}>
          {trendUp !== false ? "↗" : "↘"} {trendText}
        </p>
      ) : null}
    </article>
  );
}

/** @deprecated use AdminKpiCard */
export function StatCard({ label, value }: { label: string; value: string | number }) {
  return <AdminKpiCard label={label} value={value} />;
}
