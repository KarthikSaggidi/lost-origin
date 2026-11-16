"use client";
import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  Download,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react";
import { Modal, Field } from "./shared";
import { authFetch } from "../lib/client-auth";
import { notificationDefaults, renderMessage } from "../lib/bill";
import { money, timeLabel, type Order, type Booking } from "../lib/domain";
export function DownloadBill({
  record,
  kind,
}: {
  record: Order | Booking;
  kind: "order" | "booking";
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        className="btn secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const params = new URLSearchParams({
              action: "receipt",
              kind,
              id: record.id,
              key: record.requestKey,
            });
            const response = await fetch(`/api/v1/communications?${params}`, {
              cache: "no-store",
              referrerPolicy: "no-referrer",
            });
            if (!response.ok)
              throw new Error("The PDF could not be downloaded. Try again.");
            const url = URL.createObjectURL(await response.blob()),
              a = document.createElement("a");
            a.href = url;
            a.download = `${record.id}.pdf`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download size={16} />
        {busy ? "Preparing PDF…" : "Download bill PDF"}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </>
  );
}
export function WhatsAppShare({
  record,
  kind,
  update = false,
}: {
  record: Order | Booking;
  kind: "order" | "booking";
  update?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState("");
  const key = useRef("");
  return (
    <>
      <button
        className="btn secondary"
        disabled={!record.phone || record.status === "Queued offline"}
        onClick={async () => {
          key.current = crypto.randomUUID();
          setResult(null);
          setError("");
          setMessage(
            renderMessage(
              update
                ? notificationDefaults.orderUpdateMessage
                : notificationDefaults.billMessage,
              record,
            ),
          );
          setOpen(true);
          try {
            const r = await fetch("/api/v1/communications");
            const d: any = await r.json();
            if (r.ok)
              setMessage(
                renderMessage(
                  update
                    ? d.settings.orderUpdateMessage
                    : d.settings.billMessage,
                  record,
                ),
              );
          } catch {}
        }}
      >
        <MessageCircle size={16} />
        {update ? "Send WhatsApp update" : "Share bill on WhatsApp"}
      </button>
      {open && (
        <Modal
          title={update ? "Send order update" : "Share bill on WhatsApp"}
          close={() => setOpen(false)}
        >
          <p className="note">
            To {record.customer} · +91 {record.phone}
            {!update && " · PDF bill attached"}
          </p>
          <Field label="Message">
            <textarea
              rows={5}
              value={message}
              maxLength={2000}
              onChange={(e) => setMessage(e.target.value)}
              disabled={busy || Boolean(result)}
            />
          </Field>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {result && (
            <p className="delivery-status" role="status">
              {result.status === "Sent"
                ? "Sent to WhatsApp."
                : `${result.status}. ${result.detail || "Saved in the delivery queue. Connect WhatsApp in the admin panel to send."}`}
            </p>
          )}
          <button
            className="btn primary full"
            disabled={busy || !message.trim() || Boolean(result)}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const response = await authFetch("/api/v1/communications", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: update ? "update" : "bill",
                    id: record.id,
                    kind,
                    message,
                    requestKey: key.current,
                  }),
                });
                const d: any = await response.json();
                if (!response.ok) throw new Error(d.error);
                setResult(d);
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Send size={16} />
            {busy
              ? "Saving…"
              : result
                ? "Message saved"
                : "Send through connected WhatsApp"}
          </button>
        </Modal>
      )}
    </>
  );
}
export function EmailDeliveryStatus({ record }: { record: Order | Booking }) {
  if (!record.email) return null;
  const status = record.emailDelivery?.status;
  return (
    <div className="email-delivery-note">
      <Mail size={18} />
      <div>
        <b>{record.email}</b>
        <p>
          {status === "Sent"
            ? "Confirmation and PDF bill sent."
            : status === "Disabled"
              ? "Email receipts are switched off. Your confirmation is saved; download your bill below."
              : status === "Waiting for SMTP"
                ? "Saved, but email is waiting for SMTP settings. Download your bill below."
                : status === "Queued" || status === "Sending"
                ? "Your confirmation and PDF bill are queued for email."
                : record.emailDelivery?.detail ||
                  "Your confirmation is saved. Email delivery is pending. Download your bill below."}
        </p>
      </div>
    </div>
  );
}
export function WhatsAppDeliveryStatus({ record }: { record: Order | Booking }) {
  if (!record.whatsappDelivery) return null;
  const { status, detail } = record.whatsappDelivery;
  return (
    <div className="email-delivery-note whatsapp-delivery-note">
      <MessageCircle size={18} />
      <div>
        <b>WhatsApp confirmation</b>
        <p>
          {status === "Sent"
            ? "Confirmation and PDF bill sent through WhatsApp."
            : status === "Waiting for WhatsApp"
              ? "Saved for WhatsApp. Connect the café's WhatsApp device in the admin panel to send it."
              : status === "Queued" || status === "Sending"
                ? "Your confirmation and PDF bill are queued for WhatsApp."
                : detail || "Your confirmation is saved. WhatsApp delivery is pending."}
        </p>
      </div>
    </div>
  );
}
export function TransactionConfirmation({
  record,
  kind,
  close,
  print,
}: {
  record: Order | Booking;
  kind: "order" | "booking";
  close: () => void;
  print: () => void;
}) {
  const b = record as Booking;
  return (
    <Modal
      title={kind === "booking" ? "Booking confirmed" : "Order confirmed"}
      close={close}
      className="transaction-confirmation"
    >
      <div className="confirmation-mark">
        <CheckCircle2 size={38} strokeWidth={1.5} />
      </div>
      <h3>
        {kind === "booking"
          ? "Your court is reserved."
          : "A little goodness is on its way."}
      </h3>
      <p className="note">
        Thank you, {record.customer}. Keep this confirmation for your visit.
      </p>
      <dl className="confirmation-facts">
        <div>
          <dt>Reference</dt>
          <dd>{record.id}</dd>
        </div>
        {kind === "booking" ? (
          <>
            <div>
              <dt>Court</dt>
              <dd>{b.court}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{b.date}</dd>
            </div>
            <div>
              <dt>Session · IST</dt>
              <dd>
                {timeLabel(b.start)} – {timeLabel(b.start + b.duration)}
              </dd>
            </div>
            <div>
              <dt>Players</dt>
              <dd>{b.players}</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>Pickup · IST</dt>
              <dd>
                {new Date((record as Order).pickupAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}
              </dd>
            </div>
            {(record as Order).items.map((item, i) => (
              <div key={i}>
                <dt>
                  {item.quantity} × {item.name}
                </dt>
                <dd>{money(item.quantity * item.price)}</dd>
              </div>
            ))}
          </>
        )}
        <div className="confirmation-total">
          <dt>Total incl. tax</dt>
          <dd>{money(record.total)}</dd>
        </div>
      </dl>
      <EmailDeliveryStatus record={record} />
      <WhatsAppDeliveryStatus record={record} />
      <div className="confirmation-actions">
        <DownloadBill record={record} kind={kind} />
        <button className="btn secondary" onClick={print}>
          Print / view receipt
        </button>
        <button className="btn primary" onClick={close}>
          Done
        </button>
      </div>
      <p className="micro-copy">
        For changes or cancellation, contact the café team.
      </p>
    </Modal>
  );
}
