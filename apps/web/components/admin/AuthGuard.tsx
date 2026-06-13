"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken, getStoredUser } from "../../lib/admin-api";
import { useAdminLocale } from "./AdminLocaleProvider";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useAdminLocale();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser();
    if (!token || !user || user.role !== "ADMIN") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="admin-auth-screen">
        <div className="admin-loading">{t("loading")}</div>
      </div>
    );
  }

  return <>{children}</>;
}
