"use client";

import { Suspense, useMemo, type ReactNode } from "react";
import { AdminTopHeader } from "./AdminTopHeader";
import { Sidebar, type NavItem, type NavSection } from "./Sidebar";
import { useAdminLocale } from "./AdminLocaleProvider";
import {
  IconCategory,
  IconChevronLeft,
  IconClock,
  IconDashboard,
  IconGrocery,
  IconKitchen,
  IconMenu,
  IconOrders,
  IconPackage,
  IconPayments,
  IconProducts,
  IconReports,
  IconRestaurant,
  IconSettings,
  IconSparkle,
  IconSubscription,
  IconUnits,
  IconUser,
  IconUsers,
  IconWhatsApp,
} from "./AdminIcons";

export function AdminShell({
  children,
  variant = "main",
}: {
  children: ReactNode;
  variant?: "main" | "restaurant" | "grocery" | "catering";
}) {
  const { t } = useAdminLocale();

  const mainSections = useMemo<NavSection[]>(
    () => [
      {
        label: t("navMainMenu"),
        items: [
          { href: "/admin", label: t("overview"), icon: <IconDashboard />, exact: true },
          { href: "/admin/landing", label: t("landingPage"), icon: <IconSparkle /> },
          { href: "/admin/whatsapp", label: t("whatsapp"), icon: <IconWhatsApp /> },
          { href: "/admin/orders", label: t("orders"), icon: <IconOrders /> },
          { href: "/admin/payments", label: t("payments"), icon: <IconPayments /> },
          { href: "/admin/reports", label: t("reports"), icon: <IconReports /> },
          { href: "/admin/users", label: t("users"), icon: <IconUsers /> },
          { href: "/admin/profile", label: t("navProfile"), icon: <IconUser /> },
        ],
      },
      {
        label: t("navModules"),
        items: [
          { href: "/admin/restaurant", label: t("navRestaurant"), icon: <IconRestaurant /> },
          { href: "/admin/grocery", label: t("navGrocery"), icon: <IconGrocery /> },
          { href: "/admin/catering", label: t("navCatering"), icon: <IconPackage /> },
        ],
      },
    ],
    [t]
  );

  const cateringSections = useMemo<NavSection[]>(
    () => [
      {
        label: t("navCatering"),
        items: [
          { href: "/admin/catering", label: t("overview"), icon: <IconDashboard />, exact: true },
          { href: "/admin/catering/packages", label: t("packages"), icon: <IconPackage /> },
          { href: "/admin/orders?module=CATERING", label: t("orders"), icon: <IconOrders /> },
        ],
      },
      {
        label: t("navShortcuts"),
        items: [
          { href: "/admin/payments?module=CATERING", label: t("payments"), icon: <IconPayments /> },
        ],
      },
    ],
    [t]
  );

  const restaurantSections = useMemo<NavSection[]>(
    () => [
      {
        label: t("navRestaurant"),
        items: [
          { href: "/admin/restaurant", label: t("overview"), icon: <IconDashboard />, exact: true },
          { href: "/admin/restaurant/membership", label: t("membership"), icon: <IconSubscription /> },
          { href: "/admin/restaurant/slots", label: t("slots"), icon: <IconClock /> },
          { href: "/admin/restaurant/categories", label: t("categories"), icon: <IconCategory /> },
          { href: "/admin/restaurant/menus", label: t("menuBoards"), icon: <IconPackage /> },
          { href: "/admin/restaurant/menu", label: t("menuItems"), icon: <IconMenu /> },
          { href: "/admin/restaurant/kitchen", label: t("kitchen"), icon: <IconKitchen /> },
          { href: "/admin/restaurant/social-orders", label: t("socialOrders"), icon: <IconOrders /> },
          { href: "/admin/restaurant/hot", label: t("hotPick"), icon: <IconSparkle /> },
          { href: "/admin/restaurant/settings", label: t("restaurantSettings"), icon: <IconSettings /> },
          { href: "/admin/restaurant/delivery", label: t("deliveryPricingRestaurant"), icon: <IconReports /> },
        ],
      },
      {
        label: t("navShortcuts"),
        items: [
          { href: "/admin/orders?module=RESTAURANT", label: t("orders"), icon: <IconOrders /> },
          { href: "/admin/grocery/units?context=restaurant", label: t("units"), icon: <IconUnits /> },
        ],
      },
    ],
    [t]
  );

  const grocerySections = useMemo<NavSection[]>(
    () => [
      {
        label: t("navGrocery"),
        items: [
          { href: "/admin/grocery", label: t("overview"), icon: <IconDashboard />, exact: true },
          { href: "/admin/grocery/categories", label: t("categories"), icon: <IconCategory /> },
          { href: "/admin/grocery/units", label: t("units"), icon: <IconUnits /> },
          { href: "/admin/grocery/products", label: t("products"), icon: <IconProducts /> },
          { href: "/admin/grocery/packages", label: t("packages"), icon: <IconPackage /> },
          { href: "/admin/grocery/membership", label: t("subscriptionPlans"), icon: <IconPayments /> },
          { href: "/admin/grocery/subscriptions", label: t("subscriptions"), icon: <IconSubscription /> },
          { href: "/admin/grocery/hot", label: t("hotPick"), icon: <IconSparkle /> },
          { href: "/admin/grocery/delivery", label: t("deliveryPricingGrocery"), icon: <IconReports /> },
        ],
      },
      {
        label: t("navShortcuts"),
        items: [
          { href: "/admin/orders?module=GROCERY", label: t("orders"), icon: <IconOrders /> },
        ],
      },
    ],
    [t]
  );

  const backLink = useMemo<NavItem>(
    () => ({ href: "/admin", label: t("backToAdmin"), icon: <IconChevronLeft />, exact: true }),
    [t]
  );

  const sections =
    variant === "restaurant"
      ? restaurantSections
      : variant === "grocery"
        ? grocerySections
        : variant === "catering"
          ? cateringSections
          : mainSections;
  const footerItems = variant !== "main" ? [backLink] : undefined;

  return (
    <div className="admin-root">
      <Sidebar sections={sections} footerItems={footerItems} />
      <div className="admin-main">
        <Suspense fallback={<header className="admin-header" aria-hidden />}>
          <AdminTopHeader />
        </Suspense>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
