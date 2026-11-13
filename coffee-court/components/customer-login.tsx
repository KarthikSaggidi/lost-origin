"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck, Smartphone } from "lucide-react";
import { Field, Modal } from "./shared";
import { authFetch, setCsrfToken } from "../lib/client-auth";
export default function CustomerLogin({
  close,
  done,
}: {
  close: () => void;
  done: () => void;
}) {
  const [phone, setPhone] = useState(""),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [challenge, setChallenge] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [wait, setWait] = useState(0);
  useEffect(() => {
    if (!wait) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);
  const send = async () => {
    const response = await authFetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const value = (await response.json()) as any;
    if (!response.ok)
      throw new Error(value.error || "The code could not be sent.");
    setChallenge(value.challenge);
    setCode("");
    setWait(value.resendAfter);
  };
  return (
    <Modal
      title={challenge ? "Check your phone." : "Your good-coffee account."}
      close={close}
      className="customer-login-dialog"
    >
      <div className="customer-login-intro">
        <span>
          <Smartphone size={25} strokeWidth={1.4} />
        </span>
        <p>
          {challenge
            ? `Enter the six-digit code sent to +91 ${phone}.`
            : "Sign in with your mobile number to see your orders and court bookings."}
        </p>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setBusy(true);
          try {
            if (!challenge) await send();
            else {
              const response = await authFetch("/api/auth/otp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ challenge, code }),
              });
              const value = (await response.json()) as any;
              if (!response.ok)
                throw new Error(value.error || "Verification failed.");
              setCsrfToken(value.csrfToken);
              done();
            }
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {!challenge ? (
          <>
            <Field label="Your name">
              <input
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
            </Field>
            <Field label="Mobile number">
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                required
                pattern="[6-9][0-9]{9}"
                minLength={10}
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                disabled={busy}
              />
            </Field>
          </>
        ) : (
          <Field label="Verification code">
            <input
              className="otp-code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={busy}
            />
          </Field>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary full" type="submit" disabled={busy}>
          {busy
            ? "Please wait…"
            : challenge
              ? "Verify & sign in"
              : "Send verification code"}
          <ArrowRight size={17} />
        </button>
        {challenge && (
          <div className="otp-resend-actions">
            <button
              type="button"
              className="text-btn"
              disabled={busy || wait > 0}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await send();
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {wait ? `Resend in ${wait}s` : "Resend code"}
            </button>
            <button
              type="button"
              className="text-btn"
              disabled={busy}
              onClick={() => {
                setChallenge("");
                setError("");
              }}
            >
              Change number
            </button>
          </div>
        )}
      </form>
      <p className="customer-session-note">
        <ShieldCheck size={16} />
        Stay signed in on this device. Sign out anytime from your account.
      </p>
    </Modal>
  );
}
