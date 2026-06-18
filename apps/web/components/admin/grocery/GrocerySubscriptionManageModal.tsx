"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch, apiPost } from "../../../lib/admin-api";
import { formatMoney } from "../../../lib/format";
import { dayOfWeekLabel, frequencyLabel, packageKindLabel, groceryRecurringDeliveryDays } from "@monana/utils";
import type { AppLocale } from "@monana/i18n";
import { useAdminLocale } from "../AdminLocaleProvider";

type SubRow = {
  id: string;
  status: string;
  frequency: string;
  address: string;
  nextRunAt: string | null;
  preferredDayOfWeek: number | null;
  preferredDayOfMonth: number | null;
  secondaryDayOfMonth: number | null;
  deliveriesPerMonth: number;
  user: { id: string; name: string | null; phone: string };
  package: { id: string; name: string; kind: string; price: string | number };
};

type Package = { id: string; name: string; kind: string; active: boolean };
type Product = { id: string; name: string; available: boolean };

type BasketLine = { productId: string; quantity: string };

type Upcoming = {
  subscriptionId: string;
  status: string;
  pausedUntil: string | null;
  nextRunAt: string | null;
  cutoffAt: string | null;
  canEditBasket: boolean;
  items: { productId: string; quantity: number }[];
  pricing: { total: number; discountAmount?: number; discountPercent?: number };
  pendingOrder: { id: string; total: number; paymentStatus: string | null } | null;
};

type FullSub = {
  id: string;
  status: string;
  note: string | null;
  nextRunAt: string | null;
  address: string;
  preferredDayOfWeek: number | null;
  preferredDayOfMonth: number | null;
  secondaryDayOfMonth: number | null;
  frequency: string;
  package: { id: string; name: string; kind: string };
  user: { name: string | null; phone: string };
};

const GROCERY_WEEKDAYS = groceryRecurringDeliveryDays("en").map((d) => d.value);

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function formatDateTime(iso: string | null, locale: AppLocale) {
  if (!iso) return "—";
  const tag = locale === "sw" ? "sw-TZ" : "en-GB";
  return new Date(iso).toLocaleString(tag, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  sub: SubRow;
  packages: Package[];
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
};

export function GrocerySubscriptionManageModal({
  sub,
  packages,
  products,
  onClose,
  onSaved,
}: Props) {
  const { locale, t } = useAdminLocale();
  const [upcoming, setUpcoming] = useState<Upcoming | null>(null);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pauseWeeks, setPauseWeeks] = useState("1");
  const [pauseUntil, setPauseUntil] = useState("");
  const [basketLines, setBasketLines] = useState<BasketLine[]>([]);

  const [form, setForm] = useState({
    packageId: sub.package.id,
    address: sub.address,
    note: "",
    nextRunAt: toDatetimeLocal(sub.nextRunAt),
    status: sub.status,
    preferredDayOfWeek: String(sub.preferredDayOfWeek ?? 6),
    preferredDayOfMonth: String(sub.preferredDayOfMonth ?? 1),
    secondaryDayOfMonth: String(sub.secondaryDayOfMonth ?? 15),
  });

  const selectedPkg = packages.find((p) => p.id === form.packageId) ?? sub.package;
  const isWeekly = selectedPkg.kind === "WEEKLY_BASKET";
  const isMonthly = selectedPkg.kind === "MONTHLY_PANTRY";
  const availableProducts = useMemo(() => products.filter((p) => p.available), [products]);

  function loadUpcoming() {
    setLoadingUpcoming(true);
    Promise.all([
      apiGet<Upcoming>(`/api/grocery/subscriptions/${sub.id}/upcoming`),
      apiGet<FullSub>(`/api/grocery/subscriptions/${sub.id}`),
    ])
      .then(([up, full]) => {
        setUpcoming(up);
        setBasketLines(
          up.items.map((it) => ({
            productId: it.productId,
            quantity: String(it.quantity),
          }))
        );
        setForm((f) => ({
          ...f,
          note: full.note ?? "",
          nextRunAt: toDatetimeLocal(full.nextRunAt),
          status: full.status,
          address: full.address,
          packageId: full.package.id,
        }));
      })
      .catch((e) => alert(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoadingUpcoming(false));
  }

  useEffect(() => {
    loadUpcoming();
  }, [sub.id]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPatch(`/api/grocery/subscriptions/${sub.id}`, {
        status: form.status,
        address: form.address.trim(),
        note: form.note.trim() || null,
        packageId: form.packageId,
        nextRunAt: fromDatetimeLocal(form.nextRunAt),
        preferredDayOfWeek: isWeekly ? Number(form.preferredDayOfWeek) : undefined,
        preferredDayOfMonth: isMonthly ? Number(form.preferredDayOfMonth) : undefined,
        secondaryDayOfMonth: isMonthly ? Number(form.secondaryDayOfMonth) : undefined,
      });
      onSaved();
      loadUpcoming();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function pauseSub() {
    if (!pauseWeeks && !pauseUntil) return;
    setSaving(true);
    try {
      const body: { weeks?: number; until?: string } = {};
      if (pauseUntil) body.until = new Date(pauseUntil).toISOString();
      else body.weeks = Number(pauseWeeks);
      await apiPost(`/api/grocery/subscriptions/${sub.id}/pause`, body);
      alert(t("subscriptionPaused"));
      onSaved();
      loadUpcoming();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function resumeSub() {
    setSaving(true);
    try {
      await apiPatch(`/api/grocery/subscriptions/${sub.id}`, { status: "ACTIVE" });
      alert(t("subscriptionResumed"));
      onSaved();
      loadUpcoming();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function saveBasket() {
    const items = basketLines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }));
    if (items.length === 0) return;
    setSaving(true);
    try {
      await apiPatch(`/api/grocery/subscriptions/${sub.id}/basket`, { items });
      alert(t("basketSaved"));
      onSaved();
      loadUpcoming();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  function addBasketLine() {
    const first = availableProducts[0]?.id ?? "";
    setBasketLines((lines) => [...lines, { productId: first, quantity: "1" }]);
  }

  function updateBasketLine(index: number, patch: Partial<BasketLine>) {
    setBasketLines((lines) => lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeBasketLine(index: number) {
    setBasketLines((lines) => lines.filter((_, i) => i !== index));
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal admin-modal--wide admin-modal--catalog"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-modal__head">
          <h2>{t("manageSubscriptionTitle")}</h2>
          <p className="admin-modal__sub">
            {sub.user.name ?? sub.user.phone} · {sub.package.name}
          </p>
        </header>

        <div className="admin-panel__body-pad admin-sub-manage">
          <section className="admin-sub-manage__section">
            <h3 className="admin-sub-manage__title">{t("upcomingDelivery")}</h3>
            {loadingUpcoming ? (
              <p className="admin-crud-form__hint">{t("loadingUpcoming")}</p>
            ) : upcoming ? (
              <div className="admin-sub-upcoming">
                <div className="admin-sub-upcoming__grid">
                  <div>
                    <span className="admin-sub-upcoming__label">{t("nextDelivery")}</span>
                    <strong>{formatDateTime(upcoming.nextRunAt, locale)}</strong>
                  </div>
                  <div>
                    <span className="admin-sub-upcoming__label">{t("orderCutoff")}</span>
                    <strong>{formatDateTime(upcoming.cutoffAt, locale)}</strong>
                  </div>
                  <div>
                    <span className="admin-sub-upcoming__label">{t("subStatus")}</span>
                    <strong>{upcoming.status}</strong>
                  </div>
                  <div>
                    <span className="admin-sub-upcoming__label">{t("total")}</span>
                    <strong>{formatMoney(upcoming.pricing.total)}</strong>
                  </div>
                </div>
                {upcoming.pausedUntil ? (
                  <p className="admin-crud-form__hint">
                    {t("pausedUntil")}: {formatDateTime(upcoming.pausedUntil, locale)}
                  </p>
                ) : null}
                <p className="admin-crud-form__hint">
                  {upcoming.canEditBasket ? t("canEditBasketYes") : t("canEditBasketNo")}
                </p>
                {upcoming.pendingOrder ? (
                  <p className="admin-crud-form__hint">
                    {t("pendingCycleOrder")}: {formatMoney(upcoming.pendingOrder.total)}
                    {upcoming.pendingOrder.paymentStatus
                      ? ` · ${upcoming.pendingOrder.paymentStatus}`
                      : ""}
                  </p>
                ) : null}
                <ul className="admin-sub-basket-preview">
                  {upcoming.items.map((it) => {
                    const name = products.find((p) => p.id === it.productId)?.name ?? it.productId;
                    return (
                      <li key={`${it.productId}-${it.quantity}`}>
                        {name} × {it.quantity}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </section>

          {sub.status === "ACTIVE" ? (
            <section className="admin-sub-manage__section">
              <h3 className="admin-sub-manage__title">{t("pauseSubscription")}</h3>
              <div className="admin-crud-form admin-crud-form--grid">
                <label className="admin-crud-form__field">
                  <span className="admin-crud-form__label">{t("pauseWeeks")}</span>
                  <select
                    className="admin-select"
                    value={pauseWeeks}
                    onChange={(e) => setPauseWeeks(e.target.value)}
                  >
                    {[1, 2, 3, 4, 8, 12].map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-crud-form__field">
                  <span className="admin-crud-form__label">{t("pauseUntilDate")}</span>
                  <input
                    type="date"
                    className="admin-crud-form__input"
                    value={pauseUntil}
                    onChange={(e) => setPauseUntil(e.target.value)}
                  />
                </label>
                <div className="admin-crud-form__field">
                  <button type="button" className="admin-btn secondary" disabled={saving} onClick={pauseSub}>
                    {t("pauseSubscription")}
                  </button>
                </div>
              </div>
            </section>
          ) : sub.status === "PAUSED" ? (
            <section className="admin-sub-manage__section">
              <button type="button" className="admin-btn" disabled={saving} onClick={resumeSub}>
                {t("resumeSubscription")}
              </button>
            </section>
          ) : null}

          {upcoming?.canEditBasket ? (
            <section className="admin-sub-manage__section">
              <h3 className="admin-sub-manage__title">{t("editBasket")}</h3>
              <div className="admin-sub-basket-editor">
                {basketLines.map((line, index) => (
                  <div key={index} className="admin-sub-basket-editor__row">
                    <select
                      className="admin-select"
                      value={line.productId}
                      onChange={(e) => updateBasketLine(index, { productId: e.target.value })}
                    >
                      {availableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="admin-crud-form__input"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={line.quantity}
                      onChange={(e) => updateBasketLine(index, { quantity: e.target.value })}
                      aria-label={t("basketQuantity")}
                    />
                    <button
                      type="button"
                      className="admin-btn danger sm"
                      onClick={() => removeBasketLine(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="admin-crud-form__actions">
                  <button type="button" className="admin-btn secondary sm" onClick={addBasketLine}>
                    {t("addBasketLine")}
                  </button>
                  <button type="button" className="admin-btn sm" disabled={saving} onClick={saveBasket}>
                    {saving ? t("saving") : t("saveChanges")}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <section className="admin-sub-manage__section">
            <h3 className="admin-sub-manage__title">{t("editSubscription")}</h3>
            <form className="admin-crud-form admin-crud-form--grid" onSubmit={saveDetails}>
              <label className="admin-crud-form__field admin-crud-form__field--full">
                <span className="admin-crud-form__label">{t("changePackage")}</span>
                <select
                  className="admin-select"
                  value={form.packageId}
                  onChange={(e) => setForm({ ...form, packageId: e.target.value })}
                >
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {packageKindLabel(p.kind, locale).title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-crud-form__field admin-crud-form__field--full">
                <span className="admin-crud-form__label">{t("deliveryAddress")}</span>
                <input
                  className="admin-crud-form__input"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                />
              </label>

              <label className="admin-crud-form__field admin-crud-form__field--full">
                <span className="admin-crud-form__label">{t("subNote")}</span>
                <textarea
                  className="admin-crud-form__input admin-crud-form__textarea"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2}
                />
              </label>

              <label className="admin-crud-form__field">
                <span className="admin-crud-form__label">{t("setNextRunAt")}</span>
                <input
                  type="datetime-local"
                  className="admin-crud-form__input"
                  value={form.nextRunAt}
                  onChange={(e) => setForm({ ...form, nextRunAt: e.target.value })}
                />
              </label>

              <label className="admin-crud-form__field">
                <span className="admin-crud-form__label">{t("subStatus")}</span>
                <select
                  className="admin-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="ACTIVE">{t("subStatusActive")}</option>
                  <option value="PAUSED">{t("subStatusPaused")}</option>
                  <option value="PENDING_PAYMENT">{t("subStatusPendingPayment")}</option>
                  <option value="CANCELLED">{t("subStatusCancelled")}</option>
                </select>
              </label>

              {(isWeekly || isMonthly) ? (
                <label className="admin-crud-form__field admin-crud-form__field--full">
                  <span className="admin-crud-form__label">
                    {isWeekly ? t("deliveryDayWeekly") : t("deliveryDayRecurringWeekly")}
                  </span>
                  <select
                    className="admin-select"
                    value={form.preferredDayOfWeek}
                    onChange={(e) => setForm({ ...form, preferredDayOfWeek: e.target.value })}
                  >
                    {GROCERY_WEEKDAYS.map((v) => (
                      <option key={v} value={v}>
                        {dayOfWeekLabel(v, locale)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {isMonthly && sub.preferredDayOfMonth != null && sub.preferredDayOfWeek == null ? (
                <>
                  <label className="admin-crud-form__field">
                    <span className="admin-crud-form__label">{t("firstDayOfMonth")}</span>
                    <input
                      className="admin-crud-form__input"
                      type="number"
                      min={1}
                      max={28}
                      value={form.preferredDayOfMonth}
                      onChange={(e) => setForm({ ...form, preferredDayOfMonth: e.target.value })}
                    />
                  </label>
                  <label className="admin-crud-form__field">
                    <span className="admin-crud-form__label">{t("secondDayOfMonth")}</span>
                    <input
                      className="admin-crud-form__input"
                      type="number"
                      min={1}
                      max={28}
                      value={form.secondaryDayOfMonth}
                      onChange={(e) => setForm({ ...form, secondaryDayOfMonth: e.target.value })}
                    />
                  </label>
                </>
              ) : null}

              <div className="admin-crud-form__actions admin-crud-form__field--full">
                <button type="submit" className="admin-btn" disabled={saving}>
                  {saving ? t("saving") : t("saveChanges")}
                </button>
                <button type="button" className="admin-btn secondary" onClick={onClose}>
                  {t("close")}
                </button>
              </div>
            </form>
            <p className="admin-crud-form__hint">
              {sub.package.name} · {frequencyLabel(sub.frequency, locale)}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
