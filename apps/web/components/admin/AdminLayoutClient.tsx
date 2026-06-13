"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "./AdminShell";
import { AuthGuard } from "./AuthGuard";
import { AdminLocaleProvider } from "./AdminLocaleProvider";

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const unitsRestaurant =
    pathname.startsWith("/admin/grocery/units") &&
    searchParams.get("context") === "restaurant";

  const variant = pathname.startsWith("/admin/restaurant") || unitsRestaurant
    ? "restaurant"
    : pathname.startsWith("/admin/grocery")
      ? "grocery"
      : "main";

  return (
    <AdminLocaleProvider>
      <AuthGuard>
        <AdminShell variant={variant}>{children}</AdminShell>
      </AuthGuard>
    </AdminLocaleProvider>
  );
}
