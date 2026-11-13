import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orders } from "../../../../db/schema";
import { applicationSession } from "../../../../lib/auth-session";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const session = await applicationSession(request);
  if (session?.role !== "admin")
    return Response.json(
      { error: "Administrator access required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const key = z
    .string()
    .uuid()
    .safeParse(new URL(request.url).searchParams.get("requestKey"));
  if (!key.success)
    return Response.json(
      { error: "Invalid billing reference." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  const order =
    (
      await getDb()
        .select()
        .from(orders)
        .where(
          and(eq(orders.requestKey, key.data), eq(orders.source, "Counter")),
        )
    )[0] || null;
  return Response.json({ order }, { headers: { "Cache-Control": "no-store" } });
}
