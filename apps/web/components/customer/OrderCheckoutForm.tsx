"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, getStoredUser } from "../../lib/admin-api";
import { clearCart, getCart, type CartState } from "../../lib/cart";
import { formatMoney, UNIT_LABELS } from "../../lib/format";
import { slotLabel, tr } from "../../lib/customer-i18n";
import { useAppLocale } from "../providers/AppLocaleProvider";

type Module = "RESTAURANT" | "GROCERY";

type Props = {
  module: Module;
  title: string;
};

const MODULE_CONFIG = {
  GROCERY: {
    eyebrow: "Monana Market",
    icon: "🛒",
    theme: "green" as const,
    subtitleKey: "checkoutGrocerySub" as const,
    backHref: "/grocery/cart",
    shopHref: "/grocery/products",
    ordersHref: "/grocery/orders",
    shopLabelKey: "backToShop" as const,
    emptyLabelKey: "navGrocery" as const,
  },
  RESTAURANT: {
    eyebrow: "Monana Food",
    icon: "🍲",
    theme: "navy" as const,
    subtitleKey: "checkoutRestSub" as const,
    backHref: "/grocery/cart",
    shopHref: "/restaurant/menu",
    ordersHref: "/restaurant/orders",
    shopLabelKey: "backToMenu" as const,
    emptyLabelKey: "navRestaurant" as const,
  },
};

export function OrderCheckoutForm({ module, title }: Props) {
  const router = useRouter();
  const { locale, t } = useAppLocale();
  const cfg = MODULE_CONFIG[module];
  const [cart, setCart] = useState<CartState>({ lines: [] });
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const lines = cart.lines.filter((l) => l.module === module);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  useEffect(() => {
    setCart(getCart());
    const onCart = () => setCart(getCart());
    window.addEventListener("monana-cart", onCart);
    return () => window.removeEventListener("monana-cart", onCart);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const user = getStoredUser();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (lines.length === 0) {
      setError(t("cartEmptyModule"));
      return;
    }
    if (!address.trim()) {
      setError(t("addressRequired"));
      return;
    }

    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        userId: user.id,
        module,
        channel: "WEB",
        address: address.trim(),
        note: note.trim() || undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          menuItemId: l.menuItemId,
          quantity: l.quantity,
        })),
      };

      if (module === "RESTAURANT") {
        if (!cart.restaurantSlot) throw new Error(t("pickSlotFirst"));
        body.mealSlot = cart.restaurantSlot;
      }

      const order = await apiPost<{ id: string }>("/api/orders", body);

      const remaining = cart.lines.filter((l) => l.module !== module);
      if (remaining.length === 0) {
        clearCart();
      } else {
        const next: CartState = { lines: remaining, restaurantSlot: cart.restaurantSlot };
        localStorage.setItem("monana_cart", JSON.stringify(next));
        window.dispatchEvent(new Event("monana-cart"));
      }

      setSuccess(`${t("orderCreated").replace("!", "")} #${order.id.slice(-6).toUpperCase()}!`);
      setTimeout(() => {
        router.push(`/pay/${order.id}`);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orderFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`checkout-page checkout-page--${cfg.theme}`}>
      <header className="checkout-page__hero">
        <div className={`checkout-page__hero-icon checkout-page__hero-icon--${cfg.theme}`} aria-hidden>
          <span>{cfg.icon}</span>
        </div>
        <div className="checkout-page__hero-text">
          <p className="checkout-page__eyebrow">{cfg.eyebrow}</p>
          <h1 className="checkout-page__title">{title}</h1>
          <p className="checkout-page__sub">
            {lines.length > 0
              ? `${itemCount} ${t("items")} · ${formatMoney(total)}`
              : t(cfg.subtitleKey)}
          </p>
        </div>
      </header>

      {lines.length > 0 ? (
        <Link href={cfg.backHref} className="checkout-page__back">
          ← {t("backToCart")}
        </Link>
      ) : null}

      {lines.length === 0 ? (
        <div className="checkout-empty">
          <div className="checkout-empty__icon" aria-hidden>
            {cfg.icon}
          </div>
          <h2>{t("cartEmpty")}</h2>
          <p>
            {t("cartEmptyGoShop")} {t(cfg.emptyLabelKey).toLowerCase()}. {t("addItemsFirst")}
          </p>
          <div className="checkout-empty__actions">
            <Link
              href={cfg.shopHref}
              className={`landing-btn landing-btn--${cfg.theme === "green" ? "orange" : "navy"}`}
            >
              {t(cfg.shopLabelKey)}
            </Link>
            <Link href="/grocery/cart" className="landing-btn landing-btn--ghost">
              {t("viewCart")}
            </Link>
          </div>
        </div>
      ) : (
        <form className="checkout-page__form" onSubmit={submit}>
          {module === "RESTAURANT" && cart.restaurantSlot ? (
            <div className="checkout-slot">
              <span className="checkout-slot__icon" aria-hidden>
                🕐
              </span>
              <div>
                <span className="checkout-slot__label">{tr(locale, "checkoutSlotLabel")}</span>
                <strong>{slotLabel(locale, cart.restaurantSlot)}</strong>
              </div>
            </div>
          ) : null}

          <section className="checkout-card">
            <header className="checkout-card__head">
              <span className="checkout-card__step">1</span>
              <div>
                <h2>{t("orderSummary")}</h2>
                <p>
                  {lines.length} {t("types")} · {itemCount} {t("items")}
                </p>
              </div>
            </header>
            <ul className="checkout-lines">
              {lines.map((line) => (
                <li key={line.key} className="checkout-line">
                  <div className={`checkout-line__thumb checkout-line__thumb--${cfg.theme}`} aria-hidden>
                    {cfg.icon}
                  </div>
                  <div className="checkout-line__body">
                    <strong className="checkout-line__name">{line.name}</strong>
                    <span className="checkout-line__meta">
                      {formatMoney(line.price)} / {UNIT_LABELS[line.unit] ?? line.unit}
                    </span>
                    <span className="checkout-line__qty">
                      {t("qtyLabel")}: ×{line.quantity}
                    </span>
                  </div>
                  <strong className="checkout-line__total">{formatMoney(line.price * line.quantity)}</strong>
                </li>
              ))}
            </ul>
            <div className="checkout-card__subtotal">
              <span>{t("subtotal")}</span>
              <strong>{formatMoney(total)}</strong>
            </div>
          </section>

          <section className="checkout-card">
            <header className="checkout-card__head">
              <span className="checkout-card__step">2</span>
              <div>
                <h2>{t("deliveryAddress")}</h2>
                <p>{t("checkoutAddressHint")}</p>
              </div>
            </header>

            <div className="checkout-fields">
              <label className="checkout-field">
                <span className="checkout-field__label">
                  {t("fullAddress")} <em className="checkout-field__req">*</em>
                </span>
                <div className="checkout-field__wrap">
                  <span className="checkout-field__icon" aria-hidden>
                    📍
                  </span>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("checkoutAddressPlaceholder")}
                    required
                    autoComplete="street-address"
                  />
                </div>
              </label>

              <label className="checkout-field">
                <span className="checkout-field__label">
                  {t("extraDetails")}{" "}
                  <span className="checkout-field__optional">{t("optional")}</span>
                </span>
                <div className="checkout-field__wrap checkout-field__wrap--textarea">
                  <span className="checkout-field__icon checkout-field__icon--top" aria-hidden>
                    💬
                  </span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder={t("notePlaceholder")}
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="checkout-trust">
            <span aria-hidden>🔒</span>
            <p>{t("checkoutTrust")}</p>
          </section>

          {error ? <p className="auth-form__error checkout-page__alert">{error}</p> : null}
          {success ? <p className="auth-toast auth-toast--success checkout-page__alert">{success}</p> : null}

          <footer className="checkout-page__footer">
            <div className="checkout-page__footer-row">
              <span>{t("youPay")}</span>
              <strong>{formatMoney(total)}</strong>
            </div>
            <p className="checkout-page__footer-hint">{t("paymentAfterConfirm")}</p>
            <button
              type="submit"
              className={`landing-btn checkout-page__submit landing-btn--${cfg.theme === "green" ? "orange" : "navy"}`}
              disabled={loading || !!success}
            >
              {loading ? t("submittingOrder") : success ? t("orderSubmitted") : t("confirmOrderStep")}
            </button>
            <Link href={cfg.shopHref} className="checkout-page__continue">
              {t(cfg.shopLabelKey)}
            </Link>
          </footer>
        </form>
      )}
    </div>
  );
}
