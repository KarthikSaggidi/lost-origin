import { env } from "cloudflare:workers";
import { secretEqual } from "./auth-crypto";
export function adminTransport(request: Request) {
  const key = env.AUTH_RELAY_SECRET;
  return Boolean(
    key &&
    key.length >= 32 &&
    secretEqual(request.headers.get("x-lo-admin-relay") || "", key) &&
    request.headers.get("x-lo-admin-origin") === env.ADMIN_ORIGIN,
  );
}
export function requestOrigin(request: Request) {
  return adminTransport(request)
    ? env.ADMIN_ORIGIN!
    : new URL(request.url).origin;
}
export function validWriteOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const destination = requestOrigin(request);
  return (
    origin === destination &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}
export function cookieName(request: Request, role: "admin" | "customer") {
  const secure = new URL(requestOrigin(request)).protocol === "https:";
  return `${secure ? "__Host-" : ""}lo_${role}`;
}
export function sessionCookie(
  request: Request,
  role: "admin" | "customer",
  token: string,
  maxAge: number,
) {
  const secure = new URL(requestOrigin(request)).protocol === "https:";
  return `${cookieName(request, role)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
