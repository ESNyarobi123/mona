"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../../../lib/admin-api";
import { formatMoney } from "../../../../../lib/format";
import { AdminPageHeader } from "../../../../../components/admin/AdminPageHeader";
import { AdminLoading } from "../../../../../components/admin/dashboard/AdminLoading";
import { AdminPanel } from "../../../../../components/admin/dashboard/AdminPanel";
import { useAdminLocale } from "../../../../../components/admin/AdminLocaleProvider";

type Package = {
  id: string;
  code: string;
  nameEn: string;
  nameSw: string;
  descriptionEn: string;
  descriptionSw: string;
  pricePerHead: string | number;
  minGuests: number;
  maxGuests: number | null;
  featuresEn: string[];
  featuresSw: string[];
  active: boolean;
  sortOrder: number;
};

const emptyForm = {
  code: "",
  nameEn: "",
  nameSw: "",
  descriptionEn: "",
  descriptionSw: "",
  pricePerHead: "",
  minGuests: "10",
  maxGuests: "",
  featuresEn: "",
  featuresSw: "",
  sortOrder: "0",
  active: true,
};

function linesToArray(value: string) {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminCateringPackagesPage() {
  const { t } = useAdminLocale();
  const [rows, setRows] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [form, setForm] = useState(emptyForm);

  function load() {
    setLoading(true);
    apiGet<Package[]>("/api/catering/packages?all=1")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setSuccess("");
    setError("");
  }

  function openEdit(p: Package) {
    setEditing(p);
    setForm({
      code: p.code,
      nameEn: p.nameEn,
      nameSw: p.nameSw,
      descriptionEn: p.descriptionEn,
      descriptionSw: p.descriptionSw,
      pricePerHead: String(Number(p.pricePerHead)),
      minGuests: String(p.minGuests),
      maxGuests: p.maxGuests != null ? String(p.maxGuests) : "",
      featuresEn: (p.featuresEn ?? []).join("\n"),
      featuresSw: (p.featuresSw ?? []).join("\n"),
      sortOrder: String(p.sortOrder ?? 0),
      active: p.active,
    });
    setShowForm(true);
    setSuccess("");
    setError("");
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const payload = {
      code: form.code.trim(),
      nameEn: form.nameEn.trim(),
      nameSw: form.nameSw.trim(),
      descriptionEn: form.descriptionEn.trim(),
      descriptionSw: form.descriptionSw.trim(),
      pricePerHead: Number(form.pricePerHead),
      minGuests: Number(form.minGuests),
      maxGuests: form.maxGuests.trim() ? Number(form.maxGuests) : null,
      featuresEn: linesToArray(form.featuresEn),
      featuresSw: linesToArray(form.featuresSw),
      sortOrder: Number(form.sortOrder) || 0,
      active: form.active,
    };
    try {
      if (editing) {
        await apiPatch(`/api/catering/packages/${editing.id}`, payload);
      } else {
        await apiPost("/api/catering/packages", payload);
      }
      setSuccess(t("cateringPackageSaved"));
      closeForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function hidePackage(id: string) {
    setError("");
    try {
      await apiDelete(`/api/catering/packages/${id}`);
      setSuccess(t("cateringPackageHidden"));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    }
  }

  async function toggleActive(p: Package) {
    setError("");
    try {
      await apiPatch(`/api/catering/packages/${p.id}`, { active: !p.active });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    }
  }

  return (
    <div className="admin-dash">
      <AdminPageHeader
        title={t("packages")}
        actions={
          <>
            <Link href="/admin/catering" className="admin-btn secondary sm">
              ← {t("navCatering")}
            </Link>
            <button type="button" className="admin-btn sm" onClick={openCreate}>
              + {t("cateringPackageCreate")}
            </button>
          </>
        }
      />
      {error ? <p className="admin-error">{error}</p> : null}
      {success ? <p className="admin-success">{success}</p> : null}
      {loading ? <AdminLoading label={t("loading")} /> : null}

      {showForm ? (
        <AdminPanel title={t("cateringPackageFormTitle")}>
          <form className="admin-form" style={{ maxWidth: 560 }} onSubmit={save}>
            <label>
              Code
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                disabled={Boolean(editing)}
              />
            </label>
            <label>
              {t("customOrderQuote")} / person
              <input
                type="number"
                min={1}
                required
                value={form.pricePerHead}
                onChange={(e) => setForm({ ...form, pricePerHead: e.target.value })}
              />
            </label>
            <label>
              {t("name")} (EN)
              <input
                required
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              />
            </label>
            <label>
              {t("name")} (SW)
              <input
                required
                value={form.nameSw}
                onChange={(e) => setForm({ ...form, nameSw: e.target.value })}
              />
            </label>
            <label>
              Min guests
              <input
                type="number"
                min={1}
                required
                value={form.minGuests}
                onChange={(e) => setForm({ ...form, minGuests: e.target.value })}
              />
            </label>
            <label>
              Max guests
              <input
                type="number"
                min={1}
                value={form.maxGuests}
                onChange={(e) => setForm({ ...form, maxGuests: e.target.value })}
                placeholder="∞"
              />
            </label>
            <label>
              Description (EN)
              <textarea
                rows={2}
                required
                value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
              />
            </label>
            <label>
              Description (SW)
              <textarea
                rows={2}
                required
                value={form.descriptionSw}
                onChange={(e) => setForm({ ...form, descriptionSw: e.target.value })}
              />
            </label>
            <label>
              Features EN — {t("cateringFeaturesHint")}
              <textarea
                rows={3}
                value={form.featuresEn}
                onChange={(e) => setForm({ ...form, featuresEn: e.target.value })}
              />
            </label>
            <label>
              Features SW — {t("cateringFeaturesHint")}
              <textarea
                rows={3}
                value={form.featuresSw}
                onChange={(e) => setForm({ ...form, featuresSw: e.target.value })}
              />
            </label>
            <label>
              Sort
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </label>
            <label style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              <span>{t("active")}</span>
            </label>
            <div className="admin-inline-actions">
              <button type="submit" className="admin-btn sm" disabled={saving}>
                {saving ? t("loading") : t("save")}
              </button>
              <button type="button" className="admin-btn secondary sm" onClick={closeForm}>
                {t("cancel")}
              </button>
            </div>
          </form>
        </AdminPanel>
      ) : null}

      {!loading ? (
        <AdminPanel title={t("packages")} badge={`${rows.length}`}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>{t("name")}</th>
                  <th>{t("customOrderQuote")}</th>
                  <th>Guests</th>
                  <th>{t("status")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.code}</td>
                    <td>
                      <strong>{p.nameEn}</strong>
                      <br />
                      <small>{p.descriptionEn}</small>
                    </td>
                    <td>{formatMoney(Number(p.pricePerHead))} / person</td>
                    <td>
                      {p.minGuests}
                      {p.maxGuests != null ? `–${p.maxGuests}` : "+"}
                    </td>
                    <td>{p.active ? t("active") : t("hidden")}</td>
                    <td>
                      <div className="admin-inline-actions">
                        <button type="button" className="admin-btn sm secondary" onClick={() => openEdit(p)}>
                          {t("edit")}
                        </button>
                        <button
                          type="button"
                          className="admin-btn sm secondary"
                          onClick={() => toggleActive(p)}
                        >
                          {p.active ? t("hidden") : t("active")}
                        </button>
                        {p.active ? (
                          <button
                            type="button"
                            className="admin-btn sm secondary"
                            onClick={() => hidePackage(p.id)}
                          >
                            {t("delete")}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      ) : null}
    </div>
  );
}
