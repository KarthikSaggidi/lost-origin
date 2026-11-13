"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  MessageCircle,
  QrCode,
  RefreshCw,
  Send,
  Unplug,
  Users,
} from "lucide-react";
import { Field } from "./shared";
import { authFetch } from "../lib/client-auth";
import { notificationDefaults } from "../lib/bill";
import type { State } from "../lib/domain";
import {
  emptyFilters,
  filterNotifications,
  type AdminFilters,
} from "../lib/admin-filters";
const post = async (value: any) => {
  const r = await authFetch("/api/v1/communications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error(d.error || "The request could not be completed.");
  return d;
};
export function CampaignWhatsApp({ data }: { data: State }) {
  const [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [message, setMessage] = useState(
      "Hi {name}, something good is happening at Lost Origin Coffee House. Join us for coffee and a game!",
    ),
    [image, setImage] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  const key = useRef("");
  const contacts = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of [
      ...data.orders,
      ...data.bookings,
      ...(data.registrations || []),
    ] as any[])
      if (/^[6-9]\d{9}$/.test(c.phone)) {
        const old = map.get(c.phone);
        map.set(c.phone, {
          phone: c.phone,
          name: c.customer || c.name || c.phone,
          optIn: Boolean(old?.optIn || c.marketingOptIn),
        });
      }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);
  const filtered = contacts.filter((c) =>
      `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase()),
    ),
    eligible = filtered.filter((c) => c.optIn),
    allSelected =
      eligible.length > 0 && eligible.every((c) => selected.includes(c.phone));
  return (
    <section className="panel communication-campaign">
      <div className="section-heading">
        <div>
          <h2>
            <Users size={20} /> WhatsApp campaigns
          </h2>
          <p>
            Select contacts and send a personalised campaign through your
            connected WhatsApp.
          </p>
        </div>
      </div>
      <div className="communications-columns">
        <div>
          <Field label="Find contacts">
            <input
              placeholder="Name or mobile number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <label className="communication-select-all">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={busy || sent || !eligible.length}
              onChange={() =>
                setSelected(
                  allSelected
                    ? selected.filter(
                        (p) => !eligible.some((c) => c.phone === p),
                      )
                    : [
                        ...new Set([
                          ...selected,
                          ...eligible.map((c) => c.phone),
                        ]),
                      ].slice(0, 100),
                )
              }
            />{" "}
            Select all eligible contacts
          </label>
          <div className="communication-contacts">
            {filtered.map((c) => (
              <label key={c.phone}>
                <input
                  type="checkbox"
                  checked={selected.includes(c.phone)}
                  disabled={!c.optIn || busy || sent}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, c.phone].slice(0, 100)
                        : selected.filter((p) => p !== c.phone),
                    )
                  }
                />
                <span>
                  <b>{c.name}</b>
                  <small>+91 {c.phone}</small>
                </span>
                <small>{c.optIn ? "Opted in" : "No campaign opt-in"}</small>
              </label>
            ))}
            {!filtered.length && (
              <p className="note">
                Contacts will appear after orders, bookings or campaign
                registrations.
              </p>
            )}
          </div>
          <p className="micro-copy">
            Only contacts who opted in can receive campaigns. Up to 100 per
            batch.
          </p>
        </div>
        <div>
          <Field label="Campaign message">
            <textarea
              rows={6}
              maxLength={2000}
              value={message}
              disabled={busy || sent}
              onChange={(e) => {
                setMessage(e.target.value);
                key.current = "";
              }}
            />
          </Field>
          <p className="micro-copy">Use {"{name}"} for a personal greeting.</p>
          <Field label="Campaign image (optional)">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy || sent}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  const form = new FormData();
                  form.set("image", file);
                  const r = await authFetch("/api/v1/media", {
                    method: "POST",
                    body: form,
                  });
                  const d: any = await r.json();
                  if (!r.ok) throw new Error(d.error);
                  setImage(d.image);
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </Field>
          {image && (
            <div className="campaign-upload-preview">
              <img src={image} alt="Campaign attachment" />
              <button
                className="text-btn"
                disabled={busy || sent}
                onClick={() => setImage("")}
              >
                Remove image
              </button>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="delivery-status" role="status">
              {notice}
            </p>
          )}
          <button
            className="btn primary full"
            disabled={
              busy || sent || !selected.length || message.trim().length < 5
            }
            onClick={async () => {
              setBusy(true);
              setError("");
              key.current ||= crypto.randomUUID();
              try {
                const d = await post({
                  action: "campaign",
                  phones: selected,
                  message,
                  image,
                  requestKey: key.current,
                });
                setNotice(
                  `${d.count} campaign messages saved. Delivery follows the WhatsApp connection and queue status.`,
                );
                setSent(true);
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Send size={16} />
            {busy
              ? "Saving campaign…"
              : `Send campaign to ${selected.length} contacts`}
          </button>
          {sent && (
            <button
              className="text-btn"
              onClick={() => {
                setSent(false);
                setNotice("");
                key.current = "";
              }}
            >
              Create another campaign
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
export default function CommunicationsAdmin({
  data,
  filters = emptyFilters,
  onJobs,
}: {
  data: State;
  filters?: AdminFilters;
  onJobs?: (rows: NonNullable<State["notificationLogs"]>) => void;
}) {
  const [info, setInfo] = useState<any>(null),
    [form, setForm] = useState(notificationDefaults),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const dirty = useRef(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/communications", { cache: "no-store" }),
        d: any = await r.json();
      if (!r.ok) throw new Error(d.error);
      setInfo(d);
      onJobs?.(d.jobs);
      if (!dirty.current) setForm(d.settings);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }, [onJobs]);
  useEffect(() => {
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);
  const action = async (value: any) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await post(value);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const connection = info?.connection,
    wa = connection?.whatsapp;
  return (
    <div className="communications-admin">
      <div className="page-heading">
        <div>
          <h1>Stay connected.</h1>
          <p>
            Link WhatsApp, personalise every bill and keep track of delivery.
          </p>
        </div>
        <button className="btn secondary" onClick={load}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="communications-columns">
        <section className="panel communication-connect">
          <div className="communication-panel-title">
            <MessageCircle size={24} />
            <div>
              <h2>Connect WhatsApp</h2>
              <p>
                {wa?.state || "Checking connection…"}
                {wa?.phone ? ` · +${wa.phone}` : ""}
              </p>
            </div>
          </div>
          {wa?.qr ? (
            <>
              <img
                className="whatsapp-qr"
                src={wa.qr}
                alt="Scan this QR code with WhatsApp Linked devices"
              />
              <p>WhatsApp → Settings → Linked devices → Link a device.</p>
              <small>The QR code refreshes automatically.</small>
            </>
          ) : (
            <div className="whatsapp-qr-placeholder">
              <QrCode size={72} strokeWidth={1} />
              <p>
                {wa?.state === "Connected"
                  ? "WhatsApp is connected."
                  : wa?.state === "Connecting"
                    ? "Starting WhatsApp Web…"
                    : "Connect to display a secure linking QR code."}
              </p>
            </div>
          )}
          {connection && !connection.available && (
            <p className="note">{connection.error}</p>
          )}
          {wa?.error && <p className="form-error">{wa.error}</p>}
          <div className="communication-button-row">
            <button
              className="btn primary"
              disabled={
                busy ||
                !connection?.available ||
                ["Connected", "Connecting", "Waiting for scan"].includes(
                  wa?.state,
                )
              }
              onClick={() => action({ action: "connect" })}
            >
              <QrCode size={16} />
              Connect WhatsApp
            </button>
            <button
              className="btn secondary"
              disabled={
                busy || !connection?.available || wa?.state === "Disconnected"
              }
              onClick={() => action({ action: "disconnect" })}
            >
              <Unplug size={16} />
              Disconnect
            </button>
          </div>
          <p className="micro-copy">
            QR linking uses WhatsApp Web. The linked session stays in the
            private Node service.
          </p>
        </section>
        <section className="panel communication-templates">
          <h2>Messages with every bill</h2>
          <p className="note">
            Edit the defaults here. You can personalise each message before
            sending a bill.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await post({ action: "settings", value: form });
                dirty.current = false;
                setNotice("Message settings saved.");
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Thank-you message with bill">
              <textarea
                rows={4}
                value={form.billMessage}
                maxLength={2000}
                onChange={(e) => {
                  dirty.current = true;
                  setForm({ ...form, billMessage: e.target.value });
                }}
              />
            </Field>
            <Field label="Order update message">
              <textarea
                rows={3}
                value={form.orderUpdateMessage}
                maxLength={2000}
                onChange={(e) => {
                  dirty.current = true;
                  setForm({ ...form, orderUpdateMessage: e.target.value });
                }}
              />
            </Field>
            <p className="micro-copy">
              Placeholders:{" "}
              {
                "{name}, {reference}, {total}, {status}, {date}, {time}, {court}"
              }
            </p>
            <label className="check-field">
              <input
                type="checkbox"
                checked={form.emailEnabled}
                onChange={(e) => {
                  dirty.current = true;
                  setForm({ ...form, emailEnabled: e.target.checked });
                }}
              />
              Email confirmations and PDF bills automatically
            </label>
            <p className="note">
              SMTP:{" "}
              {connection?.smtpConfigured
                ? "Configured"
                : "Not configured — delivery setup is deferred."}
            </p>
            {notice && <p role="status">{notice}</p>}
            <button className="btn primary" disabled={busy}>
              <Check size={16} />
              Save message settings
            </button>
          </form>
        </section>
      </div>
      <section className="panel communication-history">
        <div className="communication-panel-title">
          <div>
            <h2>Delivery history</h2>
            <p>
              Queued means saved for delivery. Sent means the provider accepted
              the message.
            </p>
          </div>
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => action({ action: "process" })}
          >
            Process pending messages
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Channel / recipient</th>
                <th>Status</th>
                <th>Details</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filterNotifications(info?.jobs || [], filters).map((j: any) => (
                <tr key={j.id}>
                  <td>
                    {j.reference}
                    <small>
                      {new Date(j.createdAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </small>
                  </td>
                  <td>
                    {j.channel}
                    <small>{j.recipient}</small>
                  </td>
                  <td>{j.status}</td>
                  <td>{j.detail}</td>
                  <td>
                    {[
                      "Pending",
                      "Failed",
                      "Waiting for SMTP",
                      "Waiting for WhatsApp",
                    ].includes(j.status) && (
                      <button
                        className="btn secondary small"
                        disabled={busy}
                        onClick={() => action({ action: "retry", id: j.id })}
                      >
                        Retry / refresh
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filterNotifications(info?.jobs || [], filters).length && (
            <p className="note">
              No messages yet. Confirmations will appear after an order or
              booking.
            </p>
          )}
        </div>
      </section>
      <CampaignWhatsApp data={data} />
    </div>
  );
}
