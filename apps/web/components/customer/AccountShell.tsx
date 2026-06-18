"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getStoredUser } from "../../lib/admin-api";
import { WALLET_ENABLED } from "../../lib/features";
import { useCustomerLocale } from "./CustomerLocaleProvider";
import type { CustomerMessageKey } from "../../lib/customer-i18n";

const NAV_ITEMS = [
  { href: "/account", labelKey: "navOverview" as const, icon: "🏠", exact: true as const },
  { href: "/account/restaurant/membership", labelKey: "navRestaurantMembership" as const, icon: "🎫" },
  { href: "/account/subscription", labelKey: "navSubscription" as const, icon: "🔄" },
  { href: "/restaurant/menu", labelKey: "navOrderFood" as const, icon: "🍽️" },
  { href: "/grocery/products", labelKey: "navShopGrocery" as const, icon: "🛍️" },
  { href: "/restaurant/orders", labelKey: "navRestOrders" as const, icon: "🍲" },
  { href: "/grocery/orders", labelKey: "navGrocOrders" as const, icon: "🛒" },
  { href: "/wallet", labelKey: "navOverview" as const, icon: "💳" },
  { href: "/profile", labelKey: "navProfile" as const, icon: "👤" },
  { href: "/support", labelKey: "navSupport" as const, icon: "💬" },
];

const NAV = WALLET_ENABLED ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.href !== "/wallet");

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function currentNavLabel(pathname: string, t: (key: CustomerMessageKey) => string) {
  const item = NAV.find((n) => isActive(pathname, n.href, n.exact));
  if (item) return item.href === "/wallet" ? t("wallet") : t(item.labelKey);
  if (pathname.startsWith("/restaurant/checkout")) return t("checkout");
  if (pathname.startsWith("/restaurant/menu")) return t("menuNav");
  if (pathname.startsWith("/restaurant/slots")) return t("orderWindows");
  if (pathname.startsWith("/restaurant")) return t("navRestaurant");
  if (pathname.startsWith("/pay/")) return t("payment");
  if (pathname.startsWith("/grocery/checkout")) return t("checkout");
  if (pathname.startsWith("/grocery/cart")) return t("cartNav");
  if (pathname.startsWith("/grocery/packages")) return t("packages");
  if (pathname.startsWith("/grocery/products")) return t("shopNav");
  if (pathname.startsWith("/grocery")) return t("navGrocery");
  if (pathname.startsWith("/restaurant/orders")) return t("navRestOrders");
  if (pathname.startsWith("/grocery/orders")) return t("navGrocOrders");
  if (pathname.startsWith("/support")) return t("navSupport");
  if (pathname.startsWith("/account/restaurant/membership")) return t("navRestaurantMembership");
  if (pathname.startsWith("/account/subscription")) return t("navSubscription");
  if (pathname.startsWith("/account/membership")) return t("navSubscription");
  if (pathname.startsWith("/account/orders")) return t("orderLabel");
  if (pathname.startsWith("/profile")) return t("profileTitle");
  return "Monana";
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useCustomerLocale();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function signOut() {
    setMenuOpen(false);
    clearSession();
    setUser(null);
    router.push("/login");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const homeHref = user ? "/account" : "/";

  return (
    <div className={`account-shell ${menuOpen ? "account-shell--menu-open" : ""}`}>
      <div className="account-shell__mobile-bar">
        <button
          type="button"
          className={`account-drawer-toggle ${menuOpen ? "account-drawer-toggle--open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="account-drawer"
          aria-label={menuOpen ? "Close account menu" : "Open account menu"}
        >
          <span className="account-drawer-toggle__lines" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>
        <div className="account-shell__mobile-title">
          <span className="account-shell__mobile-eyebrow">Monana</span>
          <strong>{currentNavLabel(pathname, t)}</strong>
        </div>
        <Link href={homeHref} className="account-shell__mobile-home" aria-label={user ? "Account" : "Home"}>
          🏠
        </Link>
      </div>

      <button
        type="button"
        className="account-shell__backdrop"
        aria-label="Close menu"
        onClick={closeMenu}
      />

      <aside
        id="account-drawer"
        className={`account-shell__sidebar ${menuOpen ? "account-shell__sidebar--open" : ""}`}
      >
        <div className="account-shell__user">
          <span className="account-shell__avatar" aria-hidden>
            {(user?.name?.[0] ?? user?.phone?.slice(-2) ?? "?").toUpperCase()}
          </span>
          <div>
            <strong>{user?.name ?? t("guest")}</strong>
            <small>{user?.phone ?? t("signInHint")}</small>
          </div>
          <button
            type="button"
            className="account-shell__drawer-close"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <nav className="account-shell__nav" aria-label="Account">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href, item.exact) ? "active" : undefined}
              onClick={closeMenu}
            >
              <span className="account-shell__nav-icon" aria-hidden>
                {item.icon}
              </span>
              {item.href === "/wallet" ? t("wallet") : t(item.labelKey)}
            </Link>
          ))}
        </nav>

        {user ? (
          <button type="button" className="account-shell__signout" onClick={signOut}>
            {t("signOut")}
          </button>
        ) : (
          <Link href="/login" className="account-shell__signout account-shell__signout--login" onClick={closeMenu}>
            {t("signIn")}
          </Link>
        )}
      </aside>

      <div className="account-shell__main">{children}</div>
    </div>
  );
}
