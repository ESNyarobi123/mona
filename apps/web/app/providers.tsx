"use client";

import type { ReactNode } from "react";
import { AppLocaleProvider } from "../components/providers/AppLocaleProvider";

export function Providers({ children }: { children: ReactNode }) {
  return <AppLocaleProvider>{children}</AppLocaleProvider>;
}
