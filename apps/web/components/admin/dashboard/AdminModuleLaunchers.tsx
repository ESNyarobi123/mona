"use client";

import Link from "next/link";
import { useAdminLocale } from "../AdminLocaleProvider";

type Props = {
  restaurantOrdersToday: number;
  groceryOrdersToday: number;
  restaurantShare: number;
  groceryShare: number;
};

export function AdminModuleLaunchers({
  restaurantOrdersToday,
  groceryOrdersToday,
  restaurantShare,
  groceryShare,
}: Props) {
  const { t } = useAdminLocale();

  return (
    <section className="admin-module-launch" aria-label={t("modules")}>
      <header className="admin-module-launch__head">
        <h2 className="admin-module-launch__title">{t("modules")}</h2>
        <p className="admin-module-launch__sub">{t("chooseModuleDashboard")}</p>
      </header>

      <div className="admin-module-launch__grid">
        <Link href="/admin/restaurant" className="admin-module-launch__card admin-module-launch__card--restaurant">
          <span className="admin-module-launch__accent" aria-hidden />
          <span className="admin-module-launch__icon" aria-hidden>
            🍲
          </span>
          <span className="admin-module-launch__copy">
            <span className="admin-module-launch__tag">{t("navRestaurant")}</span>
            <strong>{t("monanaRestaurant")}</strong>
            <small>{t("restaurantDesc")}</small>
          </span>
          <span className="admin-module-launch__metrics">
            <span>
              <strong>{restaurantOrdersToday}</strong>
              <em>{t("ordersToday")}</em>
            </span>
            <span>
              <strong>{restaurantShare}%</strong>
              <em>{t("percentage")}</em>
            </span>
          </span>
          <span className="admin-module-launch__go">
            {t("enterDashboard")}
            <span className="admin-module-launch__arrow" aria-hidden>
              →
            </span>
          </span>
        </Link>

        <Link href="/admin/grocery" className="admin-module-launch__card admin-module-launch__card--grocery">
          <span className="admin-module-launch__accent" aria-hidden />
          <span className="admin-module-launch__icon" aria-hidden>
            🛒
          </span>
          <span className="admin-module-launch__copy">
            <span className="admin-module-launch__tag">{t("navGrocery")}</span>
            <strong>{t("monanaGrocery")}</strong>
            <small>{t("groceryDesc")}</small>
          </span>
          <span className="admin-module-launch__metrics">
            <span>
              <strong>{groceryOrdersToday}</strong>
              <em>{t("ordersToday")}</em>
            </span>
            <span>
              <strong>{groceryShare}%</strong>
              <em>{t("percentage")}</em>
            </span>
          </span>
          <span className="admin-module-launch__go">
            {t("enterDashboard")}
            <span className="admin-module-launch__arrow" aria-hidden>
              →
            </span>
          </span>
        </Link>
      </div>
    </section>
  );
}
