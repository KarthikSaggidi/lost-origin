"use client";
import { useState, useEffect } from "react";
import {
  ChefHat,
  Clock,
  ArrowRight,
  ShoppingBag,
  CheckCircle2,
  Phone,
  Search,
} from "lucide-react";
import { clock, nextStatus, type State, type Order } from "../lib/domain";
const elapsed = (at: string, now: number) =>
  Math.max(0, Math.floor((now - new Date(at).getTime()) / 60000));
export default function KitchenBoard({
  data,
  busy,
  mutate,
  openOrder,
}: {
  data: State;
  busy: boolean;
  mutate: any;
  openOrder: (order: Order) => void;
}) {
  const [now, setNow] = useState(Date.now()),
    [lane, setLane] = useState("All"),
    [sort, setSort] = useState("oldest");
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const live = data.orders.filter((o) =>
    ["Received", "Preparing", "Ready"].includes(o.status),
  );
  const columns = [
    {
      status: "Received",
      name: "New orders",
      action: "Start preparing",
      Icon: ShoppingBag,
    },
    {
      status: "Preparing",
      name: "In preparation",
      action: "Mark ready",
      Icon: ChefHat,
    },
    {
      status: "Ready",
      name: "Ready for pickup",
      action: "Handed over",
      Icon: CheckCircle2,
    },
  ];
  return (
    <div className="kitchen-workspace">
      <div className="page-heading">
        <div>
          <span className="eyebrow">LIVE KITCHEN</span>
          <h1>Every ticket, clearly in view.</h1>
          <p>
            Prepare, mark ready and hand over. Updates appear on the customer
            timeline.
          </p>
        </div>
        <span className="live-pill">
          <span />
          Live updates
        </span>
      </div>
      <div className="kitchen-board-tools">
        <div
          className="kitchen-lane-tabs"
          role="group"
          aria-label="Kitchen lanes"
        >
          {["All", ...columns.map((c) => c.status)].map((s) => (
            <button
              key={s}
              className={lane === s ? "active" : ""}
              onClick={() => setLane(s)}
            >
              {s === "All"
                ? "All tickets"
                : columns.find((c) => c.status === s)?.name}
              <b>
                {s === "All"
                  ? live.length
                  : live.filter((o) => o.status === s).length}
              </b>
            </button>
          ))}
        </div>
        <label className="kitchen-sort">
          Sort
          <select
            aria-label="Kitchen ticket sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="oldest">Oldest first</option>
            <option value="pickup">Pickup time</option>
          </select>
        </label>
      </div>
      <div
        className={`kitchen-board-grid ${lane !== "All" ? "single-lane" : ""}`}
      >
        {columns
          .filter((c) => lane === "All" || lane === c.status)
          .map(({ status, name, action, Icon }) => {
            const rows = live
              .filter((o) => o.status === status)
              .sort(
                (a, b) =>
                  new Date(
                    sort === "pickup" && a.source !== "Counter"
                      ? a.pickupAt
                      : a.createdAt,
                  ).getTime() -
                  new Date(
                    sort === "pickup" && b.source !== "Counter"
                      ? b.pickupAt
                      : b.createdAt,
                  ).getTime(),
              );
            return (
              <section
                className={`kitchen-lane lane-${status.toLowerCase()}`}
                key={status}
              >
                <header>
                  <Icon size={18} />
                  <h2>{name}</h2>
                  <b>{rows.length}</b>
                </header>
                <div className="kitchen-ticket-list">
                  {rows.map((o) => {
                    const age = elapsed(o.createdAt, now),
                      late =
                        o.source === "Online" &&
                        new Date(o.pickupAt).getTime() < now;
                    return (
                      <article
                        className={`kitchen-live-ticket ${late ? "late" : ""}`}
                        key={o.id}
                      >
                        <div className="kitchen-ticket-reference">
                          <button
                            className="plain"
                            onClick={() => openOrder(o)}
                          >
                            #{o.id.replace(/^LO-|^CC-/, "")}
                          </button>
                          <span className="source-tag">{o.source}</span>
                        </div>
                        <div className="kitchen-ticket-customer">
                          <h3>{o.customer}</h3>
                          {o.phone && (
                            <a
                              href={`tel:${o.phone}`}
                              aria-label={`Call ${o.customer}`}
                            >
                              <Phone size={13} />
                              {o.phone}
                            </a>
                          )}
                        </div>
                        <div className="kitchen-ticket-time">
                          <span>
                            <Clock size={13} />
                            {age} min ago
                          </span>
                          <b>
                            {o.source === "Counter"
                              ? "ASAP · counter"
                              : `${late ? "Pickup due" : "Pickup"} ${clock(o.pickupAt)}`}
                          </b>
                        </div>
                        <ul className="kitchen-line-items">
                          {o.items.map((item, index) => (
                            <li key={index}>
                              <b>{item.quantity}</b>
                              <span>
                                <strong>{item.name}</strong>
                                <small>
                                  {[
                                    item.variant && item.variant !== "Standard"
                                      ? item.variant
                                      : "",
                                    item.milk,
                                    item.shot ? "Extra shot" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") || "Standard"}
                                </small>
                              </span>
                            </li>
                          ))}
                        </ul>
                        {o.notes && (
                          <p className="kitchen-special-note">{o.notes}</p>
                        )}
                        <button
                          className="btn primary full"
                          disabled={
                            busy ||
                            (status === "Ready" &&
                              o.paymentStatus === "Pending")
                          }
                          onClick={() =>
                            mutate(
                              "orderStatus",
                              { id: o.id, status: nextStatus[o.status] },
                              status === "Received"
                                ? "Preparation started"
                                : status === "Preparing"
                                  ? "Customer order is ready"
                                  : "Order collected",
                            )
                          }
                        >
                          {action}
                          <ArrowRight size={15} />
                        </button>
                        {status === "Ready" &&
                          o.paymentStatus === "Pending" && (
                            <button
                              className="text-btn"
                              onClick={() => openOrder(o)}
                            >
                              Collect payment in order details
                            </button>
                          )}
                      </article>
                    );
                  })}
                  {!rows.length && (
                    <div className="kitchen-empty-lane">
                      <Icon size={28} />
                      <h3>
                        No{" "}
                        {status === "Received"
                          ? "new orders"
                          : status === "Preparing"
                            ? "orders in preparation"
                            : "orders ready for pickup"}
                      </h3>
                      <p>New tickets will appear here automatically.</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
