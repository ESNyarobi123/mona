"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, getStoredUser } from "../../lib/admin-api";
import { clearCart, getCart, type CartState } from "../../lib/cart";
import { formatMoney, UNIT_LABELS } from "../../lib/format";
import { slotLabel, tr } from "../../lib/customer-i18n";
import { useAppLocale } from "../providers/AppLocaleProvider";
import { GroceryDeliverySlotPicker } from "./GroceryDeliverySlotPicker";

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
  const [paymentTiming, setPaymentTiming] = useState<"PAY_NOW" | "PAY_ON_DELIVERY">("PAY_NOW");
  const [deliverySlots, setDeliverySlots] = useState<
    { date: string; label: string; deliveryAt: string; weekLabel: string }[]
  >([]);
  const [productStock, setProductStock] = useState<Map<string, boolean>>(new Map());
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [quote, setQuote] = useState<{
    subtotal: number;
    deliveryFee: number;
    total: number;
    freeDelivery: boolean;
    amountToFreeDelivery: number | null;
  } | null>(null);

  const lines = cart.lines.filter((l) => l.module === module);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const grandTotal = quote?.total ?? subtotal;

  useEffect(() => {
    setCart(getCart());
    const onCart = () => setCart(getCart());
    window.addEventListener("monana-cart", onCart);
    return () => window.removeEventListener("monana-cart", onCart);
  }, []);

  useEffect(() => {
    if (module !== "GROCERY") return;
    apiGet<{
      deliverySlots: { date: string; label: string; deliveryAt: string; weekLabel: string }[];
      products: { id: string; inStock?: boolean }[];
    }>(`/api/grocery/store/on-demand?locale=${locale}`)
      .then((catalog) => {
        setDeliverySlots(catalog.deliverySlots ?? []);
        setProductStock(
          new Map((catalog.products ?? []).map((p) => [p.id, p.inStock !== false]))
        );
        if (catalog.deliverySlots?.[0]) {
          setSelectedSlot(catalog.deliverySlots[0].deliveryAt);
        }
      })
      .catch(() => {
        setDeliverySlots([]);
        setProductStock(new Map());
      });
  }, [module, locale]);

  useEffect(() => {
    if (!lines.length) {
      setQuote(null);
      return;
    }
    const trimmed = address.trim();
    if (trimmed.length < 3) {
      setQuote(null);
      return;
    }

    const timer = window.setTimeout(() => {
      apiPost<{
        subtotal: number;
        deliveryFee: number;
        total: number;
        freeDelivery: boolean;
        amountToFreeDelivery: number | null;
      }>("/api/delivery/quote", {
        module,
        address: trimmed,
        items: lines.map((l) => ({
          productId: l.productId,
          menuItemId: l.menuItemId,
          quantity: l.quantity,
        })),
      })
        .then(setQuote)
        .catch(() => setQuote(null));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [module, address, lines.map((l) => `${l.key}:${l.quantity}`).join("|")]);

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
    if (!note.trim() || note.trim().length < 3) {
      setError(t("extraDetailsRequired"));
      return;
    }
    if (module === "GROCERY" && !selectedSlot) {
      setError(t("pickDeliverySlot"));
      return;
    }
    if (module === "GROCERY") {
      const hasOutOfStock = lines.some(
        (l) => l.productId && productStock.get(l.productId) === false
      );
      if (hasOutOfStock) {
        setError(t("cartHasOutOfStock"));
        return;
      }
    }

    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        userId: user.id,
        module,
        channel: "WEB",
        address: address.trim(),
        note: note.trim(),
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

      if (module === "GROCERY") {
        body.scheduledFor = selectedSlot;
      }

      body.paymentTiming = paymentTiming;

      const order = await apiPost<{
        id: string;
        kind?: string;
      }>("/api/orders", body);

      const remaining = cart.lines.filter((l) => l.module !== module);
      if (remaining.length === 0) {
        clearCart();
      } else {
        const next: CartState = { lines: remaining, restaurantSlot: cart.restaurantSlot };
        localStorage.setItem("monana_cart", JSON.stringify(next));
        window.dispatchEvent(new Event("monana-cart"));
      }

      if (order.kind === "ORDER") {
        setSuccess(t("checkoutPayLaterRequestSent"));
        setTimeout(() => {
          router.push(cfg.ordersHref);
        }, 800);
      } else {
        setSuccess(t("checkoutCreated"));
        setTimeout(() => {
          router.push(`/pay/${order.id}`);
        }, 800);
      }
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
              ? `${itemCount} ${t("items")} · ${formatMoney(grandTotal)}`
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
              <strong>{formatMoney(quote?.subtotal ?? subtotal)}</strong>
            </div>
            {quote ? (
              <div className="checkout-card__subtotal checkout-card__delivery">
                <span>{t("deliveryFee")}</span>
                <strong>{quote.freeDelivery ? t("deliveryFree") : formatMoney(quote.deliveryFee)}</strong>
              </div>
            ) : address.trim().length >= 3 ? (
              <p className="checkout-card__quote-hint">{t("checkoutAddressHint")}</p>
            ) : null}
            {quote?.amountToFreeDelivery ? (
              <p className="checkout-card__free-hint">
                {t("deliveryFreeHint").replace("{amount}", formatMoney(quote.amountToFreeDelivery))}
              </p>
            ) : null}
            <div className="checkout-card__total">
              <span>{t("orderTotal")}</span>
              <strong>{formatMoney(grandTotal)}</strong>
            </div>
          </section>

          <section className="checkout-card">
            <header className="checkout-card__head">
              <span className="checkout-card__step">{module === "GROCERY" ? 2 : 2}</span>
              <div>
                <h2>{module === "GROCERY" ? t("checkoutDeliveryDay") : t("deliveryAddress")}</h2>
                <p>{module === "GROCERY" ? t("checkoutDeliveryHint") : t("checkoutAddressHint")}</p>
              </div>
            </header>

            {module === "GROCERY" ? (
              <GroceryDeliverySlotPicker
                className="checkout-delivery-picker"
                slots={deliverySlots}
                value={selectedSlot}
                onChange={setSelectedSlot}
                emptyLabel={t("noDeliverySlots")}
              />
            ) : null}

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
                  {t("extraDetails")} <em className="checkout-field__req">*</em>
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
                    required
                    minLength={3}
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="checkout-card">
            <header className="checkout-card__head">
              <span className="checkout-card__step">3</span>
              <div>
                <h2>{t("paymentTimingTitle")}</h2>
              </div>
            </header>
            <div className="checkout-payment-timing">
              <label className={`checkout-payment-timing__option ${paymentTiming === "PAY_NOW" ? "checkout-payment-timing__option--active" : ""}`}>
                <input
                  type="radio"
                  name="paymentTiming"
                  value="PAY_NOW"
                  checked={paymentTiming === "PAY_NOW"}
                  onChange={() => setPaymentTiming("PAY_NOW")}
                />
                <span className="checkout-payment-timing__copy">
                  <span className="checkout-payment-timing__label">
                    {t("paymentTimingNow")}
                    <span className="checkout-payment-timing__badge">{t("paymentTimingNowRecommended")}</span>
                  </span>
                </span>
              </label>
              <label className={`checkout-payment-timing__option ${paymentTiming === "PAY_ON_DELIVERY" ? "checkout-payment-timing__option--active" : ""}`}>
                <input
                  type="radio"
                  name="paymentTiming"
                  value="PAY_ON_DELIVERY"
                  checked={paymentTiming === "PAY_ON_DELIVERY"}
                  onChange={() => setPaymentTiming("PAY_ON_DELIVERY")}
                />
                <span>{t("paymentTimingLater")}</span>
              </label>
            </div>
            {paymentTiming === "PAY_ON_DELIVERY" ? (
              <p className="checkout-page__footer-hint">{t("payOnDeliveryNote")}</p>
            ) : null}
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
              <strong>{formatMoney(grandTotal)}</strong>
            </div>
            <p className="checkout-page__footer-hint">
              {paymentTiming === "PAY_ON_DELIVERY" ? t("payOnDeliveryNote") : t("paymentAfterConfirm")}
            </p>
            <button
              type="submit"
              className={`landing-btn checkout-page__submit landing-btn--${cfg.theme === "green" ? "orange" : "navy"}`}
              disabled={loading || !!success}
            >
              {loading
                ? t("submittingOrder")
                : success
                  ? t("orderSubmitted")
                  : paymentTiming === "PAY_ON_DELIVERY"
                    ? t("sendPayLaterRequest")
                    : t("confirmOrderStep")}
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
