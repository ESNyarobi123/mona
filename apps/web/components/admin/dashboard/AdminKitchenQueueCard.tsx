"use client";

import Link from "next/link";
import { orderRef, userDisplayName, userInitials } from "../../../lib/admin-dashboard";

export type KitchenQueueItem = {
  id: string;
  mealSlot: string;
  status: string;
  position: number;
  order: {
    id: string;
    user: { name: string | null; phone: string };
    items: { name: string; quantity: number }[];
  };
};

const STATUS_STEPS = ["WAITING", "COOKING", "READY"] as const;

const STATUS_TONE: Record<string, string> = {
  WAITING: "waiting",
  COOKING: "cooking",
  READY: "ready",
};

const ADVANCE_LABEL_KEY = {
  WAITING: "kitchenStartCooking",
  COOKING: "kitchenMarkReady",
  READY: "kitchenMarkServed",
} as const;

type AdvanceLabelKey = keyof typeof ADVANCE_LABEL_KEY;

type Props = {
  item: KitchenQueueItem;
  busy: boolean;
  slotLabel: (slot: string) => string;
  kitchenLabel: (status: string) => string;
  advanceLabel: (key: AdvanceLabelKey) => string;
  itemsLabel: (n: number) => string;
  onAdvance: (item: KitchenQueueItem) => void;
};

export function AdminKitchenQueueCard({
  item,
  busy,
  slotLabel,
  kitchenLabel,
  advanceLabel,
  itemsLabel,
  onAdvance,
}: Props) {
  const tone = STATUS_TONE[item.status] ?? "waiting";
  const nextStatus =
    item.status === "WAITING" ? "COOKING" : item.status === "COOKING" ? "READY" : item.status === "READY" ? "SERVED" : null;
  const advanceKey: AdvanceLabelKey | null =
    item.status === "WAITING"
      ? "WAITING"
      : item.status === "COOKING"
        ? "COOKING"
        : item.status === "READY"
          ? "READY"
          : null;
  const currentIdx = STATUS_STEPS.indexOf(item.status as (typeof STATUS_STEPS)[number]);
  const totalQty = item.order.items.reduce((sum, i) => sum + Number(i.quantity), 0);

  return (
    <li className={`admin-kitchen-queue-card admin-kitchen-queue-card--${tone}`}>
      <div className="admin-kitchen-queue-card__head">
        <span className="admin-kitchen-queue-card__pos">#{item.position}</span>
        <span className="admin-kitchen-pill">{slotLabel(item.mealSlot)}</span>
        <span className={`admin-kitchen-queue-card__status admin-kitchen-queue-card__status--${tone}`}>
          {kitchenLabel(item.status)}
        </span>
      </div>

      <div className="admin-kitchen-queue-card__customer">
        <span className="admin-kitchen-queue-card__avatar" aria-hidden>
          {userInitials(item.order.user.name, item.order.user.phone)}
        </span>
        <div className="admin-kitchen-queue-card__customer-copy">
          <strong>{userDisplayName(item.order.user.name, item.order.user.phone)}</strong>
          <small>{item.order.user.phone}</small>
        </div>
        <Link
          href={`/admin/orders?q=${item.order.id.slice(-6)}`}
          className="admin-kitchen-queue-card__ref"
          title={item.order.id}
        >
          {orderRef(item.order.id)}
        </Link>
      </div>

      <ul className="admin-kitchen-queue-card__items">
        {item.order.items.map((line, idx) => (
          <li key={`${line.name}-${idx}`}>
            <span className="admin-kitchen-queue-card__qty">×{line.quantity}</span>
            <span>{line.name}</span>
          </li>
        ))}
      </ul>

      <p className="admin-kitchen-queue-card__meta">{itemsLabel(totalQty)}</p>

      <ol className="admin-kitchen-queue-card__steps" aria-label={kitchenLabel(item.status)}>
        {STATUS_STEPS.map((step, idx) => {
          const done = currentIdx >= idx;
          const active = item.status === step;
          return (
            <li
              key={step}
              className={`admin-kitchen-queue-card__step${done ? " is-done" : ""}${active ? " is-active" : ""}`}
            >
              <span className="admin-kitchen-queue-card__step-dot" aria-hidden />
              <span className="admin-kitchen-queue-card__step-label">{kitchenLabel(step)}</span>
            </li>
          );
        })}
      </ol>

      {nextStatus && advanceKey ? (
        <button
          type="button"
          className={`admin-kitchen-queue-card__action admin-kitchen-queue-card__action--${tone}`}
          onClick={() => onAdvance(item)}
          disabled={busy}
        >
          {busy ? "…" : `→ ${advanceLabel(advanceKey)}`}
        </button>
      ) : null}
    </li>
  );
}
