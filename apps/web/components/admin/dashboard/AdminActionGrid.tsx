import Link from "next/link";

type Action = {
  href: string;
  icon: string;
  label: string;
  sub?: string;
  tone?: "primary" | "restaurant" | "default";
};

export function AdminActionGrid({ items }: { items: Action[] }) {
  return (
    <div className="admin-action-grid">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`admin-action-card${item.tone ? ` admin-action-card--${item.tone}` : ""}`}
        >
          <span className="admin-action-card__icon" aria-hidden>
            {item.icon}
          </span>
          <span className="admin-action-card__text">
            <strong>{item.label}</strong>
            {item.sub ? <small>{item.sub}</small> : null}
          </span>
          <span className="admin-action-card__arrow" aria-hidden>
            →
          </span>
        </Link>
      ))}
    </div>
  );
}

export function AdminStatPills({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="admin-stat-pills">
      {items.map((item) => (
        <div key={item.label} className="admin-stat-pill">
          <strong className="admin-stat-pill__value">{item.value}</strong>
          <span className="admin-stat-pill__label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
