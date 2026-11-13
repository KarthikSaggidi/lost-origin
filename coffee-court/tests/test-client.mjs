// Integration tests run against local admin services with a real authenticated session.
export async function testClient() {
  const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5174";
  const url = new URL(base);
  if (!["127.0.0.1", "localhost"].includes(url.hostname))
    throw new Error("Integration tests must target a local service.");
  let cookie = process.env.TEST_COOKIE,
    csrf = process.env.TEST_CSRF;
  if (!cookie || !csrf) {
    if (!process.env.TEST_ADMIN_PASSWORD)
      throw new Error(
        "Provide TEST_ADMIN_PASSWORD or TEST_COOKIE and TEST_CSRF for the local admin service.",
      );
    const response = await globalThis.fetch(base + "/api/auth/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: url.origin },
      body: JSON.stringify({
        email: process.env.TEST_ADMIN_EMAIL || "admin@lostorigin.com",
        password: process.env.TEST_ADMIN_PASSWORD,
      }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Test login failed.");
    cookie = response.headers.getSetCookie()[0]?.split(";")[0];
    csrf = body.csrfToken;
  }
  const fetch = (input, init = {}) => {
    const target = new URL(input, base);
    if (target.origin !== url.origin)
      throw new Error("Test credentials cannot be sent to another origin.");
    return globalThis.fetch(target, {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init.headers)),
        Origin: url.origin,
        Cookie: cookie,
        "X-CSRF-Token": csrf,
      },
    });
  };
  return { base, fetch };
}
