import { randomBytes } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url),
  file = new URL(".dev.vars", root),
  service = new URL("services/communications/.env", root);
const read = async (path) => {
  try {
    return await readFile(path, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return "";
    throw e;
  }
};
let app = await read(file),
  node = await read(service);
const value = (text, key) =>
  text
    .split(/\r?\n/)
    .find((line) => line.startsWith(key + "="))
    ?.slice(key.length + 1);
const secret =
  value(app, "COMMUNICATIONS_SECRET") ||
  value(node, "COMMUNICATIONS_SECRET") ||
  randomBytes(32).toString("base64url");
if (!value(app, "COMMUNICATIONS_SECRET"))
  app += `\nCOMMUNICATIONS_SECRET=${secret}\n`;
if (!value(app, "COMMUNICATIONS_URL"))
  app += "COMMUNICATIONS_URL=http://127.0.0.1:5175\n";
if (!value(node, "COMMUNICATIONS_SECRET"))
  node += `\nCOMMUNICATIONS_SECRET=${secret}\nPORT=5175\nHOST=127.0.0.1\n`;
if (process.platform === "darwin" && !value(node, "CHROME_EXECUTABLE_PATH"))
  node +=
    "CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome\n";
for (const [path, text] of [
  [file, app],
  [service, node],
]) {
  await writeFile(path, text, { mode: 0o600 });
  await chmod(path, 0o600);
}
console.log(
  "Local communications configuration is ready. SMTP remains unconfigured.",
);
