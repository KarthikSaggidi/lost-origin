import http from "node:http";
import { mkdirSync, chmodSync, existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import wwebjs from "whatsapp-web.js";
import {
  authorised,
  smtpConfigured,
  mailOptions,
  validateJob,
} from "./core.mjs";
try {
  process.loadEnvFile();
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
if ((process.env.COMMUNICATIONS_SECRET || "").length < 32)
  throw new Error("Configure COMMUNICATIONS_SECRET before starting.");
for (const path of [".data", ".auth"]) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
}
const db = new DatabaseSync(".data/delivery.sqlite");
chmodSync(".data/delivery.sqlite", 0o600);
db.exec(
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY,payload TEXT NOT NULL,status TEXT NOT NULL,detail TEXT NOT NULL DEFAULT '',updated_at INTEGER NOT NULL)",
);
db.prepare(
  "UPDATE jobs SET status='Unknown',detail='Service restarted during delivery. Review the provider before sending again.' WHERE status='Sending'",
).run();
let client,
  connecting,
  qr = "",
  qrExpiresAt = 0,
  waState = "Disconnected",
  waPhone = "",
  waError = "",
  working = false;
const smtpReady = smtpConfigured(process.env),
  transport = smtpReady
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        requireTLS: process.env.SMTP_SECURE !== "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        disableFileAccess: true,
        disableUrlAccess: true,
      })
    : null;
const status = () => ({
  smtpConfigured: smtpReady,
  whatsapp: {
    state: waState,
    phone: waPhone,
    error: waError,
    qr: Date.now() < qrExpiresAt ? qr : "",
    qrExpiresAt,
  },
});
const update = (id, state, detail = "") =>
  db
    .prepare("UPDATE jobs SET status=?,detail=?,updated_at=? WHERE id=?")
    .run(state, detail, Date.now(), id);
async function connect() {
  if (
    connecting ||
    ["Connected", "Waiting for scan", "Connecting"].includes(waState)
  )
    return;
  waError = "";
  waState = "Connecting";
  if (client) {
    try {
      await client.destroy();
    } catch {}
  }
  const { Client, LocalAuth } = wwebjs;
  const instance = new Client({
    authStrategy: new LocalAuth({ dataPath: ".auth" }),
    puppeteer: {
      headless: true,
      ...(process.env.CHROME_EXECUTABLE_PATH
        ? { executablePath: process.env.CHROME_EXECUTABLE_PATH }
        : {}),
      args: ["--disable-dev-shm-usage"],
    },
    qrMaxRetries: 6,
    authTimeoutMs: 60000,
  });
  client = instance;
  const current = () => client === instance;
  client.on("qr", async (value) => {
    const nextQr = await QRCode.toDataURL(value, { margin: 2, width: 300 });
    if (!current()) return;
    qr = nextQr;
    qrExpiresAt = Date.now() + 45000;
    waState = "Waiting for scan";
  });
  client.on("authenticated", () => {
    if (!current()) return;
    qr = "";
    waState = "Connecting";
  });
  client.on("ready", () => {
    if (!current()) return;
    qr = "";
    waState = "Connected";
    waPhone = client.info?.wid?.user || "";
    void processQueue();
  });
  client.on("auth_failure", () => {
    if (!current()) return;
    qr = "";
    waState = "Disconnected";
    waError = "WhatsApp authentication failed. Connect again.";
  });
  client.on("disconnected", () => {
    if (!current()) return;
    qr = "";
    waPhone = "";
    waState = "Disconnected";
  });
  connecting = client
    .initialize()
    .catch(() => {
      if (!current()) return;
      qr = "";
      waState = "Disconnected";
      waError =
        "Could not start WhatsApp Web. Check the installed Chrome and service network, then connect again.";
    })
    .finally(() => {
      if (current()) connecting = null;
    });
}
async function processQueue() {
  if (working) return;
  working = true;
  try {
    const rows = db
      .prepare(
        "SELECT * FROM jobs WHERE status IN ('Queued','Waiting for SMTP','Waiting for WhatsApp') ORDER BY updated_at LIMIT 10",
      )
      .all();
    for (const row of rows) {
      const job = JSON.parse(row.payload);
      if (job.channel === "email" && !smtpReady) {
        update(
          row.id,
          "Waiting for SMTP",
          "Configure SMTP delivery in the Node service.",
        );
        continue;
      }
      if (job.channel === "whatsapp" && waState !== "Connected") {
        update(
          row.id,
          "Waiting for WhatsApp",
          "Scan the WhatsApp QR code to connect.",
        );
        continue;
      }
      update(row.id, "Sending");
      try {
        let providerId = "";
        if (job.channel === "email") {
          const sent = await transport.sendMail(
            mailOptions(job, process.env.SMTP_FROM),
          );
          if (!sent.accepted?.length) {
            update(
              row.id,
              "Failed",
              "The mail server rejected this recipient.",
            );
            continue;
          }
          providerId = sent.messageId || "";
        } else {
          const number = await client.getNumberId("91" + job.to);
          if (!number) {
            update(
              row.id,
              "Failed",
              "This phone is not registered on WhatsApp.",
            );
            continue;
          }
          const body = job.attachment
            ? new wwebjs.MessageMedia(
                job.attachment.type,
                job.attachment.content,
                job.attachment.filename,
              )
            : job.message;
          const sent = await client.sendMessage(number._serialized, body, {
            ...(job.attachment
              ? {
                  caption: job.message,
                  sendMediaAsDocument:
                    job.attachment.type === "application/pdf",
                }
              : {}),
            sendSeen: false,
          });
          providerId = sent?.id?._serialized || "";
        }
        update(
          row.id,
          "Sent",
          providerId ? "Provider accepted the message." : "Message sent.",
        );
      } catch (error) {
        const definite =
          job.channel === "email" && Number(error.responseCode) >= 500;
        update(
          row.id,
          definite ? "Failed" : "Unknown",
          definite
            ? "The mail server rejected the message."
            : "Delivery could not be confirmed. Check the provider before resending.",
        );
      }
      if (job.channel === "whatsapp")
        await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  } finally {
    working = false;
  }
}
const server = http.createServer(async (req, res) => {
  const reply = (code, data) => {
    res.writeHead(code, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(data));
  };
  try {
    if (req.headers.origin) {
      reply(403, { error: "Server requests only." });
      return;
    }
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 8500000) {
        reply(413, { error: "Message too large." });
        return;
      }
    }
    const path = req.url || "/";
    if (
      !authorised(
        process.env.COMMUNICATIONS_SECRET,
        req.method,
        path,
        req.headers,
        raw,
      )
    ) {
      reply(401, { error: "Unauthorised." });
      return;
    }
    if (req.method === "GET" && path === "/status") {
      reply(200, status());
      return;
    }
    if (req.method === "POST" && path === "/whatsapp/connect") {
      void connect();
      reply(202, status());
      return;
    }
    if (req.method === "POST" && path === "/whatsapp/disconnect") {
      const previous = client;
      client = null;
      connecting = null;
      if (previous) {
        try {
          await previous.logout();
        } catch {}
        try {
          await previous.destroy();
        } catch {}
      }
      client = null;
      qr = "";
      waState = "Disconnected";
      waPhone = "";
      reply(200, status());
      return;
    }
    const match = /^\/jobs\/(n-[a-f0-9]{64})$/.exec(path);
    if (req.method === "GET" && match) {
      const row = db
        .prepare("SELECT status,detail FROM jobs WHERE id=?")
        .get(match[1]);
      reply(row ? 200 : 404, row || { error: "Not found." });
      return;
    }
    if (req.method === "POST" && path === "/jobs") {
      const job = validateJob(JSON.parse(raw)),
        existing = db
          .prepare("SELECT status,detail FROM jobs WHERE id=?")
          .get(job.id);
      if (existing) {
        if (job.retry && existing.status === "Failed") {
          update(job.id, "Queued");
          void processQueue();
          reply(202, { status: "Queued", detail: "" });
        } else reply(200, existing);
        return;
      }
      const state =
        job.channel === "email" && !smtpReady
          ? "Waiting for SMTP"
          : job.channel === "whatsapp" && waState !== "Connected"
            ? "Waiting for WhatsApp"
            : "Queued";
      db.prepare(
        "INSERT INTO jobs(id,payload,status,updated_at) VALUES (?,?,?,?)",
      ).run(job.id, JSON.stringify(job), state, Date.now());
      void processQueue();
      reply(202, { status: state, detail: "" });
      return;
    }
    reply(404, { error: "Not found." });
  } catch {
    if (!res.headersSent)
      reply(400, { error: "The request could not be completed." });
  }
});
server.listen(
  Number(process.env.PORT || 5175),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      `Communications service listening on port ${process.env.PORT || 5175}. SMTP ${smtpReady ? "configured" : "not configured"}.`,
    ),
);
const timer = setInterval(() => void processQueue(), 10000);
timer.unref();
if (existsSync(".auth/session/Default")) void connect();
process.on("SIGTERM", async () => {
  clearInterval(timer);
  server.close();
  if (client)
    try {
      await client.destroy();
    } catch {}
  db.close();
  process.exit(0);
});
