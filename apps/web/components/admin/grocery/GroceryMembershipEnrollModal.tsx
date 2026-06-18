"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, normalizeApiList } from "../../../lib/admin-api";
import { formatMoney } from "../../../lib/format";
import { unitLabel } from "@monana/utils";
import { useAdminLocale } from "../AdminLocaleProvider";

type Plan = {
  id: "WEEKLY" | "MONTHLY";
  title: string;
  label: string;
  discountPercent: number;
  freeDelivery: boolean;
  badge: string | null;
};

type Product = {
  id: string;
  name: string;
  price: string | number;
  unit: string;
  categoryId: string | null;
  category?: { name: string } | null;
};

type Setup = {
  plans: Plan[];
  deliveryDays: {
    weekly: {
      date: string;
      dayOfWeek: number;
      label: string;
      deliveryAt: string;
      weekLabel: string;
    }[];
    monthly: { hint: string; recurring: { value: number; label: string }[] };
  };
  products: Product[];
  categories: { id: string; name: string }[];
  rules: { minBasketItems: number; orderCutoffHours: number; upfrontPaymentRequired: boolean };
};

type Preview = {
  planLabel: string;
  items: { name: string; quantity: number; lineTotal: number }[];
  pricing: {
    subtotal: number;
    discountAmount: number;
    discountPercent: number;
    deliveryFee: number;
    total: number;
    freeDelivery: boolean;
  };
  message: string;
};

type User = { id: string; name: string | null; phone: string };
type BasketLine = { productId: string; quantity: string };

type Props = {
  onClose: () => void;
  onEnrolled: () => void;
};

export function GroceryMembershipEnrollModal({ onClose, onEnrolled }: Props) {
  const { locale, t, tf } = useAdminLocale();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [dayWeek, setDayWeek] = useState("6");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [startNow, setStartNow] = useState(false);
  const [basketLines, setBasketLines] = useState<BasketLine[]>([]);

  useEffect(() => {
    Promise.all([
      apiGet<Setup>(`/api/grocery/store/membership?locale=${locale}`),
      apiGet<User[] | { items: User[] }>("/api/admin/users?limit=100"),
    ])
      .then(([s, u]) => {
        setSetup(s);
        setUsers(normalizeApiList(u));
        const first = s.products[0];
        if (first) {
          setBasketLines([{ productId: first.id, quantity: "1" }]);
        }
      })
      .catch((e) => alert(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }, [locale, t]);

  const basketPayload = useMemo(
    () =>
      basketLines
        .filter((l) => l.productId && Number(l.quantity) > 0)
        .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
    [basketLines]
  );

  const refreshPreview = useCallback(async () => {
    if (basketPayload.length === 0) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const data = await apiPost<Preview>(
        `/api/grocery/store/membership/preview?locale=${locale}`,
        { plan, defaultBasket: basketPayload }
      );
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [basketPayload, locale, plan]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshPreview();
    }, 350);
    return () => clearTimeout(timer);
  }, [refreshPreview]);

  useEffect(() => {
    if (!setup || plan !== "WEEKLY") return;
    if (!selectedSlot && setup.deliveryDays.weekly[0]) {
      setSelectedSlot(setup.deliveryDays.weekly[0].date);
    }
  }, [setup, plan, selectedSlot]);

  const filteredProducts = useMemo(() => {
    if (!setup) return [];
    const q = productSearch.trim().toLowerCase();
    return setup.products.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [setup, productSearch]);

  const selectedPlan = setup?.plans.find((p) => p.id === plan);

  function addBasketLine() {
    const first = setup?.products[0]?.id ?? "";
    setBasketLines((lines) => [...lines, { productId: first, quantity: "1" }]);
  }

  function updateLine(index: number, patch: Partial<BasketLine>) {
    setBasketLines((lines) => lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setBasketLines((lines) => lines.filter((_, i) => i !== index));
  }

  async function enroll(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || basketPayload.length === 0 || address.trim().length < 3) return;
    setSaving(true);
    try {
      await apiPost("/api/grocery/store/membership", {
        userId,
        plan,
        address: address.trim(),
        channel: "WEB",
        preferredDayOfWeek: plan === "MONTHLY" ? Number(dayWeek) : undefined,
        scheduledDeliveryDate: plan === "WEEKLY" ? selectedSlot || undefined : undefined,
        defaultBasket: basketPayload,
        note: note.trim() || undefined,
        startNow,
      });
      onEnrolled();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal admin-modal--wide admin-modal--catalog"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-modal__head">
          <h2>{t("enrollMembershipAdmin")}</h2>
          <p className="admin-modal__sub">{t("membershipAdminDesc")}</p>
        </header>

        {loading || !setup ? (
          <div className="admin-panel__body-pad">
            <p className="admin-crud-form__hint">{t("loadingMembership")}</p>
          </div>
        ) : (
          <form className="admin-panel__body-pad" onSubmit={enroll}>
            <div className="admin-add-panel admin-membership-enroll">
              <div className="admin-membership-enroll__main">
                <section className="admin-membership-enroll__section">
                  <h3 className="admin-membership-enroll__title">{t("customer")}</h3>
                  <select
                    className="admin-select"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                  >
                    <option value="">{t("selectCustomer")}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ?? u.phone} ({u.phone})
                      </option>
                    ))}
                  </select>
                </section>

                <section className="admin-membership-enroll__section">
                  <h3 className="admin-membership-enroll__title">{t("membershipPlan")}</h3>
                  <div className="admin-membership-plan-grid">
                    {setup.plans.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`admin-membership-plan-card${plan === p.id ? " is-selected" : ""}`}
                        onClick={() => setPlan(p.id)}
                      >
                        {p.badge ? <span className="admin-membership-plan-card__badge">{p.badge}</span> : null}
                        <strong>{p.title}</strong>
                        <small>{p.label}</small>
                        <span className="admin-membership-plan-card__meta">
                          {p.discountPercent > 0 ? `${p.discountPercent}% off` : ""}
                          {p.freeDelivery ? ` · ${t("freeDeliveryOffer")}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="admin-membership-enroll__section">
                  <h3 className="admin-membership-enroll__title">{t("schedule")}</h3>
                  {plan === "WEEKLY" ? (
                    <select
                      className="admin-select"
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      required
                    >
                      <option value="">{t("pickDeliverySlot")}</option>
                      {setup.deliveryDays.weekly.map((slot) => (
                        <option key={slot.date} value={slot.date}>
                          {slot.weekLabel} — {slot.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <p className="admin-crud-form__hint">{setup.deliveryDays.monthly.hint}</p>
                      <select
                        className="admin-select"
                        value={dayWeek}
                        onChange={(e) => setDayWeek(e.target.value)}
                        required
                      >
                        {setup.deliveryDays.monthly.recurring.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </section>

                <section className="admin-membership-enroll__section">
                  <h3 className="admin-membership-enroll__title">{t("defaultBasket")}</h3>
                  <input
                    type="search"
                    className="admin-crud-form__input"
                    placeholder={t("searchProducts")}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  <div className="admin-sub-basket-editor">
                    {basketLines.map((line, index) => (
                      <div key={index} className="admin-sub-basket-editor__row">
                        <select
                          className="admin-select"
                          value={line.productId}
                          onChange={(e) => updateLine(index, { productId: e.target.value })}
                        >
                          {filteredProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {formatMoney(p.price)}/{unitLabel(p.unit)}
                            </option>
                          ))}
                        </select>
                        <input
                          className="admin-crud-form__input"
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, { quantity: e.target.value })}
                          aria-label={t("basketQuantity")}
                        />
                        <button
                          type="button"
                          className="admin-btn danger sm"
                          onClick={() => removeLine(index)}
                          disabled={basketLines.length <= 1}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button type="button" className="admin-btn secondary sm" onClick={addBasketLine}>
                      {t("addBasketLine")}
                    </button>
                  </div>
                </section>

                <section className="admin-membership-enroll__section">
                  <label className="admin-crud-form__field admin-crud-form__field--full">
                    <span className="admin-crud-form__label">{t("deliveryAddress")}</span>
                    <input
                      className="admin-crud-form__input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </label>
                  <label className="admin-crud-form__field admin-crud-form__field--full">
                    <span className="admin-crud-form__label">{t("subNote")}</span>
                    <textarea
                      className="admin-crud-form__input admin-crud-form__textarea"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                    />
                  </label>
                  <label className="admin-crud-form__field admin-crud-form__field--row">
                    <input
                      type="checkbox"
                      checked={startNow}
                      onChange={(e) => setStartNow(e.target.checked)}
                    />
                    {t("startFirstOrderNow")}
                  </label>
                </section>

                <div className="admin-crud-form__actions">
                  <button type="submit" className="admin-btn" disabled={saving || basketPayload.length === 0}>
                    {saving ? t("saving") : t("enrollMembership")}
                  </button>
                  <button type="button" className="admin-btn secondary" onClick={onClose}>
                    {t("cancel")}
                  </button>
                </div>
              </div>

              <aside className="admin-add-preview admin-membership-preview" aria-live="polite">
                <span className="admin-add-preview__label">{t("livePreview")}</span>
                <p className="admin-add-preview__hint">{t("membershipPreviewHint")}</p>

                {selectedPlan ? (
                  <div className="admin-membership-preview__plan">
                    <strong>{selectedPlan.title}</strong>
                    {selectedPlan.badge ? <span className="admin-kitchen-pill">{selectedPlan.badge}</span> : null}
                  </div>
                ) : null}

                {previewLoading ? (
                  <p className="admin-crud-form__hint">{t("saving")}…</p>
                ) : preview ? (
                  <>
                    <ul className="admin-sub-basket-preview">
                      {preview.items.map((it) => (
                        <li key={`${it.name}-${it.quantity}`}>
                          {it.name} × {it.quantity} — {formatMoney(it.lineTotal)}
                        </li>
                      ))}
                    </ul>
                    <div className="admin-membership-preview__pricing">
                      <div>
                        <span>{t("subtotal")}</span>
                        <strong>{formatMoney(preview.pricing.subtotal)}</strong>
                      </div>
                      {preview.pricing.discountAmount > 0 ? (
                        <div className="admin-membership-preview__discount">
                          <span>{t("discount")}</span>
                          <strong>-{formatMoney(preview.pricing.discountAmount)}</strong>
                        </div>
                      ) : null}
                      {preview.pricing.freeDelivery ? (
                        <span className="admin-kitchen-pill admin-kitchen-pill--hot">{t("freeDeliveryOffer")}</span>
                      ) : (
                        <div>
                          <span>{t("deliveryFee")}</span>
                          <strong>{formatMoney(preview.pricing.deliveryFee)}</strong>
                        </div>
                      )}
                      <div className="admin-membership-preview__total">
                        <span>{t("upfrontTotal")}</span>
                        <strong>{formatMoney(preview.pricing.total)}</strong>
                      </div>
                    </div>
                    <p className="admin-crud-form__hint">{preview.message}</p>
                  </>
                ) : (
                  <p className="admin-crud-form__hint">{t("pickProducts")}</p>
                )}

                <p className="admin-crud-form__hint">
                  {tf("membershipCutoffHint", { n: setup.rules.orderCutoffHours })}
                </p>
              </aside>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
