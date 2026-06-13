"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminLocale } from "../AdminLocaleProvider";

type Props = {
  products: number;
  packages: number;
  subscriptions: number;
  categories: number;
  units: number;
  hotCount?: number;
  membershipCount?: number;
};

const ITEMS = [
  {
    key: "products" as const,
    desc: "productsNavDesc" as const,
    href: "/admin/grocery/products",
    icon: "🏷️",
    tone: "products",
  },
  {
    key: "packages" as const,
    desc: "packagesNavDesc" as const,
    href: "/admin/grocery/packages",
    icon: "📦",
    tone: "packages",
  },
  {
    key: "membership" as const,
    desc: "membershipNavDesc" as const,
    href: "/admin/grocery/membership",
    icon: "🎫",
    tone: "membership",
    countKey: "membership" as const,
  },
  {
    key: "subscriptions" as const,
    desc: "subscriptionsNavDesc" as const,
    href: "/admin/grocery/subscriptions",
    icon: "🔄",
    tone: "subs",
  },
  {
    key: "categories" as const,
    desc: "categoriesNavDesc" as const,
    href: "/admin/grocery/categories",
    icon: "📁",
    tone: "categories",
  },
  {
    key: "units" as const,
    desc: "unitsNavDesc" as const,
    href: "/admin/grocery/units",
    icon: "⚖️",
    tone: "units",
  },
  {
    key: "hotPick" as const,
    desc: "hotGroceryNavDesc" as const,
    href: "/admin/grocery/hot",
    icon: "🔥",
    tone: "hot",
    countKey: "hotPick" as const,
  },
];

export function AdminGrocerySectionNav({
  products,
  packages,
  subscriptions,
  categories,
  units,
  hotCount = 0,
  membershipCount = 0,
}: Props) {
  const { t } = useAdminLocale();
  const pathname = usePathname();

  const counts: Record<string, number> = {
    products,
    packages,
    subscriptions,
    categories,
    units,
    hotPick: hotCount,
    membership: membershipCount,
  };

  return (
    <nav className="admin-grocery-nav" aria-label={t("groceryManage")}>
      <div className="admin-grocery-nav__grid admin-grocery-nav__grid--6">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const count = "countKey" in item && item.countKey ? counts[item.countKey] : counts[item.key];

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-grocery-nav__card admin-grocery-nav__card--${item.tone}${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="admin-grocery-nav__accent" aria-hidden />
              <span className="admin-grocery-nav__orb" aria-hidden />

              <div className="admin-grocery-nav__body">
                <span className="admin-grocery-nav__icon">{item.icon}</span>
                <div className="admin-grocery-nav__copy">
                  <strong>{t(item.key)}</strong>
                  <span>{t(item.desc)}</span>
                </div>
                <span className="admin-grocery-nav__count">{count}</span>
              </div>

              <div className="admin-grocery-nav__foot">
                <span>{active ? t("currentSection") : t("openSection")}</span>
                <span className="admin-grocery-nav__arrow" aria-hidden>
                  →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
