let csrf = "";
export function setCsrfToken(value?: string) {
  csrf = value || "";
}
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    window.location.origin,
  );
  if (
    url.origin === window.location.origin &&
    !["GET", "HEAD"].includes((init.method || "GET").toUpperCase()) &&
    csrf
  )
    headers.set("X-CSRF-Token", csrf);
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}
export async function logout() {
  const response = await authFetch("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok)
    throw new Error(
      "Sign-out could not be completed. Check your connection and try again.",
    );
  setCsrfToken("");
}
