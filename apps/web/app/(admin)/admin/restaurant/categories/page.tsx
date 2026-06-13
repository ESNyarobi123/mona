"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { matchesAdminSearch } from "../../../../../lib/admin-search";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../../../lib/admin-api";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type Category = {
  id: string;
  name: string;
  _count: { products: number; menuItems: number };
};

type CategoryFilter = "all" | "active" | "empty";

function categoryInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function RestaurantCategoriesPage() {
  const { t, tf } = useAdminLocale();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");

  const totalMenuItems = useMemo(
    () => categories.reduce((sum, c) => sum + c._count.menuItems, 0),
    [categories]
  );

  const activeCount = useMemo(
    () => categories.filter((c) => c._count.menuItems > 0).length,
    [categories]
  );

  const emptyCount = categories.length - activeCount;

  const maxItems = useMemo(
    () => Math.max(...categories.map((c) => c._count.menuItems), 1),
    [categories]
  );

  function load() {
    setLoading(true);
    apiGet<Category[]>("/api/grocery/categories?module=RESTAURANT")
      .then(setCategories)
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

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (!matchesAdminSearch(search, [c.name])) return false;
      if (categoryFilter === "active" && c._count.menuItems === 0) return false;
      if (categoryFilter === "empty" && c._count.menuItems > 0) return false;
      return true;
    });
  }, [categories, search, categoryFilter]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/api/grocery/categories", { name: name.trim(), module: "RESTAURANT" });
      setName("");
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(category: Category) {
    setEditing(category);
    setEditName(category.name);
  }

  function closeEdit() {
    setEditing(null);
    setEditName("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await apiPatch(`/api/grocery/categories/${editing.id}`, { name: editName.trim() });
      closeEdit();
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(tf("deleteMenuCategoryConfirm", { name: category.name }))) return;
    setDeletingId(category.id);
    try {
      await apiDelete(`/api/grocery/categories/${category.id}`);
      if (editing?.id === category.id) closeEdit();
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && categories.length === 0) {
    return <AdminLoading label={t("loadingCategories")} />;
  }

  return (
    <div className="admin-dash admin-dash--restaurant">
      <AdminPageHeader
        title={t("categories")}
        actions={
          <div className="admin-overview-quick">
            <Link href="/admin/restaurant/menu" className="admin-btn secondary sm">
              {t("menu")}
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
          </div>
        }
      />

      <p className="admin-page-lead">{t("restaurantCategoriesDesc")}</p>

      <div className="admin-kpi-grid">
        <AdminKpiCard label={t("categories")} value={categories.length} tone="restaurant" icon="📁" />
        <AdminKpiCard label={t("menuItems")} value={totalMenuItems} tone="accent" icon="🍽️" />
        <AdminKpiCard
          label={t("average")}
          value={categories.length ? Math.round(totalMenuItems / categories.length) : 0}
          tone="default"
        />
        <AdminKpiCard label={t("active")} value={activeCount} tone="success" />
      </div>

      <AdminPanel title={t("addCategory")}>
        <div className="admin-panel__body-pad">
          <div className="admin-add-panel">
            <form className="admin-add-panel__form admin-crud-form" onSubmit={create}>
              <label className="admin-crud-form__field admin-crud-form__field--full" htmlFor="restaurant-cat-name">
                <span className="admin-crud-form__label">{t("categoryNameAria")}</span>
                <input
                  id="restaurant-cat-name"
                  className="admin-crud-form__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("categoryName")}
                  required
                  autoComplete="off"
                />
              </label>
              <div className="admin-crud-form__field admin-crud-form__field--full">
                <div className="admin-crud-form__actions">
                  <button type="submit" className="admin-btn" disabled={saving || !name.trim()}>
                    {saving && !editing ? t("saving") : t("add")}
                  </button>
                </div>
              </div>
            </form>
            <aside className="admin-add-preview" aria-live="polite">
              <span className="admin-add-preview__label">{t("livePreview")}</span>
              <p className="admin-add-preview__hint">{t("categoryPreviewHint")}</p>
              <div className="admin-add-preview__card">
                <span className="admin-add-preview__avatar">
                  {categoryInitials(name.trim() || "?")}
                </span>
                <div className="admin-add-preview__copy">
                  <strong>{name.trim() || t("categoryName")}</strong>
                  <small>{tf("categoryItemCount", { n: 0 })}</small>
                </div>
              </div>
              <div className="admin-add-preview__bar">
                <div className="admin-add-preview__bar-fill" />
              </div>
            </aside>
          </div>
        </div>
      </AdminPanel>

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("allCategories")} badge={tf("shownCount", { n: filteredCategories.length })}>
        <div className="admin-category-toolbar">
          <div className="admin-category-toolbar__search">
            <input
              type="search"
              className="admin-crud-form__input"
              placeholder={t("searchCategories")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("searchCategories")}
            />
          </div>
          <div className="admin-category-filter-chips" role="group" aria-label={t("filterCategoryAria")}>
            <button
              type="button"
              className={`admin-category-filter-chip${categoryFilter === "all" ? " is-active" : ""}`}
              onClick={() => setCategoryFilter("all")}
            >
              {t("all")} ({categories.length})
            </button>
            <button
              type="button"
              className={`admin-category-filter-chip${categoryFilter === "active" ? " is-active" : ""}`}
              onClick={() => setCategoryFilter("active")}
            >
              {t("active")} ({activeCount})
            </button>
            <button
              type="button"
              className={`admin-category-filter-chip${categoryFilter === "empty" ? " is-active" : ""}`}
              onClick={() => setCategoryFilter("empty")}
            >
              {t("categoriesEmpty")} ({emptyCount})
            </button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>📁</span>
            <p>{t("noCategoriesYet")}</p>
            <small>{t("restaurantCategoriesDesc")}</small>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🔍</span>
            <p>{t("noCategoriesMatch")}</p>
          </div>
        ) : (
          <ul className="admin-category-grid admin-category-grid--restaurant">
            {filteredCategories.map((c) => {
              const pct = Math.round((c._count.menuItems / maxItems) * 100);
              const busy = deletingId === c.id;

              return (
                <li key={c.id} className="admin-category-card admin-category-card--restaurant">
                  <div className="admin-category-card__head">
                    <span className="admin-category-card__avatar admin-category-card__avatar--restaurant">
                      {categoryInitials(c.name)}
                    </span>
                    <div className="admin-category-card__text">
                      <strong>{c.name}</strong>
                      <small>{tf("categoryItemCount", { n: c._count.menuItems })}</small>
                    </div>
                  </div>
                  <div className="admin-category-card__bar admin-category-card__bar--restaurant">
                    <div className="admin-category-card__bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  {c._count.menuItems > 0 ? (
                    <Link
                      href={`/admin/restaurant/menu?category=${c.id}`}
                      className="admin-category-card__link"
                    >
                      {t("viewCategoryMenu")} →
                    </Link>
                  ) : null}
                  <div className="admin-category-card__actions">
                    <button
                      type="button"
                      className="admin-btn secondary sm"
                      onClick={() => openEdit(c)}
                      disabled={busy}
                    >
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      className="admin-btn danger sm"
                      onClick={() => remove(c)}
                      disabled={busy}
                    >
                      {busy ? t("saving") : t("delete")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>

      {editing ? (
        <div className="admin-modal-overlay" onClick={closeEdit}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("editCategory")}</h2>
            <form className="admin-crud-form" onSubmit={saveEdit}>
              <label className="admin-crud-form__field">
                {t("categoryNameAria")}
                <input
                  className="admin-crud-form__input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="off"
                />
              </label>
              {editing._count.menuItems > 0 ? (
                <p className="admin-crud-form__hint">
                  {tf("categoryItemCount", { n: editing._count.menuItems })}
                </p>
              ) : null}
              <div className="admin-crud-form__actions">
                <button type="submit" className="admin-btn" disabled={saving || !editName.trim()}>
                  {saving ? t("saving") : t("saveChanges")}
                </button>
                <button type="button" className="admin-btn secondary" onClick={closeEdit}>
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
