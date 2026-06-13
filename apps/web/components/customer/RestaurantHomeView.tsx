"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/admin-api";
import { tr, slotStatusLabel, t as translate } from "../../lib/customer-i18n";
import { getCartCount } from "../../lib/cart";
import { CartNavButton } from "./CartNavButton";
import { useAppLocale } from "../providers/AppLocaleProvider";

const SLOT_ORDER = ["BREAKFAST", "LUNCH", "DINNER"] as const;

type MealSlot = "BREAKFAST" | "LUNCH" | "DINNER";

type SlotRow = {
  slot: MealSlot;
  label: string;
  emoji: string;
  orderWindow: string;
  deliversFor: string;
  status: "OPEN" | "CLOSED";
};

export function RestaurantHomeView() {
  const { locale, t } = useAppLocale();
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [timeDisplay, setTimeDisplay] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [loadingSlots, setLoadingSlots] = useState(true);

  useEffect(() => {
    const refreshCart = () => setCartCount(getCartCount());
    refreshCart();
    window.addEventListener("monana-cart", refreshCart);

    apiGet<{ timeDisplay: string; slots: SlotRow[] }>(
      `/api/restaurant/slots/status?locale=${locale}`
    )
      .then((data) => {
        setSlots(data.slots);
        setTimeDisplay(data.timeDisplay);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));

    return () => window.removeEventListener("monana-cart", refreshCart);
  }, [locale]);

  const orderedSlots = SLOT_ORDER.map((key) => slots.find((s) => s.slot === key)).filter(
    (s): s is SlotRow => !!s
  );
  const openSlot = orderedSlots.find((s) => s.status === "OPEN");
  const orderPrefix = tr(locale, "slotOrderPrefix");

  return (
    <div className="store-page store-page--hub">
      <header className="store-hub-hero store-hub-hero--restaurant">
        <div className="store-hub-hero__main">
          <p className="store-hub-hero__eyebrow">Monana Food</p>
          <h1 className="store-hub-hero__title">{t("navRestaurant")}</h1>
          <p className="store-hub-hero__sub">{t("restHubSub")}</p>
        </div>
        <div className="store-hub-hero__actions">
          <Link href="/restaurant/menu" className="landing-btn landing-btn--orange">
            {t("startOrdering")}
          </Link>
          <CartNavButton variant="pill" />
        </div>
      </header>

      {!loadingSlots && orderedSlots.length > 0 ? (
        <section className="store-hub-slots store-hub-slots--horizontal" aria-label="Order windows">
          <div className="store-hub-slots__head">
            <h2 className="store-hub-slots__title">{tr(locale, "slotsToday")}</h2>
            {timeDisplay ? (
              <span className="store-hub-slots__clock">🕐 {timeDisplay} EAT</span>
            ) : null}
          </div>
          <div className="store-hub-slots__row" role="list">
            {orderedSlots.map((s) => (
              <div
                key={s.slot}
                role="listitem"
                className={`store-hub-slot store-hub-slot--${s.status.toLowerCase()} ${
                  s.status === "OPEN" ? "store-hub-slot--active" : ""
                }`}
              >
                <span className="store-hub-slot__emoji" aria-hidden>
                  {s.emoji}
                </span>
                <strong className="store-hub-slot__name">{s.label}</strong>
                <small className="store-hub-slot__delivers">{s.deliversFor}</small>
                <small className="store-hub-slot__time">
                  {orderPrefix}: {s.orderWindow}
                </small>
                <span className="store-hub-slot__badge">{slotStatusLabel(locale, s.status)}</span>
              </div>
            ))}
          </div>
          {openSlot ? (
            <p className="store-hub-slots__hint">
              {tr(locale, "slotOpenHint")} <strong>{openSlot.label}</strong> —{" "}
              <Link href="/restaurant/menu">{tr(locale, "openMenu")}</Link>
            </p>
          ) : (
            <p className="store-hub-slots__hint store-hub-slots__hint--closed">
              {tr(locale, "noSlotOpen")}{" "}
              <Link href="/restaurant/slots">{tr(locale, "slotSchedule")}</Link>.
            </p>
          )}
        </section>
      ) : null}

      <section className="store-hub" aria-label="Actions">
        <h2 className="store-hub__section-title">{t("goTo")}</h2>
        <div className="store-hub__grid">
          <Link href="/restaurant/menu" className="store-hub__card store-hub__card--primary">
            <span className="store-hub__card-icon" aria-hidden>
              📋
            </span>
            <div className="store-hub__card-text">
              <strong>{tr(locale, "menuTitle")}</strong>
              <small>{tr(locale, "menuSub")}</small>
            </div>
            <span className="store-hub__card-arrow" aria-hidden>
              →
            </span>
          </Link>
          <Link href="/restaurant/slots" className="store-hub__card store-hub__card--default">
            <span className="store-hub__card-icon" aria-hidden>
              🕐
            </span>
            <div className="store-hub__card-text">
              <strong>{tr(locale, "slotsPageTitle")}</strong>
              <small>{tr(locale, "slotsPageSub")}</small>
            </div>
            <span className="store-hub__card-arrow" aria-hidden>
              →
            </span>
          </Link>
          <Link
            href="/grocery/cart"
            className={`store-hub__card store-hub__card--default ${
              cartCount > 0 ? "store-hub__card--has-cart" : ""
            }`}
          >
            <span className="store-hub__card-icon" aria-hidden>
              🧺
              {cartCount > 0 ? <span className="store-hub__card-badge">{cartCount}</span> : null}
            </span>
            <div className="store-hub__card-text">
              <strong>{t("yourCart")}</strong>
              <small>{t("viewCartCheckout")}</small>
            </div>
            <span className="store-hub__card-arrow" aria-hidden>
              →
            </span>
          </Link>
          <Link href="/restaurant/orders" className="store-hub__card store-hub__card--default">
            <span className="store-hub__card-icon" aria-hidden>
              🧾
            </span>
            <div className="store-hub__card-text">
              <strong>{t("myOrders")}</strong>
              <small>{t("trackOrders")}</small>
            </div>
            <span className="store-hub__card-arrow" aria-hidden>
              →
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
