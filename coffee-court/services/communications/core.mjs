import { createHmac, timingSafeEqual } from "node:crypto";
export const signature = (secret, method, path, time, body = "") =>
  createHmac("sha256", secret)
    .update([method, path, time, body].join("\n"))
    .digest("hex");
export function authorised(
  secret,
  method,
  path,
  headers,
  body,
  now = Date.now(),
) {
  const time = headers["x-lo-timestamp"],
    given = headers["x-lo-signature"] || "";
  if (
    !secret ||
    secret.length < 32 ||
    !/^\d{13}$/.test(time || "") ||
    Math.abs(now - Number(time)) > 90000 ||
    !/^[a-f0-9]{64}$/.test(given)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(given),
    Buffer.from(signature(secret, method, path, time, body)),
  );
}
export const smtpConfigured = (env) =>
  Boolean(env.SMTP_HOST && env.SMTP_FROM && env.SMTP_USER && env.SMTP_PASS);
export function mailOptions(job, from) {
  return {
    from,
    to: job.to,
    subject: job.subject,
    text: job.message,
    attachments: job.attachment
      ? [
          {
            filename: job.attachment.filename,
            content: Buffer.from(job.attachment.content, "base64"),
            contentType: job.attachment.type,
          },
        ]
      : [],
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}
export function validateJob(job) {
  if (
    !job ||
    !/^n-[a-f0-9]{64}$/.test(job.id) ||
    !["email", "whatsapp"].includes(job.channel) ||
    typeof job.message !== "string" ||
    !job.message.trim() ||
    job.message.length > 6000
  )
    throw new Error("Invalid message.");
  if (
    job.channel === "email" &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.to) ||
      job.to.length > 160 ||
      /[\r\n]/.test(job.subject || ""))
  )
    throw new Error("Invalid email.");
  if (job.channel === "whatsapp" && !/^[6-9]\d{9}$/.test(job.to))
    throw new Error("Invalid phone.");
  if (
    job.attachment &&
    (!/^[A-Za-z0-9._-]{1,100}$/.test(job.attachment.filename) ||
      !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        job.attachment.type,
      ) ||
      typeof job.attachment.content !== "string" ||
      job.attachment.content.length > 7500000)
  )
    throw new Error("Invalid attachment.");
  return job;
}
