"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppLocale } from "../providers/AppLocaleProvider";

const SERVICES = [
  { id: "grocery", href: "/grocery", emoji: "🛒", labelKey: "serviceGrocery" as const },
  { id: "restaurant", href: "/restaurant", emoji: "🍲", labelKey: "serviceRestaurant" as const },
  { id: "catering", href: "/catering", emoji: "🍽️", labelKey: "serviceCatering" as const },
] as const;

export function ServiceCategoryToggle({ sticky = true }: { sticky?: boolean }) {
  const pathname = usePathname();
  const { t } = useAppLocale();

  function activeFor(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className={`service-toggle${sticky ? " service-toggle--sticky" : ""}`} role="navigation" aria-label={t("serviceToggleLabel")}>
      <div className="service-toggle__inner">
        <p className="service-toggle__label">{t("serviceToggleLabel")}</p>
        <div className="service-toggle__tabs" role="tablist">
          {SERVICES.map((s) => {
            const active = activeFor(s.href);
            return (
              <Link
                key={s.id}
                href={s.href}
                role="tab"
                aria-selected={active}
                className={`service-toggle__tab${active ? " is-active" : ""} service-toggle__tab--${s.id}`}
              >
                <span aria-hidden>{s.emoji}</span>
                <strong>{t(s.labelKey)}</strong>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
