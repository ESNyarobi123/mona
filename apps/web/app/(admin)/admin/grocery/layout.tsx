import type { ReactNode } from "react";
import { GroceryLayoutClient } from "../../../../components/admin/GroceryLayoutClient";

export default function GrocerySectionLayout({ children }: { children: ReactNode }) {
  return <GroceryLayoutClient>{children}</GroceryLayoutClient>;
}
