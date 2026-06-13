"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { resolveAdminSearchRoute } from "../../lib/admin-search";
import { useAdminLocale } from "./AdminLocaleProvider";
import { AdminLanguageSwitch } from "./AdminLanguageSwitch";
import { IconBell, IconSearch, IconSettings, IconSparkle } from "./AdminIcons";

export function AdminTopHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAdminLocale();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const { path, q } = resolveAdminSearchRoute(query);
    if (!q) {
      router.push(path);
      return;
    }
    router.push(`${path}?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="admin-header">
      <form className="admin-header__search" onSubmit={handleSearch}>
        <IconSearch className="admin-header__search-icon" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchGlobal")}
          aria-label={t("search")}
        />
        <button type="submit" className="admin-header__search-btn">
          {t("search")}
        </button>
      </form>

      <div className="admin-header__actions">
        <AdminLanguageSwitch compact />
        <Link href="/admin/payments" className="admin-header__icon-btn" title={t("payments")}>
          <IconBell />
          <span className="admin-header__dot" aria-hidden />
        </Link>
        <Link href="/admin/whatsapp" className="admin-header__icon-btn" title={t("whatsappSettings")}>
          <IconSettings />
        </Link>
        <Link href="/admin/whatsapp" className="admin-header__cta">
          <IconSparkle />
          {t("whatsappBot")}
        </Link>
      </div>
    </header>
  );
}
