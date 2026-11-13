import { env } from "cloudflare:workers";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  authAdmins,
  authCustomers,
  authSessions,
  authLimits,
} from "../db/schema";
import { randomToken, tokenHash, rateKey, secretEqual } from "./auth-crypto";
import { adminTransport, cookieName, sessionCookie } from "./auth-transport";
export type ApplicationSession = {
  id: string;
  role: "admin" | "customer";
  subject: string;
  csrf: string;
  createdAt: number;
  lastSeen: number;
  expiresAt: number;
  version: string;
  user: { id: string; name: string; email?: string; phone?: string };
};
export async function adminAccount() {
  if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_LOGIN_EMAIL) return null;
  const db = getDb();
  const existing = (
    await db
      .select()
      .from(authAdmins)
      .where(eq(authAdmins.email, env.ADMIN_LOGIN_EMAIL.toLowerCase()))
  )[0];
  if (existing) return existing;
  await db
    .insert(authAdmins)
    .values({
      email: env.ADMIN_LOGIN_EMAIL.toLowerCase(),
      passwordHash: env.ADMIN_PASSWORD_HASH,
      version: tokenHash(env.ADMIN_PASSWORD_HASH),
      updatedAt: Date.now(),
    })
    .onConflictDoNothing();
  return (
    (
      await db
        .select()
        .from(authAdmins)
        .where(eq(authAdmins.email, env.ADMIN_LOGIN_EMAIL.toLowerCase()))
    )[0] || null
  );
}
export async function applicationSession(
  request: Request,
): Promise<ApplicationSession | null> {
  const role = adminTransport(request) ? "admin" : "customer";
  const name = cookieName(request, role);
  const matches = (request.headers.get("cookie") || "")
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${name}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(name.length + 1);
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) return null;
  const db = getDb(),
    session = (
      await db
        .select()
        .from(authSessions)
        .where(eq(authSessions.id, tokenHash(token)))
    )[0];
  if (!session || session.role !== role || session.expiresAt <= Date.now())
    return null;
  if (role === "admin") {
    if (Date.now() - session.lastSeen > 3600000) return null;
    const account = await adminAccount();
    if (
      !account ||
      account.email !== session.subject ||
      !secretEqual(session.version, account.version)
    )
      return null;
    return {
      ...session,
      role,
      user: { id: account.email, email: account.email, name: "Administrator" },
    };
  }
  const user = (
    await db
      .select()
      .from(authCustomers)
      .where(eq(authCustomers.id, session.subject))
  )[0];
  return user
    ? {
        ...session,
        role,
        user: { id: user.id, name: user.name, phone: user.phone },
      }
    : null;
}
export async function createSession(
  request: Request,
  role: "admin" | "customer",
  subject: string,
  version = "",
) {
  const token = randomToken(),
    now = Date.now(),
    maxAge = role === "admin" ? 8 * 3600 : 365 * 86400;
  const record = {
    id: tokenHash(token),
    role,
    subject,
    version,
    csrf: randomToken(),
    createdAt: now,
    lastSeen: now,
    expiresAt: now + maxAge * 1000,
  };
  await getDb().insert(authSessions).values(record);
  return { record, cookie: sessionCookie(request, role, token, maxAge) };
}
export async function touchSession(session: ApplicationSession) {
  if (Date.now() - session.lastSeen < 300000) return;
  await getDb()
    .update(authSessions)
    .set({ lastSeen: Date.now() })
    .where(eq(authSessions.id, session.id));
}
export function csrfValid(request: Request, session: ApplicationSession) {
  return secretEqual(request.headers.get("x-csrf-token") || "", session.csrf);
}
export async function renewCustomerSession(
  request: Request,
  session: ApplicationSession | null,
) {
  if (
    !session ||
    session.role !== "customer" ||
    session.expiresAt - Date.now() > 350 * 86400000
  )
    return undefined;
  const name = cookieName(request, "customer");
  const token = (request.headers.get("cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!token) return undefined;
  await getDb()
    .update(authSessions)
    .set({ expiresAt: Date.now() + 365 * 86400000, lastSeen: Date.now() })
    .where(eq(authSessions.id, session.id));
  return sessionCookie(request, "customer", token, 365 * 86400);
}
export async function enforceRate(
  request: Request,
  category: string,
  identity: string,
  limit: number,
  windowMs: number,
) {
  if (!env.AUTH_RATE_SECRET)
    throw new Error("Authentication is not configured.");
  const key = `${category}:${rateKey(env.AUTH_RATE_SECRET, identity)}`,
    now = Date.now(),
    cutoff = now - windowMs;
  const row = await getDb()
    .insert(authLimits)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: authLimits.key,
      set: {
        count: sql`CASE WHEN ${authLimits.windowStart} < ${cutoff} THEN 1 ELSE ${authLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${authLimits.windowStart} < ${cutoff} THEN ${now} ELSE ${authLimits.windowStart} END`,
      },
    })
    .returning();
  return row[0].count <= limit;
}
export const clientAddress = (request: Request) =>
  adminTransport(request)
    ? request.headers.get("x-lo-client-ip") || "local"
    : request.headers.get("cf-connecting-ip") || "local";
