import Link from "next/link";

type Props = {
  variant: "restaurant" | "grocery";
  title: string;
  subtitle: string;
  metrics: { label: string; value: string | number }[];
  href: string;
  cta: string;
};

export function AdminModuleCard({ variant, title, subtitle, metrics, href, cta }: Props) {
  return (
    <Link href={href} className={`admin-module-card admin-module-card--${variant}`}>
      <div className="admin-module-card__head">
        <span className="admin-module-card__emoji" aria-hidden>
          {variant === "restaurant" ? "🍲" : "🛒"}
        </span>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <ul className="admin-module-card__metrics">
        {metrics.map((m) => (
          <li key={m.label}>
            <span>{m.label}</span>
            <strong>{m.value}</strong>
          </li>
        ))}
      </ul>
      <span className="admin-module-card__cta">{cta} →</span>
    </Link>
  );
}
