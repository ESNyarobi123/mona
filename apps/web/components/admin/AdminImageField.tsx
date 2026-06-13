"use client";

import { useRef, useState } from "react";
import { apiUploadFile } from "../../lib/admin-api";
import { useAdminLocale } from "./AdminLocaleProvider";

type Props = {
  value: string;
  onChange: (url: string) => void;
  initials?: string;
  placeholderIcon?: string;
  label?: string;
};

export function AdminImageField({
  value,
  onChange,
  initials = "?",
  placeholderIcon = "🖼️",
  label,
}: Props) {
  const { t } = useAdminLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "url">(value.startsWith("http") ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value.startsWith("http") ? value : "");
  const [error, setError] = useState("");

  const preview = value.trim() || null;

  async function handleFile(file: File | null) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const { url } = await apiUploadFile("/api/admin/uploads", file);
      onChange(url);
      setUrlDraft("");
      setMode("upload");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setUploading(false);
    }
  }

  function applyUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    const valid = trimmed.startsWith("/uploads/") || /^https?:\/\//i.test(trimmed);
    if (!valid) {
      setError(t("imageUrlInvalid"));
      return;
    }
    onChange(trimmed);
    setError("");
  }

  function clearImage() {
    onChange("");
    setUrlDraft("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="admin-image-field">
      {label ? <span className="admin-image-field__label">{label}</span> : null}

      <div className={`admin-image-field__preview${preview ? " has-image" : ""}`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="admin-image-field__img" />
        ) : (
          <div className="admin-image-field__placeholder">
            <span className="admin-image-field__placeholder-icon" aria-hidden>
              {placeholderIcon}
            </span>
            <span className="admin-image-field__placeholder-initials">{initials}</span>
            <span className="admin-image-field__placeholder-text">{t("noImageYet")}</span>
          </div>
        )}
        {preview ? (
          <button type="button" className="admin-image-field__clear" onClick={clearImage} aria-label={t("removeImage")}>
            ×
          </button>
        ) : null}
      </div>

      <div className="admin-image-field__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`admin-image-field__tab${mode === "upload" ? " is-active" : ""}`}
          aria-selected={mode === "upload"}
          onClick={() => setMode("upload")}
        >
          {t("uploadImage")}
        </button>
        <button
          type="button"
          role="tab"
          className={`admin-image-field__tab${mode === "url" ? " is-active" : ""}`}
          aria-selected={mode === "url"}
          onClick={() => setMode("url")}
        >
          {t("imageUrl")}
        </button>
      </div>

      {mode === "upload" ? (
        <div className="admin-image-field__panel">
          <label className="admin-image-field__drop">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="admin-image-field__file"
              disabled={uploading}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <span className="admin-image-field__drop-icon" aria-hidden>
              📤
            </span>
            <strong>{uploading ? t("uploading") : t("chooseImageFile")}</strong>
            <small>{t("imageUploadHint")}</small>
          </label>
        </div>
      ) : (
        <div className="admin-image-field__panel">
          <div className="admin-image-field__url-row">
            <input
              className="admin-crud-form__input"
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://…"
              aria-label={t("imageUrl")}
            />
            <button type="button" className="admin-btn secondary sm" onClick={applyUrl}>
              {t("apply")}
            </button>
          </div>
          <p className="admin-crud-form__hint">{t("imageUrlHint")}</p>
        </div>
      )}

      {error ? <p className="admin-image-field__error">{error}</p> : null}
    </div>
  );
}
