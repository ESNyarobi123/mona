"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../lib/admin-api";
import { HotProductsRail } from "./HotProductsRail";
import { addToCart, setRestaurantSlot } from "../../lib/cart";
import { formatMoney, toNumber, UNIT_LABELS } from "../../lib/format";
import { tr, slotStatusLabel } from "../../lib/customer-i18n";
import { useAppLocale } from "../providers/AppLocaleProvider";

type MealSlot = "BREAKFAST" | "LUNCH" | "DINNER";

type SlotRow = {
  slot: MealSlot;
  label: string;
  emoji: string;
  orderWindow: string;
  deliversFor: string;
  status: "OPEN" | "CLOSED";
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  price: string | number;
  unit: string;
  mealSlots: MealSlot[];
};

type HotItem = {
  id: string;
  name: string;
  price: number;
  unit: string;
  badge?: string | null;
  imageUrl?: string | null;
  menuItemId?: string;
};

export function RestaurantMenuView() {
  const { locale, t } = useAppLocale();
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [activeSlot, setActiveSlot] = useState<MealSlot>("LUNCH");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [hot, setHot] = useState<HotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState<string | null>(null);

  const loadMenu = useCallback(async (slot: MealSlot) => {
    setLoading(true);
    setError("");
    try {
      const list = await apiGet<MenuItem[]>(`/api/restaurant/menu?slot=${slot}`);
      setItems(list);
      setRestaurantSlot(slot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imeshindwa kupakia menyu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const [ticker, hotData] = await Promise.all([
          apiGet<{ slots: SlotRow[] }>(`/api/restaurant/slots/status?locale=${locale}`),
          apiGet<{ enabled: boolean; items: HotItem[] }>("/api/hot-products?module=RESTAURANT"),
        ]);
        setSlots(ticker.slots);
        if (hotData.enabled) setHot(hotData.items);
        const open = ticker.slots.find((s) => s.status === "OPEN");
        const slot = open?.slot ?? "LUNCH";
        setActiveSlot(slot);
        await loadMenu(slot);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Imeshindwa kupakia");
        setLoading(false);
      }
    }
    init();
  }, [loadMenu, locale]);

  function pickSlot(slot: MealSlot) {
    setActiveSlot(slot);
    loadMenu(slot);
  }

  function handleAdd(item: MenuItem) {
    const slotMeta = slots.find((s) => s.slot === activeSlot);
    if (slotMeta?.status !== "OPEN") {
        setError(`${tr(locale, "slotWindowClosed")} ${activeMeta?.label ?? activeSlot} ${t("slotClosedTryOther")}`);
      return;
    }
    addToCart({
      module: "RESTAURANT",
      menuItemId: item.id,
      name: item.name,
      price: toNumber(item.price),
      unit: item.unit,
      quantity: 1,
    });
    setAdded(item.id);
    setTimeout(() => setAdded(null), 1200);
  }

  const activeMeta = slots.find((s) => s.slot === activeSlot);

  return (
    <div className="store-page">
      <header className="store-page__head">
        <div>
          <p className="store-page__eyebrow">Monana Food</p>
          <h1 className="store-page__title">{tr(locale, "menuTitle")}</h1>
          <p className="store-page__sub">{tr(locale, "menuSub")}</p>
        </div>
        <Link href="/restaurant/checkout" className="landing-btn landing-btn--orange">
          {t("checkout")} →
        </Link>
      </header>

      <div className="slot-tabs" role="tablist" aria-label="Meal slots">
        {slots.map((s) => (
          <button
            key={s.slot}
            type="button"
            role="tab"
            aria-selected={activeSlot === s.slot}
            className={`slot-tab ${activeSlot === s.slot ? "slot-tab--active" : ""} slot-tab--${s.status.toLowerCase()}`}
            onClick={() => pickSlot(s.slot)}
          >
            <span className="slot-tab__emoji">{s.emoji}</span>
            <span className="slot-tab__label">{s.label}</span>
            <span className={`slot-tab__badge slot-tab__badge--${s.status.toLowerCase()}`}>
              {slotStatusLabel(locale, s.status)}
            </span>
            <small>{s.orderWindow}</small>
          </button>
        ))}
      </div>

      {activeMeta ? (
        <p className="store-page__hint">
          {activeMeta.status === "OPEN" ? (
            <>
              <strong>{tr(locale, "slotWindowOpen")}</strong> — {activeMeta.deliversFor} ·{" "}
              {tr(locale, "slotOrderPrefix")}: {activeMeta.orderWindow}
            </>
          ) : (
            <span className="store-page__hint--closed">
              {tr(locale, "slotWindowClosed")} {activeMeta.label} {tr(locale, "slotWindowClosed2")}
            </span>
          )}
        </p>
      ) : null}

      {hot.length > 0 ? (
        <HotProductsRail
          items={hot}
          accent="orange"
          canAdd={activeMeta?.status === "OPEN"}
          addedId={added}
          onAdd={(menuItemId) => {
            const item = items.find((m) => m.id === menuItemId);
            if (item) {
              handleAdd(item);
              return;
            }
            const pick = hot.find((h) => h.menuItemId === menuItemId);
            if (pick) {
              handleAdd({
                id: menuItemId,
                name: pick.name,
                description: null,
                price: pick.price,
                unit: pick.unit,
                mealSlots: [activeSlot],
              });
            }
          }}
        />
      ) : null}

      {error ? <p className="auth-form__error">{error}</p> : null}

      {loading ? (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
          <p>{t("loadingMenu")}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="account-empty">
          <span aria-hidden>🍽️</span>
          <p>{tr(locale, "noItemsForSlot")}</p>
        </div>
      ) : (
        <div className="store-grid">
          {items.map((item) => (
            <article key={item.id} className="store-card">
              {item.imageUrl ? (
                <div className="store-card__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt="" />
                </div>
              ) : (
                <div className="store-card__icon" aria-hidden>
                  🍲
                </div>
              )}
              <h3>{item.name}</h3>
              {item.description ? <p className="store-card__desc">{item.description}</p> : null}
              <p className="store-card__price">
                {formatMoney(item.price)}
                <small> / {UNIT_LABELS[item.unit] ?? item.unit}</small>
              </p>
              <button
                type="button"
                className="landing-btn landing-btn--orange store-card__btn"
                disabled={activeMeta?.status !== "OPEN"}
                onClick={() => handleAdd(item)}
              >
                {added === item.id ? t("addedToCart") : t("addToCart")}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
