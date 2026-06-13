const MAP: Record<string, string> = {
  PENDING: "pending",
  AWAITING_CONFIRMATION: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "confirmed",
  PAID: "paid",
  DELIVERED: "paid",
  CANCELLED: "cancelled",
  FAILED: "cancelled",
  ACTIVE: "paid",
  PAUSED: "pending",
  PENDING_PAYMENT: "pending",
  RESTAURANT: "restaurant",
  GROCERY: "grocery",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = MAP[status] ?? "pending";
  return <span className={`admin-badge ${cls}`}>{status}</span>;
}
