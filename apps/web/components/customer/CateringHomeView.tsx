"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, getStoredUser } from "../../lib/admin-api";
import { formatMoney } from "../../lib/format";
import { ServiceCategoryToggle } from "../landing/ServiceCategoryToggle";
import { useAppLocale } from "../providers/AppLocaleProvider";

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
};

type EventType = "WEDDING" | "SEND_OFF" | "CORPORATE" | "BIRTHDAY" | "FUNERAL" | "OTHER";

const EVENT_KEYS: Record<
  EventType,
  | "cateringEventWedding"
  | "cateringEventSendOff"
  | "cateringEventCorporate"
  | "cateringEventBirthday"
  | "cateringEventFuneral"
  | "cateringEventOther"
> = {
  WEDDING: "cateringEventWedding",
  SEND_OFF: "cateringEventSendOff",
  CORPORATE: "cateringEventCorporate",
  BIRTHDAY: "cateringEventBirthday",
  FUNERAL: "cateringEventFuneral",
  OTHER: "cateringEventOther",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalInputValue(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function CateringHomeView() {
  const router = useRouter();
  const { locale, t } = useAppLocale();
  const user = getStoredUser();

  const [packages, setPackages] = useState<Package[]>([]);
  const [pkgsLoading, setPkgsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(20);
  const [eventType, setEventType] = useState<EventType>("CORPORATE");
  const [eventAt, setEventAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
  );
  const [location, setLocation] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [quoteGuests, setQuoteGuests] = useState(50);
  const [quoteEventType, setQuoteEventType] = useState<EventType>("WEDDING");
  const [quoteEventAt, setQuoteEventAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000))
  );
  const [quoteLocation, setQuoteLocation] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [bookLoading, setBookLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const [success, setSuccess] = useState("");
  const [quoteSuccess, setQuoteSuccess] = useState("");

  useEffect(() => {
    setPkgsLoading(true);
    apiGet<Package[]>("/api/catering/packages")
      .then((rows) => {
        setPackages(rows);
        if (rows[0]) {
          setSelectedId(rows[0].id);
          setGuestCount(rows[0].minGuests);
        }
      })
      .catch(() => setPackages([]))
      .finally(() => setPkgsLoading(false));
  }, []);

  const selected = packages.find((p) => p.id === selectedId) ?? null;
  const pricePerHead = selected ? Number(selected.pricePerHead) : 0;
  const total = useMemo(() => Math.round(pricePerHead * guestCount), [pricePerHead, guestCount]);

  useEffect(() => {
    if (!selected) return;
    if (guestCount < selected.minGuests) setGuestCount(selected.minGuests);
    if (selected.maxGuests != null && guestCount > selected.maxGuests) {
      setGuestCount(selected.maxGuests);
    }
  }, [selectedId]);

  async function ensureAuth(next: string) {
    if (user) return true;
    router.push(`/login?next=${encodeURIComponent(next)}`);
    return false;
  }

  async function bookPackage(e: React.FormEvent) {
    e.preventDefault();
    if (!(await ensureAuth("/catering"))) return;
    if (!selected || !user) return;

    setBookLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiPost<{ orderId: string; payPath: string }>(
        "/api/catering/requests",
        {
          userId: user.id,
          packageId: selected.id,
          eventType,
          eventAt: new Date(eventAt).toISOString(),
          location: location.trim(),
          guestCount,
          specialRequirements: specialRequirements.trim() || undefined,
          channel: "WEB",
        }
      );
      setSuccess(t("cateringPackageSuccess"));
      setTimeout(() => router.push(result.payPath || `/pay/${result.orderId}`), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orderFailed"));
    } finally {
      setBookLoading(false);
    }
  }

  async function submitQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!(await ensureAuth("/catering#quote"))) return;
    if (!user) return;

    setQuoteLoading(true);
    setQuoteError("");
    setQuoteSuccess("");
    try {
      await apiPost("/api/catering/requests", {
        userId: user.id,
        eventType: quoteEventType,
        eventAt: new Date(quoteEventAt).toISOString(),
        location: quoteLocation.trim(),
        guestCount: quoteGuests,
        specialRequirements: quoteNotes.trim() || undefined,
        channel: "WEB",
      });
      setQuoteSuccess(t("cateringQuoteSuccess"));
      setTimeout(() => router.push("/catering/requests"), 1200);
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : t("orderFailed"));
    } finally {
      setQuoteLoading(false);
    }
  }

  function pkgName(p: Package) {
    return locale === "sw" ? p.nameSw : p.nameEn;
  }
  function pkgDesc(p: Package) {
    return locale === "sw" ? p.descriptionSw : p.descriptionEn;
  }
  function pkgFeatures(p: Package) {
    return locale === "sw" ? p.featuresSw : p.featuresEn;
  }

  return (
    <div className="store-page catering-page">
      <ServiceCategoryToggle />

      <header className="store-page__head">
        <div>
          <p className="store-page__eyebrow">Monana Food</p>
          <h1 className="store-page__title">{t("cateringHubTitle")}</h1>
          <p className="store-page__sub">{t("cateringHubSub")}</p>
        </div>
        {user ? (
          <Link href="/catering/requests" className="landing-btn landing-btn--ghost">
            {t("cateringMyRequests")}
          </Link>
        ) : null}
      </header>

      <aside className="custom-order-rule" role="note">
        <strong>💳 {t("cateringNoCod")}</strong>
      </aside>

      <section className="catering-packages" aria-labelledby="catering-packages-title">
        <h2 id="catering-packages-title" className="store-hub__section-title">
          {t("cateringPackagesTitle")}
        </h2>
        <p className="store-page__sub catering-section-sub">{t("cateringPackagesSub")}</p>

        {pkgsLoading ? (
          <div className="catering-packages__grid" aria-busy="true" aria-label={t("cateringLoadingPackages")}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="catering-package-card catering-package-card--skeleton" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <p className="catering-empty-inline">{t("cateringPackagesEmpty")}</p>
        ) : (
          <div className="catering-packages__grid">
            {packages.map((p) => {
              const active = p.id === selectedId;
              const range =
                p.maxGuests == null
                  ? t("cateringGuestsMinPlus").replace("{min}", String(p.minGuests))
                  : t("cateringGuestsRange")
                      .replace("{min}", String(p.minGuests))
                      .replace("{max}", String(p.maxGuests));
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`catering-package-card${active ? " is-active" : ""}`}
                  onClick={() => {
                    setSelectedId(p.id);
                    setGuestCount(p.minGuests);
                  }}
                >
                  <span className="catering-package-card__code">{p.code.replace(/_/g, " ")}</span>
                  <strong>{pkgName(p)}</strong>
                  <p>{pkgDesc(p)}</p>
                  <div className="catering-package-card__price">
                    {formatMoney(Number(p.pricePerHead))}
                    <small> / {t("cateringPerHead")}</small>
                  </div>
                  <small className="catering-package-card__range">{range}</small>
                  <ul>
                    {pkgFeatures(p).slice(0, 4).map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        )}

        {selected ? (
          <form className="checkout-page__form custom-order-form catering-book-form" onSubmit={bookPackage}>
            <section className="checkout-card">
              <h3>{pkgName(selected)}</h3>
              <div className="catering-form-row">
                <label className="checkout-field">
                  <span>{t("cateringGuests")}</span>
                  <input
                    type="number"
                    required
                    min={selected.minGuests}
                    max={selected.maxGuests ?? undefined}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                  />
                </label>
                <p className="catering-total">
                  {t("cateringTotal")}: <strong>{formatMoney(total)}</strong>
                  <small>
                    ({formatMoney(pricePerHead)} × {guestCount})
                  </small>
                </p>
              </div>
              <div className="catering-form-row">
                <label className="checkout-field">
                  <span>{t("cateringEventType")}</span>
                  <select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)}>
                    {(Object.keys(EVENT_KEYS) as EventType[]).map((k) => (
                      <option key={k} value={k}>
                        {t(EVENT_KEYS[k])}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkout-field">
                  <span>{t("cateringEventAt")}</span>
                  <input
                    type="datetime-local"
                    required
                    value={eventAt}
                    onChange={(e) => setEventAt(e.target.value)}
                  />
                </label>
              </div>
              <label className="checkout-field">
                <span>{t("cateringLocation")}</span>
                <input required minLength={3} value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
              <label className="checkout-field">
                <span>{t("cateringSpecial")}</span>
                <textarea
                  rows={3}
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  placeholder={t("cateringSpecialPh")}
                />
              </label>
            </section>
            {error ? <p className="form-error">{error}</p> : null}
            {success ? <p className="form-success">{success}</p> : null}
            <button type="submit" className="landing-btn landing-btn--orange" disabled={bookLoading}>
              {bookLoading ? t("customOrderSubmitting") : t("cateringBookPackage")}
            </button>
          </form>
        ) : null}
      </section>

      <section id="quote" className="catering-quote">
        <h2 className="store-hub__section-title">{t("cateringQuoteTitle")}</h2>
        <p className="store-page__sub catering-section-sub">{t("cateringQuoteSub")}</p>
        <form className="checkout-page__form custom-order-form" onSubmit={submitQuote}>
          <section className="checkout-card">
            <div className="catering-form-row">
              <label className="checkout-field">
                <span>{t("cateringEventType")}</span>
                <select
                  value={quoteEventType}
                  onChange={(e) => setQuoteEventType(e.target.value as EventType)}
                >
                  {(Object.keys(EVENT_KEYS) as EventType[]).map((k) => (
                    <option key={k} value={k}>
                      {t(EVENT_KEYS[k])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkout-field">
                <span>{t("cateringEventAt")}</span>
                <input
                  type="datetime-local"
                  required
                  value={quoteEventAt}
                  onChange={(e) => setQuoteEventAt(e.target.value)}
                />
              </label>
            </div>
            <label className="checkout-field">
              <span>{t("cateringGuests")}</span>
              <input
                type="number"
                required
                min={1}
                value={quoteGuests}
                onChange={(e) => setQuoteGuests(Number(e.target.value))}
              />
            </label>
            <label className="checkout-field">
              <span>{t("cateringLocation")}</span>
              <input
                required
                minLength={3}
                value={quoteLocation}
                onChange={(e) => setQuoteLocation(e.target.value)}
              />
            </label>
            <label className="checkout-field">
              <span>{t("cateringSpecial")}</span>
              <textarea
                rows={3}
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                placeholder={t("cateringSpecialPh")}
              />
            </label>
          </section>
          {quoteError ? <p className="form-error">{quoteError}</p> : null}
          {quoteSuccess ? <p className="form-success">{quoteSuccess}</p> : null}
          <button type="submit" className="landing-btn landing-btn--navy" disabled={quoteLoading}>
            {quoteLoading ? t("customOrderSubmitting") : t("cateringSubmitQuote")}
          </button>
        </form>
        <p className="store-page__hint">
          <Link href="/restaurant/social-order">{t("customOrderHubCard")}</Link> — {t("customOrderHubCardSub")}
        </p>
      </section>
    </div>
  );
}
