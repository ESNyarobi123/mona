"use client";

import { useMemo } from "react";
import { groupGroceryDeliverySlotsByWeek } from "@monana/utils";

export type GroceryDeliverySlotOption = {
  date: string;
  label: string;
  deliveryAt: string;
  weekLabel: string;
};

type Props = {
  slots: GroceryDeliverySlotOption[];
  value: string;
  onChange: (deliveryAt: string) => void;
  className?: string;
  emptyLabel?: string;
};

export function GroceryDeliverySlotPicker({
  slots,
  value,
  onChange,
  className,
  emptyLabel,
}: Props) {
  const groups = useMemo(() => groupGroceryDeliverySlotsByWeek(slots), [slots]);

  if (slots.length === 0) {
    return emptyLabel ? <p className="delivery-slot-picker__empty">{emptyLabel}</p> : null;
  }

  return (
    <div className={["delivery-slot-picker", className].filter(Boolean).join(" ")}>
      {groups.map((group) => (
        <section key={group.weekLabel} className="delivery-slot-picker__week" aria-label={group.weekLabel}>
          <h3 className="delivery-slot-picker__week-label">{group.weekLabel}</h3>
          <div className="delivery-slot-picker__options" role="group" aria-label={group.weekLabel}>
            {group.slots.map((slot) => {
              const active = value === slot.deliveryAt;
              return (
                <button
                  key={slot.date}
                  type="button"
                  className={`delivery-slot-picker__btn${active ? " delivery-slot-picker__btn--active" : ""}`}
                  aria-pressed={active}
                  onClick={() => onChange(slot.deliveryAt)}
                >
                  <span className="delivery-slot-picker__day">{slot.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
