"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  apiGet,
  apiPatch,
  apiPost,
  apiUploadFile,
  getStoredUser,
  getToken,
  setSession,
  type StoredUser,
} from "../../../../lib/admin-api";
import { formatDate } from "../../../../lib/format";
import { AdminPageHeader } from "../../../../components/admin/AdminPageHeader";
import { AdminPanel } from "../../../../components/admin/dashboard/AdminPanel";
import { AdminLoading } from "../../../../components/admin/dashboard/AdminLoading";
import { useAdminLocale } from "../../../../components/admin/AdminLocaleProvider";
import { userInitials } from "../../../../lib/admin-dashboard";
import {
  IconCamera,
  IconEye,
  IconEyeOff,
  IconGlobe,
  IconLock,
  IconMail,
  IconPhone,
  IconShield,
  IconUser,
} from "../../../../components/admin/AdminIcons";

type Profile = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: string;
  locale: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  token?: string;
};

function ProfileField({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="admin-profile-field">
      <span className="admin-profile-field__label">{label}</span>
      <span className="admin-profile-field__control">
        <span className="admin-profile-field__icon" aria-hidden>
          {icon}
        </span>
        {children}
      </span>
      {hint ? <small className="admin-profile-field__hint">{hint}</small> : null}
    </label>
  );
}

export default function AdminProfilePage() {
  const { t, locale, setLocale } = useAdminLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function refreshSession(user: Profile, tokenOverride?: string) {
    const token = tokenOverride ?? getToken();
    const stored = getStoredUser();
    if (!token || !stored) return;
    const next: StoredUser = {
      ...stored,
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      imageUrl: user.imageUrl,
    };
    setSession(token, next);
    window.dispatchEvent(new Event("monana-session"));
  }

  function load() {
    setLoading(true);
    apiGet<Profile>("/api/auth")
      .then((p) => {
        setProfile(p);
        setName(p.name ?? "");
        setPhone(p.phone);
        setEmail(p.email ?? "");
        setImageUrl(p.imageUrl ?? "");
        if (p.locale === "en" || p.locale === "sw") setLocale(p.locale);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("error")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiPatch<Profile>("/api/auth", {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        locale,
        imageUrl: imageUrl.trim() || null,
      });
      setProfile(updated);
      refreshSession(updated, updated.token);
      setSuccess(t("profileUpdated"));
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { url } = await apiUploadFile("/api/admin/uploads", file);
      setImageUrl(url);
      const updated = await apiPatch<Profile>("/api/auth", { imageUrl: url });
      setProfile(updated);
      refreshSession(updated, updated.token);
      setSuccess(t("profilePhotoUpdated"));
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setSaving(true);
    setError("");
    try {
      const updated = await apiPatch<Profile>("/api/auth", { imageUrl: null });
      setImageUrl("");
      setProfile(updated);
      refreshSession(updated, updated.token);
      setSuccess(t("profilePhotoRemoved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
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
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setPwSaving(false);
    }
  }

  const initials = userInitials(profile?.name, profile?.phone);

  return (
    <div className="admin-dash admin-profile-page">
      <AdminPageHeader title={t("navProfile")} />
      <p className="admin-lead">{t("profileAdminDesc")}</p>

      {error ? <p className="admin-error">{error}</p> : null}
      {success ? <p className="admin-success">{success}</p> : null}
      {loading ? <AdminLoading label={t("loading")} /> : null}

      {!loading && profile ? (
        <div className="admin-profile-grid">
          <AdminPanel title={t("profilePhoto")}>
            <div className="admin-profile-photo">
              <div className="admin-profile-photo__preview">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" />
                ) : (
                  <span>{initials}</span>
                )}
                <label className="admin-profile-photo__overlay" title={t("uploadPhoto")}>
                  <IconCamera />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    disabled={uploading}
                    onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="admin-profile-photo__meta">
                <strong>{profile.name ?? t("navProfile")}</strong>
                <span className="admin-profile-badge">
                  <IconShield /> {profile.role}
                </span>
                <p className="admin-profile-field__hint">{t("profilePhotoHint")}</p>
                <div className="admin-profile-photo__actions">
                  <label className="admin-btn sm">
                    <IconCamera />
                    {uploading ? t("uploading") : t("uploadPhoto")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      hidden
                      disabled={uploading}
                      onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {imageUrl ? (
                    <button type="button" className="admin-btn sm secondary" onClick={removePhoto}>
                      {t("removePhoto")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title={t("profileDetails")}>
            <form className="admin-profile-form" onSubmit={saveProfile}>
              <ProfileField label={t("name")} icon={<IconUser />}>
                <input
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Admin Monana"
                />
              </ProfileField>

              <ProfileField label={t("phone")} icon={<IconPhone />} hint={t("profilePhoneHint")}>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </ProfileField>

              <ProfileField label={t("email")} icon={<IconMail />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="admin@monanafood.co.tz"
                />
              </ProfileField>

              <ProfileField label={t("language")} icon={<IconGlobe />}>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value === "sw" ? "sw" : "en")}
                >
                  <option value="en">English</option>
                  <option value="sw">Kiswahili</option>
                </select>
              </ProfileField>

              <p className="admin-profile-meta">
                {t("joined")}: <strong>{formatDate(profile.createdAt)}</strong>
              </p>

              <button type="submit" className="admin-btn admin-profile-form__submit" disabled={saving}>
                {saving ? t("loading") : t("saveChanges")}
              </button>
            </form>
          </AdminPanel>

          <AdminPanel title={t("changePassword")}>
            <form className="admin-profile-form" onSubmit={changePassword} autoComplete="off">
              <ProfileField label={t("currentPassword")} icon={<IconLock />}>
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-profile-field__toggle"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? "Hide" : "Show"}
                >
                  {showCurrent ? <IconEyeOff /> : <IconEye />}
                </button>
              </ProfileField>

              <ProfileField label={t("newPassword")} icon={<IconLock />}>
                <input
                  type={showNew ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-profile-field__toggle"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? "Hide" : "Show"}
                >
                  {showNew ? <IconEyeOff /> : <IconEye />}
                </button>
              </ProfileField>

              <ProfileField label={t("confirmPassword")} icon={<IconLock />}>
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-profile-field__toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide" : "Show"}
                >
                  {showConfirm ? <IconEyeOff /> : <IconEye />}
                </button>
              </ProfileField>

              <button type="submit" className="admin-btn admin-profile-form__submit" disabled={pwSaving}>
                {pwSaving ? t("loading") : t("updatePassword")}
              </button>
            </form>
          </AdminPanel>
        </div>
      ) : null}
    </div>
  );
}
