import { getDb } from "../../../../db";
import { realtimeClock } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { adminTransport } from "../../../../lib/auth-transport";
import { applicationSession, touchSession } from "../../../../lib/auth-session";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const admin = adminTransport(request);
  const identity = await applicationSession(request);
  if (admin && identity?.role !== "admin")
    return new Response("Please sign in.", { status: 401 });
  const db = getDb();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let last = -1;
  let count = 0;
  let authChecks = 0;
  const encoder = new TextEncoder();
  const stop = () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
  request.signal.addEventListener("abort", stop, { once: true });
  const stream = new ReadableStream({
    start(controller) {
      const tick = async () => {
        if (stopped) return;
        try {
          if (admin && ++authChecks % 30 === 0) {
            const current = await applicationSession(request);
            if (!current) {
              stop();
              controller.close();
              return;
            }
            await touchSession(current);
          }
          const row = (
            await db
              .select()
              .from(realtimeClock)
              .where(eq(realtimeClock.id, "workspace"))
          )[0];
          const version = row?.version || 0;
          if (version !== last) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ version })}\n\n`),
            );
            last = version;
          } else if (++count % 10 === 0)
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          stop();
          try {
            controller.close();
          } catch {}
          return;
        }
        if (!stopped) timer = setTimeout(tick, 1000);
      };
      controller.enqueue(encoder.encode("retry: 2000\n\n"));
      void tick();
    },
    cancel() {
      stop();
      request.signal.removeEventListener("abort", stop);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
