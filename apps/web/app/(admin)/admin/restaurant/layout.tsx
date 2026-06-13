import type { ReactNode } from "react";
import { RestaurantLayoutClient } from "../../../../components/admin/RestaurantLayoutClient";

export default function RestaurantSectionLayout({ children }: { children: ReactNode }) {
  return <RestaurantLayoutClient>{children}</RestaurantLayoutClient>;
}
