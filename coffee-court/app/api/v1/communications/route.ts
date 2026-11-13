import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import * as t from "../../../../db/schema";
import { applicationSession, csrfValid } from "../../../../lib/auth-session";
import { validWriteOrigin } from "../../../../lib/auth-transport";
import { getState } from "../../../../lib/store";
import {
  bridge,
  communicationSettings,
  queuedNotification,
  refreshNotifications,
  submitNotification,
} from "../../../../lib/communications";
import { billPDF, renderMessage } from "../../../../lib/bill";
export const dynamic = "force-dynamic";
const reply = (value: any, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  try {
    const url = new URL(request.url),
      session = await applicationSession(request);
    if (url.searchParams.get("action") === "receipt") {
      const kind = url.searchParams.get("kind"),
        id = url.searchParams.get("id"),
        key = url.searchParams.get("key");
      if (!["order", "booking"].includes(kind || "") || !id)
        return reply({ error: "Invalid receipt." }, 400);
      const db = getDb(),
        table = kind === "order" ? t.orders : t.bookings,
        record: any = (
          await db.select().from(table).where(eq(table.id, id))
        )[0];
      const own =
        session?.role === "customer" && session.user.phone === record?.phone;
      if (
        !record ||
        !(
          session?.role === "admin" ||
          own ||
          (key && key === record.requestKey)
        )
      )
        return reply({ error: "Receipt not found." }, 404);
      const business: any =
        (
          await db
            .select()
            .from(t.settings)
            .where(eq(t.settings.key, "business"))
        )[0]?.value || {};
      const pdf = await billPDF(kind as any, record, business);
      return new Response(pdf as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${record.id}.pdf"`,
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (session?.role !== "admin")
      return reply({ error: "Administrator access required." }, 401);
    let connection: any = {
      available: false,
      whatsapp: { state: "Disconnected" },
      smtpConfigured: false,
    };
    try {
      connection = { available: true, ...(await bridge("/status")) };
    } catch (error) {
      console.warn(
        "Communications connection failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      connection.error =
        error instanceof Error &&
        error.message.startsWith("Communications service is not configured")
          ? error.message
          : "The configured communications service is unavailable. Check its URL, private key and server status.";
    }
    return reply({
      connection,
      settings: await communicationSettings(),
      jobs: await refreshNotifications(),
    });
  } catch {
    return reply({ error: "Communications could not be loaded." }, 503);
  }
}
export async function POST(request: Request) {
  const session = await applicationSession(request);
  if (session?.role !== "admin")
    return reply({ error: "Administrator access required." }, 401);
  if (!validWriteOrigin(request) || !csrfValid(request, session))
    return reply({ error: "Request could not be verified." }, 403);
  try {
    const b: any = await request.json(),
      db = getDb();
    if (b.action === "settings") {
      const value = z
        .object({
          emailEnabled: z.boolean(),
          billMessage: z.string().trim().min(10).max(2000),
          orderUpdateMessage: z.string().trim().min(10).max(2000),
        })
        .parse(b.value);
      await db
        .insert(t.settings)
        .values({ key: "communications", value })
        .onConflictDoUpdate({ target: t.settings.key, set: { value } });
      return reply({ ok: true });
    }
    if (["connect", "disconnect"].includes(b.action))
      return reply(await bridge(`/whatsapp/${b.action}`, "POST", {}));
    if (b.action === "retry") {
      const id = z
        .string()
        .regex(/^n-[a-f0-9]{64}$/)
        .parse(b.id);
      return reply(await submitNotification(id, true));
    }
    if (b.action === "process") {
      const jobs = await db
        .select()
        .from(t.notificationJobs)
        .where(eq(t.notificationJobs.status, "Pending"))
        .limit(20);
      for (const row of jobs) await submitNotification(row.id);
      return reply({ processed: jobs.length });
    }
    if (b.action === "bill" || b.action === "update") {
      const body = z
        .object({
          id: z.string().max(60),
          kind: z.enum(["order", "booking"]),
          message: z.string().trim().min(1).max(2000),
          requestKey: z.string().uuid(),
        })
        .parse(b);
      const table = body.kind === "order" ? t.orders : t.bookings,
        record: any = (
          await db.select().from(table).where(eq(table.id, body.id))
        )[0];
      if (!record?.phone?.match(/^[6-9]\d{9}$/))
        return reply(
          { error: "Add a valid customer mobile number to share this bill." },
          400,
        );
      const business: any =
        (
          await db
            .select()
            .from(t.settings)
            .where(eq(t.settings.key, "business"))
        )[0]?.value || {};
      const job = queuedNotification(
        "whatsapp",
        record.id,
        record.phone,
        {
          message: renderMessage(body.message, record),
          ...(b.action === "bill" ? { kind: body.kind, record, business } : {}),
        },
        `whatsapp:${session.subject}:${body.requestKey}`,
      );
      await db.insert(t.notificationJobs).values(job).onConflictDoNothing();
      return reply({ id: job.id, ...(await submitNotification(job.id)) });
    }
    if (b.action === "campaign") {
      const body = z
        .object({
          requestKey: z.string().uuid(),
          message: z.string().trim().min(5).max(2000),
          phones: z
            .array(z.string().regex(/^[6-9]\d{9}$/))
            .min(1)
            .max(100),
          image: z
            .string()
            .regex(/^$|^\/api\/v1\/media\/[A-Za-z0-9._-]+$/)
            .default(""),
        })
        .parse(b);
      const data = await getState(),
        eligible = new Map<string, any>();
      for (const item of [
        ...data.orders,
        ...data.bookings,
        ...(data.registrations || []),
      ] as any[])
        if (item.marketingOptIn && /^[6-9]\d{9}$/.test(item.phone))
          eligible.set(item.phone, item);
      const phones = [...new Set(body.phones)];
      if (phones.some((phone) => !eligible.has(phone)))
        return reply(
          { error: "Select contacts who opted in to WhatsApp campaigns." },
          400,
        );
      const jobs = phones.map((phone) => {
        const contact = eligible.get(phone);
        return queuedNotification(
          "whatsapp",
          "Campaign",
          phone,
          {
            message: renderMessage(body.message, {
              ...contact,
              customer: contact.customer || contact.name,
            }),
            image: body.image,
          },
          `campaign:${session.subject}:${body.requestKey}:${phone}`,
        );
      });
      await db.batch(
        jobs.map((job) =>
          db.insert(t.notificationJobs).values(job).onConflictDoNothing(),
        ) as any,
      );
      // Gateway accepts durable jobs quickly; delivery is paced by its queue.
      const results = [];
      for (const job of jobs) results.push(await submitNotification(job.id));
      return reply({
        count: jobs.length,
        queued: results.filter((r) => r.status !== "Sent").length,
      });
    }
    return reply({ error: "Unknown action." }, 400);
  } catch (error) {
    return reply(
      {
        error:
          error instanceof z.ZodError
            ? error.errors[0].message
            : error instanceof Error
              ? error.message
              : "The operation could not be completed.",
      },
      error instanceof z.ZodError ? 400 : 503,
    );
  }
}
