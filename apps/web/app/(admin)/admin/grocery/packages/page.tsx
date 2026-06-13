"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../../../lib/admin-api";
import { matchesAdminSearch } from "../../../../../lib/admin-search";
import { formatMoney } from "../../../../../lib/format";
import { packageKindLabel } from "@monana/utils";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type PackageItem = { productId: string; quantity: number };
type Product = { id: string; name: string; unit: string };

type Package = {
  id: string;
  name: string;
  description: string | null;
  kind: "WEEKLY_BASKET" | "MONTHLY_PANTRY";
  price: string | number;
  active: boolean;
  deliveriesPerMonth: number;
  discountPercent?: string | number;
  freeDelivery?: boolean;
  orderCutoffHours?: number;
  items: PackageItem[];
};

const emptyForm = {
  name: "",
  description: "",
  kind: "WEEKLY_BASKET" as Package["kind"],
  price: "",
  deliveriesPerMonth: "1",
  discountPercent: "0",
  freeDelivery: false,
  orderCutoffHours: "48",
  productId: "",
  quantity: "1",
  itemRows: [] as PackageItem[],
};

function packageInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function GroceryPackagesPage() {
  const { locale, t, tf } = useAdminLocale();
  const searchParams = useSearchParams();
  const [packages, setPackages] = useState<Package[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState<"" | Package["kind"]>("");
  const [filterActive, setFilterActive] = useState<"" | "yes" | "no">("");

  function load() {
    setLoading(true);
    Promise.all([
      apiGet<Package[]>("/api/grocery/packages?all=1"),
      apiGet<Product[]>("/api/grocery/products?all=1"),
    ])
      .then(([p, prods]) => {
        setPackages(p);
        setProducts(prods);
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
      total: packages.length,
      active: packages.filter((p) => p.active).length,
      hidden: packages.filter((p) => !p.active).length,
      weekly: packages.filter((p) => p.kind === "WEEKLY_BASKET").length,
    }),
    [packages]
  );

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      if (!matchesAdminSearch(search, [p.name, p.description ?? ""])) return false;
      if (filterKind && p.kind !== filterKind) return false;
      if (filterActive === "yes" && !p.active) return false;
      if (filterActive === "no" && p.active) return false;
      return true;
    });
  }, [packages, search, filterKind, filterActive]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(p: Package) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      kind: p.kind,
      price: String(p.price),
      deliveriesPerMonth: String(p.deliveriesPerMonth),
      discountPercent: String(p.discountPercent ?? 0),
      freeDelivery: p.freeDelivery ?? false,
      orderCutoffHours: String(p.orderCutoffHours ?? 48),
      productId: "",
      quantity: "1",
      itemRows: Array.isArray(p.items) ? (p.items as PackageItem[]) : [],
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function addItemRow() {
    if (!form.productId) return;
    setForm({
      ...form,
      itemRows: [...form.itemRows, { productId: form.productId, quantity: Number(form.quantity) || 1 }],
      productId: "",
      quantity: "1",
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.itemRows.length) {
      alert(t("packageNeedsItems"));
      return;
    }
    setSaving(true);
    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      kind: form.kind,
      price: Number(form.price),
      deliveriesPerMonth: form.kind === "MONTHLY_PANTRY" ? Number(form.deliveriesPerMonth) : 1,
      discountPercent: Number(form.discountPercent) || 0,
      freeDelivery: form.freeDelivery,
      orderCutoffHours: Number(form.orderCutoffHours) || 48,
      items: form.itemRows,
      active: true,
    };
    try {
      if (editing) {
        await apiPatch(`/api/grocery/packages/${editing.id}`, body);
      } else {
        await apiPost("/api/grocery/packages", body);
      }
      closeForm();
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Package) {
    try {
      await apiPatch(`/api/grocery/packages/${p.id}`, { active: !p.active });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    }
  }

  async function remove(p: Package) {
    if (!window.confirm(tf("deletePackageConfirm", { name: p.name }))) return;
    try {
      await apiDelete(`/api/grocery/packages/${p.id}`);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    }
  }

  if (loading && packages.length === 0) {
    return <AdminLoading label={t("loadingPackages")} />;
  }

  return (
    <div className="admin-dash admin-dash--grocery">
      <AdminPageHeader
        title={t("packages")}
        actions={
          <>
            <button type="button" className="admin-btn sm" onClick={openCreate}>
              {t("addPackage")}
            </button>
            <Link href="/admin/grocery/products" className="admin-btn secondary sm">
              {t("products")}
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
          </>
        }
      />

      <p className="admin-page-lead">{t("groceryPackagesDesc")}</p>

      <div className="admin-kpi-grid">
        <AdminKpiCard label={t("packages")} value={stats.total} tone="grocery" icon="📦" />
        <AdminKpiCard label={t("active")} value={stats.active} tone="success" />
        <AdminKpiCard label={t("hidden")} value={stats.hidden} tone="warning" trendUp={false} />
        <AdminKpiCard label={t("packageKind")} value={stats.weekly} tone="accent" icon="📅" />
      </div>

      <AdminPanel title={t("filter")} badge={tf("shownCount", { n: filteredPackages.length })}>
        <div className="admin-menu-toolbar admin-panel__body-pad">
          <div className="admin-menu-toolbar__search">
            <input
              type="search"
              className="admin-crud-form__input"
              placeholder={t("searchPackages")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("searchPackagesAria")}
            />
          </div>
          <select
            className="admin-select admin-menu-toolbar__select"
            value={filterKind}
            onChange={(e) => setFilterKind(e.target.value as "" | Package["kind"])}
            aria-label={t("packageKind")}
          >
            <option value="">{t("allPackageTypes")}</option>
            <option value="WEEKLY_BASKET">{packageKindLabel("WEEKLY_BASKET", locale).title}</option>
            <option value="MONTHLY_PANTRY">{packageKindLabel("MONTHLY_PANTRY", locale).title}</option>
          </select>
          <select
            className="admin-select admin-menu-toolbar__select"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as "" | "yes" | "no")}
            aria-label={t("filterStatusAria")}
          >
            <option value="">{t("allStatuses")}</option>
            <option value="yes">{t("active")}</option>
            <option value="no">{t("hidden")}</option>
          </select>
        </div>
      </AdminPanel>

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("packages")} badge={`${filteredPackages.length}`}>
        {packages.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>📦</span>
            <p>{t("noPackagesYet")}</p>
            <small>{t("clickAddHint")}</small>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🔍</span>
            <p>{t("noPackagesMatch")}</p>
            <small>{t("changeFiltersHint")}</small>
          </div>
        ) : (
          <ul className="admin-menu-grid">
            {filteredPackages.map((p) => {
              const kind = packageKindLabel(p.kind, locale);
              const itemCount = Array.isArray(p.items) ? (p.items as PackageItem[]).length : 0;

              return (
                <li
                  key={p.id}
                  className={`admin-menu-card admin-menu-card--grocery admin-menu-card--package${p.active ? "" : " admin-menu-card--off"}`}
                >
                  <div className="admin-menu-card__head">
                    <span className="admin-menu-card__avatar admin-menu-card__avatar--grocery">
                      {packageInitials(p.name)}
                    </span>
                    <div className="admin-menu-card__title-wrap">
                      <strong className="admin-menu-card__name">{p.name}</strong>
                      <span className="admin-menu-card__menu">{kind.title}</span>
                    </div>
                    <span className={`admin-menu-card__status${p.active ? " admin-menu-card__status--on" : ""}`}>
                      {p.active ? t("statusOn") : t("statusOff")}
                    </span>
                  </div>

                  <div className="admin-menu-card__body">
                    {p.description ? <p className="admin-menu-card__desc">{p.description}</p> : null}
                    <div className="admin-menu-card__meta">
                      <span className="admin-menu-card__price">{formatMoney(p.price)}</span>
                      <span className="admin-kitchen-pill">{tf("packageProductCount", { n: itemCount })}</span>
                      {p.kind === "MONTHLY_PANTRY" ? (
                        <span className="admin-kitchen-pill">
                          {tf("perMonthShort", { n: p.deliveriesPerMonth })}
                        </span>
                      ) : null}
                      {Number(p.discountPercent) > 0 ? (
                        <span className="admin-kitchen-pill admin-kitchen-pill--hot">
                          {tf("upfrontDiscountShort", { n: Number(p.discountPercent) })}
                        </span>
                      ) : null}
                      {p.freeDelivery ? (
                        <span className="admin-kitchen-pill">{t("freeDeliveryBadge")}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="admin-menu-card__actions">
                    <button type="button" className="admin-btn sm" onClick={() => openEdit(p)}>
                      {t("edit")}
                    </button>
                    <button type="button" className="admin-btn sm secondary" onClick={() => toggleActive(p)}>
                      {p.active ? t("disable") : t("enable")}
                    </button>
                    <button type="button" className="admin-btn sm danger" onClick={() => remove(p)}>
                      {t("delete")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>

      {showForm ? (
        <div className="admin-modal-overlay admin-modal-overlay--spacious" onClick={closeForm}>
          <div className="admin-modal admin-modal--catalog admin-modal--package" onClick={(ev) => ev.stopPropagation()}>
            <header className="admin-modal__head">
              <h2>{editing ? t("editPackage") : t("newPackage")}</h2>
              <p className="admin-modal__sub">{t("groceryPackagesDesc")}</p>
            </header>

            <form className="admin-package-modal-form" onSubmit={save}>
              <aside className="admin-package-modal-form__aside">
                <div className="admin-package-preview">
                  <span className="admin-package-preview__label">{t("packagePreview")}</span>
                  <div className="admin-package-preview__avatar">
                    {form.kind === "WEEKLY_BASKET" ? "📅" : "🗓️"}
                  </div>
                  <h3 className="admin-package-preview__name">
                    {form.name.trim() || t("newPackage")}
                  </h3>
                  <p className="admin-package-preview__kind">
                    {packageKindLabel(form.kind, locale).title}
                  </p>
                  {form.price ? (
                    <p className="admin-package-preview__price">{formatMoney(Number(form.price) || 0)}</p>
                  ) : null}
                  <div className="admin-package-preview__chips">
                    <span className="admin-kitchen-pill">
                      {tf("packageProductCount", { n: form.itemRows.length })}
                    </span>
                    {form.kind === "MONTHLY_PANTRY" ? (
                      <span className="admin-kitchen-pill">
                        {tf("perMonthShort", { n: Number(form.deliveriesPerMonth) || 1 })}
                      </span>
                    ) : null}
                    {Number(form.discountPercent) > 0 ? (
                      <span className="admin-kitchen-pill admin-kitchen-pill--hot">
                        {tf("upfrontDiscountShort", { n: Number(form.discountPercent) })}
                      </span>
                    ) : null}
                    {form.freeDelivery ? (
                      <span className="admin-kitchen-pill">{t("freeDeliveryBadge")}</span>
                    ) : null}
                  </div>
                  {form.description ? (
                    <p className="admin-package-preview__desc">{form.description}</p>
                  ) : null}
                </div>
              </aside>

              <div className="admin-package-modal-form__main">
                <section className="admin-form-section">
                  <h3 className="admin-form-section__title">{t("packageDetailsSection")}</h3>
                  <div className="admin-crud-form admin-crud-form--grid">
                    <div className="admin-crud-form__field admin-crud-form__field--full">
                      <label className="admin-crud-form__label" htmlFor="pkg-name">
                        {t("packageName")}
                      </label>
                      <input
                        id="pkg-name"
                        className="admin-crud-form__input"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder={t("packageNamePlaceholder")}
                        required
                      />
                    </div>

                    <div className="admin-crud-form__field admin-crud-form__field--full">
                      <span className="admin-crud-form__label">{t("packageKind")}</span>
                      <div className="admin-package-kind-picker" role="group" aria-label={t("packageKind")}>
                        {(["WEEKLY_BASKET", "MONTHLY_PANTRY"] as const).map((kind) => {
                          const meta = packageKindLabel(kind, locale);
                          const active = form.kind === kind;
                          return (
                            <button
                              key={kind}
                              type="button"
                              className={`admin-package-kind-picker__opt${active ? " is-active" : ""}`}
                              onClick={() => setForm({ ...form, kind })}
                            >
                              <span className="admin-package-kind-picker__icon" aria-hidden>
                                {kind === "WEEKLY_BASKET" ? "📅" : "🗓️"}
                              </span>
                              <span className="admin-package-kind-picker__copy">
                                <strong>{meta.title}</strong>
                                <small>{meta.description}</small>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {form.kind === "MONTHLY_PANTRY" ? (
                      <div className="admin-crud-form__field admin-crud-form__field--full">
                        <label className="admin-crud-form__label" htmlFor="pkg-deliveries">
                          {t("deliveriesPerMonth")}
                        </label>
                        <div className="admin-segmented">
                          <button
                            type="button"
                            className={`admin-segmented__btn${form.deliveriesPerMonth === "1" ? " is-active" : ""}`}
                            onClick={() => setForm({ ...form, deliveriesPerMonth: "1" })}
                          >
                            {t("deliveryOnce")}
                          </button>
                          <button
                            type="button"
                            className={`admin-segmented__btn${form.deliveriesPerMonth === "2" ? " is-active" : ""}`}
                            onClick={() => setForm({ ...form, deliveriesPerMonth: "2" })}
                          >
                            {t("deliveryTwice")}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="admin-crud-form__field admin-crud-form__field--full">
                      <label className="admin-crud-form__label" htmlFor="pkg-desc">
                        {t("descriptionOptional")}
                      </label>
                      <textarea
                        id="pkg-desc"
                        className="admin-crud-form__input admin-crud-form__textarea"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder={t("descriptionPlaceholder")}
                        rows={3}
                      />
                    </div>
                  </div>
                </section>

                <section className="admin-form-section">
                  <h3 className="admin-form-section__title">{t("packagePricingSection")}</h3>
                  <div className="admin-crud-form admin-crud-form--grid">
                    <div className="admin-crud-form__field">
                      <label className="admin-crud-form__label" htmlFor="pkg-price">
                        {t("packagePrice")}
                      </label>
                      <input
                        id="pkg-price"
                        className="admin-crud-form__input"
                        type="number"
                        min="0"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        required
                      />
                    </div>

                    <div className="admin-crud-form__field">
                      <label className="admin-crud-form__label" htmlFor="pkg-discount">
                        {t("discountPercent")}
                      </label>
                      <input
                        id="pkg-discount"
                        className="admin-crud-form__input"
                        type="number"
                        min={0}
                        max={100}
                        value={form.discountPercent}
                        onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                      />
                    </div>

                    <div className="admin-crud-form__field">
                      <label className="admin-crud-form__label" htmlFor="pkg-cutoff">
                        {t("orderCutoffHours")}
                      </label>
                      <input
                        id="pkg-cutoff"
                        className="admin-crud-form__input"
                        type="number"
                        min={12}
                        max={168}
                        value={form.orderCutoffHours}
                        onChange={(e) => setForm({ ...form, orderCutoffHours: e.target.value })}
                      />
                      <p className="admin-crud-form__hint">{t("orderCutoffHint")}</p>
                    </div>

                    <div className="admin-crud-form__field admin-crud-form__field--full">
                      <label
                        className={`admin-toggle-card${form.freeDelivery ? " admin-toggle-card--on" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={form.freeDelivery}
                          onChange={(e) => setForm({ ...form, freeDelivery: e.target.checked })}
                        />
                        <span className="admin-toggle-card__icon" aria-hidden>
                          🚚
                        </span>
                        <span className="admin-toggle-card__copy">
                          <strong>{t("freeDeliveryOffer")}</strong>
                          <small>{t("freeDeliveryBadge")}</small>
                        </span>
                      </label>
                    </div>
                  </div>
                </section>

                <section className="admin-form-section">
                  <h3 className="admin-form-section__title">{t("packageContentsSection")}</h3>
                  <div className="admin-package-items">
                    <div className="admin-package-items__add">
                      <select
                        className="admin-select"
                        value={form.productId}
                        onChange={(e) => setForm({ ...form, productId: e.target.value })}
                        aria-label={t("selectProduct")}
                      >
                        <option value="">{t("selectProduct")}</option>
                        {products.map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            {pr.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="admin-crud-form__input admin-package-items__qty"
                        type="number"
                        min={0.1}
                        step={0.1}
                        placeholder={t("quantity")}
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        aria-label={t("quantity")}
                      />
                      <button
                        type="button"
                        className="admin-btn sm"
                        onClick={addItemRow}
                        disabled={!form.productId}
                      >
                        {t("add")}
                      </button>
                    </div>

                    {form.itemRows.length > 0 ? (
                      <ul className="admin-package-items__list">
                        {form.itemRows.map((row, i) => {
                          const pr = products.find((prod) => prod.id === row.productId);
                          return (
                            <li key={`${row.productId}-${i}`}>
                              <span className="admin-package-items__row-icon" aria-hidden>
                                🏷️
                              </span>
                              <span className="admin-package-items__row-copy">
                                <strong>{pr?.name ?? row.productId}</strong>
                                <small>× {row.quantity}</small>
                              </span>
                              <button
                                type="button"
                                className="admin-package-items__remove"
                                onClick={() =>
                                  setForm({ ...form, itemRows: form.itemRows.filter((_, j) => j !== i) })
                                }
                                aria-label={t("removeRow")}
                              >
                                ×
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="admin-package-items__empty">
                        <span aria-hidden>📦</span>
                        <p>{t("noProductsInPackage")}</p>
                        <small>{t("addProductsHint")}</small>
                      </div>
                    )}
                  </div>
                </section>

                <div className="admin-crud-form__actions admin-package-modal-form__actions">
                  <button type="submit" className="admin-btn" disabled={saving}>
                    {saving ? t("saving") : editing ? t("saveChanges") : t("savePackage")}
                  </button>
                  <button type="button" className="admin-btn secondary" onClick={closeForm}>
                    {t("cancel")}
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
