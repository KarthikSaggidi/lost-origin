"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCheck,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  freshBookingNotifications,
  type BookingNotification,
} from "../lib/booking-notifications";
import { money, timeLabel } from "../lib/domain";

function chime(context: AudioContext) {
  if (context.state !== "running") return false;
  const now = context.currentTime;
  for (const [index, frequency] of [659.25, 880].entries()) {
    const oscillator = context.createOscillator(),
      gain = context.createGain(),
      start = now + index * 0.17;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.09, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.25);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  return true;
}
function seenIds(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((id) => typeof id === "string").slice(-2000)
      : [];
  } catch {
    return [];
  }
}
function useBookingAlerts(
  records: BookingNotification[],
  account: string,
  enabled: boolean,
) {
  const [alerts, setAlerts] = useState<BookingNotification[]>([]),
    [soundEnabled, setSoundEnabled] = useState(true),
    [soundReady, setSoundReady] = useState(false),
    [supported, setSupported] = useState(true);
  const context = useRef<AudioContext | null>(null),
    preferred = useRef(true),
    seen = useRef(new Set<string>()),
    mounted = useRef(false);
  const key = `lost-origin:booking-alerts:v1:${encodeURIComponent(account)}`,
    soundKey = `${key}:sound`;
  const unlock = useCallback(
    async (sample = false) => {
      if (!enabled) return;
      try {
        const Constructor =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;
        if (!Constructor) {
          setSupported(false);
          return;
        }
        if (!context.current || context.current.state === "closed") {
          context.current = new Constructor();
          context.current.onstatechange = () => {
            if (mounted.current)
              setSoundReady(context.current?.state === "running");
          };
        }
        const audio = context.current;
        if (audio.state !== "running") await audio.resume();
        if (mounted.current) setSoundReady(audio.state === "running");
        if (sample && preferred.current) chime(audio);
      } catch {
        if (mounted.current) setSoundReady(false);
      }
    },
    [enabled],
  );
  useEffect(() => {
    mounted.current = true;
    if (!enabled)
      return () => {
        mounted.current = false;
      };
    try {
      preferred.current = localStorage.getItem(soundKey) !== "off";
    } catch {
      preferred.current = true;
    }
    setSoundEnabled(preferred.current);
    seen.current = new Set(seenIds(key));
    const gesture = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-booking-sound-control]")
      )
        return;
      if (preferred.current) void unlock();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === soundKey) {
        preferred.current = event.newValue !== "off";
        setSoundEnabled(preferred.current);
        if (!preferred.current) {
          const audio = context.current;
          context.current = null;
          void audio?.close().catch(() => {});
          setSoundReady(false);
        }
      }
    };
    document.addEventListener("pointerdown", gesture, true);
    document.addEventListener("keydown", gesture, true);
    window.addEventListener("storage", storage);
    return () => {
      mounted.current = false;
      document.removeEventListener("pointerdown", gesture, true);
      document.removeEventListener("keydown", gesture, true);
      window.removeEventListener("storage", storage);
      void context.current?.close().catch(() => {});
      context.current = null;
    };
  }, [enabled, key, soundKey, unlock]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const unreadIds = new Set(
      records.filter((r) => !r.readAt).map((r) => r.id),
    );
    setAlerts((current) => current.filter((r) => unreadIds.has(r.id)));
    const claim = () => {
      if (cancelled) return;
      const known = new Set([...seenIds(key), ...seen.current]),
        fresh = freshBookingNotifications(records, known);
      if (!fresh.length) return;
      fresh.forEach((record) => known.add(record.id));
      seen.current = known;
      try {
        localStorage.setItem(key, JSON.stringify([...known].slice(-2000)));
      } catch {}
      setAlerts((current) => [...current, ...fresh].slice(-100));
      if (preferred.current) {
        if (!context.current || !chime(context.current)) setSoundReady(false);
      }
    };
    const process = () => {
      if (navigator.locks?.request)
        void navigator.locks.request(key, claim).catch(claim);
      else claim();
    };
    // Let a visible admin tab claim the alert before an inactive tab does.
    const timer = setTimeout(
      process,
      document.visibilityState === "hidden" ? 250 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [records, enabled, key]);
  const toggle = async () => {
    if (soundEnabled && soundReady) {
      preferred.current = false;
      setSoundEnabled(false);
      try {
        localStorage.setItem(soundKey, "off");
      } catch {}
      const audio = context.current;
      context.current = null;
      await audio?.close().catch(() => {});
      setSoundReady(false);
    } else {
      preferred.current = true;
      setSoundEnabled(true);
      try {
        localStorage.setItem(soundKey, "on");
      } catch {}
      await unlock(true);
    }
  };
  const dismiss = useCallback(
    (id: string) => setAlerts((current) => current.filter((r) => r.id !== id)),
    [],
  );
  return {
    alerts,
    soundEnabled,
    soundReady,
    supported,
    toggle,
    test: () => unlock(true),
    dismiss,
  };
}
const dateLabel = (value: string) =>
  new Date(value + "T12:00:00+05:30").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
function AlertCard({
  record,
  open,
  dismiss,
  active,
}: {
  record: BookingNotification;
  open: () => void;
  dismiss: (id: string) => void;
  active: boolean;
}) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || !active) return;
    const timer = setTimeout(() => dismiss(record.id), 15000);
    return () => clearTimeout(timer);
  }, [paused, active, dismiss, record.id]);
  return (
    <article
      className="booking-alert-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setPaused(false);
      }}
    >
      <div className="booking-alert-title">
        <span>
          <CalendarCheck size={18} />
          New website booking
        </span>
        <button
          className="booking-alert-dismiss"
          onClick={() => dismiss(record.id)}
          aria-label={`Dismiss booking alert ${record.reference}`}
        >
          <X size={17} />
        </button>
      </div>
      <strong>{record.data.customer}</strong>
      <p>
        {record.data.court} · {dateLabel(record.data.date)}
      </p>
      <p>
        {timeLabel(record.data.start)} –{" "}
        {timeLabel(record.data.start + record.data.duration)} IST
      </p>
      <div className="booking-alert-details">
        <span>
          {record.data.players} players · {money(record.data.total)}
        </span>
        <span>+91 {record.data.phone}</span>
      </div>
      <button
        className="booking-alert-view"
        onClick={open}
        aria-label={`View booking ${record.reference}`}
      >
        View booking <ArrowRight size={15} />
      </button>
    </article>
  );
}
function AlertStack({
  alerts,
  open,
  dismiss,
}: {
  alerts: BookingNotification[];
  open: (record: BookingNotification) => void;
  dismiss: (id: string) => void;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null),
    [active, setActive] = useState(true);
  useEffect(() => {
    const update = () => {
      const dialogs =
        document.querySelectorAll<HTMLDialogElement>("dialog[open]");
      setHost(dialogs.item(dialogs.length - 1) || document.body);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    const visible = () => setActive(document.visibilityState === "visible");
    visible();
    document.addEventListener("visibilitychange", visible);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  if (!host || !alerts.length) return null;
  return createPortal(
    <aside
      className="booking-alert-stack"
      aria-label="New court booking alerts"
      aria-live="polite"
      aria-relevant="additions"
    >
      {alerts.slice(0, 3).map((record) => (
        <AlertCard
          key={record.id}
          record={record}
          active={active}
          open={() => {
            dismiss(record.id);
            open(record);
          }}
          dismiss={dismiss}
        />
      ))}
      {alerts.length > 3 && (
        <div className="booking-alert-more">
          {alerts.length - 3} more booking alerts queued
        </div>
      )}
    </aside>,
    host,
  );
}
export default function BookingNotifications({
  records,
  unread,
  account,
  enabled,
  open,
  setOpen,
  onOpen,
  onRead,
  activeOrders,
  lowStock,
  onOrders,
  onInventory,
}: {
  records: BookingNotification[];
  unread: number;
  account: string;
  enabled: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  onOpen: (record: BookingNotification) => void;
  onRead: (ids: string[]) => Promise<void>;
  activeOrders: number;
  lowStock: number;
  onOrders: () => void;
  onInventory: () => void;
}) {
  const alerts = useBookingAlerts(records, account, enabled),
    wrap = useRef<HTMLDivElement>(null),
    bell = useRef<HTMLButtonElement>(null),
    [reading, setReading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        bell.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, setOpen]);
  const soundLabel = !alerts.supported
    ? "Audio unavailable"
    : alerts.soundEnabled && alerts.soundReady
      ? "Mute booking sound"
      : "Enable booking sound";
  return (
    <>
      <div className="booking-notification-controls" ref={wrap}>
        <button
          className={`booking-sound-toggle ${alerts.soundEnabled && alerts.soundReady ? "sound-ready" : ""}`}
          data-booking-sound-control
          aria-label={soundLabel}
          title={soundLabel}
          disabled={!enabled || !alerts.supported}
          onClick={() => void alerts.toggle()}
        >
          {alerts.soundEnabled && alerts.soundReady ? (
            <Volume2 size={18} />
          ) : (
            <VolumeX size={18} />
          )}
          <span>
            {alerts.soundEnabled && alerts.soundReady
              ? "Sound on"
              : "Enable sound"}
          </span>
        </button>
        <div className="notification-wrap">
          <button
            ref={bell}
            className={`icon-btn notification-btn booking-notification-bell ${open ? "is-active" : ""}`}
            aria-label={`Booking notifications, ${unread} unread`}
            aria-expanded={open}
            aria-controls="admin-booking-inbox"
            onClick={() => setOpen(!open)}
          >
            <Bell size={19} />
            {unread > 0 && (
              <span className="booking-bell-count" aria-hidden="true">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
          {open && (
            <section
              id="admin-booking-inbox"
              className="notification-panel booking-inbox"
              aria-label="Booking notifications"
            >
              <div className="booking-inbox-heading">
                <h3>Website court bookings</h3>
                <button
                  className="booking-inbox-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close booking notifications"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="booking-inbox-tools">
                <span>{unread} unread</span>
                <button
                  className="booking-inbox-tool"
                  disabled={reading || !records.some((r) => !r.readAt)}
                  onClick={async () => {
                    setReading(true);
                    setError("");
                    try {
                      await onRead(
                        records.filter((r) => !r.readAt).map((r) => r.id),
                      );
                    } catch {
                      setError(
                        "Could not mark notifications as read. Try again.",
                      );
                    } finally {
                      setReading(false);
                    }
                  }}
                >
                  <CheckCheck size={14} />
                  {reading ? "Updating…" : "Mark shown as read"}
                </button>
              </div>
              <div className="booking-inbox-list">
                {records.map((record) => (
                  <button
                    key={record.id}
                    className={`booking-notification-row ${record.readAt ? "is-read" : "is-unread"}`}
                    onClick={() => onOpen(record)}
                  >
                    <CalendarCheck size={18} />
                    <span>
                      <b>
                        {record.data.customer} · {record.data.court}
                      </b>
                      <small>
                        {dateLabel(record.data.date)} ·{" "}
                        {timeLabel(record.data.start)} IST
                      </small>
                      <small>
                        {record.reference}
                        {!record.readAt ? " · New" : ""}
                      </small>
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))}
                {!records.length && (
                  <p className="booking-inbox-empty">
                    New website court bookings will appear here.
                  </p>
                )}
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="booking-inbox-operations">
                <button onClick={onOrders}>
                  {activeOrders} orders in progress <ArrowRight size={14} />
                </button>
                <button onClick={onInventory}>
                  {lowStock} inventory items running low{" "}
                  <ArrowRight size={14} />
                </button>
              </div>
              <div className="booking-inbox-sound">
                <p>
                  {!alerts.supported
                    ? "Sound is unavailable in this browser."
                    : alerts.soundEnabled && alerts.soundReady
                      ? "Booking sound is on."
                      : alerts.soundEnabled
                        ? "Enable sound once in this browser for audible alerts."
                        : "Booking sound is muted."}{" "}
                  Alerts work while the admin panel is open.
                </p>
                <button
                  className="booking-inbox-tool"
                  data-booking-sound-control
                  disabled={!alerts.supported}
                  onClick={() =>
                    void (alerts.soundEnabled && alerts.soundReady
                      ? alerts.test()
                      : alerts.toggle())
                  }
                >
                  {alerts.soundEnabled && alerts.soundReady
                    ? "Test sound"
                    : "Enable sound"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
      {enabled && (
        <AlertStack
          alerts={alerts.alerts}
          dismiss={alerts.dismiss}
          open={onOpen}
        />
      )}
    </>
  );
}
