"use client";

import Link from "next/link";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthSplitLayout, AuthPageLoading } from "../../../components/auth/AuthSplitLayout";
import { setSession } from "../../../lib/admin-api";
import { getStoredLocale, syncLocaleToServer } from "../../../lib/locale-preference";
import { useAppLocale } from "../../../components/providers/AppLocaleProvider";

function LoginForm() {
  const { t } = useAppLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const justRegistered = searchParams.get("registered") === "1";
  const [showSuccess, setShowSuccess] = useState(justRegistered);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!justRegistered) return;
    setShowSuccess(true);
    const timer = setTimeout(() => setShowSuccess(false), 6000);
    return () => clearTimeout(timer);
  }, [justRegistered]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowSuccess(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password: password || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? t("signInFailed"));

      setSession(json.data.token, {
        id: json.data.user.id,
        name: json.data.user.name,
        phone: json.data.user.phone,
        role: json.data.user.role,
      });

      const preferred = getStoredLocale();
      await syncLocaleToServer(json.data.user.id, preferred, json.data.token).catch(() => {});

      if (json.data.user.role === "ADMIN") {
        router.push(next?.startsWith("/admin") ? next : "/admin");
      } else {
        router.push(next && !next.startsWith("/admin") ? next : "/account");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showSuccess ? (
        <div className="auth-toast auth-toast--success" role="status">
          <span className="auth-toast__icon">✓</span>
          <div>
            <strong>{t("accountCreated")}</strong>
            <p>{t("signInAfterRegister")}</p>
          </div>
          <button
            type="button"
            className="auth-toast__close"
            onClick={() => setShowSuccess(false)}
            aria-label={t("dismiss")}
          >
            ×
          </button>
        </div>
      ) : null}

      <AuthSplitLayout>
        <div className="auth-form">
          <span className="auth-form__eyebrow">{t("welcomeBack")}</span>
          <h1 className="auth-form__title">{t("signIn")}</h1>
          <p className="auth-form__sub">{t("signInSub")}</p>

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
              <span className="mn-field__label">{t("password")}</span>
              <span className="mn-field__wrap">
                <span className="mn-field__icon" aria-hidden>
                  🔒
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="current-password"
                  required
                />
              </span>
            </label>

            {error ? (
              <p className="auth-form__error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="mn-btn mn-btn--orange mn-btn--block auth-form__submit" disabled={loading}>
              {loading ? t("signingIn") : t("signIn")}
            </button>
          </form>

          <div className="auth-form__divider">
            <span>{t("newHere")}</span>
          </div>

          <p className="auth-form__alt">
            <Link href="/register">{t("createAccount")}</Link>
            {" · "}
            <Link href="/#whatsapp-bot">{t("orderOnWhatsapp")}</Link>
          </p>
        </div>
      </AuthSplitLayout>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthPageLoading />}>
      <LoginForm />
    </Suspense>
  );
}
