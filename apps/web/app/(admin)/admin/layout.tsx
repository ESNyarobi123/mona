import type { ReactNode } from "react";
import { AdminLayoutClient } from "../../../components/admin/AdminLayoutClient";

export const dynamic = "force-dynamic";

export default function AdminSectionLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
