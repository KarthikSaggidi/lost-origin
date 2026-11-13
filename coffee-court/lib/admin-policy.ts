export function hasAdminIdentity(input: {
  production: boolean;
  allowedEmails?: string;
  userId?: string | null;
  email?: string | null;
}) {
  if (!input.userId || !input.email) return false;
  return (input.allowedEmails || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
    .includes(input.email.trim().toLowerCase());
}
