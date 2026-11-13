"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Shield,
} from "lucide-react";
import CoffeeApp from "./coffee-app";
import { authFetch, setCsrfToken } from "../lib/client-auth";
export default function AdminLogin() {
  const [ready, setReady] = useState(false),
    [authenticated, setAuthenticated] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [connection, setConnection] = useState<
    "checking" | "https" | "local" | "http"
  >("checking");
  useEffect(() => {
    setConnection(
      location.protocol === "https:"
        ? "https"
        : ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)
          ? "local"
          : "http",
    );
    const check = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const value = (await response.json()) as any;
        setCsrfToken(value.csrfToken);
        setAuthenticated(value.authenticated && value.role === "admin");
      } catch {
        setError("Unable to connect. Check your connection and try again.");
      } finally {
        setReady(true);
      }
    };
    void check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, []);
  if (ready && authenticated) return <CoffeeApp surface="admin" />;
  return (
    <main className="admin-login-page">
      <div className="admin-login-scene" aria-hidden="true">
        <span className="admin-login-coffee" />
        <span className="admin-login-leaves" />
      </div>
      <div className="admin-login-shell">
        <div className="admin-login-brand">
          <img
            src="/lost-origin-logo.svg"
            alt="Lost Origin Coffee House"
            width={500}
            height={150}
            fetchPriority="high"
          />
        </div>
        <section
          className="admin-login-card"
          aria-labelledby="admin-login-title"
        >
          <h1 id="admin-login-title">Admin Login</h1>
          <p className="admin-login-subtitle">
            Access your coffee house dashboard.
          </p>
          <div
            className={`admin-connection admin-connection-${connection}`}
            aria-live="polite"
          >
            <span className="admin-security-icon" aria-hidden="true">
              <Shield size={31} fill="currentColor" strokeWidth={0} />
              <LockKeyhole size={13} strokeWidth={2.5} />
            </span>
            <div>
              <strong>
                {connection === "https"
                  ? "Protected by HTTPS (SSL)"
                  : connection === "local"
                    ? "Local development preview"
                    : connection === "http"
                      ? "Connection is not encrypted"
                      : "Checking your connection…"}
              </strong>
              <span>
                {connection === "https"
                  ? "A secure, encrypted connection to keep your data private."
                  : connection === "local"
                    ? "HTTPS protects the hosted login."
                    : connection === "http"
                      ? "Use the HTTPS address to sign in securely."
                      : "Verifying the connection for your sign-in."}
              </span>
            </div>
          </div>
          {!ready ? (
            <p className="admin-login-loading" role="status">
              Checking your session…
            </p>
          ) : (
            <form
              aria-label="Administrator login"
              aria-busy={busy}
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const response = await authFetch("/api/auth/admin/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                  });
                  const value = (await response.json()) as any;
                  if (!response.ok)
                    throw new Error(
                      value.error || "Sign-in could not be completed.",
                    );
                  setCsrfToken(value.csrfToken);
                  setPassword("");
                  window.location.replace("/admin");
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label htmlFor="admin-email" className="sr-only">
                Email address
              </label>
              <div className="admin-login-field">
                <Mail size={18} strokeWidth={1.7} aria-hidden="true" />
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={160}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  disabled={busy}
                />
              </div>
              <label htmlFor="admin-password" className="sr-only">
                Password
              </label>
              <div className="admin-login-field admin-password-input">
                <LockKeyhole size={18} strokeWidth={1.7} aria-hidden="true" />
                <input
                  id="admin-password"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  disabled={busy}
                />
                <button
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  aria-pressed={visible}
                  disabled={busy}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="admin-signin-button"
                type="submit"
                disabled={busy}
              >
                <span>{busy ? "Signing in…" : "Sign in"}</span>
                <ArrowRight size={18} strokeWidth={1.6} aria-hidden="true" />
              </button>
            </form>
          )}
          <footer className="admin-login-credit">
            <a
              href="https://www.dropxcorp.in"
              target="_blank"
              rel="noopener noreferrer"
            >
              Designed and Developed by <strong>DropXcorp Pvt Ltd</strong>
            </a>
          </footer>
        </section>
      </div>
    </main>
  );
}
