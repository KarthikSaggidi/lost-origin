import { env } from "cloudflare:workers";
import { createHmac } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { notificationJobs, settings } from "../db/schema";
import { tokenHash } from "./auth-crypto";
import {
  billPDF,
  billLines,
  notificationDefaults,
  renderMessage,
} from "./bill";
export const communicationId = (key: string) => `n-${tokenHash(key)}`;
export async function communicationSettings() {
  const row = (
    await getDb()
      .select()
      .from(settings)
      .where(eq(settings.key, "communications"))
  )[0];
  return { ...notificationDefaults, ...(row?.value || {}) };
}
export function queuedNotification(
  channel: string,
  reference: string,
  recipient: string,
  payload: any,
  key: string,
) {
  const now = new Date().toISOString();
  return {
    id: communicationId(key),
    channel,
    reference,
    recipient,
    payload,
    status: "Pending",
    detail: "",
    createdAt: now,
    updatedAt: now,
  };
}
export async function bridge(path: string, method = "GET", body?: any) {
  const origin = env.COMMUNICATIONS_URL,
    secret = env.COMMUNICATIONS_SECRET;
  if (!origin || !secret || secret.length < 32)
    throw new Error("Communications service is not configured.");
  const target = new URL(origin);
  if (
    target.protocol !== "https:" &&
    !(target.protocol === "http:" && target.hostname === "127.0.0.1")
  )
    throw new Error("A secure communications service URL is required.");
  const raw = body ? JSON.stringify(body) : "",
    time = String(Date.now());
  const signature = createHmac("sha256", secret)
    .update([method, path, time, raw].join("\n"))
    .digest("hex");
  const r = await fetch(new URL(path, origin), {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-LO-Timestamp": time,
      "X-LO-Signature": signature,
    },
    ...(raw ? { body: raw } : {}),
    signal: AbortSignal.timeout(8000),
    redirect: "manual",
  });
  if (!r.ok)
    throw new Error(
      `The communications service returned ${r.status}. Your transaction is saved.`,
    );
  return (await r.json()) as any;
}
export async function submitNotification(id: string, retry = false) {
  const db = getDb(),
    row = (
      await db
        .select()
        .from(notificationJobs)
        .where(eq(notificationJobs.id, id))
    )[0];
  if (!row) return { status: "Not found" };
  if (["Sent", "Sending", "Unknown"].includes(row.status))
    return { status: row.status, detail: row.detail };
  try {
    const p: any = row.payload,
      config = await communicationSettings();
    let message = p.message;
    if (!message) message = renderMessage(config.billMessage, p.record);
    const payload: any = {
      id: row.id,
      channel: row.channel,
      to: row.recipient,
      subject: p.subject || `Lost Origin ${row.reference}`,
      message,
      retry,
    };
    if (p.record) {
      const pdf = await billPDF(p.kind, p.record, p.business);
      payload.attachment = {
        filename: `${row.reference}.pdf`,
        type: "application/pdf",
        content: Buffer.from(pdf).toString("base64"),
      };
      if (row.channel === "email")
        payload.message +=
          "\n\n" + billLines(p.kind, p.record, p.business).join("\n");
    }
    if (p.image?.startsWith("/api/v1/media/") && env.BUCKET) {
      const image = await env.BUCKET.get(`hero/${p.image.split("/").pop()}`);
      if (image && image.size <= 5 * 1024 * 1024)
        payload.attachment = {
          filename: p.image.split("/").pop(),
          type: image.httpMetadata?.contentType,
          content: Buffer.from(await image.arrayBuffer()).toString("base64"),
        };
    }
    const result = await bridge("/jobs", "POST", payload);
    await db
      .update(notificationJobs)
      .set({
        status: result.status,
        detail: result.detail || "",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(notificationJobs.id, id));
    return result;
  } catch {
    const detail = env.COMMUNICATIONS_URL
      ? "Delivery service unavailable. The receipt is saved for retry."
      : "Delivery service is not configured yet. The receipt is saved.";
    await db
      .update(notificationJobs)
      .set({ status: "Pending", detail, updatedAt: new Date().toISOString() })
      .where(eq(notificationJobs.id, id));
    return { status: "Pending", detail };
  }
}
export async function refreshNotifications() {
  const db = getDb(),
    rows = await db
      .select()
      .from(notificationJobs)
      .orderBy(sql`${notificationJobs.createdAt} DESC`)
      .limit(100);
  if (env.COMMUNICATIONS_URL)
    for (const row of rows
      .filter(
        (r) => !["Sent", "Failed", "Unknown", "Pending"].includes(r.status),
      )
      .slice(0, 20)) {
      try {
        const next = await bridge(`/jobs/${row.id}`);
        row.status = next.status;
        row.detail = next.detail || "";
        await db
          .update(notificationJobs)
          .set({ status: row.status, detail: row.detail })
          .where(eq(notificationJobs.id, row.id));
      } catch {}
    }
  return rows.map(({ payload, ...row }) => row);
}
