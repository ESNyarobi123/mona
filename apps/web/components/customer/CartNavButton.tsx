"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCartCount } from "../../lib/cart";

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6h15l-1.5 9H7.5L6 6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M6 6 5 3H2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="9" cy="20" r="1.25" fill="currentColor" />
      <circle cx="18" cy="20" r="1.25" fill="currentColor" />
    </svg>
  );
}

type Props = {
  variant?: "header" | "pill";
  href?: string;
  className?: string;
};

export function CartNavButton({ variant = "header", href = "/grocery/cart", className }: Props) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const active = pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const refresh = () => setCount(getCartCount());
    refresh();
    window.addEventListener("monana-cart", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("monana-cart", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [pathname]);

  if (variant === "pill") {
    return (
      <Link
        href={href}
        className={`cart-nav cart-nav--pill ${active ? "cart-nav--active" : ""} ${className ?? ""}`}
        aria-label={`Cart${count > 0 ? `, ${count} items` : ""}`}
      >
        <span className="cart-nav__icon-wrap">
          <CartIcon className="cart-nav__svg" />
          {count > 0 ? <span className="cart-nav__badge">{count > 99 ? "99+" : count}</span> : null}
        </span>
        <span className="cart-nav__text">
          <span className="cart-nav__label">Cart</span>
          {count > 0 ? <span className="cart-nav__hint">{count} bidhaa</span> : <span className="cart-nav__hint">Tupu</span>}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`cart-nav cart-nav--header ${active ? "cart-nav--active" : ""} ${className ?? ""}`}
      aria-label={`Cart${count > 0 ? `, ${count} items` : ""}`}
    >
      <CartIcon className="cart-nav__svg" />
      {count > 0 ? <span className="cart-nav__badge">{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}
