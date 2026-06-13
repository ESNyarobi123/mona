"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getToken, getStoredUser, apiGet } from "../../lib/admin-api";

export function RequireCustomer({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const token = getToken();
      const stored = getStoredUser();
      if (!token || !stored) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (stored.role === "ADMIN") {
        router.replace("/admin");
        return;
      }
      try {
        const me = await apiGet<{ role: string }>("/api/auth");
        if (cancelled) return;
        if (me.role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        setReady(true);
      } catch {
        if (cancelled) return;
        clearSession();
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="account-loading">
        <div className="account-loading__spinner" aria-hidden />
        <p>Sign in to continue…</p>
      </div>
    );
  }

  return <>{children}</>;
}
