"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "../../lib/admin-api";
import { getCart, getCartCount } from "../../lib/cart";
import { CartNavButton } from "./CartNavButton";
import { useAppLocale } from "../providers/AppLocaleProvider";

type Catalog = {
  products: { id: string }[];
  categories: { id: string; name: string }[];
};

export function GroceryHomeView() {
  const { locale, t } = useAppLocale();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [packageCount, setPackageCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [groceryInCart, setGroceryInCart] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refreshCart = () => {
      const cart = getCart();
      setCartCount(getCartCount());
      setGroceryInCart(
        cart.lines.filter((l) => l.module === "GROCERY").reduce((n, l) => n + l.quantity, 0)
      );
    };
    refreshCart();
    window.addEventListener("monana-cart", refreshCart);

    Promise.all([
      apiGet<Catalog>("/api/grocery/store/on-demand"),
      apiGet<{ id: string }[]>("/api/grocery/packages"),
    ])
      .then(([cat, pkgs]) => {
        setCatalog(cat);
        setPackageCount(pkgs.length);
      })
      .catch(() => {
        setCatalog(null);
        setPackageCount(0);
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener("monana-cart", refreshCart);
  }, []);

  const productCount = catalog?.products.length ?? 0;
  const categoryCount = catalog?.categories.length ?? 0;

  const hubLinks = [
    { href: "/grocery/products", icon: "🛒", title: t("hubProducts"), desc: t("hubProductsDesc"), variant: "primary" as const, cartKey: null },
    { href: "/grocery/packages", icon: "📦", title: t("hubPackages"), desc: t("hubPackagesDesc"), variant: "accent" as const, cartKey: null },
    { href: "/grocery/cart", icon: "🧺", title: t("yourCart"), desc: t("hubCartDesc"), variant: "default" as const, cartKey: "cart" as const },
    { href: "/grocery/orders", icon: "🧾", title: t("myOrders"), desc: t("trackOrders"), variant: "default" as const, cartKey: null },
  ];

  return (
    <div className="store-page store-page--hub">
      <header className="store-hub-hero store-hub-hero--grocery">
        <div className="store-hub-hero__main">
          <p className="store-hub-hero__eyebrow">Monana Market</p>
          <h1 className="store-hub-hero__title">{t("groceryHubTitle")}</h1>
          <p className="store-hub-hero__sub">{t("groceryHubSub")}</p>
        </div>
        <div className="store-hub-hero__actions">
          <Link href="/grocery/products" className="landing-btn landing-btn--orange">
            {t("openShop")}
          </Link>
          <CartNavButton variant="pill" />
        </div>
      </header>

      {!loading ? (
        <section className="store-hub-stats store-hub-stats--grocery" aria-label="Shop overview">
          <h2 className="store-hub-slots__title">{t("storeToday")}</h2>
          <div className="store-hub-stats__row">
            <div className="store-hub-stat-pill">
              <span className="store-hub-stat-pill__value">{productCount}</span>
              <span className="store-hub-stat-pill__label">{t("products")}</span>
            </div>
            <div className="store-hub-stat-pill">
              <span className="store-hub-stat-pill__value">{categoryCount}</span>
              <span className="store-hub-stat-pill__label">{t("categories")}</span>
            </div>
            <div className="store-hub-stat-pill">
              <span className="store-hub-stat-pill__value">{packageCount}</span>
              <span className="store-hub-stat-pill__label">{t("packages")}</span>
            </div>
          </div>
          {groceryInCart > 0 ? (
            <p className="store-hub-slots__hint">
              {t("cartHintYou")} <strong>{groceryInCart}</strong> {t("cartHint")}{" "}
              <Link href="/grocery/cart">{t("goCart")}</Link>
            </p>
          ) : (
            <p className="store-hub-slots__hint">
              {t("startProducts")} <Link href="/grocery/products">{t("products").toLowerCase()}</Link> {t("orPackages")}{" "}
              <Link href="/grocery/packages">{t("packages").toLowerCase()}</Link>.
            </p>
          )}
        </section>
      ) : (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
          <p>{t("loadingShop")}</p>
        </div>
      )}

      <section className="store-hub" aria-label="Actions">
        <h2 className="store-hub__section-title">{t("goTo")}</h2>
        <div className="store-hub__grid">
          {hubLinks.map((item) => {
            const showBadge = item.cartKey === "cart" && cartCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`store-hub__card store-hub__card--${item.variant} ${
                  showBadge ? "store-hub__card--has-cart" : ""
                }`}
              >
                <span className="store-hub__card-icon" aria-hidden>
                  {item.icon}
                  {showBadge ? <span className="store-hub__card-badge">{cartCount}</span> : null}
                </span>
                <div className="store-hub__card-text">
                  <strong>{item.title}</strong>
                  <small>{item.desc}</small>
                </div>
                <span className="store-hub__card-arrow" aria-hidden>
                  →
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
