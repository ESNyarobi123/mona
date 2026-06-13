import type { ReactNode } from "react";
import { RequireCustomer } from "../../../../components/customer/RequireCustomer";

export default function PayOrderLayout({ children }: { children: ReactNode }) {
  return <RequireCustomer>{children}</RequireCustomer>;
}
