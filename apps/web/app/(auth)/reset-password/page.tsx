"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthSplitLayout, AuthPageLoading } from "../../../components/auth/AuthSplitLayout";
import { useAppLocale } from "../../../components/providers/AppLocaleProvider";

function ResetPasswordForm() {
  const { t } = useAppLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onResend() {
    if (!phone.trim()) {
      setError(t("errPhoneInvalid"));
      return;
    }
    setResending(true);
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
      setInfo(t("forgotPasswordSent"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
    } finally {
      setResending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (newPassword.length < 6) {
      setError(t("errPasswordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("errPasswordMismatch"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: code.trim(), newPassword }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? t("somethingWrong"));
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout>
      <div className="auth-form">
        <span className="auth-form__eyebrow">{t("resetPasswordEyebrow")}</span>
        <h1 className="auth-form__title">{t("resetPasswordTitle")}</h1>
        <p className="auth-form__sub">{t("resetPasswordSub")}</p>

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
              />
            </span>
          </label>

          <label className="mn-field">
            <span className="mn-field__label">{t("resetCodeLabel")}</span>
            <span className="mn-field__wrap">
              <span className="mn-field__icon" aria-hidden>
                #
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                autoComplete="one-time-code"
                required
              />
            </span>
            <span className="mn-field__hint">{t("resetCodeHint")}</span>
          </label>

          <label className="mn-field">
            <span className="mn-field__label">{t("newPassword")}</span>
            <span className="mn-field__wrap mn-field__wrap--toggle">
              <span className="mn-field__icon" aria-hidden>
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
                className="mn-field__toggle"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? t("hidePassword") : t("showPassword")}
              >
                {showNew ? "🙈" : "👁"}
              </button>
            </span>
          </label>

          <label className="mn-field">
            <span className="mn-field__label">{t("confirmPassword")}</span>
            <span className="mn-field__wrap mn-field__wrap--toggle">
              <span className="mn-field__icon" aria-hidden>
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
                className="mn-field__toggle"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? t("hidePassword") : t("showPassword")}
              >
                {showConfirm ? "🙈" : "👁"}
              </button>
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
            {loading ? t("updatingPassword") : t("updatePassword")}
          </button>
        </form>

        <p className="auth-form__alt">
          <button type="button" className="auth-form__text-btn" onClick={onResend} disabled={resending}>
            {resending ? t("sendingCode") : t("resendResetCode")}
          </button>
          {" · "}
          <Link href="/login">{t("backToSignIn")}</Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthPageLoading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
