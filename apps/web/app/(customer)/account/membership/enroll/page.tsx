"use client";

import { Suspense } from "react";
import { MembershipEnrollView } from "../../../../../components/customer/MembershipEnrollView";
import { useAppLocale } from "../../../../../components/providers/AppLocaleProvider";

function EnrollFallback() {
  const { t } = useAppLocale();
  return (
    <div className="account-loading account-loading--inline">
      <div className="account-loading__spinner" aria-hidden />
      <p>{t("loadingMembership")}</p>
    </div>
  );
}

export default function AccountMembershipEnrollPage() {
  return (
    <Suspense fallback={<EnrollFallback />}>
      <MembershipEnrollView />
    </Suspense>
  );
}
