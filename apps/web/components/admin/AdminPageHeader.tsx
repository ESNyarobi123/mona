import type { ReactNode } from "react";

type Props = {
  title: string;
  actions?: ReactNode;
};

/** Compact page title + optional actions — no marketing copy. */
export function AdminPageHeader({ title, actions }: Props) {
  return (
    <header className="admin-page-toolbar">
      <h1 className="admin-page-toolbar__title">{title}</h1>
      {actions ? <div className="admin-page-toolbar__actions">{actions}</div> : null}
    </header>
  );
}
