"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, getStoredUser } from "../../lib/admin-api";
import { formatDate } from "../../lib/format";
import { SUB_STATUS_I18N } from "../../lib/customer-i18n";
import { unitLabel } from "@monana/utils";
import { deliveryDayLabel } from "@monana/grocery";
import { frequencyLabel, membershipPlanTitle } from "@monana/utils";
import { useAppLocale } from "../providers/AppLocaleProvider";

type PendingPayment =
  | {
      status: "ready";
      payId: string;
      kind: "ORDER" | "CHECKOUT_INTENT";
      amount: string;
      expiresAt: string | null;
    }
  | {
      status: "expired";
      amount: string | null;
    };

type Subscription = {
  id: string;
  status: string;
  frequency: string;
  address: string;
  nextRunAt: string | null;
  preferredDayOfWeek: number | null;
  preferredDayOfMonth: number | null;
  package?: { id: string; name: string; kind: string };
  pendingPayment?: PendingPayment | null;
};

type Setup = {
  products: { id: string; name: string; price: number | string; unit: string; inStock?: boolean }[];
};

type UpcomingDelivery = {
  canEditBasket: boolean;
  items: { productId: string; quantity: number }[];
};

type StorePackage = {
  id: string;
  name: string;
  kind: string;
};

type BasketLine = {
  productId: string;
  quantity: number;
};

export function MembershipDashboardView() {
  const router = useRouter();
  const { locale, t } = useAppLocale();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [storePackages, setStorePackages] = useState<StorePackage[]>([]);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [editingBasketId, setEditingBasketId] = useState<string | null>(null);
  const [savingBasketId, setSavingBasketId] = useState<string | null>(null);
  const [basketDraft, setBasketDraft] = useState<BasketLine[]>([]);
  const [basketLocked, setBasketLocked] = useState(false);
  const [changingPackageId, setChangingPackageId] = useState<string | null>(null);

  const user = getStoredUser();

  async function load() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [subscriptions, setupData, packages] = await Promise.all([
        apiGet<Subscription[]>(`/api/grocery/subscriptions?userId=${user.id}`),
        apiGet<Setup>(`/api/grocery/store/membership?locale=${locale}`),
        apiGet<StorePackage[]>("/api/grocery/packages"),
      ]);
      setSubs(subscriptions);
      setSetup(setupData);
      setStorePackages(packages);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user?.id, locale]);

  async function pauseOneWeek(subId: string) {
    setPausingId(subId);
    setError("");
    try {
      await apiPost(`/api/grocery/subscriptions/${subId}/pause`, { weeks: 1 });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setPausingId(null);
    }
  }

  async function cancelPending(subId: string) {
    if (!window.confirm(t("cancelPendingSubscriptionConfirm"))) return;
    setCancellingId(subId);
    setError("");
    try {
      await apiPost(`/api/grocery/subscriptions/${subId}/cancel-pending`, {});
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setCancellingId(null);
    }
  }

  async function cancelActive(subId: string) {
    if (!window.confirm(t("cancelActiveSubscriptionConfirm"))) return;
    setCancellingId(subId);
    setError("");
    try {
      await apiPost(`/api/grocery/subscriptions/${subId}/cancel`, {});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setCancellingId(null);
    }
  }

  async function resumePayment(subId: string) {
    setResumingId(subId);
    setError("");
    try {
      const payment = await apiPost<{ status: "ready"; payId: string }>(
        `/api/grocery/subscriptions/${subId}/resume-payment`,
        {}
      );
      if (payment.status === "ready" && payment.payId) {
        router.push(`/pay/${payment.payId}`);
      } else {
        load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setResumingId(null);
    }
  }

  function packageDisplayName(sub: Subscription) {
    if (sub.frequency === "WEEKLY" || sub.frequency === "MONTHLY") {
      return membershipPlanTitle(sub.frequency, locale);
    }
    return sub.package?.name ?? frequencyLabel(sub.frequency, locale);
  }

  function subStatusLabel(status: string) {
    return SUB_STATUS_I18N[status]?.[locale] ?? status;
  }

  function addBasketLine() {
    const fallbackProduct = setup?.products.find((p) => p.inStock !== false)?.id ?? setup?.products[0]?.id ?? "";
    if (!fallbackProduct) return;
    setBasketDraft((prev) => [...prev, { productId: fallbackProduct, quantity: 1 }]);
  }

  function updateBasketLine(index: number, patch: Partial<BasketLine>) {
    setBasketDraft((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeBasketLine(index: number) {
    setBasketDraft((prev) => prev.filter((_, i) => i !== index));
  }

  async function startBasketEdit(subId: string) {
    setEditingBasketId(subId);
    setBasketLocked(false);
    setError("");
    try {
      const upcoming = await apiGet<UpcomingDelivery>(`/api/grocery/subscriptions/${subId}/upcoming`);
      const rows = upcoming.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) }));
      setBasketDraft(rows.length > 0 ? rows : []);
      setBasketLocked(!upcoming.canEditBasket);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
      setEditingBasketId(null);
    }
  }

  async function saveBasket(subId: string) {
    const items = basketDraft
      .filter((line) => line.productId && Number(line.quantity) > 0)
      .map((line) => ({ productId: line.productId, quantity: Number(line.quantity) }));
    if (items.length === 0) {
      setError(t("pickProducts"));
      return;
    }
    setSavingBasketId(subId);
    setError("");
    try {
      await apiPatch(`/api/grocery/subscriptions/${subId}/basket`, { items });
      setEditingBasketId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setSavingBasketId(null);
    }
  }

  async function switchPackage(sub: Subscription, pkgId: string) {
    if (!window.confirm(t("switchPackageConfirm"))) return;
    setChangingPackageId(`${sub.id}:${pkgId}`);
    setError("");
    try {
      await apiPost(`/api/grocery/subscriptions/${sub.id}/cancel`, {});
      router.push(`/account/subscription/enroll?packageId=${pkgId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionFailed"));
    } finally {
      setChangingPackageId(null);
    }
  }

  function scheduleLabel(sub: Subscription) {
    const dayLabel = deliveryDayLabel(
      sub.frequency as "WEEKLY" | "MONTHLY",
      sub.preferredDayOfWeek,
      sub.preferredDayOfMonth,
      locale
    );
    if (dayLabel) return dayLabel;
    return frequencyLabel(sub.frequency, locale);
  }

  const enrollmentBlocked = subs.some((s) => ["PENDING_PAYMENT", "ACTIVE", "PAUSED"].includes(s.status));

  return (
    <div className="membership-page">
      <header className="account-page-head">
        <div>
          <p className="account-page-head__eyebrow">{t("membership")}</p>
          <h1 className="account-page-head__title">{t("membershipTitle")}</h1>
          <p className="account-page-head__sub">{t("membershipSub")}</p>
        </div>
        {!enrollmentBlocked ? (
          <Link href="/account/subscription/enroll" className="landing-btn landing-btn--orange">
            {t("membershipEnroll")}
          </Link>
        ) : null}
      </header>

      {loading ? (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
          <p>{t("loadingMembership")}</p>
        </div>
      ) : error ? (
        <p className="auth-form__error">{error}</p>
      ) : subs.length === 0 ? (
        <div className="account-empty">
          <span aria-hidden>🔄</span>
          <p>{t("membershipNone")}</p>
          <Link href="/account/subscription/enroll" className="landing-btn landing-btn--orange">
            {t("membershipEnroll")}
          </Link>
        </div>
      ) : (
        <ul className="membership-cards">
          {subs.map((sub) => {
            const pending = sub.pendingPayment;
            const payReady = pending?.status === "ready";
            const payExpired = pending?.status === "expired";

            return (
              <li key={sub.id} className="membership-card">
                <div className="membership-card__head">
                  <strong>{packageDisplayName(sub)}</strong>
                  <span
                    className={`order-status ${
                      sub.status === "ACTIVE"
                        ? "order-status--confirmed"
                        : sub.status === "PAUSED"
                          ? "order-status--pending"
                          : "order-status--pending"
                    }`}
                  >
                    {subStatusLabel(sub.status)}
                  </span>
                </div>
                <p className="membership-card__schedule">
                  📅 {scheduleLabel(sub)} · {frequencyLabel(sub.frequency, locale)}
                </p>
                <p className="membership-card__addr">📍 {sub.address}</p>
                {sub.nextRunAt ? (
                  <p className="membership-card__next">
                    {t("nextDelivery")}: <strong>{formatDate(sub.nextRunAt)}</strong>
                  </p>
                ) : null}

                {sub.status === "PENDING_PAYMENT" ? (
                  <p className="membership-card__pending-note">
                    {payExpired ? t("subscriptionPaymentExpired") : t("subscriptionPaymentPending")}
                  </p>
                ) : null}

                <div className="membership-card__actions">
                  {sub.status === "PENDING_PAYMENT" ? (
                    <>
                      {payReady ? (
                        <Link
                          href={`/pay/${pending.payId}`}
                          className="landing-btn landing-btn--orange landing-btn--sm"
                        >
                          {t("payNow")}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="landing-btn landing-btn--orange landing-btn--sm"
                          disabled={resumingId === sub.id}
                          onClick={() => resumePayment(sub.id)}
                        >
                          {resumingId === sub.id ? t("loadingPayment") : t("resumePayment")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="landing-btn landing-btn--ghost landing-btn--sm"
                        disabled={cancellingId === sub.id}
                        onClick={() => cancelPending(sub.id)}
                      >
                        {cancellingId === sub.id ? t("cancellingOrder") : t("cancelSubscription")}
                      </button>
                    </>
                  ) : null}
                  {sub.status === "ACTIVE" || sub.status === "PAUSED" ? (
                    <>
                      <button
                        type="button"
                        className="landing-btn landing-btn--ghost landing-btn--sm"
                        onClick={() => startBasketEdit(sub.id)}
                      >
                        {t("manageBasket")}
                      </button>
                      {sub.status === "ACTIVE" ? (
                        <button
                          type="button"
                          className="landing-btn landing-btn--ghost landing-btn--sm"
                          disabled={pausingId === sub.id}
                          onClick={() => pauseOneWeek(sub.id)}
                        >
                          {pausingId === sub.id ? t("pausing") : t("pauseWeek")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="landing-btn landing-btn--ghost landing-btn--sm"
                        disabled={cancellingId === sub.id}
                        onClick={() => cancelActive(sub.id)}
                      >
                        {cancellingId === sub.id ? t("cancellingOrder") : t("cancelSubscription")}
                      </button>
                    </>
                  ) : null}
                  <Link href="/grocery/products" className="landing-btn landing-btn--ghost landing-btn--sm">
                    {t("shopGrocery")}
                  </Link>
                </div>

                {editingBasketId === sub.id && setup ? (
                  <div className="membership-basket-editor">
                    <p className="membership-basket-editor__title">{t("manageBasket")}</p>
                    <div className="membership-basket-editor__rows">
                      {basketDraft.map((line, index) => (
                        <div key={`${line.productId}-${index}`} className="membership-basket-editor__row">
                          <select
                            value={line.productId}
                            onChange={(e) => updateBasketLine(index, { productId: e.target.value })}
                            disabled={basketLocked}
                          >
                            {setup.products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - {product.price}/{unitLabel(product.unit, locale)}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={line.quantity}
                            onChange={(e) => updateBasketLine(index, { quantity: Number(e.target.value) })}
                            disabled={basketLocked}
                          />
                          <button
                            type="button"
                            className="landing-btn landing-btn--ghost landing-btn--sm"
                            onClick={() => removeBasketLine(index)}
                            disabled={basketDraft.length <= 1 || basketLocked}
                          >
                            {t("removeBasketItem")}
                          </button>
                        </div>
                      ))}
                    </div>
                    {basketLocked ? <p className="membership-package-switch__hint">{t("canEditBasketNo")}</p> : null}
                    <div className="membership-basket-editor__actions">
                      <button
                        type="button"
                        className="landing-btn landing-btn--ghost landing-btn--sm"
                        onClick={addBasketLine}
                        disabled={basketLocked}
                      >
                        {t("addBasketItem")}
                      </button>
                      <button
                        type="button"
                        className="landing-btn landing-btn--orange landing-btn--sm"
                        disabled={savingBasketId === sub.id || basketLocked}
                        onClick={() => saveBasket(sub.id)}
                      >
                        {savingBasketId === sub.id ? t("saving") : t("saveBasket")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {sub.status === "ACTIVE" || sub.status === "PAUSED" ? (
                  <div className="membership-package-switch">
                    <p className="membership-package-switch__title">{t("changePackage")}</p>
                    <p className="membership-package-switch__hint">{t("packageChangeHint")}</p>
                    <div className="membership-package-switch__list">
                      {storePackages
                        .filter((pkg) => pkg.id !== sub.package?.id && pkg.kind === sub.package?.kind)
                        .map((pkg) => {
                          const isChanging = changingPackageId === `${sub.id}:${pkg.id}`;
                          return (
                            <button
                              key={pkg.id}
                              type="button"
                              className="landing-btn landing-btn--ghost landing-btn--sm"
                              onClick={() => switchPackage(sub, pkg.id)}
                              disabled={isChanging}
                            >
                              {isChanging ? t("cancellingOrder") : `${t("changePackage")}: ${pkg.name}`}
                            </button>
                          );
                        })}
                    </div>
                    {storePackages.filter((pkg) => pkg.id !== sub.package?.id && pkg.kind === sub.package?.kind)
                      .length === 0 ? (
                      <p className="membership-package-switch__hint">{t("noAltPackages")}</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="account-delivery-hint">{t("membershipHint")}</p>
    </div>
  );
}
