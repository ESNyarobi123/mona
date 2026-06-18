import { redirect } from "next/navigation";

export default function LegacyMembershipEnrollPage() {
  redirect("/account/subscription/enroll");
}
