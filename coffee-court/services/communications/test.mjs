import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import {
  signature,
  authorised,
  smtpConfigured,
  mailOptions,
  validateJob,
} from "./core.mjs";
const key = "test-server-key-".repeat(4);
test("service authentication binds body, route and time; rejects browser or stale credentials", () => {
  const time = String(Date.now()),
    body = JSON.stringify({ hello: "world" }),
    headers = {
      "x-lo-timestamp": time,
      "x-lo-signature": signature(key, "POST", "/jobs", time, body),
    };
  assert.ok(authorised(key, "POST", "/jobs", headers, body));
  assert.equal(authorised(key, "POST", "/jobs", headers, body + " "), false);
  assert.equal(
    authorised(key, "POST", "/whatsapp/connect", headers, body),
    false,
  );
  assert.equal(
    authorised(key, "POST", "/jobs", headers, body, Number(time) + 100000),
    false,
  );
  assert.equal(authorised("", "POST", "/jobs", headers, body), false);
});
test("Nodemailer creates a real MIME message containing the bill attachment and thank-you text", async () => {
  const job = validateJob({
    id: "n-" + "a".repeat(64),
    channel: "email",
    to: "test@example.invalid",
    subject: "Lost Origin bill",
    message: "Thank you for visiting Lost Origin.",
    attachment: {
      filename: "LO-TEST.pdf",
      type: "application/pdf",
      content: Buffer.from("%PDF-1.7 test attachment").toString("base64"),
    },
  });
  const transporter = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: "unix",
  });
  const mail = await transporter.sendMail(
    mailOptions(job, "Lost Origin <sender@example.invalid>"),
  );
  const mime = mail.message.toString();
  assert.match(mime, /Thank you for visiting/);
  assert.match(mime, /application\/pdf/);
  assert.match(mime, /filename=LO-TEST.pdf/);
  assert.equal(smtpConfigured({}), false);
  assert.throws(() =>
    validateJob({ ...job, to: "target@example.com\nBcc:other@example.com" }),
  );
  assert.throws(() =>
    validateJob({
      ...job,
      attachment: { ...job.attachment, filename: "../../file" },
    }),
  );
});
