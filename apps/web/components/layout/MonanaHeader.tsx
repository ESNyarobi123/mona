"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getStoredUser, type StoredUser } from "../../lib/admin-api";
import { useAppLocale } from "../providers/AppLocaleProvider";
import { CartNavButton } from "../customer/CartNavButton";
import { LanguageSwitch } from "../shared/LanguageSwitch";

export function MonanaHeader({ variant = "app" }: { variant?: "landing" | "app" }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, t } = useAppLocale();
  const [user, setUser] = useState<StoredUser | null>(null);

  function refresh() {
    setUser(getStoredUser());
  }

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("monana-cart", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("monana-cart", onStorage);
    };
  }, [pathname]);

  function navClass(href: string, exact = false) {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    return active ? "active" : undefined;
  }

  function signOut() {
    clearSession();
    setUser(null);
    router.push("/login");
  }

  const logoHref = user ? "/account" : "/";
  const isLanding = variant === "landing";

  return (
    <header className="landing-header">
      <div className="landing-header__inner">
        <Link href={logoHref} className="landing-logo" title={user ? t("navAccount") : "Monana"}>
          <span className="landing-logo__icon">🔥</span>
          Monana
        </Link>

        <nav className="landing-nav" aria-label="Main">
          <Link href="/" className={navClass("/", true)}>
            {t("navHome")}
          </Link>
          <Link href="/restaurant" className={navClass("/restaurant")}>
            {t("navRestaurant")}
          </Link>
          <Link href="/grocery" className={navClass("/grocery")}>
            {t("navGrocery")}
          </Link>
          {user ? (
            <Link href="/account" className={navClass("/account")}>
              {t("navAccount")}
            </Link>
          ) : null}
          <Link
            href={isLanding ? "/#whatsapp-bot" : "/support"}
            className={isLanding ? undefined : navClass("/support")}
          >
            {isLanding ? t("navWhatsapp") : t("navSupport")}
          </Link>
        </nav>

        <div className="landing-header__actions">
          <LanguageSwitch compact />

          <CartNavButton variant="header" />

          {user ? (
            <div className="app-header-user">
              <Link href="/account" className="app-header-user__btn">
                <span className="app-header-user__avatar" aria-hidden>
                  {(user.name?.[0] ?? "M").toUpperCase()}
                </span>
                <span className="app-header-user__name">{user.name?.split(" ")[0] ?? t("navAccount")}</span>
              </Link>
              <button type="button" className="app-header-user__logout" onClick={signOut}>
                {t("signOut")}
              </button>
            </div>
          ) : (
            <Link
              href={`/login${pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""}`}
              className="landing-btn landing-btn--orange"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
