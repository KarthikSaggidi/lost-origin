"use client";
import { useState } from "react";
import {
  Search,
  ArrowRight,
  CalendarDays,
  Clock,
  Receipt,
  Coffee,
} from "lucide-react";
import {
  money,
  clock,
  timeLabel,
  type State,
  type Order,
  type Booking,
} from "../lib/domain";
import OrderTimeline from "./order-timeline";
export default function CustomerActivity({
  data,
  recentOrder,
  recentBooking,
  openOrder,
  openBooking,
  receipt,
  navigate,
  signIn,
}: {
  data: State;
  recentOrder: Order | null;
  recentBooking: Booking | null;
  openOrder: (o: Order) => void;
  openBooking: (b: Booking) => void;
  receipt: (b: Booking) => void;
  navigate: (view: string) => void;
  signIn: () => void;
}) {
  const customer = data.access?.customer;
  const [tab, setTab] = useState<"orders" | "bookings">(
    recentBooking ? "bookings" : "orders",
  );
  const orders = customer ? data.orders : recentOrder ? [recentOrder] : [];
  const bookings = customer
    ? data.bookings.filter((booking) => booking.phone === customer.phone)
    : recentBooking
      ? [recentBooking]
      : [];
  const showing = Boolean(customer || recentOrder || recentBooking);
  return (
    <section className="customer-activity">
      <div className="customer-activity-heading">
        <span className="section-kicker">
          YOUR LOST ORIGIN VISITS
          <i />
        </span>
        <h1>Orders & court bookings.</h1>
        <p>Follow your order and keep your court receipts in one place.</p>
      </div>
      {customer ? (
        <p className="activity-verified-account">
          Signed in as {customer.name} · +91 {customer.phone}
        </p>
      ) : (
        <div className="activity-signin-prompt">
          <p>
            Sign in to see the orders and court bookings linked to your verified
            mobile number.
          </p>
          <button className="btn primary" onClick={signIn}>
            Sign in with mobile
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      {showing && (
        <>
          <div className="activity-tabs" role="group" aria-label="Visit type">
            <button
              className={tab === "orders" ? "active" : ""}
              onClick={() => setTab("orders")}
            >
              <Coffee size={16} />
              Café orders<span>{orders.length}</span>
            </button>
            <button
              className={tab === "bookings" ? "active" : ""}
              onClick={() => setTab("bookings")}
            >
              <CalendarDays size={16} />
              Court bookings<span>{bookings.length}</span>
            </button>
          </div>
          {tab === "orders" ? (
            <div className="activity-orders">
              {orders.map((o) => (
                <article className="activity-order-card" key={o.id}>
                  <header>
                    <div>
                      <small>
                        {new Date(o.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: "Asia/Kolkata",
                        })}
                      </small>
                      <h2>{o.id}</h2>
                    </div>
                    <span
                      className={`activity-status status-${o.status.toLowerCase()}`}
                    >
                      {o.status === "Completed" ? "Collected" : o.status}
                    </span>
                  </header>
                  <p className="activity-order-items">
                    {o.items
                      .map((i) => `${i.quantity} × ${i.name}`)
                      .join(" · ")}
                  </p>
                  <div className="activity-order-meta">
                    <span>
                      <Clock size={14} />
                      {o.source === "Counter"
                        ? "Instant counter order"
                        : `Pickup ${clock(o.pickupAt)}`}
                    </span>
                    <b>{money(o.total)}</b>
                  </div>
                  <OrderTimeline order={o} compact />
                  <button className="text-btn" onClick={() => openOrder(o)}>
                    Order details & receipt
                    <ArrowRight size={15} />
                  </button>
                </article>
              ))}
              {!orders.length && (
                <div className="activity-empty">
                  <Coffee size={30} />
                  <h2>No café orders found</h2>
                  <p>Check the mobile number or explore the menu.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="activity-bookings">
              {bookings.map((b) => (
                <article className="activity-booking-card" key={b.id}>
                  <div>
                    <small>{b.id}</small>
                    <h2>{b.court}</h2>
                    <p>
                      {new Date(b.date + "T12:00:00+05:30").toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          timeZone: "Asia/Kolkata",
                        },
                      )}
                    </p>
                    <p>
                      {timeLabel(b.start)} – {timeLabel(b.start + b.duration)} ·{" "}
                      {b.players} players
                    </p>
                  </div>
                  <div>
                    <span
                      className={`activity-status status-${b.status.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {b.status}
                    </span>
                    <b>{money(b.total)}</b>
                    <button
                      className="btn secondary small"
                      onClick={() => receipt(b)}
                    >
                      <Receipt size={14} />
                      {b.status === "Completed"
                        ? "Save / print bill"
                        : "Save / print receipt"}
                    </button>
                    <button className="text-btn" onClick={() => openBooking(b)}>
                      Booking details
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              ))}
              {!bookings.length && (
                <div className="activity-empty">
                  <CalendarDays size={30} />
                  <h2>No court bookings found</h2>
                  <p>Your next game is waiting.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <div className="activity-help">
        <p>Need to change or cancel a booking? Contact the Lost Origin team.</p>
        {data.settings.business.phone && (
          <a href={`tel:${data.settings.business.phone}`}>
            {data.settings.business.phone}
          </a>
        )}
        <button className="text-btn" onClick={() => navigate("menu")}>
          Explore the café menu
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
function PhoneIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M10 18h4" />
    </svg>
  );
}
