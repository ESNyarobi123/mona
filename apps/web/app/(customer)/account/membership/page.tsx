import { redirect } from "next/navigation";

export default function LegacyMembershipPage() {
  redirect("/account/subscription");
}
