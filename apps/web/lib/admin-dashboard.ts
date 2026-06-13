export function adminTodayLabel() {
  return new Date().toLocaleDateString("sw-TZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function orderRef(id: string) {
  return `#${id.slice(-6).toUpperCase()}`;
}

export function userInitials(name: string | null | undefined, phone?: string) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return (phone?.slice(-2) ?? "?").toUpperCase();
}

export function userDisplayName(name: string | null | undefined, phone?: string) {
  return name?.trim() || phone || "—";
}

export function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

const ORDER_PROGRESS: Record<string, number> = {
  PENDING: 15,
  AWAITING_CONFIRMATION: 25,
  CONFIRMED: 40,
  PREPARING: 60,
  ON_THE_WAY: 80,
  DELIVERED: 100,
  PAID: 100,
  CANCELLED: 0,
  FAILED: 0,
};

export function orderProgress(status: string) {
  return ORDER_PROGRESS[status] ?? 30;
}
