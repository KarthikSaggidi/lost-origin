import { env } from "cloudflare:workers";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  if (!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(key))
    return new Response("Not found", { status: 404 });
  const object = await env.BUCKET?.get(`hero/${key}`);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers({ "X-Content-Type-Options": "nosniff" });
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
