"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { apiGet } from "../../lib/admin-api";
import { defaultWhatsAppUrl } from "../../lib/whatsapp-public";

type Props = {
  className?: string;
  children: ReactNode;
  /** If bot number unavailable */
  fallbackHref?: string;
};

export function WhatsAppDirectLink({
  className,
  children,
  fallbackHref = "/support",
}: Props) {
  const [url, setUrl] = useState<string | null>(() => defaultWhatsAppUrl());

  useEffect(() => {
    apiGet<{ whatsappUrl: string | null }>("/api/bot/showcase")
      .then((data) => {
        if (data.whatsappUrl) setUrl(data.whatsappUrl);
      })
      .catch(() => {});
  }, []);

  if (url) {
    return (
      <a href={url} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={fallbackHref} className={className}>
      {children}
    </Link>
  );
}
