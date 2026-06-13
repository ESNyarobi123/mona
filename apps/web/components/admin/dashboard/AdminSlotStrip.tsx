import { SLOT_LABELS } from "../../../lib/format";

type SlotRow = {
  slot: string;
  label: string;
  emoji: string;
  orderWindow: string;
  deliversFor: string;
  status: "OPEN" | "CLOSED";
};

const SLOT_ORDER = ["BREAKFAST", "LUNCH", "DINNER"];

export function AdminSlotStrip({
  slots,
  timeDisplay,
  ordersBySlot,
}: {
  slots: SlotRow[];
  timeDisplay?: string;
  ordersBySlot?: Record<string, number>;
}) {
  const ordered = SLOT_ORDER.map((key) => slots.find((s) => s.slot === key)).filter(
    (s): s is SlotRow => !!s
  );

  if (ordered.length === 0) return null;

  return (
    <section className="admin-slot-strip">
      <div className="admin-slot-strip__head">
        <h2 className="admin-slot-strip__title">Dirisha la oda leo</h2>
        {timeDisplay ? <span className="admin-slot-strip__clock">🕐 {timeDisplay} EAT</span> : null}
      </div>
      <div className="admin-slot-strip__row">
        {ordered.map((s) => {
          const count = ordersBySlot?.[s.slot] ?? 0;
          const isOpen = s.status === "OPEN";
          return (
            <article
              key={s.slot}
              className={`admin-slot-card admin-slot-card--${isOpen ? "open" : "closed"}`}
            >
              <span className="admin-slot-card__emoji">{s.emoji}</span>
              <strong className="admin-slot-card__name">{SLOT_LABELS[s.slot] ?? s.label}</strong>
              <span className="admin-slot-card__window">{s.orderWindow}</span>
              <span className={`admin-slot-card__badge admin-slot-card__badge--${isOpen ? "open" : "closed"}`}>
                {isOpen ? "Wazi" : "Imefungwa"}
              </span>
              <span className="admin-slot-card__count">{count} oda leo</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
