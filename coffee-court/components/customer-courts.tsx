"use client";
import { useState, useEffect } from "react";
import {
  CalendarDays,
  Clock,
  Coffee,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
  Trophy,
  Zap,
  Grid2X2,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  courtConfig,
  todayIST,
  timeLabel,
  money,
  quoteBooking,
  bookingStarts,
  bookingSlotAvailability,
  validBookingDate,
  type State,
  type CourtConfig,
} from "../lib/domain";
import BlueCourt from "./blue-court";

const formatDate = (date: string) =>
  validBookingDate(date)
    ? new Date(date + "T12:00:00+05:30").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "Choose a date";
export default function CustomerCourts({
  data,
  confirm,
}: {
  data: State;
  confirm: (value: {
    date: string;
    court: string;
    start: number;
    duration: number;
    reviewOnly: boolean;
  }) => void;
}) {
  const courts = courtConfig(data.settings);
  const now = new Date();
  const first = (
    court: CourtConfig | undefined,
    date: string,
    duration: number,
  ) =>
    bookingStarts(court, duration).find(
      (s) =>
        bookingSlotAvailability(
          court,
          date,
          s,
          duration,
          data.bookings,
          now,
        ) === "Available",
    ) ?? null;
  const [selection, setSelection] = useState(() => {
    for (let offset = 0; offset <= 30; offset++) {
      const date = todayIST(new Date(now.getTime() + offset * 86400000));
      const court = courts.find((c) => first(c, date, 60) !== null);
      if (court)
        return {
          date,
          court: court.name,
          duration: 60,
          start: first(court, date, 60),
        };
    }
    return {
      date: todayIST(),
      court: courts[0]?.name || "",
      duration: 60,
      start: null as number | null,
    };
  });
  const [page, setPage] = useState(() => {
    const c = courts.find((c) => c.name === selection.court);
    const choices = bookingStarts(c, selection.duration).filter(
      (s) =>
        bookingSlotAvailability(
          c,
          selection.date,
          s,
          selection.duration,
          data.bookings,
          now,
        ) !== "Past",
    );
    return Math.max(0, Math.floor(choices.indexOf(selection.start ?? -1) / 6));
  });
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setClockTick((v) => v + 1), 15000);
    return () => clearInterval(timer);
  }, []);
  const { date, court, duration, start } = selection;
  const config = courts.find((c) => c.name === court);
  const status = (c: CourtConfig, s: number) =>
    bookingSlotAvailability(c, date, s, duration, data.bookings, now);
  const slots = bookingStarts(config, duration).filter(
    (s) => status(config!, s) !== "Past",
  );
  const pages = Math.max(1, Math.ceil(slots.length / 6));
  const visiblePage = Math.min(page, pages - 1);
  const visibleSlots = slots.slice(visiblePage * 6, visiblePage * 6 + 6);
  const available =
    config && start !== null && status(config, start) === "Available";
  const total = available
    ? quoteBooking(start, duration, false, date, config)
    : 0;
  const choose = (
    nextDate: string,
    nextCourt: string,
    nextDuration: number,
    nextStart: number | null = null,
  ) => {
    const c = courts.find((c) => c.name === nextCourt);
    const chosen =
      nextStart !== null &&
      bookingSlotAvailability(
        c,
        nextDate,
        nextStart,
        nextDuration,
        data.bookings,
        now,
      ) === "Available"
        ? nextStart
        : first(c, nextDate, nextDuration);
    setSelection({
      date: nextDate,
      court: nextCourt,
      duration: nextDuration,
      start: chosen,
    });
    const choices = bookingStarts(c, nextDuration).filter(
      (s) =>
        bookingSlotAvailability(
          c,
          nextDate,
          s,
          nextDuration,
          data.bookings,
          now,
        ) !== "Past",
    );
    setPage(Math.max(0, Math.floor(choices.indexOf(chosen ?? -1) / 6)));
  };
  const nextDay = () =>
    choose(
      todayIST(
        new Date(
          new Date(
            (validBookingDate(date) ? date : todayIST()) + "T12:00:00+05:30",
          ).getTime() + 86400000,
        ),
      ),
      court,
      duration,
    );
  return (
    <div className="pickleball-page">
      <section className="pickleball-hero">
        <div className="pickleball-hero-copy">
          <p className="pickleball-eyebrow">PICKLEBALL AT LOST ORIGIN</p>
          <h1>
            Book a<br />
            Pickleball Court
          </h1>
          <p className="pickleball-description">
            Reserve one of our four courts and enjoy
            <br className="desktop-break" /> a great game with coffee, food and
            a relaxed space.
          </p>
          <div className="pickleball-hero-features">
            <span>
              <Grid2X2 />4 Courts
            </span>
            <span>
              <CalendarDays />
              Easy Booking
            </span>
            <span>
              <Coffee />
              Coffee & Refreshments
            </span>
          </div>
        </div>
        <div className="pickleball-hero-art">
          <img
            src="/images/pickleball-paddle.png"
            alt="White pickleball paddle and ball"
            fetchPriority="high"
          />
        </div>
      </section>
      <section
        className="court-booking-panel"
        aria-label="Book a pickleball court"
      >
        <div className="court-booking-controls">
          <h2>Book a Court</h2>
          <p>Choose your date, duration and court to play pickleball.</p>
          <label className="court-booking-field">
            <CalendarDays />
            <span>
              <span>Select Date</span>
              <b>{formatDate(date)}</b>
            </span>
            <CalendarDays className="field-end-icon" />
            <input
              aria-label="Select booking date"
              type="date"
              required
              min={todayIST()}
              max={todayIST(new Date(now.getTime() + 30 * 86400000))}
              value={date}
              onChange={(e) => choose(e.target.value, court, duration)}
            />
          </label>
          <label className="court-booking-field">
            <Clock />
            <span>
              <span>Select Duration</span>
              <b>{duration} Minutes</b>
            </span>
            <ChevronDown className="field-end-icon" />
            <select
              aria-label="Select booking duration"
              value={duration}
              onChange={(e) =>
                choose(date, court, Number(e.target.value), start)
              }
            >
              {[30, 60, 90, 120].map((d) => (
                <option value={d} key={d}>
                  {d} Minutes
                </option>
              ))}
            </select>
          </label>
          <p className="court-booking-note">
            Times are shown in IST. Reserve up to 30 days ahead.
          </p>
        </div>
        <div className="court-booking-options">
          <div className="court-choice-heading">
            <h3>Choose a Court</h3>
            <div className="court-choice-legend">
              <span>
                <i className="available" />
                Available
              </span>
              <span>
                <i className="booked" />
                Booked
              </span>
              <span>
                <i className="selected" />
                Your Selection
              </span>
            </div>
          </div>
          <div
            className="court-choice-grid"
            role="group"
            aria-label="Choose a court"
          >
            {courts.map((c) => {
              const any = first(c, date, duration) !== null;
              const state = !c.active
                ? "Closed"
                : start !== null
                  ? status(c, start)
                  : !validBookingDate(date)
                    ? "Closed"
                    : any
                      ? "Available"
                      : bookingStarts(c, duration).some(
                            (s) => status(c, s) === "Booked",
                          )
                        ? "Booked"
                        : "Closed";
              const label =
                state === "Past"
                  ? "Unavailable"
                  : state === "Booked" && any
                    ? "Other times"
                    : state;
              const disabled = !any;
              return (
                <button
                  key={c.name}
                  type="button"
                  className={`court-choice-card ${court === c.name ? "selected" : ""} ${disabled ? "unavailable" : ""}`}
                  aria-label={`${c.name}, ${label}`}
                  aria-pressed={court === c.name}
                  title={
                    state === "Booked" && any
                      ? "Booked at the selected time. Choose this court to find another time."
                      : undefined
                  }
                  disabled={disabled}
                  onClick={() => choose(date, c.name, duration, start)}
                >
                  {court === c.name && (
                    <span className="court-selection-check">
                      <Check size={14} />
                    </span>
                  )}
                  <BlueCourt />
                  <b>{c.name}</b>
                  <span className="court-availability">
                    <i
                      className={state === "Available" ? "available" : "booked"}
                    />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="court-slot-heading">
            <h3>Select a Time Slot</h3>
            <div className="court-slot-paging">
              <button
                type="button"
                aria-label="Earlier times"
                disabled={visiblePage === 0}
                onClick={() => setPage(visiblePage - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                {visiblePage + 1} / {pages}
              </span>
              <button
                type="button"
                aria-label="Later times"
                disabled={visiblePage >= pages - 1}
                onClick={() => setPage(visiblePage + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div
            className="court-time-grid"
            role="group"
            aria-label="Available start times"
          >
            {visibleSlots.map((s) => {
              const state = status(config!, s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={state !== "Available"}
                  className={start === s && available ? "selected" : ""}
                  aria-pressed={start === s}
                  aria-label={`${timeLabel(s)}, ${state}`}
                  onClick={() => setSelection((v) => ({ ...v, start: s }))}
                >
                  {timeLabel(s)}
                  {state === "Booked" && <small>Booked</small>}
                </button>
              );
            })}
          </div>
          {!slots.some((s) => status(config!, s) === "Available") && (
            <div className="court-empty-state">
              <Info size={17} />
              <span>
                {validBookingDate(date)
                  ? "No available times for this court and duration. Try another court or date."
                  : "Choose a valid date within the next 30 days."}
              </span>
              <button
                type="button"
                className="text-btn"
                onClick={nextDay}
                disabled={
                  date >= todayIST(new Date(now.getTime() + 30 * 86400000))
                }
              >
                Next day
                <ArrowRight size={14} />
              </button>
            </div>
          )}
          {start !== null && !available && (
            <p className="court-slot-conflict" role="status">
              <RefreshCw size={14} />
              This session is no longer available. Choose another time.
            </p>
          )}
        </div>
        <div className="court-booking-summary">
          <div className="court-summary-selection">
            <span className="court-summary-thumbnail">
              <BlueCourt />
            </span>
            <div>
              <h3>{config?.name || "Choose a court"}</h3>
              <p>
                {formatDate(date)}
                {start !== null && (
                  <>
                    {" "}
                    <span>·</span> {timeLabel(start)} –{" "}
                    {timeLabel(start + duration)} ({duration} mins)
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="court-summary-total" aria-live="polite">
            <span>Total</span>
            <strong>{available ? money(total) : "—"}</strong>
            <small>
              {available
                ? `Includes ${config?.taxRate ?? 0}% tax`
                : "Choose an available session"}
            </small>
          </div>
          <button
            className="btn primary court-confirm-button"
            disabled={!available}
            onClick={() => {
              if (available && start !== null)
                confirm({ date, court, duration, start, reviewOnly: true });
            }}
          >
            Confirm Booking
            <ArrowRight size={21} />
          </button>
        </div>
      </section>
      <section
        className="pickleball-benefits"
        aria-label="Why play at Lost Origin"
      >
        {[
          {
            icon: Trophy,
            title: "Premium Courts",
            text: "Four spaces for your next rally",
          },
          {
            icon: CalendarDays,
            title: "Flexible Timings",
            text: "Play at your convenience",
          },
          {
            icon: Zap,
            title: "Instant Booking",
            text: "Quick and hassle-free",
          },
          {
            icon: Coffee,
            title: "Coffee & Refreshments",
            text: "Enjoy great coffee after your game",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
