"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthSplitLayout } from "../../../components/auth/AuthSplitLayout";
import { useAppLocale } from "../../../components/providers/AppLocaleProvider";

export default function ForgotPasswordPage() {
  const { t, locale } = useAppLocale();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? t("somethingWrong"));
      const msg =
        locale === "sw"
          ? (json.data?.messageSw as string | undefined)
          : (json.data?.messageEn as string | undefined);
      setInfo(msg ?? t("forgotPasswordSent"));
      // Let user read success before navigating to enter OTP
      window.setTimeout(() => {
        router.push(`/reset-password?phone=${encodeURIComponent(phone)}`);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout>
      <div className="auth-form">
        <span className="auth-form__eyebrow">{t("forgotPasswordEyebrow")}</span>
        <h1 className="auth-form__title">{t("forgotPasswordTitle")}</h1>
        <p className="auth-form__sub">{t("forgotPasswordSub")}</p>

        <form className="auth-form__fields" onSubmit={onSubmit}>
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
                disabled={loading && !!info}
              />
            </span>
          </label>

          {error ? (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="auth-toast auth-toast--success" role="status">
              {info}
            </p>
          ) : null}

          <button type="submit" className="mn-btn mn-btn--orange mn-btn--block auth-form__submit" disabled={loading}>
            {loading ? (info ? t("redirectingReset") : t("sendingCode")) : t("sendResetCode")}
          </button>
        </form>

        <p className="auth-form__alt">
          <Link href="/login">{t("backToSignIn")}</Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
