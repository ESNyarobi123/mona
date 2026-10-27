"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, getStoredUser, getToken, setSession } from "../../lib/admin-api";
import { formatDate } from "../../lib/format";
import { useAppLocale } from "../providers/AppLocaleProvider";

type Profile = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
};

export function ProfileView() {
  const { setLocale: setAppLocale, t } = useAppLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [locale, setLocale] = useState<"en" | "sw">("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    apiGet<Profile>("/api/auth/me")
      .then((p) => {
        setProfile(p);
        setName(p.name ?? "");
        setEmail(p.email ?? "");
        setLocale(p.locale === "sw" ? "sw" : "en");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiPatch<Profile>("/api/auth/me", {
        name: name.trim(),
        email: email.trim(),
      });
      setProfile(updated);
      const token = getToken();
      const stored = getStoredUser();
      if (token && stored) {
        setSession(token, {
          ...stored,
          name: updated.name,
        });
      }
      setSuccess(t("profileUpdated"));
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function setLanguage(next: "en" | "sw") {
    if (!profile || locale === next) return;
    setSaving(true);
    setError("");
    try {
      await setAppLocale(next);
      setLocale(next);
      setProfile((p) => (p ? { ...p, locale: next } : p));
      setSuccess(next === "sw" ? t("languageSetSw") : t("languageSetEn"));
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("changeLangFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwSaving(true);
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      setPwSaving(false);
      return;
    }
    try {
      await apiPost("/api/auth/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(t("passwordChanged"));
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setPwSaving(false);
    }
  }

  const initials = (profile?.name?.[0] ?? profile?.phone?.slice(-2) ?? "M").toUpperCase();

  return (
    <div className="profile-page">
      <header className="profile-page__hero">
        <div className="profile-page__avatar" aria-hidden>
          {initials}
        </div>
        <div>
          <p className="profile-page__eyebrow">{t("profileEyebrow")}</p>
          <h1 className="profile-page__title">{profile?.name ?? t("profileTitle")}</h1>
          <p className="profile-page__sub">{profile?.phone}</p>
        </div>
      </header>

      {loading ? (
        <div className="account-loading account-loading--inline">
          <div className="account-loading__spinner" aria-hidden />
          <p>{t("loadingProfile")}</p>
        </div>
      ) : profile ? (
        <>
          {success ? (
            <p className="auth-toast auth-toast--success profile-page__toast" role="status">
              {success}
            </p>
          ) : null}
          {error ? <p className="auth-form__error">{error}</p> : null}

          <form className="profile-card profile-card--form" onSubmit={saveProfile}>
            <header className="profile-card__head">
              <span className="profile-card__head-icon" aria-hidden>
                ✏️
              </span>
              <div>
                <h2>{t("basicInfo")}</h2>
                <p className="profile-card__head-sub">{t("basicInfoSub")}</p>
              </div>
            </header>

            <div className="profile-form">
              <label className="profile-field">
                <span className="profile-field__label">
                  {t("nameLabel")} <span className="profile-field__req">*</span>
                </span>
                <span className="profile-field__wrap">
                  <span className="profile-field__icon" aria-hidden>
                    👤
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    required
                    minLength={2}
                    autoComplete="name"
                  />
                </span>
              </label>

              <div className="profile-field">
                <span className="profile-field__label">{t("phoneLabel")}</span>
                <div className="profile-field__locked">
                  <span className="profile-field__icon" aria-hidden>
                    📱
                  </span>
                  <span className="profile-field__locked-value">{profile.phone}</span>
                  <span className="profile-field__lock-badge" title={t("cannotChange")}>
                    🔒
                  </span>
                </div>
                <span className="profile-field__hint">{t("phoneLocked")}</span>
              </div>

              <label className="profile-field">
                <span className="profile-field__label">
                  {t("emailOptional")}{" "}
                  <span className="profile-field__optional">{t("optional")}</span>
                </span>
                <span className="profile-field__wrap">
                  <span className="profile-field__icon" aria-hidden>
                    ✉️
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </span>
              </label>
            </div>

            <footer className="profile-form__footer">
              <button type="submit" className="landing-btn landing-btn--orange profile-form__submit" disabled={saving}>
                {saving ? t("saving") : t("saveChanges")}
              </button>
            </footer>
          </form>

          <form className="profile-card profile-card--form" onSubmit={changePassword} autoComplete="off">
            <header className="profile-card__head">
              <span className="profile-card__head-icon" aria-hidden>
                🔐
              </span>
              <div>
                <h2>{t("changePassword")}</h2>
                <p className="profile-card__head-sub">{t("changePasswordSub")}</p>
              </div>
            </header>

            <div className="profile-form">
              <label className="profile-field">
                <span className="profile-field__label">{t("currentPassword")}</span>
                <span className="profile-field__wrap profile-field__wrap--toggle">
                  <span className="profile-field__icon" aria-hidden>
                    🔒
                  </span>
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="profile-field__toggle"
                    onClick={() => setShowCurrent((v) => !v)}
                    aria-label={showCurrent ? t("hidePassword") : t("showPassword")}
                  >
                    {showCurrent ? "🙈" : "👁"}
                  </button>
                </span>
              </label>

              <label className="profile-field">
                <span className="profile-field__label">{t("newPassword")}</span>
                <span className="profile-field__wrap profile-field__wrap--toggle">
                  <span className="profile-field__icon" aria-hidden>
                    🔒
                  </span>
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("passwordMinPlaceholder")}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="profile-field__toggle"
                    onClick={() => setShowNew((v) => !v)}
                    aria-label={showNew ? t("hidePassword") : t("showPassword")}
                  >
                    {showNew ? "🙈" : "👁"}
                  </button>
                </span>
              </label>

              <label className="profile-field">
                <span className="profile-field__label">{t("confirmPassword")}</span>
                <span className="profile-field__wrap profile-field__wrap--toggle">
                  <span className="profile-field__icon" aria-hidden>
                    🔒
                  </span>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("repeatPassword")}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="profile-field__toggle"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? t("hidePassword") : t("showPassword")}
                  >
                    {showConfirm ? "🙈" : "👁"}
                  </button>
                </span>
              </label>
            </div>

            <footer className="profile-form__footer">
              <button
                type="submit"
                className="landing-btn landing-btn--orange profile-form__submit"
                disabled={pwSaving}
              >
                {pwSaving ? t("updatingPassword") : t("updatePassword")}
              </button>
            </footer>
          </form>

          <section className="profile-card">
            <h2>{t("languageSection")}</h2>
            <p className="profile-card__desc">{t("languageSectionSub")}</p>
            <div className="profile-locale">
              <button
                type="button"
                className={`profile-locale__btn ${locale === "sw" ? "profile-locale__btn--active" : ""}`}
                onClick={() => setLanguage("sw")}
                disabled={saving}
              >
                🇹🇿 {t("languageSw")}
              </button>
              <button
                type="button"
                className={`profile-locale__btn ${locale === "en" ? "profile-locale__btn--active" : ""}`}
                onClick={() => setLanguage("en")}
                disabled={saving}
              >
                🇬🇧 {t("languageEn")}
              </button>
            </div>
          </section>

          <section className="profile-card profile-card--meta">
            <dl className="profile-meta">
              <div>
                <dt>{t("accountSince")}</dt>
                <dd>{formatDate(profile.createdAt)}</dd>
              </div>
              <div>
                <dt>{t("lastUpdated")}</dt>
                <dd>{formatDate(profile.updatedAt)}</dd>
              </div>
              <div>
                <dt>{t("accountType")}</dt>
                <dd>{profile.role === "ADMIN" ? t("adminRole") : t("customer")}</dd>
              </div>
            </dl>
          </section>

          <section className="profile-card profile-card--links">
            <h2>{t("links")}</h2>
            <div className="support-links">
              <Link href="/account">🏠 {t("navOverview")}</Link>
              <Link href="/restaurant/orders">🍲 {t("navRestOrders")}</Link>
              <Link href="/grocery/orders">🛒 {t("navGrocOrders")}</Link>
              <Link href="/support">🆘 {t("navSupport")}</Link>
            </div>
          </section>
        </>
      ) : (
        <p className="auth-form__error">{error || t("profileNotFound")}</p>
      )}
    </div>
  );
}
