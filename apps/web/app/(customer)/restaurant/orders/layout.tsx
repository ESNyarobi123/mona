import type { ReactNode } from "react";
import { CustomerAuthGuard } from "../../../../components/customer/CustomerAuthGuard";

export default function RestaurantOrdersLayout({ children }: { children: ReactNode }) {
  return <CustomerAuthGuard>{children}</CustomerAuthGuard>;
}
