import { adminTodayLabel } from "../../../lib/admin-dashboard";

type Variant = "main" | "restaurant" | "grocery";

type Props = {
  variant?: Variant;
  title: string;
  subtitle: string;
  badge?: string;
};

export function AdminDashboardHero({ variant = "main", title, subtitle, badge }: Props) {
  return (
    <header className={`admin-dash-hero admin-dash-hero--${variant}`}>
      <div className="admin-dash-hero__text">
        {badge ? <span className="admin-dash-hero__badge">{badge}</span> : null}
        <h1 className="admin-dash-hero__title">{title}</h1>
        <p className="admin-dash-hero__sub">{subtitle}</p>
        <time className="admin-dash-hero__date" dateTime={new Date().toISOString()}>
          📅 {adminTodayLabel()}
        </time>
      </div>
      <div className="admin-dash-hero__decor" aria-hidden>
        <span className="admin-dash-hero__orb admin-dash-hero__orb--1" />
        <span className="admin-dash-hero__orb admin-dash-hero__orb--2" />
      </div>
    </header>
  );
}
