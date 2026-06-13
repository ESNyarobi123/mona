import type { ReactNode } from "react";
import { CustomerAuthGuard } from "../../../components/customer/CustomerAuthGuard";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <CustomerAuthGuard>{children}</CustomerAuthGuard>;
}
