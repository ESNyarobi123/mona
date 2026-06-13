"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiDelete, apiGet, apiPost, apiPatch } from "../../../../../lib/admin-api";
import { formatPricePerUnit, unitLabel } from "@monana/utils";
import { UnitSelect } from "../../../../../components/admin/UnitSelect";
import { AdminImageField } from "../../../../../components/admin/AdminImageField";
import { AdminHotToggle } from "../../../../../components/admin/AdminHotToggle";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string | number;
  unit: string;
  mealSlots: string[];
  available: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  menu: { id: string; name: string };
};

type MenuData = { menus: { id: string; name: string }[]; items: MenuItem[] };
type Category = { id: string; name: string };

type ManualPick = {
  id: string;
  menuItemId: string | null;
  badge: string | null;
  active: boolean;
};

type HotAdminView = {
  manualPicks: ManualPick[];
};

const SLOT_OPTIONS = ["BREAKFAST", "LUNCH", "DINNER"] as const;

type ItemFormState = {
  menuId: string;
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  categoryId: string;
  unit: string;
  mealSlots: string[];
  available: boolean;
  isHot: boolean;
  hotBadge: string;
};

const EMPTY_FORM: ItemFormState = {
  menuId: "",
  name: "",
  description: "",
  imageUrl: "",
  price: "",
  categoryId: "",
  unit: "PIECE",
  mealSlots: ["LUNCH"],
  available: true,
  isHot: false,
  hotBadge: "🔥 Hot",
};

function itemInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function itemToForm(item: MenuItem, hot?: ManualPick | null): ItemFormState {
  return {
    menuId: item.menu.id,
    name: item.name,
    description: item.description ?? "",
    imageUrl: item.imageUrl ?? "",
    price: String(Number(item.price)),
    categoryId: item.categoryId ?? item.category?.id ?? "",
    unit: item.unit ?? "PIECE",
    mealSlots: [...item.mealSlots],
    available: item.available,
    isHot: hot?.active ?? false,
    hotBadge: hot?.badge ?? "🔥 Hot",
  };
}

export default function RestaurantMenuPage() {
  const { t, tf, slotLabel } = useAdminLocale();
  const searchParams = useSearchParams();
  const [data, setData] = useState<MenuData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hotByMenuItemId, setHotByMenuItemId] = useState<Map<string, ManualPick>>(new Map());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMenu, setFilterMenu] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSlot, setFilterSlot] = useState("");
  const [filterAvailable, setFilterAvailable] = useState<"" | "yes" | "no">("");
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM);

  function loadHotPicks() {
    return apiGet<HotAdminView>("/api/admin/hot-products?module=RESTAURANT").then((view) => {
      const map = new Map<string, ManualPick>();
      for (const pick of view.manualPicks) {
        if (pick.menuItemId && pick.active) map.set(pick.menuItemId, pick);
      }
      setHotByMenuItemId(map);
    });
  }

  function load() {
    setLoading(true);
    Promise.all([
      apiGet<MenuData>("/api/restaurant/menu?all=1"),
      apiGet<Category[]>("/api/grocery/categories?module=RESTAURANT"),
      loadHotPicks(),
    ])
      .then(([d, c]) => {
        setData(d);
        setCategories(c);
        setForm((f) => (f.menuId ? f : { ...f, menuId: d.menus[0]?.id ?? "" }));
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
    const category = searchParams.get("category");
    if (category) setFilterCategory(category);
    const menu = searchParams.get("menu");
    if (menu) setFilterMenu(menu);
  }, [searchParams]);

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: items.length,
      available: items.filter((i) => i.available).length,
      hidden: items.filter((i) => !i.available).length,
      menus: data?.menus.length ?? 0,
    };
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const selectedCat = categories.find((c) => c.id === filterCategory);
    return data.items.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q)) return false;
      if (filterMenu && item.menu.id !== filterMenu) return false;
      if (selectedCat && item.category?.id !== selectedCat.id && item.categoryId !== selectedCat.id) return false;
      if (filterSlot && !item.mealSlots.includes(filterSlot)) return false;
      if (filterAvailable === "yes" && !item.available) return false;
      if (filterAvailable === "no" && item.available) return false;
      return true;
    });
  }, [data, search, filterMenu, filterCategory, filterSlot, filterAvailable, categories]);

  function openCreate() {
    if (!data?.menus.length) {
      alert(t("noMenusYet"));
      return;
    }
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      menuId: filterMenu || (data.menus[0]?.id ?? ""),
    });
    setModalMode("create");
  }

  function openEdit(item: MenuItem) {
    setEditingId(item.id);
    setForm(itemToForm(item, hotByMenuItemId.get(item.id)));
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
  }

  async function toggleAvailable(item: MenuItem) {
    try {
      await apiPatch(`/api/restaurant/menu/items/${item.id}`, { available: !item.available });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    }
  }

  async function removeItem(item: MenuItem) {
    if (!confirm(tf("removeFromMenuConfirm", { name: item.name }))) return;
    try {
      await apiDelete(`/api/restaurant/menu/items/${item.id}`);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t("error"));
    }
  }

  function toggleFormSlot(slot: string) {
    setForm((f) => ({
      ...f,
      mealSlots: f.mealSlots.includes(slot)
        ? f.mealSlots.filter((s) => s !== slot)
        : [...f.mealSlots, slot],
    }));
  }

  async function syncHotPick(menuItemId: string, isHot: boolean, hotBadge: string) {
    await apiPost("/api/admin/hot-products/toggle", {
      module: "RESTAURANT",
      menuItemId,
      hot: isHot,
      badge: hotBadge.trim() || "🔥 Hot",
    });
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (form.mealSlots.length === 0) {
      alert(t("pickSlotRequired"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || "",
        price: Number(form.price),
        unit: form.unit,
        categoryId: form.categoryId || null,
        mealSlots: form.mealSlots,
        available: form.available,
      };

      let menuItemId = editingId;

      if (modalMode === "edit" && editingId) {
        await apiPatch(`/api/restaurant/menu/items/${editingId}`, payload);
      } else {
        const created = await apiPost<MenuItem>("/api/restaurant/menu/items", {
          menuId: form.menuId,
          ...payload,
          categoryId: form.categoryId || undefined,
        });
        menuItemId = created.id;
      }

      if (menuItemId) {
        await syncHotPick(menuItemId, form.isHot, form.hotBadge);
      }

      closeModal();
      setForm({ ...EMPTY_FORM, menuId: form.menuId });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return <AdminLoading label={t("loadingMenu")} />;
  }

  return (
    <div className="admin-dash admin-dash--restaurant">
      <AdminPageHeader
        title={t("menuItems")}
        actions={
          <>
            <button type="button" className="admin-btn sm" onClick={openCreate}>
              {t("addMenuItem")}
            </button>
            <Link href="/admin/restaurant/menus" className="admin-btn secondary sm">
              {t("menuBoards")}
            </Link>
            <Link href="/admin/restaurant/categories" className="admin-btn secondary sm">
              {t("categories")}
            </Link>
          </>
        }
      />

      <div className="admin-kpi-grid">
        <AdminKpiCard label={t("items")} value={stats.total} tone="restaurant" />
        <AdminKpiCard label={t("available")} value={stats.available} tone="success" />
        <AdminKpiCard label={t("hidden")} value={stats.hidden} tone="warning" trendUp={false} />
        <AdminKpiCard label={t("hotPick")} value={hotByMenuItemId.size} tone="accent" icon="🔥" />
        <AdminKpiCard label={t("categories")} value={categories.length} tone="default" />
      </div>

      <AdminPanel title={t("filter")} badge={tf("shownCount", { n: filteredItems.length })}>
        <div className="admin-menu-toolbar admin-panel__body-pad">
          <div className="admin-menu-toolbar__search">
            <input
              type="search"
              className="admin-crud-form__input"
              placeholder={t("searchMenu")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("searchMenuAria")}
            />
          </div>
          <select
            className="admin-select admin-menu-toolbar__select"
            value={filterMenu}
            onChange={(e) => setFilterMenu(e.target.value)}
            aria-label={t("menu")}
          >
            <option value="">{t("all")}</option>
            {data?.menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
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
            value={filterSlot}
            onChange={(e) => setFilterSlot(e.target.value)}
            aria-label={t("filterSlotAria")}
          >
            <option value="">{t("allSlots")}</option>
            {SLOT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {slotLabel(s)}
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
          <button type="button" className="admin-btn secondary sm" onClick={load}>
            {t("refresh")}
          </button>
        </div>
      </AdminPanel>

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("items")} badge={`${filteredItems.length}`}>
        {!data || filteredItems.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🍽️</span>
            <p>{data?.items.length ? t("noMenuItemsMatch") : t("noMenuItems")}</p>
            <small>
              {data?.items.length ? t("changeFiltersHint") : t("clickAddHint")}
            </small>
            {!data?.items.length && data?.menus.length ? (
              <button type="button" className="admin-btn sm" onClick={openCreate}>
                {t("addMenuItem")}
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="admin-menu-grid">
            {filteredItems.map((item) => {
              const hot = hotByMenuItemId.get(item.id);
              return (
              <li
                key={item.id}
                className={`admin-menu-card${item.available ? "" : " admin-menu-card--off"}`}
              >
                <div className="admin-menu-card__head">
                  {item.imageUrl ? (
                    <span className="admin-menu-card__thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt="" />
                    </span>
                  ) : (
                    <span className="admin-menu-card__avatar">{itemInitials(item.name)}</span>
                  )}
                  <div className="admin-menu-card__title-wrap">
                    <strong className="admin-menu-card__name">{item.name}</strong>
                    <span className="admin-menu-card__menu">{item.menu.name}</span>
                  </div>
                  <span className={`admin-menu-card__status${item.available ? " admin-menu-card__status--on" : ""}`}>
                    {item.available ? t("statusOn") : t("statusOff")}
                  </span>
                </div>

                <div className="admin-menu-card__body">
                  <div className="admin-menu-card__meta">
                    {hot ? (
                      <span className="admin-kitchen-pill admin-kitchen-pill--hot">{hot.badge ?? "🔥 Hot"}</span>
                    ) : null}
                    <span className="admin-menu-card__price">
                      {formatPricePerUnit(Number(item.price), item.unit ?? "PIECE")}
                    </span>
                    <span className="admin-kitchen-pill">{unitLabel(item.unit ?? "PIECE")}</span>
                    {item.category ? (
                      <span className="admin-kitchen-pill">{item.category.name}</span>
                    ) : (
                      <span className="admin-kitchen-pill admin-kitchen-pill--muted">{t("noCategory")}</span>
                    )}
                  </div>

                  {item.description ? (
                    <p className="admin-menu-card__desc">{item.description}</p>
                  ) : null}

                  <div className="admin-menu-card__slots">
                    {item.mealSlots.length > 0 ? (
                      item.mealSlots.map((s) => (
                        <span key={s} className="admin-slot-chip admin-slot-chip--filled">
                          {slotLabel(s)}
                        </span>
                      ))
                    ) : (
                      <span className="admin-kitchen-pill admin-kitchen-pill--muted">{t("noSlot")}</span>
                    )}
                  </div>
                </div>

                <div className="admin-menu-card__actions">
                  <button type="button" className="admin-btn sm" onClick={() => openEdit(item)}>
                    {t("edit")}
                  </button>
                  <button
                    type="button"
                    className="admin-btn sm secondary"
                    onClick={() => toggleAvailable(item)}
                  >
                    {item.available ? t("disable") : t("enable")}
                  </button>
                  <button type="button" className="admin-btn sm danger" onClick={() => removeItem(item)}>
                    {t("delete")}
                  </button>
                </div>
              </li>
            );
            })}
          </ul>
        )}
      </AdminPanel>

      {modalMode && data && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal admin-modal--catalog" onClick={(e) => e.stopPropagation()}>
            <header className="admin-modal__head">
              <h2>{modalMode === "edit" ? t("editMenuItem") : t("newMenuItem")}</h2>
            </header>

            <form className="admin-item-modal-form" onSubmit={saveItem}>
              <aside className="admin-item-modal-form__aside">
                <AdminImageField
                  label={t("menuItemImage")}
                  value={form.imageUrl}
                  onChange={(imageUrl) => setForm({ ...form, imageUrl })}
                  initials={itemInitials(form.name || "?")}
                  placeholderIcon="🍲"
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
                <label className="admin-crud-form__label" htmlFor="menu-item-name">
                  {t("foodName")}
                </label>
                <input
                  id="menu-item-name"
                  className="admin-crud-form__input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("foodNamePlaceholder")}
                  required
                />
              </div>

              <div className="admin-crud-form__field admin-crud-form__field--full">
                <label className="admin-crud-form__label" htmlFor="menu-item-desc">
                  {t("descriptionOptional")}
                </label>
                <textarea
                  id="menu-item-desc"
                  className="admin-crud-form__input admin-crud-form__textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("descriptionPlaceholder")}
                  rows={2}
                />
              </div>

              {modalMode === "create" ? (
                <div className="admin-crud-form__field">
                  <label className="admin-crud-form__label" htmlFor="menu-select">
                    {t("menu")}
                  </label>
                  <select
                    id="menu-select"
                    className="admin-select"
                    value={form.menuId}
                    onChange={(e) => setForm({ ...form, menuId: e.target.value })}
                    required
                  >
                    {data.menus.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="admin-crud-form__field">
                  <span className="admin-crud-form__label">{t("menu")}</span>
                  <p className="admin-crud-form__static">
                    {data.menus.find((m) => m.id === form.menuId)?.name ?? "—"}
                  </p>
                </div>
              )}

              <div className="admin-crud-form__field">
                <label className="admin-crud-form__label" htmlFor="menu-price">
                  {t("priceTzs")}
                </label>
                <input
                  id="menu-price"
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
                <UnitSelect value={form.unit} onChange={(unit) => setForm({ ...form, unit })} />
              </div>

              <div className="admin-crud-form__field">
                <label className="admin-crud-form__label" htmlFor="menu-category">
                  {t("categories")}
                </label>
                <select
                  id="menu-category"
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
                    <Link href="/admin/restaurant/categories">{t("addCategoryFirst")}</Link>
                  </p>
                ) : null}
              </div>

              <div className="admin-crud-form__field">
                <label className="admin-crud-form__label" htmlFor="menu-available">
                  {t("status")}
                </label>
                <select
                  id="menu-available"
                  className="admin-select"
                  value={form.available ? "yes" : "no"}
                  onChange={(e) => setForm({ ...form, available: e.target.value === "yes" })}
                >
                  <option value="yes">{t("availableOnMenu")}</option>
                  <option value="no">{t("hidden")}</option>
                </select>
              </div>

              <div className="admin-crud-form__field admin-crud-form__field--full">
                <span className="admin-crud-form__label">{t("orderWindow")}</span>
                <div className="admin-slot-chips">
                  {SLOT_OPTIONS.map((slot) => {
                    const active = form.mealSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={`admin-slot-chip${active ? " admin-slot-chip--active" : ""}`}
                        onClick={() => toggleFormSlot(slot)}
                      >
                        {slotLabel(slot)}
                      </button>
                    );
                  })}
                </div>
                <p className="admin-crud-form__hint">{t("orderWindowHint")}</p>
              </div>

              <div className="admin-crud-form__actions admin-crud-form__field--full">
                <button type="submit" className="admin-btn" disabled={saving}>
                  {saving ? t("saving") : modalMode === "edit" ? t("saveChanges") : t("saveItem")}
                </button>
                <button type="button" className="admin-btn secondary" onClick={closeModal}>
                  {t("close")}
                </button>
              </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
