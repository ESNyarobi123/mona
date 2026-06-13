"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { clearSession, getStoredUser } from "../../lib/admin-api";
import { userDisplayName, userInitials } from "../../lib/admin-dashboard";
import { useAdminLocale } from "./AdminLocaleProvider";
import { IconChevronLeft } from "./AdminIcons";

export type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  exact?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export function Sidebar({
  sections,
  footerItems,
}: {
  sections: NavSection[];
  footerItems?: NavItem[];
}) {
  const pathname = usePathname();
  const user = getStoredUser();
  const { t } = useAdminLocale();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact || href === "/admin") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className={`admin-sidebar${collapsed ? " admin-sidebar--collapsed" : ""}`}>
      <div className="admin-sidebar__top">
        <Link href="/admin" className="admin-sidebar-brand">
          <span className="admin-sidebar-brand__mark">M</span>
          {!collapsed && (
            <span className="admin-sidebar-brand__text">
              <strong>Monana</strong>
              <small>Admin Panel</small>
            </span>
          )}
        </Link>
        <button
          type="button"
          className="admin-sidebar__collapse"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? t("expandMenu") : t("collapseMenu")}
        >
          <IconChevronLeft className={collapsed ? "admin-sidebar__collapse-icon--flipped" : ""} />
        </button>
      </div>

      <nav className="admin-nav">
        {sections.map((section) => (
          <div key={section.label} className="admin-nav__group">
            {!collapsed && <p className="admin-nav-section">{section.label}</p>}
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href, item.exact) ? "active" : ""}
                title={collapsed ? item.label : undefined}
              >
                {item.icon ? <span className="admin-nav__icon">{item.icon}</span> : null}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar__bottom">
        <div className="admin-sidebar-profile">
          <div className="admin-sidebar-profile__avatar">
            {userInitials(user?.name, user?.phone)}
          </div>
          {!collapsed && (
            <div className="admin-sidebar-profile__info">
              <strong>{userDisplayName(user?.name, user?.phone)}</strong>
              <small>{user?.phone ?? "Admin"}</small>
            </div>
          )}
          {!collapsed && (
            <button
              type="button"
              className="admin-sidebar-profile__logout"
              onClick={() => {
                clearSession();
                window.location.href = "/login";
              }}
            >
              {t("signOut")}
            </button>
          )}
        </div>

        {footerItems && footerItems.length > 0 ? (
          <div className="admin-sidebar__back">
            {footerItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-sidebar__back-link${isActive(item.href, item.exact) ? " is-active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon ? <span className="admin-sidebar__back-icon">{item.icon}</span> : null}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
