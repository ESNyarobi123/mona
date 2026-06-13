"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminLocale } from "../AdminLocaleProvider";

type Props = {
  menuItems: number;
  menus: number;
  kitchenActive: number;
  slotOrders: number;
};

const ITEMS = [
  {
    key: "menuItems" as const,
    desc: "menuItemsNavDesc" as const,
    href: "/admin/restaurant/menu",
    icon: "🍽️",
    tone: "items",
    countKey: "menuItems" as const,
  },
  {
    key: "categories" as const,
    desc: "categoriesNavDesc" as const,
    href: "/admin/restaurant/categories",
    icon: "📁",
    tone: "categories",
    countKey: null,
  },
  {
    key: "menuBoards" as const,
    desc: "menuBoardsNavDesc" as const,
    href: "/admin/restaurant/menus",
    icon: "📋",
    tone: "menus",
    countKey: "menus" as const,
  },
  {
    key: "kitchen" as const,
    desc: "kitchenNavDesc" as const,
    href: "/admin/restaurant/kitchen",
    icon: "👨‍🍳",
    tone: "kitchen",
    countKey: "kitchenActive" as const,
  },
  {
    key: "slots" as const,
    desc: "slotsNavDesc" as const,
    href: "/admin/restaurant/slots",
    icon: "🕐",
    tone: "slots",
    countKey: "slotOrders" as const,
  },
  {
    key: "hotPick" as const,
    desc: "hotNavDesc" as const,
    href: "/admin/restaurant/hot",
    icon: "🔥",
    tone: "hot",
    countKey: null,
  },
] as const;

export function AdminRestaurantSectionNav({
  menuItems,
  menus,
  kitchenActive,
  slotOrders,
}: Props) {
  const { t } = useAdminLocale();
  const pathname = usePathname();

  const counts = { menuItems, menus, kitchenActive, slotOrders };

  return (
    <nav className="admin-restaurant-nav" aria-label={t("restaurantManage")}>
      <div className="admin-restaurant-nav__grid admin-restaurant-nav__grid--6">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const count = item.countKey ? counts[item.countKey] : null;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-restaurant-nav__card admin-restaurant-nav__card--${item.tone}${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="admin-restaurant-nav__accent" aria-hidden />
              <span className="admin-restaurant-nav__orb" aria-hidden />

              <div className="admin-restaurant-nav__body">
                <span className="admin-restaurant-nav__icon" aria-hidden>
                  {item.icon}
                </span>
                <div className="admin-restaurant-nav__copy">
                  <strong>{t(item.key)}</strong>
                  <span>{t(item.desc)}</span>
                </div>
                {count !== null ? (
                  <span className="admin-restaurant-nav__count" aria-label={`${count}`}>
                    {count}
                  </span>
                ) : (
                  <span className="admin-restaurant-nav__count admin-restaurant-nav__count--empty" aria-hidden>
                    —
                  </span>
                )}
              </div>

              <div className="admin-restaurant-nav__foot">
                <span>{active ? t("currentSection") : t("openSection")}</span>
                <span className="admin-restaurant-nav__arrow" aria-hidden>
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
