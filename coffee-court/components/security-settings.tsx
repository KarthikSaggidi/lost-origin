"use client";
import { useState } from "react";
import { Field } from "./shared";
import { authFetch, setCsrfToken } from "../lib/client-auth";
export default function SecuritySettings({
  otpAvailable,
}: {
  otpAvailable?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <div className="security-settings">
      <h2>Account security</h2>
      <p>
        Change the administrator password. Other admin sessions will be signed
        out.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget,
            values = new FormData(form);
          setError("");
          setSaved(false);
          if (values.get("password") !== values.get("confirm")) {
            setError("The new passwords do not match.");
            return;
          }
          setBusy(true);
          try {
            const response = await authFetch("/api/auth/admin/password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                currentPassword: values.get("current"),
                password: values.get("password"),
              }),
            });
            const value = (await response.json()) as any;
            if (!response.ok)
              throw new Error(value.error || "Password could not be updated.");
            setCsrfToken(value.csrfToken);
            form.reset();
            setSaved(true);
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Current password">
          <input
            name="current"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </Field>
        <Field label="New password">
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </Field>
        <Field label="Confirm new password">
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </Field>
        <p className="note">
          Use at least 12 characters. A longer, unique passphrase is a good
          choice.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="security-success" role="status">
            Password updated. Other admin sessions have been revoked.
          </p>
        )}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
      <div className="sms-provider-state">
        <h3>Customer SMS login</h3>
        <p>
          {otpAvailable
            ? "SMS verification is configured."
            : "SMS delivery is not configured yet. Customer login will activate after provider credentials are connected."}
        </p>
      </div>
    </div>
  );
}
