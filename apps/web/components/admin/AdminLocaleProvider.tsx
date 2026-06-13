"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { parseLocale, type AppLocale } from "@monana/i18n";
import {
  ta,
  tf,
  adminKitchenLabel,
  adminSlotLabel,
  type AdminMessageKey,
} from "../../lib/admin-i18n";

const ADMIN_LOCALE_KEY = "monana_admin_locale";
const ADMIN_DEFAULT_LOCALE: AppLocale = "en";

function readAdminLocale(): AppLocale {
  if (typeof window === "undefined") return ADMIN_DEFAULT_LOCALE;
  const stored = localStorage.getItem(ADMIN_LOCALE_KEY);
  if (stored === "en" || stored === "sw") return stored;
  return ADMIN_DEFAULT_LOCALE;
}

type AdminLocaleContextValue = {
  locale: AppLocale;
  t: (key: AdminMessageKey) => string;
  tf: (key: AdminMessageKey, vars: Record<string, string | number>) => string;
  slotLabel: (slot: string) => string;
  kitchenLabel: (status: string) => string;
  setLocale: (next: AppLocale) => void;
};

const AdminLocaleContext = createContext<AdminLocaleContextValue | null>(null);

export function AdminLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(ADMIN_DEFAULT_LOCALE);

  useEffect(() => {
    const next = readAdminLocale();
    setLocaleState(next);
    document.documentElement.lang = next;
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    localStorage.setItem(ADMIN_LOCALE_KEY, next);
    setLocaleState(next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<AdminLocaleContextValue>(
    () => ({
      locale,
      t: (key) => ta(locale, key),
      tf: (key, vars) => tf(locale, key, vars),
      slotLabel: (slot) => adminSlotLabel(locale, slot),
      kitchenLabel: (status) => adminKitchenLabel(locale, status),
      setLocale,
    }),
    [locale, setLocale]
  );

  return <AdminLocaleContext.Provider value={value}>{children}</AdminLocaleContext.Provider>;
}

export function useAdminLocale() {
  const ctx = useContext(AdminLocaleContext);
  if (!ctx) {
    const locale = ADMIN_DEFAULT_LOCALE;
    return {
      locale,
      t: (key: AdminMessageKey) => ta(locale, key),
      tf: (key: AdminMessageKey, vars: Record<string, string | number>) => tf(locale, key, vars),
      slotLabel: (slot: string) => adminSlotLabel(locale, slot),
      kitchenLabel: (status: string) => adminKitchenLabel(locale, status),
      setLocale: (_next: AppLocale) => {},
    };
  }
  return ctx;
}

export function parseAdminLocale(value: string | null | undefined): AppLocale {
  return parseLocale(value);
}
