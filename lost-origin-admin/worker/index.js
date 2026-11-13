// Dedicated admin origin. Credentials and database sessions live on the backend;
// this worker relays only approved routes and never exposes its service secrets.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const allowedOrigin = env.ADMIN_ORIGIN;
    if (!env.BACKEND_ORIGIN || !env.AUTH_RELAY_SECRET || !allowedOrigin)
      return new Response("Admin service is not configured.", { status: 503 });
    if (url.origin !== allowedOrigin) return new Response("Invalid host.", { status: 403 });
    if (url.pathname === "/") return Response.redirect(`${url.origin}/admin${url.search}`, 302);
    if (["/admin/", "/admin/login/"].includes(url.pathname)) return Response.redirect(`${url.origin}${url.pathname.slice(0,-1)}${url.search}`,302);
    const api = url.pathname.startsWith("/api/");
    const page = ["/admin", "/admin/login"].includes(url.pathname);
    const development = /^http:\/\/127\.0\.0\.1:\d+$/.test(env.BACKEND_ORIGIN);
    const asset = /^\/(?:_next\/|images\/|lost-origin-logo\.svg$|favicon\.svg$|manifest\.webmanifest$)/.test(url.pathname)
      || (development && /^\/(?:@|components\/|app\/|lib\/|node_modules\/|scripts\/)/.test(url.pathname));
    if ((!api && !page && !asset) || (asset && !["GET", "HEAD"].includes(request.method))) return new Response("Not found.", { status: 404 });
    if (!['GET','HEAD'].includes(request.method) && (request.headers.get("origin") !== allowedOrigin || request.headers.get("sec-fetch-site") === "cross-site"))
      return new Response("Request origin rejected.", { status: 403 });
    const target = new URL(url.pathname + url.search, env.BACKEND_ORIGIN);
    const headers = new Headers(request.headers);
    for (const name of [...headers.keys()]) if (/^(?:oai-|x-lo-|host$|authorization$)/i.test(name)) headers.delete(name);
    const secure = url.protocol === "https:";
    const cookieName = `${secure ? "__Host-" : ""}lo_admin`;
    const cookies = (request.headers.get("cookie") || "").split(";").map(value=>value.trim()).filter(value=>value.startsWith(`${cookieName}=`));
    if (cookies.length) headers.set("cookie", cookies.join("; ")); else headers.delete("cookie");
    headers.set("x-lo-admin-relay", env.AUTH_RELAY_SECRET);
    headers.set("x-lo-admin-origin", allowedOrigin);
    headers.set("accept-encoding", "identity");
    headers.set("x-lo-client-ip", request.headers.get("cf-connecting-ip") || "local");
    if (env.BACKEND_SERVICE_TOKEN) headers.set("OAI-Sites-Authorization", `Bearer ${env.BACKEND_SERVICE_TOKEN}`);
    try {
      const upstream = await fetch(new Request(target, { method: request.method, headers,
        body: ['GET','HEAD'].includes(request.method) ? undefined : request.body, redirect: "manual", duplex: "half", signal: request.signal }));
      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.delete("access-control-allow-origin"); responseHeaders.delete("access-control-allow-credentials");
      responseHeaders.set("X-Content-Type-Options", "nosniff"); responseHeaders.set("Referrer-Policy", "same-origin");
      if (page || api) responseHeaders.set("Cache-Control", "no-store");
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    } catch { return new Response("The admin service is temporarily unavailable. Please try again.", { status: 503 }); }
  }
};
