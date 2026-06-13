"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAdminLocale } from "./AdminLocaleProvider";

export function GroceryLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useAdminLocale();
  const isOverview = pathname === "/admin/grocery";

  return (
    <div className="admin-grocery-layout">
      {!isOverview ? (
        <div className="admin-grocery-layout__bar">
          <Link href="/admin/grocery" className="admin-crumb-link">
            ← {t("navGrocery")}
          </Link>
        </div>
      ) : null}
      {children}
    </div>
  );
}
