"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WhatsAppDirectLink } from "../shared/WhatsAppDirectLink";
import { apiGet } from "../../lib/admin-api";
import { orderStatusLabel, SLOT_I18N } from "../../lib/customer-i18n";
import { formatDate, formatMoney } from "../../lib/format";
import { useAppLocale } from "../providers/AppLocaleProvider";
import { isOrderActive } from "../../lib/order-timeline";

type Me = {
  id: string;
  name: string | null;
  phone: string;
  role: string;
  locale: string;
  createdAt: string;
};

type OrderItem = { name: string; quantity: string | number };

type OrderRow = {
  id: string;
  module: string;
  status: string;
  total: string | number;
  createdAt: string;
  mealSlot?: string | null;
  items?: OrderItem[];
  payment?: { status: string } | null;
};

type SubscriptionRow = {
  id: string;
  status: string;
  frequency: string;
  nextRunAt: string | null;
  address: string;
  package?: { name: string };
};

type RestaurantMembershipRow = {
  id: string;
  status: string;
  mealSlots: string[];
};

type OrdersResponse = OrderRow[] | { items: OrderRow[]; meta: { total: number } };

function normalizeOrders(data: OrdersResponse) {
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: data.items, total: data.meta.total };
}

function itemsPreview(items: OrderItem[] | undefined) {
  if (!items?.length) return null;
  const parts = items.slice(0, 2).map((i) => `${i.name} ×${Number(i.quantity)}`);
  const more = items.length > 2 ? ` +${items.length - 2}` : "";
  return parts.join(", ") + more;
}

const MODULE_META = {
  RESTAURANT: { icon: "🍲", accent: "navy" as const },
  GROCERY: { icon: "🛒", accent: "orange" as const },
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "order-status--pending",
  CONFIRMED: "order-status--confirmed",
  PREPARING: "order-status--preparing",
  ON_THE_WAY: "order-status--delivery",
  DELIVERED: "order-status--done",
  CANCELLED: "order-status--cancelled",
};

export function AccountDashboardView() {
  const { locale, t, refresh } = useAppLocale();
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [restaurantMembership, setRestaurantMembership] = useState<RestaurantMembershipRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await refresh();
        const profile = await apiGet<Me>("/api/auth");
        if (cancelled) return;
        setMe(profile);

        const [rawOrders, rawSubs, rawRestMembership] = await Promise.all([
          apiGet<OrdersResponse>(`/api/orders?userId=${profile.id}&limit=8`),
          apiGet<SubscriptionRow[]>(`/api/grocery/subscriptions?userId=${profile.id}`).catch(() => []),
          apiGet<RestaurantMembershipRow[]>(`/api/restaurant/store/membership?userId=${profile.id}`).catch(
            () => []
          ),
        ]);
        if (cancelled) return;
        const { items, total } = normalizeOrders(rawOrders);
        setOrders(items);
        setOrderTotal(total);
        setSubs(rawSubs);
        setRestaurantMembership(
          rawRestMembership.find((m) => m.status === "ACTIVE" || m.status === "PAUSED") ?? null
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const activeOrders = orders.filter((o) => isOrderActive(o.status)).length;
  const activeSub = subs.find((s) => s.status === "ACTIVE" || s.status === "PENDING_PAYMENT");
  const firstName = me?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <header className="account-page-head">
        <div>
          <p className="account-page-head__eyebrow">{t("dashboardEyebrow")}</p>
          <h1 className="account-page-head__title">
            {t("dashboardGreeting")}, {firstName} 👋
          </h1>
          <p className="account-page-head__sub">{t("dashboardSub")}</p>
        </div>
        <div className="account-page-head__actions">
          <Link href="/restaurant" className="landing-btn landing-btn--navy">
            {t("orderFood")}
          </Link>
          <Link href="/grocery" className="landing-btn landing-btn--orange">
            {t("shopGrocery")}
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
          <p>{t("loadingDashboard")}</p>
        </div>
      ) : error ? (
        <p className="auth-form__error">{error}</p>
      ) : (
        <>
          <div className="account-stats account-stats--four">
            <div className="account-stat">
              <span className="account-stat__icon">🧾</span>
              <div>
                <span className="account-stat__value">{orderTotal}</span>
                <span className="account-stat__label">{t("totalOrders")}</span>
              </div>
            </div>
            <div className="account-stat account-stat--highlight">
              <span className="account-stat__icon">📦</span>
              <div>
                <span className="account-stat__value">{activeOrders}</span>
                <span className="account-stat__label">{t("activeOrders")}</span>
              </div>
            </div>
            <div className="account-stat">
              <span className="account-stat__icon">🔄</span>
              <div>
                <span className="account-stat__value">{subs.length}</span>
                <span className="account-stat__label">{t("membership")}</span>
              </div>
            </div>
            <div className="account-stat">
              <span className="account-stat__icon">🌐</span>
              <div>
                <span className="account-stat__value">{locale === "sw" ? "SW" : "EN"}</span>
                <span className="account-stat__label">
                  {locale === "sw" ? t("languageSw") : t("languageEn")}
                </span>
              </div>
            </div>
          </div>

          <section className="account-card account-card--orders">
            <div className="account-card__head">
              <div>
                <h2>{t("recentOrders")}</h2>
                <p className="account-card__head-sub">{t("recentOrdersSub")}</p>
              </div>
              <div className="account-card__head-links">
                <Link href="/restaurant/orders">🍲 {t("navRestOrders")}</Link>
                <Link href="/grocery/orders">🛒 {t("navGrocOrders")}</Link>
              </div>
            </div>
            <p className="account-delivery-hint">{t("deliveryHint")}</p>

            {orders.length === 0 ? (
              <div className="account-empty">
                <span aria-hidden>📦</span>
                <p>{t("noOrders")}</p>
                <div className="account-empty__actions">
                  <Link href="/restaurant" className="landing-btn landing-btn--ghost">
                    {t("browseRestaurant")}
                  </Link>
                  <Link href="/grocery" className="landing-btn landing-btn--orange">
                    {t("shopGrocery")}
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="account-recent-list">
                {orders.map((o) => {
                  const meta = MODULE_META[o.module as keyof typeof MODULE_META] ?? MODULE_META.GROCERY;
                  const preview = itemsPreview(o.items);
                  const slotLabel = o.mealSlot ? SLOT_I18N[o.mealSlot]?.[locale] : null;
                  const needsPay =
                    o.status !== "CANCELLED" && (!o.payment || o.payment.status === "PENDING");
                  const statusLabel = orderStatusLabel(locale, o.status);
                  const moduleLabel = o.module === "RESTAURANT" ? t("navRestOrders") : t("navGrocOrders");

                  return (
                    <li key={o.id} className="account-recent-item">
                      <Link
                        href={`/account/orders/${o.id}`}
                        className={`account-recent-item__card account-recent-item__card--${meta.accent}`}
                      >
                        <span className={`account-recent-item__thumb account-recent-item__thumb--${meta.accent}`} aria-hidden>
                          {meta.icon}
                        </span>
                        <div className="account-recent-item__body">
                          <div className="account-recent-item__row">
                            <strong className="account-recent-item__title">
                              {moduleLabel} · #{o.id.slice(-6).toUpperCase()}
                            </strong>
                            <span className={`order-status ${STATUS_CLASS[o.status] ?? ""}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <span className="account-recent-item__date">{formatDate(o.createdAt)}</span>
                          {slotLabel ? (
                            <span className="account-recent-item__meta">🕐 {slotLabel}</span>
                          ) : null}
                          {preview ? <span className="account-recent-item__preview">{preview}</span> : null}
                        </div>
                        <div className="account-recent-item__aside">
                          <strong className="account-recent-item__total">{formatMoney(o.total)}</strong>
                          <span className="account-recent-item__chevron" aria-hidden>
                            ›
                          </span>
                        </div>
                      </Link>
                      {needsPay ? (
                        <Link href={`/pay/${o.id}`} className="account-recent-item__pay landing-btn landing-btn--orange">
                          {t("payNow")}
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="account-card account-card--membership">
            <div className="account-card__head">
              <div>
                <h2>{t("restaurantMembershipTitle")}</h2>
                <p className="account-card__head-sub">{t("restaurantMembershipSub")}</p>
              </div>
              <Link href="/account/restaurant/membership">{t("restaurantMembershipEnroll")}</Link>
            </div>
            <div className="account-membership-banner">
              {restaurantMembership ? (
                <>
                  <p className="account-membership-banner__meta">
                    {restaurantMembership.mealSlots
                      .map((s) => SLOT_I18N[s]?.[locale] ?? s)
                      .join(" · ")}
                  </p>
                  <Link href="/account/restaurant/membership" className="landing-btn landing-btn--ghost landing-btn--sm">
                    {t("restaurantMembershipActive")}
                  </Link>
                </>
              ) : (
                <>
                  <p>{t("restaurantMembershipNone")}</p>
                  <Link href="/account/restaurant/membership/enroll" className="landing-btn landing-btn--navy landing-btn--sm">
                    {t("restaurantMembershipEnroll")}
                  </Link>
                </>
              )}
            </div>
          </section>

          <section className="account-card account-card--membership">
            <div className="account-card__head">
              <div>
                <h2>{t("subscriptionTitle")}</h2>
                <p className="account-card__head-sub">{t("subscriptionSub")}</p>
              </div>
              <Link href="/account/subscription">{t("membershipManage")}</Link>
            </div>
            <div className="account-membership-banner">
              {activeSub ? (
                <>
                  <div className="account-membership-banner__main">
                    <strong>{activeSub.package?.name ?? activeSub.frequency}</strong>
                    <span className={`order-status order-status--${activeSub.status === "ACTIVE" ? "confirmed" : "pending"}`}>
                      {activeSub.status === "ACTIVE"
                        ? t("statusActive")
                        : t("statusPendingPay")}
                    </span>
                  </div>
                  {activeSub.nextRunAt ? (
                    <p className="account-membership-banner__meta">
                      {t("nextDelivery")}: <strong>{formatDate(activeSub.nextRunAt)}</strong>
                    </p>
                  ) : null}
                  <p className="account-membership-banner__addr">📍 {activeSub.address}</p>
                  <Link href="/account/subscription" className="landing-btn landing-btn--ghost landing-btn--sm">
                    {t("membershipManage")}
                  </Link>
                </>
              ) : (
                <>
                  <p>{t("membershipNone")}</p>
                  <Link href="/account/subscription/enroll" className="landing-btn landing-btn--orange">
                    {t("membershipEnroll")}
                  </Link>
                </>
              )}
            </div>
          </section>

          <section className="account-quick">
            <WhatsAppDirectLink className="account-quick__tile">
              <span>💬</span>
              <strong>{t("quickWhatsapp")}</strong>
              <small>{t("quickWhatsappSub")}</small>
            </WhatsAppDirectLink>
            <Link href="/support" className="account-quick__tile">
              <span>🆘</span>
              <strong>{t("quickSupport")}</strong>
              <small>{t("quickSupportSub")}</small>
            </Link>
            <Link href="/profile" className="account-quick__tile">
              <span>👤</span>
              <strong>{t("quickProfile")}</strong>
              <small>{t("quickProfileSub")}</small>
            </Link>
          </section>
        </>
      )}
    </>
  );
}
