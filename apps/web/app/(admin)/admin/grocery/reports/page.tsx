import { redirect } from "next/navigation";

/** Legacy grocery reports URL → main Reports page. */
export default function GroceryReportsRedirectPage() {
  redirect("/admin/reports");
}
