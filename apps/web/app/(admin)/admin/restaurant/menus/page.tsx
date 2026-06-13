"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { matchesAdminSearch } from "../../../../../lib/admin-search";
import { apiGet, apiPatch, apiPost } from "../../../../../lib/admin-api";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type MenuRow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  items: { id: string; available: boolean }[];
};

type MenuData = { menus: MenuRow[]; items: unknown[] };

type MenuFormState = {
  name: string;
  description: string;
  active: boolean;
};

const EMPTY_FORM: MenuFormState = {
  name: "",
  description: "",
  active: true,
};

function menuInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function RestaurantMenusPage() {
  const { t, tf } = useAdminLocale();
  const searchParams = useSearchParams();
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuFormState>(EMPTY_FORM);

  function load() {
    setLoading(true);
    apiGet<MenuData>("/api/restaurant/menu?all=1")
      .then((d) => setMenus(d.menus))
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

  const filteredMenus = useMemo(
    () =>
      menus.filter((m) =>
        matchesAdminSearch(search, [m.name, m.description ?? ""])
      ),
    [menus, search]
  );

  const stats = useMemo(() => {
    const active = menus.filter((m) => m.active).length;
    const items = menus.reduce(
      (sum, m) => sum + m.items.filter((i) => i.available).length,
      0
    );
    return { total: menus.length, active, items };
  }, [menus]);

  const editingMenu = editingId ? menus.find((m) => m.id === editingId) : null;
  const previewItemCount =
    modalMode === "edit" && editingMenu
      ? editingMenu.items.filter((i) => i.available).length
      : 0;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalMode("create");
  }

  function openEdit(menu: MenuRow) {
    setEditingId(menu.id);
    setForm({
      name: menu.name,
      description: menu.description ?? "",
      active: menu.active,
    });
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
  }

  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await apiPatch(`/api/restaurant/menu/${editingId}`, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          active: form.active,
        });
      } else {
        await apiPost("/api/restaurant/menu", {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          active: true,
        });
      }
      closeModal();
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(menu: MenuRow) {
    if (!window.confirm(tf("deleteMenuBoardConfirm", { name: menu.name }))) return;
    setSaving(true);
    try {
      await apiPatch(`/api/restaurant/menu/${menu.id}`, { active: false });
      if (editingId === menu.id) closeModal();
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading && menus.length === 0) {
    return <AdminLoading label={t("menuBoards")} />;
  }

  return (
    <div className="admin-dash admin-dash--restaurant">
      <AdminPageHeader
        title={t("menuBoards")}
        actions={
          <div className="admin-overview-quick">
            <button type="button" className="admin-btn sm" onClick={openCreate}>
              {t("addMenuBoard")}
            </button>
            <Link href="/admin/restaurant/menu" className="admin-btn secondary sm">
              {t("menuItems")}
            </Link>
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
          </div>
        }
      />

      <p className="admin-page-lead">{t("menuBoardsDesc")}</p>

      <div className="admin-kpi-grid">
        <AdminKpiCard label={t("menuBoards")} value={stats.total} tone="restaurant" icon="📋" />
        <AdminKpiCard label={t("active")} value={stats.active} tone="success" />
        <AdminKpiCard label={t("menuItems")} value={stats.items} tone="accent" icon="🍽️" />
        <AdminKpiCard
          label={t("hidden")}
          value={stats.total - stats.active}
          tone="default"
        />
      </div>

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("all")} badge={tf("shownCount", { n: filteredMenus.length })}>
        <div className="admin-category-toolbar">
          <div className="admin-category-toolbar__search">
            <input
              type="search"
              className="admin-crud-form__input"
              placeholder={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("search")}
            />
          </div>
        </div>

        {menus.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>📋</span>
            <p>{t("noMenusYet")}</p>
            <small>{t("clickAddHint")}</small>
            <button type="button" className="admin-btn sm" onClick={openCreate}>
              {t("addMenuBoard")}
            </button>
          </div>
        ) : filteredMenus.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🔍</span>
            <p>{t("noCategoriesMatch")}</p>
          </div>
        ) : (
          <ul className="admin-category-grid admin-category-grid--restaurant">
            {filteredMenus.map((menu) => {
              const itemCount = menu.items.filter((i) => i.available).length;
              const busy = saving && editingId === menu.id;

              return (
                <li
                  key={menu.id}
                  className={`admin-category-card admin-category-card--restaurant${!menu.active ? " is-inactive" : ""}`}
                >
                  <div className="admin-category-card__head">
                    <span className="admin-category-card__avatar admin-category-card__avatar--restaurant">
                      {menuInitials(menu.name)}
                    </span>
                    <div className="admin-category-card__text">
                      <strong>{menu.name}</strong>
                      <small>
                        {tf("categoryItemCount", { n: itemCount })}
                        {!menu.active ? ` · ${t("hidden")}` : ""}
                      </small>
                    </div>
                  </div>
                  {menu.description ? (
                    <p className="admin-menu-board-desc">{menu.description}</p>
                  ) : null}
                  <div className="admin-category-card__actions">
                    <button
                      type="button"
                      className="admin-btn secondary sm"
                      onClick={() => openEdit(menu)}
                      disabled={busy}
                    >
                      {t("edit")}
                    </button>
                    {menu.active ? (
                      <button
                        type="button"
                        className="admin-btn danger sm"
                        onClick={() => deactivate(menu)}
                        disabled={busy}
                      >
                        {t("hidden")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn sm"
                        onClick={() => {
                          setSaving(true);
                          apiPatch(`/api/restaurant/menu/${menu.id}`, { active: true })
                            .then(load)
                            .catch((err) =>
                              alert(err instanceof Error ? err.message : t("error"))
                            )
                            .finally(() => setSaving(false));
                        }}
                        disabled={busy}
                      >
                        {t("available")}
                      </button>
                    )}
                  </div>
                  {itemCount > 0 ? (
                    <Link
                      href={`/admin/restaurant/menu?menu=${menu.id}`}
                      className="admin-category-card__link"
                    >
                      {t("menuItems")} →
                    </Link>
                  ) : null}
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
              <h2>{modalMode === "edit" ? t("editMenuBoard") : t("addMenuBoard")}</h2>
            </header>
            <form className="admin-crud-form admin-panel__body-pad" onSubmit={saveForm}>
              <div className="admin-add-panel">
                <div className="admin-add-panel__form">
                  <label className="admin-crud-form__field admin-crud-form__field--full" htmlFor="menu-board-name">
                    <span className="admin-crud-form__label">{t("menuBoardName")}</span>
                    <input
                      id="menu-board-name"
                      className="admin-crud-form__input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t("menuBoardName")}
                      required
                      autoFocus
                      autoComplete="off"
                    />
                  </label>
                  <label className="admin-crud-form__field admin-crud-form__field--full" htmlFor="menu-board-desc">
                    <span className="admin-crud-form__label">{t("menuBoardDesc")}</span>
                    <textarea
                      id="menu-board-desc"
                      className="admin-crud-form__input admin-crud-form__textarea"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder={t("menuBoardDesc")}
                      rows={3}
                      autoComplete="off"
                    />
                  </label>
                  {modalMode === "edit" ? (
                    <label className="admin-crud-form__field admin-crud-form__field--full admin-crud-form__field--row">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      />
                      {t("availableOnMenu")}
                    </label>
                  ) : null}
                </div>
                <aside className="admin-add-preview" aria-live="polite">
                  <span className="admin-add-preview__label">{t("livePreview")}</span>
                  <p className="admin-add-preview__hint">{t("menuBoardPreviewHint")}</p>
                  <div className="admin-add-preview__card">
                    <span className="admin-add-preview__avatar">
                      {menuInitials(form.name.trim() || "?")}
                    </span>
                    <div className="admin-add-preview__copy">
                      <strong>{form.name.trim() || t("menuBoardName")}</strong>
                      <small>
                        {tf("categoryItemCount", { n: previewItemCount })}
                        {modalMode === "edit" && !form.active ? ` · ${t("hidden")}` : ` · ${t("available")}`}
                      </small>
                    </div>
                  </div>
                  {form.description.trim() ? (
                    <p className="admin-menu-board-desc">{form.description.trim()}</p>
                  ) : (
                    <p className="admin-add-preview__hint">{t("menuBoardDesc")}</p>
                  )}
                </aside>
              </div>
              <div className="admin-crud-form__actions">
                <button type="submit" className="admin-btn" disabled={saving || !form.name.trim()}>
                  {saving ? t("saving") : modalMode === "edit" ? t("saveChanges") : t("add")}
                </button>
                <button type="button" className="admin-btn secondary" onClick={closeModal}>
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
