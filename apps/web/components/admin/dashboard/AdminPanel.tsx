import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  actionHref?: string;
  actionLabel?: string;
  /** Count or short label shown as a badge (not a dropdown). */
  badge?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function AdminPanel({
  title,
  actionHref,
  actionLabel = "Zote →",
  badge,
  children,
  className,
  id,
}: Props) {
  return (
    <section id={id} className={`admin-panel ${className ?? ""}`.trim()}>
      <header className="admin-panel__head">
        <h2 className="admin-panel__title">{title}</h2>
        <div className="admin-panel__head-actions">
          {badge ? <span className="admin-panel__badge">{badge}</span> : null}
          {actionHref ? (
            <Link href={actionHref} className="admin-panel__action">
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </header>
      <div className="admin-panel__body">{children}</div>
    </section>
  );
}
