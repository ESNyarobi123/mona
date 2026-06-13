"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatPricePerUnit } from "@monana/utils";
import { matchesAdminSearch } from "../../../../../lib/admin-search";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../../../lib/admin-api";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminKpiCard } from "../../../../../components/admin/dashboard/AdminKpiCard";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type UnitRow = {
  id: string;
  code: string;
  labelEn: string;
  labelSw: string;
  priceSuffix: string;
  quantitySuffixEn: string | null;
  quantitySuffixSw: string | null;
  icon: string | null;
  module: "GROCERY" | "RESTAURANT" | null;
  isSystem: boolean;
  active: boolean;
  sortOrder: number;
  _count: { products: number; menuItems: number };
};

type UnitFormState = {
  code: string;
  labelEn: string;
  labelSw: string;
  priceSuffix: string;
  quantitySuffixEn: string;
  quantitySuffixSw: string;
  icon: string;
  module: "" | "GROCERY" | "RESTAURANT";
  active: boolean;
};

const EMPTY_FORM: UnitFormState = {
  code: "",
  labelEn: "",
  labelSw: "",
  priceSuffix: "",
  quantitySuffixEn: "",
  quantitySuffixSw: "",
  icon: "⚖️",
  module: "",
  active: true,
};

function slugPreview(label: string) {
  const code = label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return code || "UNIT";
}

function unitToForm(unit: UnitRow): UnitFormState {
  return {
    code: unit.code,
    labelEn: unit.labelEn,
    labelSw: unit.labelSw,
    priceSuffix: unit.priceSuffix,
    quantitySuffixEn: unit.quantitySuffixEn ?? "",
    quantitySuffixSw: unit.quantitySuffixSw ?? "",
    icon: unit.icon ?? "⚖️",
    module: unit.module ?? "",
    active: unit.active,
  };
}

function UnitPreview({
  form,
  locale,
  codeOverride,
}: {
  form: UnitFormState;
  locale: "en" | "sw";
  codeOverride?: string;
}) {
  const { t } = useAdminLocale();
  const code = codeOverride ?? (form.code.trim() || slugPreview(form.labelEn));
  const name = locale === "sw" ? form.labelSw || form.labelEn : form.labelEn || form.labelSw;
  const sub = locale === "sw" ? form.labelEn : form.labelSw;
  const unitDef = {
    code,
    labelEn: form.labelEn || "Unit",
    labelSw: form.labelSw || form.labelEn || "Kipimo",
    priceSuffix: form.priceSuffix || "unit",
  };

  return (
    <div className="admin-unit-preview">
      <span className="admin-unit-preview__label">{t("unitPreview")}</span>
      <span className="admin-unit-preview__code">{code}</span>
      <div className="admin-unit-preview__icon" aria-hidden>
        {form.icon || "⚖️"}
      </div>
      <h3 className="admin-unit-preview__name">{name || t("newUnit")}</h3>
      {sub ? <p className="admin-unit-preview__sub">{sub}</p> : null}
      <p className="admin-unit-preview__price">{formatPricePerUnit(42000, code, locale, [unitDef])}</p>
    </div>
  );
}

export default function GroceryUnitsPage() {
  const { t, tf, locale } = useAdminLocale();
  const searchParams = useSearchParams();
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<UnitFormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<UnitRow | null>(null);
  const [editForm, setEditForm] = useState<UnitFormState>(EMPTY_FORM);

  const restaurantContext = searchParams.get("context") === "restaurant";

  function load() {
    setLoading(true);
    const q = restaurantContext ? "/api/admin/units?usage=1" : "/api/admin/units?module=GROCERY&usage=1";
    apiGet<UnitRow[]>(q)
      .then((rows) => {
        if (restaurantContext) {
          setUnits(rows.filter((u) => u.module === "RESTAURANT" || u.module === null));
        } else {
          setUnits(rows);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [restaurantContext]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const stats = useMemo(() => {
    const inUse = units.filter((u) => u._count.products + u._count.menuItems > 0).length;
    return {
      total: units.length,
      active: units.filter((u) => u.active).length,
      custom: units.filter((u) => !u.isSystem).length,
      inUse,
    };
  }, [units]);

  const filtered = useMemo(
    () =>
      units.filter((u) =>
        matchesAdminSearch(search, [u.code, u.labelEn, u.labelSw, u.priceSuffix])
      ),
    [units, search]
  );

  function openCreate() {
    setForm({
      ...EMPTY_FORM,
      module: restaurantContext ? "RESTAURANT" : "",
    });
    setShowCreate(true);
  }

  function closeCreate() {
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/api/admin/units", {
        ...(form.code.trim() ? { code: form.code.trim() } : {}),
        labelEn: form.labelEn.trim(),
        labelSw: form.labelSw.trim(),
        priceSuffix: form.priceSuffix.trim(),
        quantitySuffixEn: form.quantitySuffixEn.trim() || undefined,
        quantitySuffixSw: form.quantitySuffixSw.trim() || undefined,
        icon: form.icon.trim() || undefined,
        module: form.module || null,
        active: form.active,
      });
      closeCreate();
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(unit: UnitRow) {
    setEditing(unit);
    setEditForm(unitToForm(unit));
  }

  function closeEdit() {
    setEditing(null);
    setEditForm(EMPTY_FORM);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await apiPatch(`/api/admin/units/${editing.id}`, {
        labelEn: editForm.labelEn.trim(),
        labelSw: editForm.labelSw.trim(),
        priceSuffix: editForm.priceSuffix.trim(),
        quantitySuffixEn: editForm.quantitySuffixEn.trim() || null,
        quantitySuffixSw: editForm.quantitySuffixSw.trim() || null,
        icon: editForm.icon.trim() || null,
        module: editForm.module || null,
        active: editForm.active,
      });
      closeEdit();
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(unit: UnitRow) {
    setSaving(true);
    try {
      await apiPatch(`/api/admin/units/${unit.id}`, { active: !unit.active });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(unit: UnitRow) {
    if (unit.isSystem) {
      alert(t("unitCannotDeleteSystem"));
      return;
    }
    if (!window.confirm(tf("deleteUnitConfirm", { name: unit.labelEn }))) return;
    setDeletingId(unit.id);
    try {
      await apiDelete(`/api/admin/units/${unit.id}`);
      if (editing?.id === unit.id) closeEdit();
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setDeletingId(null);
    }
  }

  function moduleScopeLabel(module: UnitRow["module"]) {
    if (!module) return t("unitScopeShared");
    if (module === "GROCERY") return t("unitScopeGrocery");
    return t("unitScopeRestaurant");
  }

  if (loading && units.length === 0) {
    return <AdminLoading label={t("loadingUnits")} />;
  }

  return (
    <div className={`admin-dash${restaurantContext ? " admin-dash--restaurant" : " admin-dash--grocery"}`}>
      <AdminPageHeader
        title={t("units")}
        actions={
          <div className="admin-overview-quick">
            <button type="button" className="admin-btn sm" onClick={openCreate}>
              {t("addUnit")}
            </button>
            {restaurantContext ? (
              <Link href="/admin/restaurant/menu" className="admin-btn secondary sm">
                {t("menuItems")}
              </Link>
            ) : (
              <Link href="/admin/grocery/products" className="admin-btn secondary sm">
                {t("products")}
              </Link>
            )}
            <button type="button" className="admin-btn secondary sm" onClick={load}>
              {t("refresh")}
            </button>
          </div>
        }
      />

      <p className="admin-page-lead">
        {restaurantContext ? t("unitsRestaurantHint") : t("groceryUnitsDesc")}
      </p>

      <div className="admin-kpi-grid">
        <AdminKpiCard label={t("units")} value={stats.total} tone="grocery" icon="⚖️" />
        <AdminKpiCard label={t("active")} value={stats.active} tone="success" />
        <AdminKpiCard label={t("unitCustom")} value={stats.custom} tone="accent" icon="✨" />
        <AdminKpiCard label={t("inUse")} value={stats.inUse} tone="default" />
      </div>

      {error && <p className="admin-error">{error}</p>}

      <AdminPanel title={t("allUnits")} badge={tf("shownCount", { n: filtered.length })}>
        <div className="admin-menu-toolbar admin-panel__body-pad admin-menu-toolbar--bordered">
          <div className="admin-menu-toolbar__search">
            <input
              type="search"
              className="admin-crud-form__input"
              placeholder={t("searchUnits")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("searchUnits")}
            />
          </div>
        </div>

        {units.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>⚖️</span>
            <p>{t("noUnitsYet")}</p>
            <small>{t("clickAddHint")}</small>
            <button type="button" className="admin-btn sm" onClick={openCreate}>
              {t("addUnit")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-category-empty">
            <span aria-hidden>🔍</span>
            <p>{t("noUnitsMatch")}</p>
          </div>
        ) : (
          <ul className="admin-unit-grid">
            {filtered.map((unit) => {
              const busy = deletingId === unit.id;
              const usage = unit._count.products + unit._count.menuItems;

              return (
                <li
                  key={unit.id}
                  className={`admin-unit-card${unit.active ? "" : " is-inactive"}`}
                >
                  <div className="admin-unit-card__head">
                    <span className="admin-unit-card__icon" aria-hidden>
                      {unit.icon ?? "⚖️"}
                    </span>
                    <div className="admin-unit-card__copy">
                      <strong>{locale === "sw" ? unit.labelSw : unit.labelEn}</strong>
                      <small>
                        {locale === "sw" ? unit.labelEn : unit.labelSw} · {unit.code}
                      </small>
                    </div>
                    <div className="admin-unit-card__badges">
                      <span className="admin-kitchen-pill">
                        {unit.isSystem ? t("unitSystem") : t("unitCustom")}
                      </span>
                      <span className={`admin-kitchen-pill${unit.active ? "" : " muted"}`}>
                        {unit.active ? t("unitActive") : t("unitInactive")}
                      </span>
                    </div>
                  </div>

                  <div className="admin-unit-card__meta">
                    <span className="admin-unit-card__price-chip">
                      {formatPricePerUnit(1000, unit.code, locale, [unit])}
                    </span>
                    <span>{moduleScopeLabel(unit.module)}</span>
                  </div>

                  <p className="admin-crud-form__hint" style={{ margin: 0 }}>
                    {usage > 0
                      ? tf("unitUsageCount", {
                          products: unit._count.products,
                          menu: unit._count.menuItems,
                        })
                      : t("unitNotInUse")}
                  </p>

                  <div className="admin-unit-card__actions">
                    <button
                      type="button"
                      className="admin-btn secondary sm"
                      onClick={() => openEdit(unit)}
                      disabled={busy}
                    >
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      className="admin-btn secondary sm"
                      onClick={() => toggleActive(unit)}
                      disabled={busy || saving}
                    >
                      {unit.active ? t("disable") : t("enable")}
                    </button>
                    {!unit.isSystem ? (
                      <button
                        type="button"
                        className="admin-btn danger sm"
                        onClick={() => remove(unit)}
                        disabled={busy}
                      >
                        {busy ? t("saving") : t("delete")}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>

      {showCreate ? (
        <div className="admin-modal-overlay admin-modal-overlay--spacious" onClick={closeCreate}>
          <div
            className="admin-modal admin-modal--catalog admin-modal--unit"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-modal__head">
              <h2>{t("addUnit")}</h2>
              <p className="admin-modal__sub">{t("groceryUnitsDesc")}</p>
            </header>
            <form className="admin-unit-modal-form" onSubmit={create}>
              <div className="admin-unit-modal-form__main">
                <div className="admin-crud-form admin-crud-form--grid">
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="unit-label-en">
                      {t("unitLabelEn")}
                    </label>
                    <input
                      id="unit-label-en"
                      className="admin-crud-form__input"
                      value={form.labelEn}
                      onChange={(e) => setForm({ ...form, labelEn: e.target.value })}
                      placeholder="Kilogram"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="unit-label-sw">
                      {t("unitLabelSw")}
                    </label>
                    <input
                      id="unit-label-sw"
                      className="admin-crud-form__input"
                      value={form.labelSw}
                      onChange={(e) => setForm({ ...form, labelSw: e.target.value })}
                      placeholder="Kilo (kg)"
                      required
                    />
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="unit-code">
                      {t("unitCode")}
                    </label>
                    <input
                      id="unit-code"
                      className="admin-crud-form__input"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      placeholder={slugPreview(form.labelEn)}
                    />
                    <p className="admin-crud-form__hint">{t("unitCodeHint")}</p>
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="unit-suffix">
                      {t("unitPriceSuffix")}
                    </label>
                    <input
                      id="unit-suffix"
                      className="admin-crud-form__input"
                      value={form.priceSuffix}
                      onChange={(e) => setForm({ ...form, priceSuffix: e.target.value })}
                      placeholder="kg"
                      required
                    />
                    <p className="admin-crud-form__hint">{t("unitPriceSuffixHint")}</p>
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="unit-icon">
                      {t("unitIcon")}
                    </label>
                    <input
                      id="unit-icon"
                      className="admin-crud-form__input"
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      maxLength={8}
                    />
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="unit-qty-en">
                      {t("unitQuantitySuffixEn")}
                    </label>
                    <input
                      id="unit-qty-en"
                      className="admin-crud-form__input"
                      value={form.quantitySuffixEn}
                      onChange={(e) => setForm({ ...form, quantitySuffixEn: e.target.value })}
                      placeholder="kg"
                    />
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="unit-qty-sw">
                      {t("unitQuantitySuffixSw")}
                    </label>
                    <input
                      id="unit-qty-sw"
                      className="admin-crud-form__input"
                      value={form.quantitySuffixSw}
                      onChange={(e) => setForm({ ...form, quantitySuffixSw: e.target.value })}
                      placeholder="kilo"
                    />
                  </div>
                  <div className="admin-crud-form__field admin-crud-form__field--full">
                    <label className="admin-crud-form__label" htmlFor="unit-module">
                      {t("unitModuleScope")}
                    </label>
                    <select
                      id="unit-module"
                      className="admin-select"
                      value={form.module}
                      onChange={(e) =>
                        setForm({ ...form, module: e.target.value as UnitFormState["module"] })
                      }
                    >
                      <option value="">{t("unitScopeShared")}</option>
                      <option value="GROCERY">{t("unitScopeGrocery")}</option>
                      <option value="RESTAURANT">{t("unitScopeRestaurant")}</option>
                    </select>
                  </div>
                  <div className="admin-crud-form__field admin-crud-form__field--full">
                    <label className={`admin-toggle-card${form.active ? " admin-toggle-card--on" : ""}`}>
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      />
                      <span className="admin-toggle-card__icon" aria-hidden>
                        ✓
                      </span>
                      <span className="admin-toggle-card__copy">
                        <strong>{t("unitActive")}</strong>
                        <small>{t("groceryProductsDesc")}</small>
                      </span>
                    </label>
                  </div>
                </div>
                <div className="admin-crud-form__actions">
                  <button
                    type="submit"
                    className="admin-btn"
                    disabled={
                      saving || !form.labelEn.trim() || !form.labelSw.trim() || !form.priceSuffix.trim()
                    }
                  >
                    {saving ? t("saving") : t("addUnit")}
                  </button>
                  <button type="button" className="admin-btn secondary" onClick={closeCreate}>
                    {t("cancel")}
                  </button>
                </div>
              </div>
              <aside className="admin-unit-modal-form__aside">
                <UnitPreview form={form} locale={locale} />
              </aside>
            </form>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="admin-modal-overlay admin-modal-overlay--spacious" onClick={closeEdit}>
          <div
            className="admin-modal admin-modal--catalog admin-modal--unit"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-modal__head">
              <h2>{t("editUnit")}</h2>
              <p className="admin-modal__sub">
                {editing.code} · {moduleScopeLabel(editing.module)}
              </p>
            </header>
            <form className="admin-unit-modal-form" onSubmit={saveEdit}>
              <div className="admin-unit-modal-form__main">
                <div className="admin-crud-form admin-crud-form--grid">
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="edit-unit-en">
                      {t("unitLabelEn")}
                    </label>
                    <input
                      id="edit-unit-en"
                      className="admin-crud-form__input"
                      value={editForm.labelEn}
                      onChange={(e) => setEditForm({ ...editForm, labelEn: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="edit-unit-sw">
                      {t("unitLabelSw")}
                    </label>
                    <input
                      id="edit-unit-sw"
                      className="admin-crud-form__input"
                      value={editForm.labelSw}
                      onChange={(e) => setEditForm({ ...editForm, labelSw: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="edit-unit-suffix">
                      {t("unitPriceSuffix")}
                    </label>
                    <input
                      id="edit-unit-suffix"
                      className="admin-crud-form__input"
                      value={editForm.priceSuffix}
                      onChange={(e) => setEditForm({ ...editForm, priceSuffix: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="edit-unit-icon">
                      {t("unitIcon")}
                    </label>
                    <input
                      id="edit-unit-icon"
                      className="admin-crud-form__input"
                      value={editForm.icon}
                      onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                      maxLength={8}
                    />
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="edit-unit-qty-en">
                      {t("unitQuantitySuffixEn")}
                    </label>
                    <input
                      id="edit-unit-qty-en"
                      className="admin-crud-form__input"
                      value={editForm.quantitySuffixEn}
                      onChange={(e) =>
                        setEditForm({ ...editForm, quantitySuffixEn: e.target.value })
                      }
                      placeholder="kg"
                    />
                  </div>
                  <div className="admin-crud-form__field">
                    <label className="admin-crud-form__label" htmlFor="edit-unit-qty-sw">
                      {t("unitQuantitySuffixSw")}
                    </label>
                    <input
                      id="edit-unit-qty-sw"
                      className="admin-crud-form__input"
                      value={editForm.quantitySuffixSw}
                      onChange={(e) =>
                        setEditForm({ ...editForm, quantitySuffixSw: e.target.value })
                      }
                      placeholder="kilo"
                    />
                  </div>
                  <div className="admin-crud-form__field admin-crud-form__field--full">
                    <label className="admin-crud-form__label" htmlFor="edit-unit-module">
                      {t("unitModuleScope")}
                    </label>
                    <select
                      id="edit-unit-module"
                      className="admin-select"
                      value={editForm.module}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          module: e.target.value as UnitFormState["module"],
                        })
                      }
                    >
                      <option value="">{t("unitScopeShared")}</option>
                      <option value="GROCERY">{t("unitScopeGrocery")}</option>
                      <option value="RESTAURANT">{t("unitScopeRestaurant")}</option>
                    </select>
                  </div>
                  <div className="admin-crud-form__field admin-crud-form__field--full">
                    <label className={`admin-toggle-card${editForm.active ? " admin-toggle-card--on" : ""}`}>
                      <input
                        type="checkbox"
                        checked={editForm.active}
                        onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                      />
                      <span className="admin-toggle-card__icon" aria-hidden>
                        ✓
                      </span>
                      <span className="admin-toggle-card__copy">
                        <strong>{t("unitActive")}</strong>
                        <small>{t("groceryProductsDesc")}</small>
                      </span>
                    </label>
                  </div>
                </div>
                <div className="admin-crud-form__actions">
                  <button type="submit" className="admin-btn" disabled={saving}>
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                  <button type="button" className="admin-btn secondary" onClick={closeEdit}>
                    {t("cancel")}
                  </button>
                </div>
              </div>
              <aside className="admin-unit-modal-form__aside">
                <UnitPreview form={editForm} locale={locale} codeOverride={editing.code} />
              </aside>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
