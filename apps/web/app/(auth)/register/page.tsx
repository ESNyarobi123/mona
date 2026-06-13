"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthSplitLayout } from "../../../components/auth/AuthSplitLayout";
import { getStoredLocale } from "../../../lib/locale-preference";
import { useAppLocale } from "../../../components/providers/AppLocaleProvider";

type Step = 1 | 2;

export default function RegisterPage() {
  const { t } = useAppLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (name.trim().length < 2) {
        throw new Error(t("errNameMin"));
      }
      if (phone.replace(/\D/g, "").length < 9) {
        throw new Error(t("errPhoneInvalid"));
      }
      const res = await fetch(`/api/auth/check-phone?phone=${encodeURIComponent(phone)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? t("errPhoneVerify"));
      if (!json.data.available) {
        throw new Error(t("errPhoneTaken"));
      }
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError(t("errPasswordMin"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errPasswordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          name: name.trim(),
          password,
          locale: getStoredLocale(),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? t("errRegisterFailed"));
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  const phoneTaken = error === t("errPhoneTaken");

  return (
    <AuthSplitLayout>
      <div className="auth-form">
        <div className="auth-steps" aria-label={t("registerProgress")}>
          <span className={`auth-steps__dot ${step >= 1 ? "auth-steps__dot--active" : ""}`}>1</span>
          <span className="auth-steps__line" />
          <span className={`auth-steps__dot ${step >= 2 ? "auth-steps__dot--active" : ""}`}>2</span>
        </div>
        <p className="auth-steps__label">
          {t("registerStep")
            .replace("{step}", String(step))
            .replace("{label}", step === 1 ? t("yourDetails") : t("setPassword"))}
        </p>

        {step === 1 ? (
          <>
            <span className="auth-form__eyebrow">{t("joinMonana")}</span>
            <h1 className="auth-form__title">{t("registerTitle")}</h1>
            <p className="auth-form__sub">{t("registerSub")}</p>

            <form className="auth-form__fields" onSubmit={onContinue}>
              <label className="mn-field">
                <span className="mn-field__label">{t("fullName")}</span>
                <span className="mn-field__wrap">
                  <span className="mn-field__icon" aria-hidden>
                    👤
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("yourNamePlaceholder")}
                    autoComplete="name"
                    required
                  />
                </span>
              </label>

              <label className="mn-field">
                <span className="mn-field__label">{t("phoneLabel")}</span>
                <span className="mn-field__wrap">
                  <span className="mn-field__icon" aria-hidden>
                    📱
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("phonePlaceholder")}
                    autoComplete="tel"
                    required
                  />
                </span>
              </label>

              {error ? (
                <p className="auth-form__error" role="alert">
                  {error}
                  {phoneTaken ? (
                    <>
                      {" "}
                      <Link href="/login">{t("signIn")}</Link>
                    </>
                  ) : null}
                </p>
              ) : null}

              <button type="submit" className="mn-btn mn-btn--orange mn-btn--block auth-form__submit" disabled={loading}>
                {loading ? t("checking") : t("continueBtn")}
              </button>
            </form>
          </>
        ) : (
          <>
            <span className="auth-form__eyebrow">{t("almostDone")}</span>
            <h1 className="auth-form__title">{t("setPasswordTitle")}</h1>
            <p className="auth-form__sub">
              {t("setPasswordSub").replace("{name}", name.trim())}
            </p>

            <form className="auth-form__fields" onSubmit={onRegister}>
              <label className="mn-field">
                <span className="mn-field__label">{t("password")}</span>
                <span className="mn-field__wrap">
                  <span className="mn-field__icon" aria-hidden>
                    🔒
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("passwordMinPlaceholder")}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </span>
              </label>

              <label className="mn-field">
                <span className="mn-field__label">{t("confirmPassword")}</span>
                <span className="mn-field__wrap">
                  <span className="mn-field__icon" aria-hidden>
                    🔒
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("repeatPassword")}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </span>
              </label>

              {error ? (
                <p className="auth-form__error" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" className="mn-btn mn-btn--orange mn-btn--block auth-form__submit" disabled={loading}>
                {loading ? t("creatingAccount") : t("registerTitle")}
              </button>

              <button
                type="button"
                className="mn-btn mn-btn--ghost mn-btn--block"
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
                disabled={loading}
              >
                {t("authBack")}
              </button>
            </form>
          </>
        )}

        <div className="auth-form__divider">
          <span>{step === 1 ? t("alreadyRegisteredQ") : t("needHelp")}</span>
        </div>

        <p className="auth-form__alt">
          {step === 1 ? (
            <Link href="/login">{t("signInInstead")}</Link>
          ) : (
            <Link href="/support">{t("navSupport")}</Link>
          )}
        </p>
      </div>
    </AuthSplitLayout>
  );
}
