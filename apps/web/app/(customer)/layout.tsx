import type { ReactNode } from "react";
import { CustomerLayoutClient } from "../../components/customer/CustomerLayoutClient";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return <CustomerLayoutClient>{children}</CustomerLayoutClient>;
}
