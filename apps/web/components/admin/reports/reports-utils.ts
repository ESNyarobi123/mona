import { getToken } from "../../../lib/admin-api";

const TZ = "Africa/Dar_es_Salaam";

export function dateIsoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function tomorrowIso(): string {
  return dateIsoOffset(1);
}

export function formatDeliveryDay(iso: string, locale: "en" | "sw"): string {
  const tag = locale === "sw" ? "sw-TZ" : "en-GB";
  return new Date(`${iso}T12:00:00`).toLocaleDateString(tag, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export async function openAuthenticatedExport(path: string, downloadName?: string) {
  const token = getToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Imeshindwa kupakua");
  const type = res.headers.get("Content-Type") ?? "";
  if (type.includes("text/csv") && downloadName) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const html = await res.text();
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
