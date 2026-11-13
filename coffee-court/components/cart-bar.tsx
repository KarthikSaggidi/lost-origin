"use client";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { calculate, money, type Item } from "../lib/domain";
export default function CartBar({
  cart,
  open,
}: {
  cart: Item[];
  open: () => void;
}) {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const last = cart.at(-1);
  if (!last || !count) return null;
  return (
    <div
      className="customer-cart-bar"
      role="region"
      aria-label="Your takeaway bag"
    >
      <div className="cart-bar-summary">
        <span className="cart-bar-icon">
          <ShoppingBag size={21} />
          <b>{count}</b>
        </span>
        <div>
          <strong>
            {count} {count === 1 ? "item" : "items"} in your bag
          </strong>
          <span>
            {cart.length === 1
              ? last.name
              : `${last.name} + ${cart.length - 1} more`}
          </span>
        </div>
      </div>
      <div className="cart-bar-action">
        <div>
          <b>{money(calculate(cart, "").subtotal)}</b>
          <small>Before tax</small>
        </div>
        <button type="button" onClick={open}>
          View bag
          <ArrowRight size={17} />
        </button>
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">
        {count} {count === 1 ? "item" : "items"} in your bag. Subtotal{" "}
        {money(calculate(cart, "").subtotal)} before tax.
      </span>
    </div>
  );
}
