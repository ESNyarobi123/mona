"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, getStoredUser } from "../../lib/admin-api";
import { CartNavButton } from "./CartNavButton";
import { HotProductsRail } from "./HotProductsRail";
import { addToCart } from "../../lib/cart";
import { formatMoney, PACKAGE_KIND_LABELS, toNumber, UNIT_LABELS } from "../../lib/format";
import { unitLabelsRecord, type UnitDefinitionLike } from "@monana/utils";
import { useAppLocale } from "../providers/AppLocaleProvider";

type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl?: string | null;
  price: string | number;
  unit: string;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
};

type Category = { id: string; name: string };

type Package = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  price: string | number;
  items: unknown;
  discountPercent: string | number;
  freeDelivery: boolean;
  deliveriesPerMonth: number;
};

type Tab = "products" | "packages";

type HotItem = {
  id: string;
  name: string;
  price: number;
  unit: string;
  badge?: string | null;
  imageUrl?: string | null;
  productId?: string;
};

export function GroceryShopView({ initialTab = "products" }: { initialTab?: Tab }) {
  const { t, locale } = useAppLocale();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [hot, setHot] = useState<HotItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [unitLabels, setUnitLabels] = useState<Record<string, string>>({});
  const [categoryId, setCategoryId] = useState<string | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<UnitDefinitionLike[]>("/api/units?module=GROCERY")
      .then((units) => {
        if (!cancelled) setUnitLabels(unitLabelsRecord(units, locale));
      })
      .catch(() => {
        if (!cancelled) setUnitLabels({});
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ enabled: boolean; items: HotItem[] }>("/api/hot-products?module=GROCERY")
      .then((data) => {
        if (!cancelled && data.enabled) setHot(data.items);
        else if (!cancelled) setHot([]);
      })
      .catch(() => {
        if (!cancelled) setHot([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        if (tab === "products") {
          const q = categoryId ? `?categoryId=${categoryId}` : "";
          const data = await apiGet<{ products: Product[]; categories: Category[] }>(
            `/api/grocery/store/on-demand${q}`
          );
          if (cancelled) return;
          setProducts(data.products);
          setCategories(data.categories);
        } else {
          const list = await apiGet<Package[]>("/api/grocery/packages");
          if (cancelled) return;
          setPackages(list);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tab, categoryId]);

  function handleAdd(p: Product) {
    addToCart({
      module: "GROCERY",
      productId: p.id,
      name: p.name,
      price: toNumber(p.price),
      unit: p.unit,
      quantity: 1,
    });
    setAdded(p.id);
    setTimeout(() => setAdded(null), 1200);
  }

  function packageItemCount(items: unknown) {
    return Array.isArray(items) ? items.length : 0;
  }

  return (
    <div className="store-page">
      <header className="store-page__head">
        <div>
          <p className="store-page__eyebrow">Monana Market</p>
          <h1 className="store-page__title">{t("groceryShopTitle")}</h1>
          <p className="store-page__sub">{t("groceryShopSub")}</p>
        </div>
        <CartNavButton variant="pill" />
      </header>

      <div className="store-toolbar">
        <div className="store-tabs store-tabs--segmented" role="tablist" aria-label="Aina ya ununuzi">
          <button
            type="button"
            role="tab"
            className={`store-tab store-tab--segment ${tab === "products" ? "store-tab--active" : ""}`}
            aria-selected={tab === "products"}
            onClick={() => setTab("products")}
          >
            <span className="store-tab__icon" aria-hidden>
              🛒
            </span>
            <span>{t("products")}</span>
          </button>
          <button
            type="button"
            role="tab"
            className={`store-tab store-tab--segment ${tab === "packages" ? "store-tab--active" : ""}`}
            aria-selected={tab === "packages"}
            onClick={() => setTab("packages")}
          >
            <span className="store-tab__icon" aria-hidden>
              📦
            </span>
            <span>{t("packages")}</span>
          </button>
        </div>

        {tab === "products" && categories.length > 0 ? (
          <div className="store-filters-panel">
            <p className="store-filters-panel__label">{t("categories")}</p>
            <div className="store-filters" role="group" aria-label={t("categories")}>
              <button
                type="button"
                className={`store-chip store-chip--all ${categoryId === "" ? "store-chip--active" : ""}`}
                onClick={() => setCategoryId("")}
              >
                {t("all")}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`store-chip ${categoryId === c.id ? "store-chip--active" : ""}`}
                  onClick={() => setCategoryId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="auth-form__error">{error}</p> : null}

      {loading ? (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
          <p>{t("loading")}</p>
        </div>
      ) : tab === "products" ? (
        <>
          {hot.length > 0 ? (
            <HotProductsRail
              title={t("hotRailTitle")}
              subtitle={t("hotRailSub")}
              items={hot}
              accent="green"
              canAdd
              addedId={added}
              onAdd={(productId) => {
                const p = products.find((x) => x.id === productId);
                if (p) {
                  handleAdd(p);
                  return;
                }
                const pick = hot.find((h) => (h.productId ?? h.id) === productId);
                if (pick) {
                  handleAdd({
                    id: productId,
                    name: pick.name,
                    description: null,
                    price: pick.price,
                    unit: pick.unit,
                    categoryId: null,
                  });
                }
              }}
            />
          ) : null}

          {products.length === 0 ? (
            <div className="account-empty">
              <span aria-hidden>🛒</span>
              <p>{t("noProductsCategory")}</p>
            </div>
          ) : (
            <div className="store-grid">
              {products.map((p) => (
                <article key={p.id} className="store-card">
                  {p.imageUrl ? (
                    <div className="store-card__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt="" />
                    </div>
                  ) : (
                    <div className="store-card__icon" aria-hidden>
                      🥬
                    </div>
                  )}
                  <h3>{p.name}</h3>
                  {p.description ? <p className="store-card__desc">{p.description}</p> : null}
                  {p.category ? <span className="store-card__cat">{p.category.name}</span> : null}
                  <p className="store-card__price">
                    {formatMoney(p.price)}
                    <small> / {unitLabels[p.unit] ?? UNIT_LABELS[p.unit] ?? p.unit}</small>
                  </p>
                  <button
                    type="button"
                    className="landing-btn landing-btn--orange store-card__btn"
                    onClick={() => handleAdd(p)}
                  >
                    {added === p.id ? t("addedToCart") : t("addToCart")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      ) : packages.length === 0 ? (
        <div className="account-empty">
          <span aria-hidden>📦</span>
          <p>{t("noPackages")}</p>
        </div>
      ) : (
        <>
          <article className="store-card store-card--package store-card--custom">
            <span className="store-card__kind">{t("enrollCustomPackage")}</span>
            <h3>{t("enrollCustomPackage")}</h3>
            <p className="store-card__desc">{t("enrollCustomPackageSub")}</p>
            <Link
              href={
                getStoredUser()
                  ? "/account/membership/enroll"
                  : "/login?next=/account/membership/enroll"
              }
              className="landing-btn landing-btn--orange store-card__btn"
            >
              {getStoredUser() ? t("joinMembership") : t("joinLogin")}
            </Link>
          </article>
          <div className="store-grid store-grid--packages">
          {packages.map((pkg) => (
            <article key={pkg.id} className="store-card store-card--package">
              <span className="store-card__kind">{PACKAGE_KIND_LABELS[pkg.kind] ?? pkg.kind}</span>
              <h3>{pkg.name}</h3>
              {pkg.description ? <p className="store-card__desc">{pkg.description}</p> : null}
              <ul className="store-card__perks">
                <li>
                  {packageItemCount(pkg.items)} {t("itemsInPackage")}
                </li>
                {Number(pkg.discountPercent) > 0 ? (
                  <li>
                    {t("discount")} {pkg.discountPercent}%
                  </li>
                ) : null}
                {pkg.freeDelivery ? <li>{t("freeDelivery")}</li> : null}
                {pkg.deliveriesPerMonth > 1 ? (
                  <li>
                    {pkg.deliveriesPerMonth} {t("deliveriesPerMonth")}
                  </li>
                ) : null}
              </ul>
              <p className="store-card__price">{formatMoney(pkg.price)}</p>
              <Link
                href={
                  getStoredUser()
                    ? `/account/membership/enroll?packageId=${pkg.id}`
                    : `/login?next=${encodeURIComponent(`/account/membership/enroll?packageId=${pkg.id}`)}`
                }
                className="landing-btn landing-btn--navy store-card__btn"
              >
                {getStoredUser() ? t("joinMembership") : t("joinLogin")}
              </Link>
            </article>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
