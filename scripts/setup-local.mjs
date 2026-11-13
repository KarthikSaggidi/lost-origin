import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { passwordHash } from "../coffee-court/lib/auth-crypto.ts";
const root = new URL("../", import.meta.url);
const website = new URL("coffee-court/.dev.vars", root),
  admin = new URL("lost-origin-admin/.dev.vars", root),
  gateway = new URL("coffee-court/services/communications/.env", root);
async function read(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}
const parse = (text) =>
  Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const at = line.indexOf("=");
        return [line.slice(0, at), line.slice(at + 1)];
      }),
  );
async function hiddenPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (!process.stdin.isTTY)
    throw new Error(
      "Run setup in a terminal, or supply ADMIN_PASSWORD securely in the process environment.",
    );
  process.stdout.write(
    "Administrator password (hidden, at least 8 characters): ",
  );
  process.stdin.setRawMode(true);
  process.stdin.setEncoding("utf8");
  process.stdin.resume();
  let value = "";
  return new Promise((resolve, reject) => {
    const finish = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\u0003") {
          finish();
          reject(new Error("Setup cancelled."));
          return;
        }
        if (ch === "\r" || ch === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else if (ch >= " ") value += ch;
      }
    };
    process.stdin.on("data", onData);
  });
}
let appText = await read(website),
  adminText = await read(admin),
  gatewayText = await read(gateway);
const app = parse(appText),
  panel = parse(adminText),
  service = parse(gatewayText),
  token = () => randomBytes(32).toString("base64url");
const relay = app.AUTH_RELAY_SECRET || panel.AUTH_RELAY_SECRET || token(),
  communication =
    app.COMMUNICATIONS_SECRET || service.COMMUNICATIONS_SECRET || token();
if (panel.AUTH_RELAY_SECRET && panel.AUTH_RELAY_SECRET !== relay)
  throw new Error(
    "Existing admin relay keys do not match. Resolve the local configuration before continuing.",
  );
if (
  service.COMMUNICATIONS_SECRET &&
  service.COMMUNICATIONS_SECRET !== communication
)
  throw new Error(
    "Existing communications keys do not match. Resolve the local configuration before continuing.",
  );
let hash = app.ADMIN_PASSWORD_HASH;
if (!hash) {
  let password = await hiddenPassword();
  if (password.length < 8 || password.length > 128)
    throw new Error("Use a password between 8 and 128 characters.");
  hash = passwordHash(password);
  password = "";
}
function extend(text, existing, defaults) {
  return (
    text +
    (text.endsWith("\n") || !text ? "" : "\n") +
    Object.entries(defaults)
      .filter(([key]) => !existing[key])
      .map(([key, value]) => `${key}=${value}\n`)
      .join("")
  );
}
appText = extend(appText, app, {
  ADMIN_LOGIN_EMAIL: "admin@lostorigin.com",
  ADMIN_PASSWORD_HASH: hash,
  AUTH_RELAY_SECRET: relay,
  AUTH_RATE_SECRET: token(),
  ADMIN_ORIGIN: "http://127.0.0.1:5174",
  COMMUNICATIONS_URL: "http://127.0.0.1:5175",
  COMMUNICATIONS_SECRET: communication,
});
adminText = extend(adminText, panel, {
  ADMIN_ORIGIN: "http://127.0.0.1:5174",
  BACKEND_ORIGIN: "http://127.0.0.1:5173",
  AUTH_RELAY_SECRET: relay,
});
gatewayText = extend(gatewayText, service, {
  COMMUNICATIONS_SECRET: communication,
  PORT: "5175",
  HOST: "127.0.0.1",
  ...(process.platform === "darwin"
    ? {
        CHROME_EXECUTABLE_PATH:
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      }
    : {}),
});
for (const [path, text] of [
  [website, appText],
  [admin, adminText],
  [gateway, gatewayText],
]) {
  await writeFile(path, text, { mode: 0o600 });
  await chmod(path, 0o600);
}
console.log(
  "Private local configuration is ready. The password is stored as a salted hash. SMTP and SMS remain unconfigured.",
);
