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

function categoryInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function GroceryCategoriesPage() {
  const { t, tf } = useAdminLocale();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");

  const totalProducts = useMemo(
    () => categories.reduce((sum, c) => sum + c._count.products, 0),
    [categories]
  );

  const maxProducts = useMemo(
    () => Math.max(...categories.map((c) => c._count.products), 1),
    [categories]
  );

  function load() {
    setLoading(true);
    apiGet<Category[]>("/api/grocery/categories?module=GROCERY")
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

  const filteredCategories = useMemo(
    () => categories.filter((c) => matchesAdminSearch(search, [c.name])),
    [categories, search]
  );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/api/grocery/categories", { name: name.trim(), module: "GROCERY" });
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
    if (!window.confirm(tf("deleteCategoryConfirm", { name: category.name }))) return;
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
    <div className="admin-dash admin-dash--grocery">
      <AdminPageHeader
        title={t("categories")}
        actions={
          <div className="admin-overview-quick">
            <Link href="/admin/grocery/products" className="admin-btn secondary sm">
              {t("products")}
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
          </div>
        }
      />

      <p className="admin-page-lead">{t("groceryCategoriesDesc")}</p>

      <div className="admin-kpi-grid">
        <AdminKpiCard label={t("categories")} value={categories.length} tone="grocery" icon="📁" />
        <AdminKpiCard label={t("products")} value={totalProducts} tone="accent" icon="🏷️" />
        <AdminKpiCard
          label={t("average")}
          value={categories.length ? Math.round(totalProducts / categories.length) : 0}
          tone="default"
        />
        <AdminKpiCard
          label={t("active")}
          value={categories.filter((c) => c._count.products > 0).length}
          tone="success"
        />
      </div>

      <AdminPanel title={t("addCategory")}>
        <div className="admin-panel__body-pad">
          <form className="admin-crud-form admin-crud-form--inline" onSubmit={create}>
            <input
              id="grocery-cat-name"
              className="admin-crud-form__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("categoryName")}
              required
              autoComplete="off"
              aria-label={t("categoryNameAria")}
            />
            <button type="submit" className="admin-btn" disabled={saving || !name.trim()}>
              {saving && !editing ? t("saving") : t("add")}
            </button>
          </form>
        </div>
      </AdminPanel>

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("allCategories")} badge={tf("shownCount", { n: filteredCategories.length })}>
        <div className="admin-menu-toolbar admin-panel__body-pad admin-menu-toolbar--bordered">
          <div className="admin-menu-toolbar__search">
            <input
              type="search"
              className="admin-crud-form__input"
              placeholder={t("searchCategories")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("searchCategories")}
            />
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>📁</span>
            <p>{t("noCategoriesYet")}</p>
            <small>{t("groceryCategoriesDesc")}</small>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🔍</span>
            <p>{t("noCategoriesMatch")}</p>
          </div>
        ) : (
          <ul className="admin-category-grid admin-category-grid--grocery">
            {filteredCategories.map((c) => {
              const pct = Math.round((c._count.products / maxProducts) * 100);
              const busy = deletingId === c.id;

              return (
                <li key={c.id} className="admin-category-card admin-category-card--grocery">
                  <div className="admin-category-card__head">
                    <span className="admin-category-card__avatar admin-category-card__avatar--grocery">
                      {categoryInitials(c.name)}
                    </span>
                    <div className="admin-category-card__text">
                      <strong>{c.name}</strong>
                      <small>{tf("categoryProductCount", { n: c._count.products })}</small>
                    </div>
                  </div>
                  <div className="admin-category-card__bar admin-category-card__bar--grocery">
                    <div className="admin-category-card__bar-fill" style={{ width: `${pct}%` }} />
                  </div>
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
              {editing._count.products > 0 ? (
                <p className="admin-crud-form__hint">
                  {tf("categoryProductCount", { n: editing._count.products })}
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
