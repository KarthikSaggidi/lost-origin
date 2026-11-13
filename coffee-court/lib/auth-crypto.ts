import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
export const randomToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function secretEqual(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32, {
    N: 16384,
    r: 8,
    p: 5,
    maxmem: 33554432,
  }).toString("base64url");
  return `scrypt$16384$8$5$${salt}$${hash}`;
}
export function verifyPassword(password: string, encoded: string) {
  const [name, n, r, p, salt, expected] = encoded.split("$");
  if (
    name !== "scrypt" ||
    n !== "16384" ||
    r !== "8" ||
    p !== "5" ||
    !salt ||
    !expected
  )
    return false;
  const hash = scryptSync(password, salt, 32, {
    N: 16384,
    r: 8,
    p: 5,
    maxmem: 33554432,
  }).toString("base64url");
  return secretEqual(hash, expected);
}
export const rateKey = (secret: string, value: string) =>
  createHmac("sha256", secret).update(value).digest("hex");
