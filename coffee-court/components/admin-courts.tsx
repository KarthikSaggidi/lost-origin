"use client";
import { useState, useEffect } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Phone,
  Receipt,
  Check,
  ArrowRight,
  Clock,
  Users,
  X,
  LayoutGrid,
  List,
  RefreshCw,
} from "lucide-react";
import {
  courtConfig,
  todayIST,
  timeLabel,
  money,
  bookingSlotAvailability,
  type State,
  type Booking,
  type CourtConfig,
} from "../lib/domain";
import { Modal, Field } from "./shared";
import BlueCourt from "./blue-court";
const dateLabel = (date: string) =>
  new Date(date + "T12:00:00+05:30").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
const instant = (b: Booking) =>
  new Date(
    `${b.date}T${String(Math.floor(b.start / 60)).padStart(2, "0")}:${String(b.start % 60).padStart(2, "0")}:00+05:30`,
  ).getTime();
export default function AdminCourts({
  data,
  setModal,
  act,
  busy,
  receipt,
}: {
  data: State;
  setModal: any;
  act: any;
  busy: boolean;
  receipt: (b: Booking) => void;
}) {
  const [date, setDate] = useState(todayIST()),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [source, setSource] = useState(""),
    [view, setView] = useState("Bookings"),
    [cancel, setCancel] = useState<Booking | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const courts = courtConfig(data.settings),
    day = data.bookings.filter((b) => b.date === date),
    active = day.filter((b) => b.status !== "Cancelled");
  const rows = day
    .filter(
      (b) =>
        (!status || b.status === status) &&
        (!source || (b.source || "Legacy") === source) &&
        [b.id, b.customer, b.phone, b.court]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => a.start - b.start || a.court.localeCompare(b.court));
  const step = (n: number) =>
    setDate(
      todayIST(
        new Date(
          new Date((date || todayIST()) + "T12:00:00+05:30").getTime() +
            n * 86400000,
        ),
      ),
    );
  const advance = async (b: Booking) => {
    try {
      const updated = await act(
        "bookingStatus",
        {
          id: b.id,
          status: b.status === "Confirmed" ? "Checked in" : "Completed",
        },
        b.status === "Confirmed"
          ? "Players checked in"
          : "Game completed · bill ready",
      );
      if (b.status === "Checked in") receipt(updated);
    } catch {}
  };
  const booking = (value: any = {}) =>
    setModal({
      type: "booking",
      value: { date: date >= todayIST() ? date : todayIST(), ...value },
    });
  const refund = cancel
    ? Math.round(
        cancel.total *
          ((instant(cancel) - now) / 3600000 >= 12
            ? 1
            : (instant(cancel) - now) / 3600000 >= 4
              ? 0.5
              : 0),
      )
    : 0;
  return (
    <div className="admin-courts-workspace">
      <div className="page-heading">
        <div>
          <span className="eyebrow">COURTS & COMMUNITY</span>
          <h1>Court bookings.</h1>
          <p>
            See the day at a glance, reach players and finish every game with a
            bill.
          </p>
        </div>
        <div className="heading-actions">
          <span className="live-pill">
            <span />
            Live availability
          </span>
          <button className="btn primary" onClick={() => booking()}>
            <Plus size={16} />
            New booking
          </button>
        </div>
      </div>
      <div className="court-admin-stats">
        <div>
          <CalendarDays />
          <span>Bookings on this day</span>
          <strong>{active.length}</strong>
        </div>
        <div>
          <Users />
          <span>Checked in</span>
          <strong>
            {active.filter((b) => b.status === "Checked in").length}
          </strong>
        </div>
        <div>
          <Clock />
          <span>Court time reserved</span>
          <strong>
            {(active.reduce((s, b) => s + b.duration, 0) / 60).toLocaleString(
              "en-IN",
            )}
            <small> hrs</small>
          </strong>
        </div>
        <div>
          <Receipt />
          <span>Booked total after refunds</span>
          <strong>
            {money(
              data.payments
                .filter(
                  (p) =>
                    day.some((b) => b.id === p.reference) &&
                    !["Pending", "Void"].includes(p.status),
                )
                .reduce((s, p) => s + p.amount, 0),
            )}
          </strong>
        </div>
      </div>
      <section className="court-live-overview" aria-label="Court overview">
        {courts.map((c) => {
          const sessions = active
              .filter((b) => b.court === c.name)
              .sort((a, b) => a.start - b.start),
            live = sessions.find((b) => b.status === "Checked in"),
            reservedNow = sessions.find(
              (b) =>
                b.status === "Confirmed" &&
                instant(b) <= now &&
                instant(b) + b.duration * 60000 > now,
            ),
            next = sessions.find(
              (b) => b.status === "Confirmed" && instant(b) >= now,
            ),
            state = !c.active
              ? "Closed"
              : live
                ? "On court"
                : reservedNow
                  ? "Reserved now"
                  : date === todayIST()
                    ? "Available now"
                    : "Schedule ready";
          return (
            <article
              className={`court-live-card ${live ? "playing" : ""}`}
              key={c.name}
            >
              <BlueCourt />
              <div>
                <h2>{c.name}</h2>
                <span className={`court-live-status ${live ? "playing" : ""}`}>
                  {state}
                </span>
                <p>
                  {live
                    ? `${live.customer} · until ${timeLabel(live.start + live.duration)}`
                    : next
                      ? `Next: ${timeLabel(next.start)} · ${next.customer}`
                      : sessions.length
                        ? `${sessions.length} bookings on this day`
                        : "No bookings on this day"}
                </p>
              </div>
              <button
                aria-label={`View ${c.name} bookings`}
                className="icon-btn"
                onClick={() => {
                  setQuery(c.name);
                  setView("Bookings");
                }}
              >
                <ArrowRight size={16} />
              </button>
            </article>
          );
        })}
      </section>
      <section className="panel court-admin-register">
        <div className="court-register-toolbar">
          <div className="court-date-controls">
            <button
              className="icon-btn bordered"
              aria-label="Previous booking day"
              onClick={() => step(-1)}
            >
              <ChevronLeft size={17} />
            </button>
            <input
              aria-label="Admin booking date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayIST())}
            />
            <button
              className="icon-btn bordered"
              aria-label="Next booking day"
              onClick={() => step(1)}
            >
              <ChevronRight size={17} />
            </button>
            <button
              className="btn secondary small"
              onClick={() => setDate(todayIST())}
            >
              Today
            </button>
          </div>
          <div
            className="court-register-views"
            role="group"
            aria-label="Booking layout"
          >
            {[
              { name: "Bookings", Icon: List },
              { name: "Schedule", Icon: LayoutGrid },
            ].map(({ name, Icon }) => (
              <button
                key={name}
                aria-pressed={view === name}
                className={view === name ? "active" : ""}
                onClick={() => setView(name)}
              >
                <Icon size={15} />
                {name}
              </button>
            ))}
          </div>
        </div>
        {view === "Bookings" ? (
          <>
            <div className="filter-bar court-register-filters">
              <label className="search-input">
                <Search size={16} />
                <input
                  aria-label="Search court bookings"
                  placeholder="Booking, name, mobile or court…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Booking status filter"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {["Confirmed", "Checked in", "Completed", "Cancelled"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </select>
              <select
                aria-label="Booking source filter"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">All sources</option>
                <option value="Website">Website</option>
                <option value="Admin">Admin</option>
                <option value="Legacy">Earlier bookings</option>
              </select>
              <button
                className="text-btn"
                onClick={() => {
                  setQuery("");
                  setStatus("");
                  setSource("");
                }}
              >
                <RefreshCw size={13} />
                Reset
              </button>
              <span className="muted">{rows.length} bookings</span>
            </div>
            <div className="table-scroll">
              <table className="court-bookings-table">
                <thead>
                  <tr>
                    <th>Booking / court</th>
                    <th>Customer</th>
                    <th>Session · IST</th>
                    <th>Players</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <button
                          className="plain booking-reference-link"
                          onClick={() =>
                            setModal({ type: "bookingDetail", value: b })
                          }
                        >
                          {b.id}
                        </button>
                        <b>{b.court}</b>
                        <small>
                          {b.source === "Website"
                            ? "Online booking"
                            : b.source === "Admin"
                              ? "Admin booking"
                              : "Earlier booking"}
                        </small>
                      </td>
                      <td>
                        <b>{b.customer}</b>
                        <a className="booking-phone" href={`tel:${b.phone}`}>
                          <Phone size={12} />
                          {b.phone}
                        </a>
                      </td>
                      <td>
                        <b>
                          {timeLabel(b.start)} –{" "}
                          {timeLabel(b.start + b.duration)}
                        </b>
                        <small>
                          {b.duration} minutes · {dateLabel(b.date)}
                        </small>
                      </td>
                      <td>
                        <b>{b.players}</b>
                        <small>
                          {b.equipment ? "Paddles included" : "Own paddles"}
                        </small>
                      </td>
                      <td>
                        <b>{money(b.total)}</b>
                        {Boolean(b.refund) && (
                          <small>Refund: {money(b.refund!)}</small>
                        )}
                      </td>
                      <td>
                        <span
                          className={`booking-status status-${b.status.toLowerCase().replaceAll(" ", "-")}`}
                        >
                          {b.status}
                        </span>
                        {b.completedAt && (
                          <small>
                            Finished{" "}
                            {new Date(b.completedAt).toLocaleTimeString(
                              "en-IN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Kolkata",
                              },
                            )}
                          </small>
                        )}
                      </td>
                      <td>
                        <div className="booking-row-actions">
                          {["Confirmed", "Checked in"].includes(b.status) && (
                            <button
                              className="btn primary small"
                              disabled={busy}
                              onClick={() => void advance(b)}
                            >
                              {b.status === "Confirmed"
                                ? "Check in"
                                : "Complete & bill"}
                              <Check size={13} />
                            </button>
                          )}
                          <button
                            className="btn secondary small"
                            onClick={() => receipt(b)}
                          >
                            <Receipt size={13} />
                            {b.status === "Completed" ? "Bill" : "Receipt"}
                          </button>
                          <button
                            className="text-btn"
                            onClick={() =>
                              setModal({ type: "bookingDetail", value: b })
                            }
                          >
                            Details
                          </button>
                          {b.status === "Confirmed" && (
                            <button
                              className="text-btn danger-text"
                              disabled={busy}
                              onClick={() => {
                                setCancel(b);
                                setReason("");
                                setError("");
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <div className="court-register-empty">
                <CalendarDays size={31} />
                <h3>No matching bookings</h3>
                <p>Try a different date or filter, or add a new booking.</p>
                <button className="btn secondary" onClick={() => booking()}>
                  New booking
                  <Plus size={14} />
                </button>
              </div>
            )}
          </>
        ) : (
          <CourtSchedule
            courts={courts}
            bookings={day}
            date={date}
            now={now}
            open={(b) => setModal({ type: "bookingDetail", value: b })}
            book={booking}
          />
        )}
      </section>
      {cancel && (
        <Modal title="Cancel this court booking?" close={() => setCancel(null)}>
          <div className="cancel-booking-summary">
            <h3>
              {cancel.customer} · {cancel.court}
            </h3>
            <p>
              {dateLabel(cancel.date)} · {timeLabel(cancel.start)} –{" "}
              {timeLabel(cancel.start + cancel.duration)}
            </p>
            <a href={`tel:${cancel.phone}`}>{cancel.phone}</a>
            <div>
              <span>Applicable preview refund</span>
              <b>{money(refund)}</b>
            </div>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                await act(
                  "bookingStatus",
                  { id: cancel.id, status: "Cancelled", reason },
                  "Booking cancelled by admin",
                );
                setCancel(null);
              } catch (e: any) {
                setError(e.message);
              }
            }}
          >
            <Field label="Cancellation reason">
              <textarea
                required
                minLength={3}
                maxLength={200}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Record why the booking is being cancelled…"
              />
            </Field>
            <p className="note">
              Cancellation releases the court slot and records the applicable
              refund. The customer cannot cancel directly.
            </p>
            {error && <p className="form-error">{error}</p>}
            <div className="cancel-booking-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setCancel(null)}
              >
                Keep booking
              </button>
              <button className="btn primary" type="submit" disabled={busy}>
                Confirm cancellation
                <X size={15} />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
function CourtSchedule({
  courts,
  bookings,
  date,
  now,
  open,
  book,
}: {
  courts: CourtConfig[];
  bookings: Booking[];
  date: string;
  now: number;
  open: (b: Booking) => void;
  book: (value: any) => void;
}) {
  const first = Math.min(...courts.map((c) => c.open)),
    last = Math.max(...courts.map((c) => c.close)),
    height = ((last - first) / 30) * 42,
    rows = Array.from(
      { length: (last - first) / 30 },
      (_, i) => first + i * 30,
    );
  return (
    <div className="admin-court-schedule">
      <div
        className="admin-schedule-grid"
        style={{
          gridTemplateColumns: `66px repeat(${courts.length},minmax(185px,1fr))`,
        }}
      >
        <div className="schedule-heading">IST</div>
        {courts.map((c) => (
          <div className="schedule-heading" key={c.name}>
            {c.name}
            <small>
              {c.active
                ? `${timeLabel(c.open)} – ${timeLabel(c.close)}`
                : "Closed"}
            </small>
          </div>
        ))}
        <div className="schedule-hours" style={{ height }}>
          {rows.map((s) => (
            <span key={s} style={{ height: 42 }}>
              {timeLabel(s)}
            </span>
          ))}
        </div>
        {courts.map((c) => (
          <div
            className="schedule-court-column"
            key={c.name}
            style={{ height }}
          >
            {rows.map((s) => (
              <button
                key={s}
                className="schedule-free-slot"
                style={{ height: 42 }}
                disabled={
                  bookingSlotAvailability(
                    c,
                    date,
                    s,
                    30,
                    bookings,
                    new Date(now),
                  ) !== "Available"
                }
                aria-label={`Book ${c.name} at ${timeLabel(s)}`}
                onClick={() =>
                  book({ date, court: c.name, start: s, duration: 30 })
                }
              >
                <Plus size={12} />
              </button>
            ))}
            {bookings
              .filter((b) => b.court === c.name && b.status !== "Cancelled")
              .map((b) => (
                <button
                  className={`schedule-booking-event status-${b.status.toLowerCase().replaceAll(" ", "-")}`}
                  key={b.id}
                  style={{
                    top: ((b.start - first) / 30) * 42 + 3,
                    height: (b.duration / 30) * 42 - 6,
                  }}
                  title={`${b.customer} · ${b.phone} · ${b.id}`}
                  data-court={b.court}
                  data-reference={b.id}
                  data-customer={b.customer}
                  data-phone={b.phone}
                  data-session={`${timeLabel(b.start)} – ${timeLabel(b.start + b.duration)}`}
                  onClick={() => open(b)}
                >
                  <b>{b.customer}</b>
                  <span>
                    {timeLabel(b.start)} – {timeLabel(b.start + b.duration)}
                  </span>
                  {b.duration >= 60 && (
                    <small>
                      {b.phone} · {b.status}
                    </small>
                  )}
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
