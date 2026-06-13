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
import type { CustomerLocale, CustomerMessageKey } from "../../lib/customer-i18n";
import { t as translate } from "../../lib/customer-i18n";
import {
  getStoredLocale,
  LOCALE_CHANGE_EVENT,
  setStoredLocale,
  syncLocaleToServer,
} from "../../lib/locale-preference";
import { apiGet, getStoredUser, getToken } from "../../lib/admin-api";
import { DEFAULT_LOCALE, parseLocale, type AppLocale } from "@monana/i18n";

type Profile = { id: string; locale: string };

type LocaleContextValue = {
  locale: AppLocale;
  t: (key: CustomerMessageKey) => string;
  setLocale: (next: AppLocale) => Promise<void>;
  refresh: () => Promise<void>;
  ready: boolean;
};

const AppLocaleContext = createContext<LocaleContextValue | null>(null);

export function AppLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  const pushToServer = useCallback(async (next: AppLocale) => {
    const token = getToken();
    const user = getStoredUser();
    if (!token || !user) return;
    try {
      await syncLocaleToServer(user.id, next, token);
    } catch {
      /* offline or session edge case — local preference still applies */
    }
  }, []);

  const setLocale = useCallback(
    async (next: AppLocale) => {
      setStoredLocale(next);
      setLocaleState(next);
      await pushToServer(next);
    },
    [pushToServer]
  );

  const refresh = useCallback(async () => {
    const stored = getStoredLocale();
    setLocaleState(stored);
    document.documentElement.lang = stored;

    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }

    try {
      const me = await apiGet<Profile>("/api/auth");
      const profileLocale = parseLocale(me.locale);
      if (profileLocale !== stored) {
        await syncLocaleToServer(me.id, stored, token);
      }
    } catch {
      /* guest session expired — keep stored locale */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onLocaleChange = (e: Event) => {
      const next = (e as CustomEvent<AppLocale>).detail;
      if (next === "en" || next === "sw") setLocaleState(next);
    };
    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: (key) => translate(locale, key),
      setLocale,
      refresh,
      ready,
    }),
    [locale, setLocale, refresh, ready]
  );

  return <AppLocaleContext.Provider value={value}>{children}</AppLocaleContext.Provider>;
}

export function useAppLocale() {
  const ctx = useContext(AppLocaleContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      t: (key: CustomerMessageKey) => translate(DEFAULT_LOCALE, key),
      setLocale: async (next: AppLocale) => {
        setStoredLocale(next);
      },
      refresh: async () => {},
      ready: true,
    };
  }
  return ctx;
}

/** @deprecated use useAppLocale — kept for existing customer components */
export function useCustomerLocale() {
  return useAppLocale();
}

export type { CustomerLocale };
