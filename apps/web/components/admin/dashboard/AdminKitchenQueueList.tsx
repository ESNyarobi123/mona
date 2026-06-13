import { AdminUserCell } from "./AdminUserCell";
import { KITCHEN_LABELS, SLOT_LABELS } from "../../../lib/format";
import { orderRef } from "../../../lib/admin-dashboard";

type QueueItem = {
  id: string;
  mealSlot: string;
  status: string;
  position: number;
  order: {
    id: string;
    user: { name: string | null; phone: string };
    items: { name: string }[];
  };
};

const STATUS_TONE: Record<string, string> = {
  WAITING: "waiting",
  COOKING: "cooking",
  READY: "ready",
};

export function AdminKitchenQueueList({ items }: { items: QueueItem[] }) {
  if (items.length === 0) {
    return (
      <div className="admin-kitchen-empty">
        <span className="admin-kitchen-empty__icon" aria-hidden>
          👨‍🍳
        </span>
        <p>Foleni tupu — jikoni hai tulivu</p>
        <small>Oda mpya zitaonekana hapa moja kwa moja</small>
      </div>
    );
  }

  return (
    <ul className="admin-kitchen-grid">
      {items.map((q) => {
        const tone = STATUS_TONE[q.status] ?? "waiting";
        const preview = q.order.items
          .slice(0, 2)
          .map((i) => i.name)
          .join(", ");
        const more = q.order.items.length > 2 ? ` +${q.order.items.length - 2}` : "";

        return (
          <li key={q.id} className={`admin-kitchen-card admin-kitchen-card--${tone}`}>
            <div className="admin-kitchen-card__top">
              <span className="admin-kitchen-card__pos">#{q.position}</span>
              <span className="admin-kitchen-pill">{SLOT_LABELS[q.mealSlot] ?? q.mealSlot}</span>
              <span className={`admin-kitchen-card__status admin-kitchen-card__status--${tone}`}>
                {KITCHEN_LABELS[q.status] ?? q.status}
              </span>
            </div>
            <AdminUserCell
              name={q.order.user.name}
              phone={q.order.user.phone}
              sub={`${orderRef(q.order.id)}${preview ? ` · ${preview}${more}` : ""}`}
            />
          </li>
        );
      })}
    </ul>
  );
}
