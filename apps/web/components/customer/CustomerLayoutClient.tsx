"use client";

import type { ReactNode } from "react";
import { AppHeader } from "../layout/AppHeader";
import { SiteFooter } from "../landing/SiteFooter";
import { AccountShell } from "./AccountShell";

/** Wraps all (customer) routes: header + slide sidebar + content */
export function CustomerLayoutClient({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <AppHeader />
      <main className="mn-page mn-page--account">
        <AccountShell>{children}</AccountShell>
      </main>
      <SiteFooter />
    </div>
  );
}
