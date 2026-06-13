"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAdminLocale } from "./AdminLocaleProvider";

export function RestaurantLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useAdminLocale();
  const isOverview = pathname === "/admin/restaurant";

  return (
    <div className="admin-restaurant-layout">
      {!isOverview ? (
        <div className="admin-restaurant-layout__bar">
          <Link href="/admin/restaurant" className="admin-crumb-link">
            ← {t("navRestaurant")}
          </Link>
        </div>
      ) : null}
      {children}
    </div>
  );
}
