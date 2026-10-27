"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getToken, getStoredUser, apiGet, isSessionInvalidError } from "../../lib/admin-api";
import { useCustomerLocale } from "./CustomerLocaleProvider";

type Me = { id: string; name: string | null; phone: string; role: string };

export function CustomerAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useCustomerLocale();
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
        const me = await apiGet<Me>("/api/auth/me");
        if (cancelled) return;
        if (me.role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        // Only a real rejection (401/403) ends the session. A 429 rate limit,
        // a 5xx or a network blip must keep the user signed in.
        if (isSessionInvalidError(err)) {
          clearSession();
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setReady(true);
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
        <p>{t("verifying")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
