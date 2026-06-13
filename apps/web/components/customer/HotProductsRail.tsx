"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney, UNIT_LABELS } from "../../lib/format";

export type HotRailItem = {
  id: string;
  name: string;
  price: number;
  unit: string;
  badge?: string | null;
  imageUrl?: string | null;
  menuItemId?: string;
  productId?: string;
};

type Props = {
  title?: string;
  subtitle?: string;
  items: HotRailItem[];
  accent?: "orange" | "navy" | "green";
  canAdd?: boolean;
  addedId?: string | null;
  onAdd?: (itemId: string) => void;
};

export function HotProductsRail({
  title = "🔥 Maarufu leo",
  subtitle = "Telezesha kushoto — chagua chakula maarufu",
  items,
  accent = "orange",
  canAdd = false,
  addedId = null,
  onAdd,
}: Props) {
  const btnClass =
    accent === "green"
      ? "landing-btn landing-btn--navy hot-rail-card__btn"
      : "landing-btn landing-btn--orange hot-rail-card__btn";
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    updateScrollHints();
    window.addEventListener("resize", updateScrollHints);
    return () => window.removeEventListener("resize", updateScrollHints);
  }, [items.length]);

  function updateScrollHints() {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
  }

  function scrollBy(dx: number) {
    trackRef.current?.scrollBy({ left: dx, behavior: "smooth" });
    setTimeout(updateScrollHints, 350);
  }

  if (items.length === 0) return null;

  return (
    <section className={`hot-rail-section hot-rail-section--${accent}`}>
      <div className="hot-rail-section__head">
        <div>
          <h2 className="hot-rail-section__title">{title}</h2>
          <p className="hot-rail-section__sub">{subtitle}</p>
        </div>
        <div className="hot-rail-section__nav" aria-hidden={!canScrollLeft && !canScrollRight}>
          <button
            type="button"
            className="hot-rail-section__arrow"
            aria-label="Scroll left"
            disabled={!canScrollLeft}
            onClick={() => scrollBy(-220)}
          >
            ‹
          </button>
          <button
            type="button"
            className="hot-rail-section__arrow"
            aria-label="Scroll right"
            disabled={!canScrollRight}
            onClick={() => scrollBy(220)}
          >
            ›
          </button>
        </div>
      </div>

      <div
        className={[
          "hot-rail-wrap",
          canScrollLeft ? "hot-rail-wrap--fade-left" : "",
          canScrollRight ? "hot-rail-wrap--fade-right" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div ref={trackRef} className="hot-rail-track" onScroll={updateScrollHints}>
          <div className="hot-rail-track__inner">
            {items.map((h, i) => {
              const addId = h.productId ?? h.menuItemId ?? h.id;
              return (
                <article
                  key={h.id}
                  className="hot-rail-card"
                  style={{ "--hot-i": i } as React.CSSProperties}
                >
                  {h.badge ? <span className="hot-rail-card__badge">{h.badge}</span> : null}
                  {h.imageUrl ? (
                    <div className="hot-rail-card__media">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={h.imageUrl} alt="" />
                    </div>
                  ) : (
                    <span className="hot-rail-card__flame" aria-hidden>
                      🔥
                    </span>
                  )}
                  <h3 className="hot-rail-card__name">{h.name}</h3>
                  <p className="hot-rail-card__price">
                    {formatMoney(h.price)}
                    <small> / {UNIT_LABELS[h.unit] ?? h.unit}</small>
                  </p>
                  {canAdd && onAdd ? (
                    <button type="button" className={btnClass} onClick={() => onAdd(addId)}>
                      {addedId === addId ? "✓ Imeongezwa" : "Ongeza cart"}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
