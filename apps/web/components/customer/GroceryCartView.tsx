"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  cartTotal,
  clearCart,
  getCart,
  removeFromCart,
  updateQuantity,
  type CartLine,
  type CartState,
} from "../../lib/cart";
import { formatMoney, UNIT_LABELS } from "../../lib/format";
import { useAppLocale } from "../providers/AppLocaleProvider";

export function GroceryCartView() {
  const { t } = useAppLocale();
  const [cart, setCart] = useState<CartState>({ lines: [] });

  function refresh() {
    setCart(getCart());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("monana-cart", refresh);
    return () => window.removeEventListener("monana-cart", refresh);
  }, []);

  const groceryLines = cart.lines.filter((l) => l.module === "GROCERY");
  const restaurantLines = cart.lines.filter((l) => l.module === "RESTAURANT");
  const total = cartTotal(cart);
  const itemCount = cart.lines.reduce((n, l) => n + l.quantity, 0);

  const moduleMeta = useMemo(
    () => ({
      RESTAURANT: { icon: "🍲", label: t("navRestaurant"), color: "navy" as const },
      GROCERY: { icon: "🛒", label: t("navGrocery"), color: "orange" as const },
    }),
    [t]
  );

  return (
    <div className="cart-page">
      <header className="cart-page__hero">
        <div className="cart-page__hero-icon" aria-hidden>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M6 6h15l-1.5 9H7.5L6 6Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
            <path d="M6 6 5 3H2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="9" cy="20" r="1.25" fill="currentColor" />
            <circle cx="18" cy="20" r="1.25" fill="currentColor" />
          </svg>
        </div>
        <div>
          <p className="cart-page__eyebrow">Monana</p>
          <h1 className="cart-page__title">{t("cartTitle")}</h1>
          <p className="cart-page__sub">
            {itemCount > 0
              ? `${itemCount} ${t("items")} · ${formatMoney(total)}`
              : t("cartEmptyCount")}
          </p>
        </div>
      </header>

      {cart.lines.length === 0 ? (
        <div className="cart-empty">
          <div className="cart-empty__icon" aria-hidden>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M6 6h15l-1.5 9H7.5L6 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M6 6 5 3H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="9" cy="20" r="1" fill="currentColor" />
              <circle cx="18" cy="20" r="1" fill="currentColor" />
            </svg>
          </div>
          <h2>{t("cartEmpty")}</h2>
          <p>{t("cartEmptySub")}</p>
          <div className="cart-empty__actions">
            <Link href="/restaurant/menu" className="landing-btn landing-btn--navy">
              {t("browseMenu")}
            </Link>
            <Link href="/grocery/products" className="landing-btn landing-btn--orange">
              {t("browseGrocery")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="cart-page__body">
            {restaurantLines.length > 0 ? (
              <CartSection module="RESTAURANT" lines={restaurantLines} meta={moduleMeta.RESTAURANT} onChange={refresh} checkoutHref="/restaurant/checkout" t={t} />
            ) : null}
            {groceryLines.length > 0 ? (
              <CartSection module="GROCERY" lines={groceryLines} meta={moduleMeta.GROCERY} onChange={refresh} checkoutHref="/grocery/checkout" t={t} />
            ) : null}
          </div>

          <footer className="cart-page__footer">
            <div className="cart-page__footer-row">
              <span>
                {t("total")} ({itemCount})
              </span>
              <strong>{formatMoney(total)}</strong>
            </div>
            <div className="cart-page__footer-actions">
              <button type="button" className="cart-page__clear" onClick={() => { clearCart(); refresh(); }}>
                {t("clearAll")}
              </button>
              <Link href="/grocery/products" className="landing-btn landing-btn--ghost">
                {t("continueShopping")}
              </Link>
            </div>
            {groceryLines.length > 0 ? (
              <Link href="/grocery/checkout" className="landing-btn landing-btn--orange cart-page__checkout">
                {t("checkoutGrocery")}
              </Link>
            ) : null}
            {restaurantLines.length > 0 ? (
              <Link href="/restaurant/checkout" className="landing-btn landing-btn--navy cart-page__checkout">
                {t("checkoutRestaurant")}
              </Link>
            ) : null}
          </footer>
        </>
      )}
    </div>
  );
}

function CartSection({
  lines,
  meta,
  onChange,
  checkoutHref,
  t,
}: {
  module: string;
  lines: CartLine[];
  meta: { icon: string; label: string; color: "navy" | "orange" };
  onChange: () => void;
  checkoutHref: string;
  t: (key: import("../../lib/i18n-messages").UiMessageKey) => string;
}) {
  const sub = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  return (
    <section className={`cart-block cart-block--${meta.color}`}>
      <div className="cart-block__head">
        <div className="cart-block__title">
          <span className="cart-block__module-icon" aria-hidden>
            {meta.icon}
          </span>
          <div>
            <h2>{meta.label}</h2>
            <small>
              {lines.length} {t("types")} · {formatMoney(sub)}
            </small>
          </div>
        </div>
        <Link href={checkoutHref} className="cart-block__checkout-btn">
          {t("checkout")}
        </Link>
      </div>

      <ul className="cart-items">
        {lines.map((line) => (
          <li key={line.key} className="cart-item">
            <div className={`cart-item__thumb cart-item__thumb--${meta.color}`} aria-hidden>
              {meta.icon}
            </div>
            <div className="cart-item__body">
              <strong className="cart-item__name">{line.name}</strong>
              <span className="cart-item__unit">
                {formatMoney(line.price)} / {UNIT_LABELS[line.unit] ?? line.unit}
              </span>
              <div className="cart-item__footer">
                <div className="cart-item__stepper">
                  <button type="button" aria-label={t("reduce")} onClick={() => { updateQuantity(line.key, line.quantity - 1); onChange(); }}>
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button type="button" aria-label={t("increase")} onClick={() => { updateQuantity(line.key, line.quantity + 1); onChange(); }}>
                    +
                  </button>
                </div>
                <strong className="cart-item__line-total">{formatMoney(line.price * line.quantity)}</strong>
              </div>
            </div>
            <button type="button" className="cart-item__remove" aria-label={`${t("remove")} ${line.name}`} onClick={() => { removeFromCart(line.key); onChange(); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
