"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../../../lib/admin-api";
import { formatPricePerUnit, unitLabel } from "@monana/utils";
import { UnitSelect } from "../../../../../components/admin/UnitSelect";
import { AdminImageField } from "../../../../../components/admin/AdminImageField";
import { AdminHotToggle } from "../../../../../components/admin/AdminHotToggle";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string | number;
  unit: string;
  available: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
};

type Category = { id: string; name: string };

type ManualPick = {
  id: string;
  productId: string | null;
  badge: string | null;
  active: boolean;
};

type HotAdminView = {
  manualPicks: ManualPick[];
};

type ProductFormState = {
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  categoryId: string;
  unit: string;
  available: boolean;
  isHot: boolean;
  hotBadge: string;
};

const EMPTY_FORM: ProductFormState = {
  name: "",
  description: "",
  imageUrl: "",
  price: "",
  categoryId: "",
  unit: "KG",
  available: true,
  isHot: false,
  hotBadge: "🔥 Hot",
};

function productInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function productToForm(product: Product, hot?: ManualPick | null): ProductFormState {
  return {
    name: product.name,
    description: product.description ?? "",
    imageUrl: product.imageUrl ?? "",
    price: String(Number(product.price)),
    categoryId: product.categoryId ?? product.category?.id ?? "",
    unit: product.unit ?? "PIECE",
    available: product.available,
    isHot: hot?.active ?? false,
    hotBadge: hot?.badge ?? "🔥 Hot",
  };
}

export default function GroceryProductsPage() {
  const { t, tf } = useAdminLocale();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hotByProductId, setHotByProductId] = useState<Map<string, ManualPick>>(new Map());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterAvailable, setFilterAvailable] = useState<"" | "yes" | "no">("");
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  function loadHotPicks() {
    return apiGet<HotAdminView>("/api/admin/hot-products?module=GROCERY").then((view) => {
      const map = new Map<string, ManualPick>();
      for (const pick of view.manualPicks) {
        if (pick.productId && pick.active) map.set(pick.productId, pick);
      }
      setHotByProductId(map);
    });
  }

  function load() {
    setLoading(true);
    Promise.all([
      apiGet<Product[]>("/api/grocery/products?all=1"),
      apiGet<Category[]>("/api/grocery/categories?module=GROCERY"),
      loadHotPicks(),
    ])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const stats = useMemo(
    () => ({
      total: products.length,
      available: products.filter((p) => p.available).length,
      hidden: products.filter((p) => !p.available).length,
      hot: hotByProductId.size,
      categories: categories.length,
    }),
    [products, categories, hotByProductId]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      if (q && !product.name.toLowerCase().includes(q)) return false;
      if (filterCategory && product.category?.id !== filterCategory && product.categoryId !== filterCategory) {
        return false;
      }
      if (filterAvailable === "yes" && !product.available) return false;
      if (filterAvailable === "no" && product.available) return false;
      return true;
    });
  }, [products, search, filterCategory, filterAvailable]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalMode("create");
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setForm(productToForm(product, hotByProductId.get(product.id)));
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
  }

  async function toggleAvailable(product: Product) {
    try {
      await apiPatch(`/api/grocery/products/${product.id}`, { available: !product.available });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    }
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(tf("deleteProductConfirm", { name: product.name }))) return;
    try {
      await apiDelete(`/api/grocery/products/${product.id}`);
      if (editingId === product.id) closeModal();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    }
  }

  async function syncHotStatus(productId: string) {
    await apiPost("/api/admin/hot-products/toggle", {
      module: "GROCERY",
      productId,
      hot: form.isHot,
      badge: form.hotBadge.trim() || "🔥 Hot",
    });
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || "",
        price: Number(form.price),
        unit: form.unit,
        categoryId: form.categoryId || null,
        available: form.available,
      };

      let productId = editingId;

      if (modalMode === "edit" && editingId) {
        await apiPatch(`/api/grocery/products/${editingId}`, payload);
      } else {
        const created = await apiPost<Product>("/api/grocery/products", {
          ...payload,
          categoryId: form.categoryId || undefined,
        });
        productId = created.id;
      }

      if (productId) {
        await syncHotStatus(productId);
      }

      closeModal();
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading && products.length === 0) {
    return <AdminLoading label={t("loadingProducts")} />;
  }

  return (
    <div className="admin-dash admin-dash--grocery">
      <AdminPageHeader
        title={t("products")}
        actions={
          <>
            <button type="button" className="admin-btn sm" onClick={openCreate}>
              {t("addProduct")}
            </button>
            <Link href="/admin/grocery/categories" className="admin-btn secondary sm">
              {t("categories")}
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
          </>
        }
      />

      <p className="admin-page-lead">
        {t("groceryProductsDesc")}{" "}
        <Link href="/admin/grocery/categories">{t("categories")} →</Link>
      </p>

      <div className="admin-kpi-grid">
        <AdminKpiCard label={t("products")} value={stats.total} tone="grocery" icon="🏷️" />
        <AdminKpiCard label={t("available")} value={stats.available} tone="success" />
        <AdminKpiCard label={t("hotPick")} value={stats.hot} tone="accent" icon="🔥" />
        <AdminKpiCard label={t("categories")} value={stats.categories} tone="default" icon="📁" />
      </div>

      <AdminPanel title={t("filter")} badge={tf("shownCount", { n: filteredProducts.length })}>
        <div className="admin-menu-toolbar admin-panel__body-pad">
          <div className="admin-menu-toolbar__search">
            <input
              type="search"
              className="admin-crud-form__input"
              placeholder={t("searchProducts")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("searchProductsAria")}
            />
          </div>
          <select
            className="admin-select admin-menu-toolbar__select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label={t("filterCategoryAria")}
          >
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="admin-select admin-menu-toolbar__select"
            value={filterAvailable}
            onChange={(e) => setFilterAvailable(e.target.value as "" | "yes" | "no")}
            aria-label={t("filterStatusAria")}
          >
            <option value="">{t("allStatuses")}</option>
            <option value="yes">{t("available")}</option>
            <option value="no">{t("hidden")}</option>
          </select>
        </div>
      </AdminPanel>

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("products")} badge={`${filteredProducts.length}`}>
        {products.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🏷️</span>
            <p>{t("noProductsYet")}</p>
            <small>{t("clickAddHint")}</small>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🔍</span>
            <p>{t("noProductsMatch")}</p>
            <small>{t("changeFiltersHint")}</small>
          </div>
        ) : (
          <ul className="admin-menu-grid">
            {filteredProducts.map((product) => {
              const hot = hotByProductId.get(product.id);
              return (
                <li
                  key={product.id}
                  className={`admin-menu-card admin-menu-card--grocery${product.available ? "" : " admin-menu-card--off"}`}
                >
                  <div className="admin-menu-card__head">
                    {product.imageUrl ? (
                      <span className="admin-menu-card__thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.imageUrl} alt="" />
                      </span>
                    ) : (
                      <span className="admin-menu-card__avatar admin-menu-card__avatar--grocery">
                        {productInitials(product.name)}
                      </span>
                    )}
                    <div className="admin-menu-card__title-wrap">
                      <strong className="admin-menu-card__name">{product.name}</strong>
                      <span className="admin-menu-card__menu">
                        {product.category?.name ?? t("noCategory")}
                      </span>
                    </div>
                    <span
                      className={`admin-menu-card__status${product.available ? " admin-menu-card__status--on" : ""}`}
                    >
                      {product.available ? t("statusOn") : t("statusOff")}
                    </span>
                  </div>

                  <div className="admin-menu-card__body">
                    <div className="admin-menu-card__meta">
                      {hot ? (
                        <span className="admin-kitchen-pill admin-kitchen-pill--hot">{hot.badge ?? "🔥 Hot"}</span>
                      ) : null}
                      <span className="admin-menu-card__price">
                        {formatPricePerUnit(Number(product.price), product.unit ?? "PIECE")}
                      </span>
                      <span className="admin-kitchen-pill">{unitLabel(product.unit ?? "PIECE")}</span>
                    </div>

                    {product.description ? (
                      <p className="admin-menu-card__desc">{product.description}</p>
                    ) : null}
                  </div>

                  <div className="admin-menu-card__actions">
                    <button type="button" className="admin-btn sm" onClick={() => openEdit(product)}>
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      className="admin-btn sm secondary"
                      onClick={() => toggleAvailable(product)}
                    >
                      {product.available ? t("disable") : t("enable")}
                    </button>
                    <button type="button" className="admin-btn sm danger" onClick={() => removeProduct(product)}>
                      {t("delete")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>

      {modalMode ? (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal admin-modal--catalog" onClick={(e) => e.stopPropagation()}>
            <header className="admin-modal__head">
              <h2>{modalMode === "edit" ? t("editProduct") : t("newProduct")}</h2>
              <p className="admin-modal__sub">{t("groceryProductsDesc")}</p>
            </header>

            <form className="admin-item-modal-form" onSubmit={saveProduct}>
              <aside className="admin-item-modal-form__aside">
                <AdminImageField
                  label={t("productImage")}
                  value={form.imageUrl}
                  onChange={(imageUrl) => setForm({ ...form, imageUrl })}
                  initials={productInitials(form.name || "?")}
                  placeholderIcon="🏷️"
                />
                <AdminHotToggle
                  checked={form.isHot}
                  onChange={(isHot) => setForm({ ...form, isHot })}
                  badge={form.hotBadge}
                  onBadgeChange={(hotBadge) => setForm({ ...form, hotBadge })}
                  disabled={saving}
                />
              </aside>

              <div className="admin-item-modal-form__main admin-crud-form admin-crud-form--grid">
                <div className="admin-crud-form__field admin-crud-form__field--full">
                  <label className="admin-crud-form__label" htmlFor="product-name">
                    {t("productName")}
                  </label>
                  <input
                    id="product-name"
                    className="admin-crud-form__input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t("productNamePlaceholder")}
                    required
                  />
                </div>

                <div className="admin-crud-form__field admin-crud-form__field--full">
                  <label className="admin-crud-form__label" htmlFor="product-desc">
                    {t("descriptionOptional")}
                  </label>
                  <textarea
                    id="product-desc"
                    className="admin-crud-form__input admin-crud-form__textarea"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t("descriptionPlaceholder")}
                    rows={2}
                  />
                </div>

                <div className="admin-crud-form__field">
                  <label className="admin-crud-form__label" htmlFor="product-price">
                    {t("priceTzs")}
                  </label>
                  <input
                    id="product-price"
                    className="admin-crud-form__input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>

                <div className="admin-crud-form__field">
                  <UnitSelect
                    value={form.unit}
                    onChange={(unit) => setForm({ ...form, unit })}
                    label={t("unitLabel")}
                  />
                </div>

                <div className="admin-crud-form__field">
                  <label className="admin-crud-form__label" htmlFor="product-category">
                    {t("categories")}
                  </label>
                  <select
                    id="product-category"
                    className="admin-select"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">{t("none")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 ? (
                    <p className="admin-crud-form__hint">
                      <Link href="/admin/grocery/categories">{t("addCategoryFirst")}</Link>
                    </p>
                  ) : null}
                </div>

                <div className="admin-crud-form__field">
                  <label className="admin-crud-form__label" htmlFor="product-available">
                    {t("status")}
                  </label>
                  <select
                    id="product-available"
                    className="admin-select"
                    value={form.available ? "yes" : "no"}
                    onChange={(e) => setForm({ ...form, available: e.target.value === "yes" })}
                  >
                    <option value="yes">{t("availableInStore")}</option>
                    <option value="no">{t("hidden")}</option>
                  </select>
                </div>

                <div className="admin-crud-form__actions admin-crud-form__field--full">
                  <button type="submit" className="admin-btn" disabled={saving}>
                    {saving ? t("saving") : modalMode === "edit" ? t("saveChanges") : t("saveProduct")}
                  </button>
                  <button type="button" className="admin-btn secondary" onClick={closeModal}>
                    {t("close")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
