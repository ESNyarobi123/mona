import { redirect } from "next/navigation";

export default function CustomOrdersRedirectPage() {
  redirect("/admin/restaurant/social-orders");
}
