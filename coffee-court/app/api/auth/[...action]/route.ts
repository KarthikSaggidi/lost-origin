import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import {
  authAdmins,
  authCustomers,
  authSessions,
  authChallenges,
  operationGuards,
} from "../../../../db/schema";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  adminAccount,
  applicationSession,
  createSession,
  csrfValid,
  enforceRate,
  clientAddress,
  touchSession,
  renewCustomerSession,
} from "../../../../lib/auth-session";
import {
  adminTransport,
  validWriteOrigin,
  sessionCookie,
} from "../../../../lib/auth-transport";
import {
  passwordHash,
  randomToken,
  secretEqual,
  tokenHash,
  verifyPassword,
} from "../../../../lib/auth-crypto";
import {
  otpConfigured,
  otpProvider,
  terminalOtpConfigured,
} from "../../../../lib/otp-provider";
export const dynamic = "force-dynamic";
const reply = (body: any, status = 200, cookie?: string) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });
function isLoopbackRequest(request: Request) {
  const url = new URL(request.url);
  return (
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  );
}
export async function GET(
  request: Request,
  context: { params: Promise<{ action: string[] }> },
) {
  if ((await context.params).action.join("/") !== "session")
    return reply({ error: "Not found." }, 404);
  const session = await applicationSession(request);
  if (session) await touchSession(session);
  const cookie = await renewCustomerSession(request, session);
  return reply(
    {
      authenticated: Boolean(session),
      role: session?.role || (adminTransport(request) ? "admin" : "customer"),
      user: session?.user || null,
      csrfToken: session?.csrf || "",
      otpAvailable:
        otpConfigured(env) ||
        (terminalOtpConfigured(env) && isLoopbackRequest(request)),
    },
    200,
    cookie,
  );
}
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string[] }> },
) {
  if (!validWriteOrigin(request))
    return reply({ error: "This request could not be verified." }, 403);
  const action = (await context.params).action.join("/");
  try {
    const body = (await request.json()) as any,
      db = getDb(),
      now = Date.now();
    if (action === "admin/login") {
      if (!adminTransport(request))
        return reply({ error: "Use the separate admin login." }, 403);
      const b = z
        .object({
          email: z.string().trim().max(160),
          password: z.string().min(1).max(128),
        })
        .parse(body);
      if (
        !(await enforceRate(
          request,
          "admin-login-ip",
          clientAddress(request),
          10,
          900000,
        )) ||
        !(await enforceRate(
          request,
          "admin-login-account",
          "administrator",
          20,
          900000,
        ))
      )
        return reply(
          {
            error: "Too many sign-in attempts. Please try again in 15 minutes.",
          },
          429,
        );
      const account = await adminAccount();
      if (!account)
        return reply(
          { error: "Admin login is not configured. Please contact the owner." },
          503,
        );
      const validPassword = verifyPassword(b.password, account.passwordHash);
      if (!validPassword || b.email.toLowerCase() !== account.email)
        return reply({ error: "The email or password is incorrect." }, 401);
      const session = await createSession(
        request,
        "admin",
        account.email,
        account.version,
      );
      return reply(
        {
          authenticated: true,
          role: "admin",
          user: { email: account.email, name: "Administrator" },
          csrfToken: session.record.csrf,
        },
        200,
        session.cookie,
      );
    }
    if (action === "otp/request") {
      if (adminTransport(request))
        return reply({ error: "Use the customer website to sign in." }, 403);
      const b = z
        .object({
          phone: z
            .string()
            .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
          name: z.string().trim().min(2).max(80),
        })
        .parse(body);
      const localTerminal =
        terminalOtpConfigured(env) && isLoopbackRequest(request);
      if (!otpConfigured(env) && !localTerminal)
        return reply(
          {
            error:
              "SMS login is not configured yet. Please contact the café team.",
          },
          503,
        );
      if (
        !(await enforceRate(
          request,
          "otp-ip",
          clientAddress(request),
          10,
          3600000,
        )) ||
        !(await enforceRate(request, "otp-phone", b.phone, 5, 3600000)) ||
        !(await enforceRate(request, "otp-cooldown", b.phone, 1, 60000))
      )
        return reply(
          { error: "Please wait before requesting another code." },
          429,
        );
      const id = randomToken();
      let providerId: string;
      if (localTerminal) {
        const code = String(
          crypto.getRandomValues(new Uint32Array(1))[0] % 1000000,
        ).padStart(6, "0");
        providerId = `local:${tokenHash(`${tokenHash(id)}:${code}`)}`;
        console.info(
          `[Lost Origin local sign-in] Mobile ending ${b.phone.slice(-4)} · OTP ${code} · expires in 5 minutes`,
        );
      } else {
        const verification = await otpProvider(env, "send", b.phone);
        providerId = verification.sid!;
      }
      await db.insert(authChallenges).values({
        id: tokenHash(id),
        phone: b.phone,
        name: b.name,
        providerId,
        expiresAt: now + 300000,
      });
      return reply({
        challenge: id,
        expiresIn: 300,
        resendAfter: 60,
        delivery: localTerminal ? "terminal" : "sms",
      });
    }
    if (action === "otp/verify") {
      if (adminTransport(request))
        return reply({ error: "Use the customer website to sign in." }, 403);
      const b = z
        .object({
          challenge: z.string().regex(/^[a-zA-Z0-9_-]{43}$/),
          code: z
            .string()
            .regex(/^\d{6}$/, "Enter the six-digit verification code."),
        })
        .parse(body);
      const localTerminalAvailable =
        terminalOtpConfigured(env) && isLoopbackRequest(request);
      if (!otpConfigured(env) && !localTerminalAvailable)
        return reply({ error: "SMS login is not configured yet." }, 503);
      if (
        !(await enforceRate(
          request,
          "otp-verify-ip",
          clientAddress(request),
          30,
          900000,
        ))
      )
        return reply(
          { error: "Too many attempts. Please try again later." },
          429,
        );
      const rows = await db
        .update(authChallenges)
        .set({ attempts: sql`${authChallenges.attempts} + 1` })
        .where(
          and(
            eq(authChallenges.id, tokenHash(b.challenge)),
            eq(authChallenges.consumed, 0),
            gt(authChallenges.expiresAt, now),
            lt(authChallenges.attempts, 5),
          ),
        )
        .returning();
      const challenge = rows[0];
      if (!challenge)
        return reply(
          {
            error:
              "This code has expired or reached its attempt limit. Request a new code.",
          },
          400,
        );
      let checked: { status?: string };
      if (challenge.providerId.startsWith("local:")) {
        const expected = challenge.providerId.slice("local:".length);
        const provided = tokenHash(`${challenge.id}:${b.code}`);
        checked = {
          status:
            localTerminalAvailable && secretEqual(expected, provided)
              ? "approved"
              : "denied",
        };
      } else {
        checked = await otpProvider(env, "check", challenge.phone, b.code);
      }
      if (checked.status !== "approved")
        return reply({ error: "The code is invalid or has expired." }, 400);
      const consumed = await db
        .update(authChallenges)
        .set({ consumed: 1 })
        .where(
          and(
            eq(authChallenges.id, challenge.id),
            eq(authChallenges.consumed, 0),
          ),
        )
        .returning();
      if (!consumed.length)
        return reply(
          { error: "This code has already been used. Request a new code." },
          409,
        );
      await db
        .insert(authCustomers)
        .values({
          id: crypto.randomUUID(),
          phone: challenge.phone,
          name: challenge.name,
          createdAt: now,
        })
        .onConflictDoNothing();
      const user = (
        await db
          .select()
          .from(authCustomers)
          .where(eq(authCustomers.phone, challenge.phone))
      )[0];
      const session = await createSession(request, "customer", user.id);
      return reply(
        {
          authenticated: true,
          role: "customer",
          user: { id: user.id, phone: user.phone, name: user.name },
          csrfToken: session.record.csrf,
        },
        200,
        session.cookie,
      );
    }
    const session = await applicationSession(request);
    if (action === "logout" && !session)
      return reply(
        { authenticated: false },
        200,
        sessionCookie(
          request,
          adminTransport(request) ? "admin" : "customer",
          "",
          0,
        ),
      );
    if (!session || !csrfValid(request, session))
      return reply({ error: "Please sign in again." }, 401);
    if (action === "logout") {
      await db.delete(authSessions).where(eq(authSessions.id, session.id));
      return reply(
        { authenticated: false },
        200,
        sessionCookie(request, session.role, "", 0),
      );
    }
    if (action === "admin/password" && session.role === "admin") {
      const b = z
        .object({
          currentPassword: z.string().min(1).max(128),
          password: z.string().min(12, "Use at least 12 characters.").max(128),
        })
        .parse(body);
      if (
        !(await enforceRate(
          request,
          "password-change",
          session.subject,
          5,
          900000,
        ))
      )
        return reply(
          { error: "Too many attempts. Please try again later." },
          429,
        );
      const account = await adminAccount();
      if (!account || !verifyPassword(b.currentPassword, account.passwordHash))
        return reply({ error: "The current password is incorrect." }, 400);
      if (b.currentPassword === b.password)
        return reply({ error: "Choose a different password." }, 400);
      const hash = passwordHash(b.password),
        version = randomToken(),
        guard = crypto.randomUUID();
      await db.batch([
        db.insert(operationGuards).values({
          id: guard,
          verified: sql`CASE WHEN (SELECT version FROM auth_admins WHERE email = ${account.email}) = ${account.version} THEN 1 ELSE 0 END`,
        }),
        db
          .update(authAdmins)
          .set({ passwordHash: hash, version, updatedAt: now })
          .where(eq(authAdmins.email, account.email)),
        db
          .delete(authSessions)
          .where(
            and(
              eq(authSessions.role, "admin"),
              eq(authSessions.subject, account.email),
            ),
          ),
        db.delete(operationGuards).where(eq(operationGuards.id, guard)),
      ]);
      const renewed = await createSession(
        request,
        "admin",
        account.email,
        version,
      );
      return reply(
        { updated: true, csrfToken: renewed.record.csrf },
        200,
        renewed.cookie,
      );
    }
    return reply({ error: "Not found." }, 404);
  } catch (error: any) {
    if (error instanceof z.ZodError)
      return reply({ error: error.errors[0].message }, 400);
    return reply(
      { error: "Sign-in could not be completed. Please try again." },
      503,
    );
  }
}
