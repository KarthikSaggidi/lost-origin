import { getDb } from "../../../../db";
import { and, inArray, isNull, desc } from "drizzle-orm";
import { websiteBookingNotification } from "../../../../lib/booking-notifications";
import {
  getState,
  seed,
  t,
  eq,
  sql,
  audit,
  saleJournal,
  journal,
} from "../../../../lib/store";
import {
  calculate,
  courtConfig,
  variantPrice,
  productVariants,
  todayIST,
  quoteBooking,
  bookingCharges,
  productVisible,
  nextStatus,
  validBooking,
  validBookingDate,
  type Item,
} from "../../../../lib/domain";
import { z } from "zod";
import {
  communicationSettings,
  communicationId,
  queuedNotification,
  submitNotification,
} from "../../../../lib/communications";
import { notificationJobs } from "../../../../db/schema";
import {
  applicationSession,
  csrfValid,
  touchSession,
  renewCustomerSession,
  enforceRate,
  clientAddress,
} from "../../../../lib/auth-session";
import {
  adminTransport,
  validWriteOrigin,
} from "../../../../lib/auth-transport";
import { customerState } from "../../../../lib/public-state";
import { otpConfigured } from "../../../../lib/otp-provider";
import { env } from "cloudflare:workers";
import {
  popupCampaignSchema,
  popupCampaignStatus,
  registrationAnswers,
} from "../../../../lib/popup-campaign";
import { heroSlidesSchema } from "../../../../lib/hero";
import { resolveOrderTime } from "../../../../lib/order-timing";

export const dynamic = "force-dynamic";
const response = (data: any, status = 200, cookie?: string) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });
const publicHttpsUrl = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .url()
    .max(300)
    .refine(
      (value) => new URL(value).protocol === "https:",
      "Use an https:// link.",
    ),
]);
const contact = z.object({
  email: z
    .union([z.literal(""), z.string().trim().email().max(160)])
    .default(""),
  marketingOptIn: z.boolean().default(false),
  customer: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
});
class BusinessError extends Error {}
function fail(message: string): never {
  throw new BusinessError(message);
}
async function replayReceipt(record: any) {
  if (!record.email) return response(record);
  const job = (
    await getDb()
      .select({
        status: notificationJobs.status,
        detail: notificationJobs.detail,
      })
      .from(notificationJobs)
      .where(
        eq(
          notificationJobs.id,
          communicationId(`confirmation-email:${record.id}`),
        ),
      )
  )[0];
  return response({ ...record, emailDelivery: job || { status: "Disabled" } });
}
function recordGuard(db: any, kind: "order" | "booking", record: any) {
  return db.insert(t.operationGuards).values({
    id: crypto.randomUUID(),
    verified:
      kind === "order"
        ? sql`CASE WHEN (SELECT version FROM orders WHERE id = ${record.id}) = ${record.version} THEN 1 ELSE 0 END`
        : sql`CASE WHEN (SELECT version FROM bookings WHERE id = ${record.id}) = ${record.version} THEN 1 ELSE 0 END`,
  });
}
export async function GET(request: Request) {
  try {
    const session = await applicationSession(request);
    if (adminTransport(request) && session?.role !== "admin")
      return response({ error: "Please sign in to the admin panel." }, 401);
    const data = await getState();
    const admin = session?.role === "admin";
    const db = getDb();
    const [notifications, unread] = admin
      ? await Promise.all([
          db
            .select()
            .from(t.adminNotifications)
            .orderBy(
              sql`CASE WHEN ${t.adminNotifications.readAt} IS NULL THEN 0 ELSE 1 END`,
              desc(t.adminNotifications.createdAt),
              desc(t.adminNotifications.id),
            )
            .limit(100),
          db
            .select({ count: sql<number>`count(*)` })
            .from(t.adminNotifications)
            .where(isNull(t.adminNotifications.readAt)),
        ])
      : [[], [{ count: 0 }]];
    if (session) await touchSession(session);
    const cookie = await renewCustomerSession(request, session);
    return response(
      {
        ...(admin
          ? data
          : customerState(
              data,
              session?.role === "customer" ? session.user : undefined,
            )),
        registrations: admin ? data.registrations : [],
        notifications,
        notificationUnread: unread[0]?.count || 0,
        access: {
          admin,
          csrfToken: session?.csrf || "",
          customer: session?.role === "customer" ? session.user : null,
          adminEmail: admin ? session.user.email : undefined,
          otpAvailable: otpConfigured(env),
        },
      },
      200,
      cookie,
    );
  } catch (e) {
    console.error(e);
    return response(
      { error: "The database is unavailable. Please try again." },
      503,
    );
  }
}
export async function POST(request: Request) {
  // This prototype is deployed owner-private. Sites authenticates every hosted request.
  // Keep it private until application roles, OTP and provider integrations are implemented.
  if (!validWriteOrigin(request))
    return response({ error: "Invalid request origin." }, 403);
  const session = await applicationSession(request);
  if (adminTransport(request) && session?.role !== "admin")
    return response({ error: "Please sign in to the admin panel." }, 401);
  if (session && !csrfValid(request, session))
    return response(
      { error: "This request could not be verified. Refresh and try again." },
      403,
    );
  let body: any;
  try {
    body = await request.json();
  } catch {
    return response({ error: "Invalid JSON." }, 400);
  }
  const customerAction =
    body.action === "campaignRegistration" ||
    (body.action === "booking" && body.source !== "Admin") ||
    (body.action === "order" && body.source === "Online");
  if (!customerAction && session?.role !== "admin")
    return response(
      { error: "Administrator access is required for this action." },
      403,
    );
  if (
    session?.role === "customer" &&
    ["order", "booking"].includes(body.action)
  ) {
    if (body.phone && body.phone !== session.user.phone)
      return response(
        { error: "Use your verified mobile number for this booking or order." },
        403,
      );
    body.phone = session.user.phone;
  }
  try {
    await seed();
    const db: any = getDb();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    let result: any = { ok: true };
    const ops: any[] = [];
    switch (body.action) {
      case "order": {
        const b = contact
          .extend({
            customer: z.string().trim().max(80).default("Walk-in customer"),
            phone: z.string().trim().max(20).default(""),
            source: z.enum(["Online", "Counter"]),
            paymentMode: z.enum(["Cash", "UPI", "Card", "Pay at counter"]),
            requestKey: z.string().uuid(),
            pickupAt: z.string().optional(),
            notes: z.string().max(500).default(""),
            offline: z.boolean().default(false),
            offlineTaxRate: z.number().min(0).max(28).optional(),
            createdAt: z.string().optional(),
            coupon: z.string().max(30).default(""),
            items: z
              .array(
                z.object({
                  id: z.string(),
                  quantity: z.number().int().min(1).max(20),
                  variant: z.string().max(40).optional(),
                  size: z.enum(["Regular", "Large"]).default("Regular"),
                  milk: z.enum(["Whole milk", "Oat milk", ""]).default(""),
                  shot: z.boolean().default(false),
                  price: z.number().int().positive().max(1000000).optional(),
                }),
              )
              .min(1)
              .max(30),
          })
          .parse(body);
        if (b.source === "Online") {
          contact.parse({ customer: b.customer, phone: b.phone });
          if (!b.email)
            fail("Enter your email address for the confirmation and bill.");
        } else {
          if (b.customer.length < 2) b.customer = "Walk-in customer";
          if (b.phone && !/^[6-9]\d{9}$/.test(b.phone))
            fail("Enter a valid 10-digit mobile number, or leave it blank.");
        }
        const existing = await db
          .select()
          .from(t.orders)
          .where(eq(t.orders.requestKey, b.requestKey));
        if (existing[0]) return replayReceipt(existing[0]);
        if (
          b.source === "Online" &&
          session?.role !== "admin" &&
          (!(await enforceRate(
            request,
            "receipt-ip",
            clientAddress(request),
            20,
            3600000,
          )) ||
            !(await enforceRate(
              request,
              "receipt-email",
              b.email.toLowerCase(),
              10,
              3600000,
            )))
        )
          return response(
            {
              error:
                "Too many requests. Please contact the café team or try again later.",
            },
            429,
          );
        const config = (
          await db
            .select()
            .from(t.settings)
            .where(eq(t.settings.key, "business"))
        )[0].value;
        if (config.paused && b.source === "Online")
          fail("Online ordering is paused. Please visit the counter.");
        if (
          b.offline &&
          (b.source !== "Counter" || !["Cash", "UPI"].includes(b.paymentMode))
        )
          fail("Offline sync is for cash or UPI counter bills only.");
        let resolvedTime: string;
        try {
          resolvedTime = resolveOrderTime(b, config);
        } catch (error: any) {
          fail(error.message);
        }
        const pickup = new Date(resolvedTime!);
        const inSlot = (await db.select().from(t.orders)).filter(
          (o: any) =>
            o.source === "Online" &&
            Math.floor(new Date(o.pickupAt).getTime() / 900000) ===
              Math.floor(pickup.getTime() / 900000) &&
            !["Cancelled", "Completed"].includes(o.status),
        );
        if (b.source === "Online" && inSlot.length >= config.slotCapacity)
          fail("That pickup slot is full. Please choose another time.");
        const products = await db.select().from(t.products);
        const stock = await db.select().from(t.inventory);
        const consumption: Record<string, number> = {};
        const items: Item[] = b.items.map((i) => {
          const p = products.find(
            (p: any) => p.id === i.id && (p.active || b.offline),
          );
          if (!p) fail("An item is no longer available.");
          if (
            !b.offline &&
            !productVisible(p, b.source === "Counter" ? "pos" : "website")
          )
            fail("This item is hidden from this ordering channel.");
          if (
            !b.offline &&
            (i.size !== "Regular" || i.shot || i.milk === "Oat milk")
          )
            fail("Choose an option from the current Lost Origin menu.");
          const selected = productVariants(p).find(
            (v) => v.label === (i.variant || productVariants(p)[0].label),
          );
          if (!selected && !b.offline)
            fail("That menu option is not available.");
          const factor = b.offline && i.size === "Large" ? 1.3 : 1;
          for (const [key, value] of Object.entries(p.recipe)) {
            const stockKey =
              key === "milk" && i.milk === "Oat milk" ? "oat" : key;
            consumption[stockKey] =
              (consumption[stockKey] || 0) +
              Math.ceil(
                (value as number) *
                  (key === "cups" || key === "croissants" || key === "bread"
                    ? 1
                    : factor),
              ) *
                i.quantity;
          }
          if (i.shot)
            consumption.beans = (consumption.beans || 0) + 18 * i.quantity;
          return {
            ...i,
            name: p.name,
            variant: selected?.label || i.variant || "Standard",
            price: b.offline && i.price ? i.price : selected!.price,
          };
        });
        for (const [key, quantity] of Object.entries(consumption)) {
          if ((stock.find((s: any) => s.id === key)?.quantity || 0) < quantity)
            fail(
              "There is not enough stock for this order. Please reduce the quantity.",
            );
        }
        let coupon = b.coupon.toUpperCase();
        if (coupon) {
          const campaign = (
            await db
              .select()
              .from(t.documents)
              .where(eq(t.documents.id, "camp-first"))
          )[0];
          if (coupon !== "FIRSTBREW" || !campaign?.data.active)
            fail("This coupon is not active.");
        }
        const totals = calculate(
          items,
          coupon,
          b.offline ? (b.offlineTaxRate ?? config.taxRate) : config.taxRate,
        );
        const orderId = `LO-${id.slice(0, 8).toUpperCase()}`;
        result = {
          id: orderId,
          customer: b.customer,
          phone: b.phone,
          email: b.email,
          marketingOptIn: b.marketingOptIn ? 1 : 0,
          source: b.source,
          status: "Received",
          paymentMode: b.paymentMode,
          paymentStatus:
            b.paymentMode === "Pay at counter" ? "Pending" : "Demo paid",
          ...totals,
          items,
          pickupAt: pickup.toISOString(),
          createdAt:
            b.offline && b.createdAt && !Number.isNaN(Date.parse(b.createdAt))
              ? b.createdAt
              : now,
          requestKey: b.requestKey,
          notes:
            b.notes +
            (b.offline
              ? " [Synced from device queue; original prices retained.]"
              : ""),
        };
        result.timeline = [{ status: "Received", at: result.createdAt }];
        ops.push(db.insert(t.orders).values(result));
        for (const [item, quantity] of Object.entries(consumption)) {
          ops.push(
            db
              .update(t.inventory)
              .set({ quantity: sql`${t.inventory.quantity} - ${quantity}` })
              .where(eq(t.inventory.id, item)),
          );
          ops.push(
            db.insert(t.stockLedger).values({
              id: `${orderId}-${item}`,
              item,
              delta: -quantity,
              reason: "Sale",
              reference: orderId,
              createdAt: now,
            }),
          );
        }
        ops.push(
          db.insert(t.payments).values({
            id: `pay-${orderId}`,
            reference: orderId,
            source: b.source,
            mode: b.paymentMode,
            amount: totals.total,
            status: result.paymentStatus,
            createdAt: now,
          }),
        );
        ops.push(
          db
            .insert(t.journals)
            .values(
              saleJournal(
                orderId,
                b.source,
                totals.total,
                totals.tax,
                b.paymentMode,
              ),
            ),
        );
        const cost = Object.entries(consumption).reduce(
          (sum, [key, q]) =>
            sum + q * (stock.find((s: any) => s.id === key)?.cost || 0),
          0,
        );
        ops.push(
          db.insert(t.journals).values(
            journal(`cogs-${orderId}`, orderId, "Ingredient cost", [
              { account: "Cost of goods sold", debit: cost, credit: 0 },
              { account: "Inventory", debit: 0, credit: cost },
            ]),
          ),
        );
        ops.push(
          audit(
            db,
            "Order created",
            `${orderId} · ${b.source} · ${b.offline ? "offline bill synced with original prices" : "demo transaction"}`,
          ),
        );
        break;
      }
      case "orderStatus": {
        const b = z
          .object({
            id: z.string(),
            status: z.enum(["Preparing", "Ready", "Completed", "Cancelled"]),
          })
          .parse(body);
        const order = (
          await db.select().from(t.orders).where(eq(t.orders.id, b.id))
        )[0];
        if (!order) fail("Order not found.");
        ops.push(recordGuard(db, "order", order));
        if (b.status === order.status) return response({ ok: true });
        if (b.status === "Cancelled") {
          if (!["Received", "Preparing", "Ready"].includes(order.status))
            fail("This order cannot be cancelled.");
          const j = (
            await db
              .select()
              .from(t.journals)
              .where(eq(t.journals.id, `j-${b.id}`))
          )[0];
          ops.push(
            db.insert(t.journals).values(
              journal(
                `reverse-${b.id}`,
                b.id,
                "Order cancellation",
                j.lines.map((l: any) => ({
                  ...l,
                  debit: l.credit,
                  credit: l.debit,
                })),
              ),
            ),
          );
          ops.push(
            db.insert(t.payments).values({
              id: `refund-${b.id}`,
              reference: b.id,
              source: order.source,
              mode: order.paymentMode,
              amount: -order.total,
              status:
                order.paymentStatus === "Pending" ? "Void" : "Demo refunded",
              createdAt: now,
            }),
          );
          if (order.status === "Received") {
            const cogs = (
              await db
                .select()
                .from(t.journals)
                .where(eq(t.journals.id, `cogs-${b.id}`))
            )[0];
            if (cogs)
              ops.push(
                db.insert(t.journals).values(
                  journal(
                    `reverse-cogs-${b.id}`,
                    b.id,
                    "Ingredient cost reversal",
                    cogs.lines.map((l: any) => ({
                      ...l,
                      debit: l.credit,
                      credit: l.debit,
                    })),
                  ),
                ),
              );
          }
          const movements = await db
            .select()
            .from(t.stockLedger)
            .where(eq(t.stockLedger.reference, b.id));
          if (order.status === "Received")
            for (const m of movements) {
              ops.push(
                db
                  .update(t.inventory)
                  .set({ quantity: sql`${t.inventory.quantity} - ${m.delta}` })
                  .where(eq(t.inventory.id, m.item)),
              );
              ops.push(
                db.insert(t.stockLedger).values({
                  ...m,
                  id: `return-${m.id}`,
                  delta: -m.delta,
                  reason: "Cancellation return",
                  createdAt: now,
                }),
              );
            }
        } else if (nextStatus[order.status] !== b.status)
          fail("The order status changed. Refresh and try again.");
        if (b.status === "Completed" && order.paymentStatus === "Pending")
          fail("Collect payment before completing this order.");
        ops.push(
          db
            .update(t.orders)
            .set({
              status: b.status,
              version: order.version + 1,
              timeline: [
                ...(order.timeline?.length
                  ? order.timeline
                  : [{ status: "Received", at: order.createdAt }]),
                { status: b.status, at: now },
              ],
            })
            .where(eq(t.orders.id, b.id)),
        );
        ops.push(audit(db, "Order status", `${b.id} → ${b.status}`));
        break;
      }
      case "collectPayment": {
        const b = z
          .object({ id: z.string(), mode: z.enum(["Cash", "UPI", "Card"]) })
          .parse(body);
        const order = (
          await db.select().from(t.orders).where(eq(t.orders.id, b.id))
        )[0];
        if (
          !order ||
          order.paymentStatus !== "Pending" ||
          order.status === "Cancelled"
        )
          fail("There is no payment to collect.");
        ops.push(recordGuard(db, "order", order));
        ops.push(
          db.insert(t.payments).values({
            id: `collect-${b.id}`,
            reference: b.id,
            source: order.source,
            mode: b.mode,
            amount: order.total,
            status: "Demo collected",
            createdAt: now,
          }),
        );
        // The original pending entry is excluded from collected totals; the receivable clears once.
        ops.push(
          db.insert(t.journals).values(
            journal(`collect-${b.id}`, b.id, "Counter payment collected", [
              {
                account:
                  b.mode === "Cash" ? "Cash in hand" : "Demo payment clearing",
                debit: order.total,
                credit: 0,
              },
              { account: "Accounts receivable", debit: 0, credit: order.total },
            ]),
          ),
        );
        ops.push(
          db
            .update(t.orders)
            .set({
              paymentStatus: "Demo paid",
              paymentMode: b.mode,
              version: order.version + 1,
            })
            .where(eq(t.orders.id, b.id)),
        );
        ops.push(audit(db, "Payment collected", b.id));
        break;
      }
      case "booking": {
        const b = contact
          .extend({
            court: z.string().min(1).max(60),
            source: z.enum(["Website", "Admin"]).default("Website"),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            start: z.number().int(),
            duration: z.number().int(),
            players: z.number().int().min(2).max(8),
            equipment: z.boolean(),
            requestKey: z.string().uuid(),
          })
          .parse(body);
        if (b.source === "Website" && !b.email)
          fail(
            "Enter your email address for the booking confirmation and bill.",
          );
        const existing = await db
          .select()
          .from(t.bookings)
          .where(eq(t.bookings.requestKey, b.requestKey));
        if (existing[0]) return replayReceipt(existing[0]);
        if (
          b.source === "Website" &&
          session?.role !== "admin" &&
          (!(await enforceRate(
            request,
            "receipt-ip",
            clientAddress(request),
            20,
            3600000,
          )) ||
            !(await enforceRate(
              request,
              "receipt-email",
              b.email.toLowerCase(),
              10,
              3600000,
            )))
        )
          return response(
            {
              error:
                "Too many requests. Please contact the café team or try again later.",
            },
            429,
          );
        const business = (
          await db
            .select()
            .from(t.settings)
            .where(eq(t.settings.key, "business"))
        )[0].value;
        const court = courtConfig({ business }).find(
          (c) => c.name === b.court && c.active,
        );
        if (!court) fail("This court is not available.");
        if (
          !validBooking(b.start, b.duration, court) ||
          !validBookingDate(b.date, new Date(now))
        )
          fail("Choose an available time within the next 30 days.");
        if (
          new Date(
            `${b.date}T${String(Math.floor(b.start / 60)).padStart(2, "0")}:${String(b.start % 60).padStart(2, "0")}:00+05:30`,
          ).getTime() < Date.now()
        )
          fail("That time has already passed. Please select a later slot.");
        const bookingId = `PB-${id.slice(0, 8).toUpperCase()}`;
        result = {
          id: bookingId,
          customer: b.customer,
          phone: b.phone,
          email: b.email,
          marketingOptIn: b.marketingOptIn ? 1 : 0,
          court: b.court,
          date: b.date,
          start: b.start,
          duration: b.duration,
          players: b.players,
          equipment: b.equipment ? 1 : 0,
          total: quoteBooking(b.start, b.duration, b.equipment, b.date, court),
          source: b.source,
          pricing: bookingCharges(
            b.start,
            b.duration,
            b.equipment,
            b.date,
            court,
          ),
          status: "Confirmed",
          createdAt: now,
          requestKey: b.requestKey,
        };
        ops.push(db.insert(t.bookings).values(result));
        const notification = websiteBookingNotification(result);
        if (notification)
          ops.push(db.insert(t.adminNotifications).values(notification));
        for (let slot = b.start; slot < b.start + b.duration; slot += 30)
          ops.push(
            db.insert(t.bookingSlots).values({
              id: `${bookingId}-${slot}`,
              bookingId: bookingId,
              court: b.court,
              date: b.date,
              slot,
            }),
          );
        ops.push(
          db.insert(t.payments).values({
            id: `pay-${bookingId}`,
            reference: bookingId,
            source: "Court",
            mode: "UPI",
            amount: result.total,
            status: "Demo paid",
            createdAt: now,
          }),
        );
        ops.push(
          db
            .insert(t.journals)
            .values(
              saleJournal(
                bookingId,
                "Court",
                result.total,
                result.pricing.tax,
                "UPI",
              ),
            ),
        );
        ops.push(
          audit(db, "Court booked", `${bookingId} · ${b.court} · ${b.date}`),
        );
        break;
      }
      case "notificationsRead": {
        const b = z
          .object({ ids: z.array(z.string().min(1).max(100)).min(1).max(100) })
          .parse(body);
        ops.push(
          db
            .update(t.adminNotifications)
            .set({ readAt: now })
            .where(
              and(
                inArray(t.adminNotifications.id, b.ids),
                isNull(t.adminNotifications.readAt),
              ),
            ),
        );
        break;
      }
      case "bookingStatus": {
        const b = z
          .object({
            id: z.string(),
            reason: z
              .string()
              .trim()
              .min(3)
              .max(200)
              .default("Cancelled by administrator"),
            status: z.enum(["Checked in", "Completed", "Cancelled"]),
          })
          .parse(body);
        const booking = (
          await db.select().from(t.bookings).where(eq(t.bookings.id, b.id))
        )[0];
        if (!booking) fail("Booking not found.");
        ops.push(recordGuard(db, "booking", booking));
        if (b.status === booking.status) return response(booking);
        let refund = booking.refund || 0;
        if (b.status === "Cancelled") {
          if (booking.status !== "Confirmed")
            fail("Only confirmed bookings can be cancelled in this preview.");
          const startTime = new Date(
            `${booking.date}T${String(Math.floor(booking.start / 60)).padStart(2, "0")}:${String(booking.start % 60).padStart(2, "0")}:00+05:30`,
          ).getTime();
          const hours = (startTime - Date.now()) / 3600000;
          refund = Math.round(
            booking.total * (hours >= 12 ? 1 : hours >= 4 ? 0.5 : 0),
          );
          ops.push(
            db.delete(t.bookingSlots).where(eq(t.bookingSlots.bookingId, b.id)),
          );
          if (refund > 0) {
            ops.push(
              db.insert(t.payments).values({
                id: `refund-${b.id}`,
                reference: b.id,
                source: "Court",
                mode: "UPI",
                amount: -refund,
                status: "Demo refunded",
                createdAt: now,
              }),
            );
            const bookedTax =
              booking.pricing?.tax ??
              (
                await db
                  .select()
                  .from(t.journals)
                  .where(eq(t.journals.id, `j-${b.id}`))
              )[0]?.lines?.find((l: any) => l.account === "Output tax")
                ?.credit ??
              0;
            const tax = booking.total
              ? Math.round((refund * bookedTax) / booking.total)
              : 0;
            ops.push(
              db.insert(t.journals).values(
                journal(`refund-${b.id}`, b.id, "Court cancellation refund", [
                  { account: "Court revenue", debit: refund - tax, credit: 0 },
                  { account: "Output tax", debit: tax, credit: 0 },
                  {
                    account: "Demo payment clearing",
                    debit: 0,
                    credit: refund,
                  },
                ]),
              ),
            );
          }
          result = { ok: true, refund };
        } else if (
          (b.status === "Checked in" && booking.status !== "Confirmed") ||
          (b.status === "Completed" && booking.status !== "Checked in")
        )
          fail("Invalid booking status transition.");
        ops.push(
          db
            .update(t.bookings)
            .set({
              status: b.status,
              version: booking.version + 1,
              checkedInAt:
                b.status === "Checked in" ? now : booking.checkedInAt,
              completedAt: b.status === "Completed" ? now : booking.completedAt,
              refund,
              cancellationReason:
                b.status === "Cancelled"
                  ? b.reason
                  : booking.cancellationReason,
            })
            .where(eq(t.bookings.id, b.id)),
        );
        result = {
          ...booking,
          status: b.status,
          checkedInAt: b.status === "Checked in" ? now : booking.checkedInAt,
          completedAt: b.status === "Completed" ? now : booking.completedAt,
          refund,
          cancellationReason:
            b.status === "Cancelled" ? b.reason : booking.cancellationReason,
        };
        ops.push(
          audit(
            db,
            "Booking status",
            `${b.id} → ${b.status}${b.status === "Cancelled" ? ` · ${b.reason}` : ""}`,
          ),
        );
        break;
      }
      case "stock": {
        const b = z
          .object({
            id: z.string(),
            quantity: z
              .number()
              .int()
              .min(-100000)
              .max(100000)
              .refine((n) => n !== 0)
              .optional(),
            targetQuantity: z.number().int().min(0).max(100000).optional(),
            requestKey: z.string().uuid().optional(),
            reason: z.enum(["Purchase", "Wastage", "Physical count"]),
          })
          .refine(
            (v) => v.quantity !== undefined || v.targetQuantity !== undefined,
            { message: "Supply a movement or a counted quantity." },
          )
          .parse(body);
        const movementId = b.requestKey || id;
        if (
          b.requestKey &&
          (
            await db
              .select()
              .from(t.stockLedger)
              .where(eq(t.stockLedger.id, movementId))
          ).length
        )
          return response({ ok: true, duplicate: true });
        const item = (
          await db.select().from(t.inventory).where(eq(t.inventory.id, b.id))
        )[0];
        if (!item) fail("Inventory item not found.");
        const delta =
          b.targetQuantity !== undefined
            ? b.targetQuantity - item.quantity
            : b.quantity!;
        if (delta === 0) return response({ ok: true, unchanged: true });
        if (b.targetQuantity !== undefined) {
          if (b.reason !== "Physical count")
            fail("Counted quantities require Physical count.");
          ops.push(
            db.insert(t.operationGuards).values({
              id: crypto.randomUUID(),
              verified: sql`CASE WHEN (SELECT quantity FROM inventory WHERE id = ${b.id}) = ${item.quantity} THEN 1 ELSE 0 END`,
            }),
          );
        }
        if (
          (b.reason === "Purchase" && delta < 0) ||
          (b.reason === "Wastage" && delta > 0)
        )
          fail("Purchases add stock and wastage removes stock.");
        if (item.quantity + delta < 0) fail("Stock cannot be negative.");
        ops.push(
          db
            .update(t.inventory)
            .set({ quantity: sql`${t.inventory.quantity} + ${delta}` })
            .where(eq(t.inventory.id, b.id)),
        );
        ops.push(
          db.insert(t.stockLedger).values({
            id: movementId,
            item: b.id,
            delta: delta,
            reason: b.reason,
            reference: `ADJ-${id.slice(0, 8)}`,
            createdAt: now,
          }),
        );
        const value = Math.abs(delta) * item.cost;
        ops.push(
          db.insert(t.journals).values(
            journal(
              `j-${movementId}`,
              movementId,
              b.reason,
              delta > 0
                ? [
                    { account: "Inventory", debit: value, credit: 0 },
                    {
                      account:
                        b.reason === "Purchase"
                          ? "Accounts payable"
                          : "Stock adjustment",
                      debit: 0,
                      credit: value,
                    },
                  ]
                : [
                    { account: "Stock loss expense", debit: value, credit: 0 },
                    { account: "Inventory", debit: 0, credit: value },
                  ],
            ),
          ),
        );
        ops.push(
          audit(
            db,
            "Stock adjusted",
            `${item.name}: ${delta > 0 ? "+" : ""}${delta} ${item.unit} · ${b.reason}`,
          ),
        );
        break;
      }
      case "inventoryItem": {
        const b = z
          .object({
            id: z
              .string()
              .regex(/^[a-zA-Z0-9_-]+$/)
              .max(80),
            name: z.string().trim().min(2).max(100),
            unit: z.string().trim().min(1).max(20),
            quantity: z.number().int().min(0).max(100000),
            reorder: z.number().int().min(0).max(100000),
            cost: z.number().int().positive().max(1000000),
          })
          .parse(body);
        const existing = (
          await db.select().from(t.inventory).where(eq(t.inventory.id, b.id))
        )[0];
        if (existing) return response({ ok: true, duplicate: true });
        ops.push(db.insert(t.inventory).values(b));
        ops.push(
          db.insert(t.stockLedger).values({
            id: "opening-" + b.id,
            item: b.id,
            delta: b.quantity,
            reason: "Imported opening balance",
            reference: "OPEN-" + b.id,
            createdAt: now,
          }),
        );
        const amount = b.quantity * b.cost;
        ops.push(
          db.insert(t.journals).values(
            journal("opening-" + b.id, b.id, "Imported opening inventory", [
              { account: "Inventory", debit: amount, credit: 0 },
              { account: "Opening inventory equity", debit: 0, credit: amount },
            ]),
          ),
        );
        ops.push(audit(db, "Inventory item created", b.name));
        break;
      }
      case "expense": {
        const b = z
          .object({
            requestKey: z.string().uuid().optional(),
            description: z.string().trim().min(3).max(150),
            category: z.enum([
              "Rent",
              "Utilities",
              "Staff",
              "Supplies",
              "Maintenance",
              "Other",
            ]),
            amount: z.number().int().positive().max(100000000),
          })
          .parse(body);
        const expenseId = b.requestKey || id;
        if (
          b.requestKey &&
          (
            await db
              .select()
              .from(t.expenses)
              .where(eq(t.expenses.id, expenseId))
          ).length
        )
          return response({ ok: true, duplicate: true });
        if (b.amount > 5000000)
          fail(
            "Expenses above ₹50,000 need partner approval. This approval flow is not enabled yet.",
          );
        ops.push(
          db.insert(t.expenses).values({
            id: expenseId,
            description: b.description,
            category: b.category,
            amount: b.amount,
            createdAt: now,
          }),
        );
        ops.push(
          db.insert(t.journals).values(
            journal(`j-${expenseId}`, expenseId, b.description, [
              { account: `${b.category} expense`, debit: b.amount, credit: 0 },
              { account: "Cash in hand", debit: 0, credit: b.amount },
            ]),
          ),
        );
        ops.push(audit(db, "Expense recorded", b.description));
        break;
      }
      case "productVisibility": {
        const b = z
          .object({
            id: z.string(),
            channel: z.enum(["pos", "website"]),
            visible: z.boolean(),
          })
          .parse(body);
        const existing = (
          await db.select().from(t.products).where(eq(t.products.id, b.id))
        )[0];
        if (!existing) fail("Product not found.");
        const value = existing.active
          ? {
              showOnPos: existing.showOnPos,
              showOnWebsite: existing.showOnWebsite,
            }
          : { showOnPos: 0, showOnWebsite: 0 };
        if (b.channel === "pos") value.showOnPos = b.visible ? 1 : 0;
        else value.showOnWebsite = b.visible ? 1 : 0;
        ops.push(
          db
            .update(t.products)
            .set({ ...value, active: 1 })
            .where(eq(t.products.id, b.id)),
        );
        ops.push(
          audit(
            db,
            "Product visibility",
            `${existing.name} · ${b.channel} · ${b.visible ? "visible" : "hidden"}`,
          ),
        );
        break;
      }
      case "product": {
        const b = z
          .object({
            id: z
              .string()
              .regex(/^[a-zA-Z0-9_-]+$/)
              .max(80),
            category: z.string().trim().min(1).max(50).optional(),
            description: z.string().max(500).optional(),
            ingredients: z
              .array(z.string().trim().min(1).max(100))
              .max(30)
              .optional(),
            image: z.string().max(80).optional(),
            diet: z.enum(["veg", "nonveg", "egg"]).optional(),
            section: z.enum(["Food", "Drinks"]).optional(),
            name: z.string().trim().min(2).max(80),
            price: z.number().int().positive().max(1000000),
            active: z.number().int().min(0).max(1),
            showOnPos: z.number().int().min(0).max(1).optional(),
            showOnWebsite: z.number().int().min(0).max(1).optional(),
            variants: z
              .array(
                z.object({
                  label: z.string().min(1).max(40),
                  price: z.number().int().positive().max(1000000),
                }),
              )
              .min(1)
              .max(5)
              .optional(),
            recipe: z
              .record(z.number().int().nonnegative().max(100000))
              .optional(),
          })
          .parse(body);
        const existing = (
          await db.select().from(t.products).where(eq(t.products.id, b.id))
        )[0];
        if (!existing && (!b.category || !b.name))
          fail("New products need a name and category.");
        const variants =
          b.variants ||
          (existing
            ? productVariants(existing)
            : [{ label: "Standard", price: b.price }]
          ).map((v, i) => ({
            ...v,
            price: i === 0 ? b.price : v.price,
          }));
        if (new Set(variants.map((v) => v.label)).size !== variants.length)
          fail("Menu option names must be unique.");
        if (b.recipe) {
          const ids = new Set(
            (await db.select().from(t.inventory)).map((i: any) => i.id),
          );
          if (Object.keys(b.recipe).some((id) => !ids.has(id)))
            fail("Recipe contains an unknown inventory item.");
        }
        const value = {
          id: b.id,
          name: b.name,
          price: variants[0].price,
          active: b.active,
          showOnPos: b.showOnPos ?? existing?.showOnPos ?? 1,
          showOnWebsite: b.showOnWebsite ?? existing?.showOnWebsite ?? 1,
          variants,
          recipe: b.recipe || existing?.recipe || {},
          category: b.category || existing?.category || "Coffee",
          description:
            b.description ??
            existing?.description ??
            "Prepared fresh at Lost Origin.",
          image: b.image || existing?.image || "latte",
          diet: b.diet || existing?.diet || "veg",
          section: b.section || existing?.section || "Drinks",
        };
        ops.push(
          existing
            ? db.update(t.products).set(value).where(eq(t.products.id, b.id))
            : db.insert(t.products).values(value),
        );
        if (b.ingredients !== undefined) {
          const details = { ingredients: [...new Set(b.ingredients)] };
          ops.push(
            db
              .insert(t.documents)
              .values({
                id: `product-details-${b.id}`,
                type: "productDetails",
                data: details,
              })
              .onConflictDoUpdate({
                target: t.documents.id,
                set: { data: details },
              }),
          );
        }
        ops.push(
          audit(db, existing ? "Product updated" : "Product created", b.name),
        );
        break;
      }
      case "settings": {
        const b = z
          .object({
            shopName: z.string().trim().min(2).max(50),
            tagline: z.string().max(100),
            headline: z.string().min(2).max(120),
            announcement: z.string().max(200),
            heroSlides: heroSlidesSchema.optional(),
            phone: z.string().max(20),
            email: z
              .union([z.literal(""), z.string().email().max(160)])
              .optional(),
            footerTagline: z.string().max(180).optional(),
            socialLinks: z
              .object({
                instagram: publicHttpsUrl.default(""),
                youtube: publicHttpsUrl.default(""),
                linkedin: publicHttpsUrl.default(""),
                whatsapp: publicHttpsUrl.default(""),
              })
              .optional(),
            privacyPolicy: z.string().max(5000).optional(),
            terms: z.string().max(5000).optional(),
            gstin: z.string().max(20).optional(),
            fssai: z.string().max(25).optional(),
            receiptFooter: z.string().max(200).optional(),
            receiptWidth: z.union([z.literal(58), z.literal(80)]).optional(),
            address: z.string().max(200),
            openTime: z.string().regex(/^\d{2}:\d{2}$/),
            closeTime: z.string().regex(/^\d{2}:\d{2}$/),
            paused: z.boolean(),
            slotCapacity: z.number().int().min(1).max(100),
            prepMinutes: z.number().int().min(5).max(120),
            taxRate: z.number().min(0).max(28),
            courts: z
              .array(
                z.object({
                  name: z.string().trim().min(1).max(60),
                  active: z.boolean(),
                  baseRate: z.number().int().positive().max(1000000),
                  peakRate: z.number().int().positive().max(1000000),
                  peakStart: z.number().int().min(0).max(1410).multipleOf(30),
                  open: z.number().int().min(0).max(1410).multipleOf(30),
                  close: z.number().int().min(30).max(1440).multipleOf(30),
                  equipmentRate: z.number().int().min(0).max(1000000),
                  taxRate: z.number().min(0).max(28),
                }),
              )
              .length(4),
            partnerShares: z
              .array(z.number().min(0).max(100))
              .length(3)
              .refine((v) => v.reduce((s, n) => s + n, 0) === 100),
          })
          .parse(body.value);
        if (b.openTime >= b.closeTime)
          fail("Closing time must be later than opening time.");
        if (b.courts.some((c) => c.open >= c.close))
          fail("Court closing times must be after opening times.");
        if (new Set(b.courts.map((c) => c.name)).size !== 4)
          fail("Each court needs a unique name.");
        const oldConfig = (
          await db
            .select()
            .from(t.settings)
            .where(eq(t.settings.key, "business"))
        )[0].value;
        const oldCourts = courtConfig({ business: oldConfig });
        if (b.courts.some((c, i) => c.name !== oldCourts[i]?.name)) {
          const currentBookings = await db.select().from(t.bookings);
          if (
            currentBookings.some(
              (booking: any) =>
                booking.date >= todayIST() &&
                booking.status !== "Cancelled" &&
                oldCourts.some(
                  (old, i) =>
                    old.name === booking.court &&
                    b.courts[i]?.name !== old.name,
                ),
            )
          )
            fail(
              "A court with existing bookings cannot be renamed. Keep its name or resolve its bookings first.",
            );
        }
        ops.push(
          db
            .update(t.settings)
            .set({ value: b })
            .where(eq(t.settings.key, "business")),
        );
        ops.push(
          audit(
            db,
            "Settings updated",
            "Business profile, content and ordering rules",
          ),
        );
        break;
      }
      case "popupCampaign": {
        const value = popupCampaignSchema.parse(body.value);
        ops.push(
          db
            .insert(t.documents)
            .values({
              id: "popup-campaign",
              type: "popupCampaign",
              data: value,
            })
            .onConflictDoUpdate({
              target: t.documents.id,
              set: { data: value },
            }),
        );
        ops.push(
          audit(
            db,
            "Popup campaign saved",
            `${value.title} · ${value.enabled ? "enabled" : "disabled"}`,
          ),
        );
        break;
      }
      case "campaignRegistration": {
        const b = z
          .object({
            marketingOptIn: z.boolean().default(false),
            campaignId: z.string().max(80),
            requestKey: z.string().uuid(),
            page: z.enum(["home", "menu", "book", "track"]),
            answers: z.record(z.string().max(200)),
          })
          .parse(body);
        const existing = (
          await db
            .select()
            .from(t.campaignRegistrations)
            .where(eq(t.campaignRegistrations.requestKey, b.requestKey))
        )[0];
        if (existing) {
          if (existing.campaignId !== b.campaignId)
            fail("Please reopen the campaign and try again.");
          return response({ id: existing.id, registered: true });
        }
        const document = (
          await db
            .select()
            .from(t.documents)
            .where(eq(t.documents.id, "popup-campaign"))
        )[0];
        const parsed = popupCampaignSchema.safeParse(document?.data);
        if (
          !parsed.success ||
          parsed.data.campaignId !== b.campaignId ||
          popupCampaignStatus(parsed.data) !== "Live" ||
          !parsed.data.pages.includes(b.page) ||
          !parsed.data.registrationEnabled
        )
          fail("This campaign is no longer accepting registrations.");
        const campaign = parsed.data;
        let answers: Record<string, string>;
        try {
          answers = registrationAnswers(campaign, b.answers);
        } catch (e: any) {
          fail(e.message);
        }
        const fields = campaign.fields.filter((field) => field.enabled);
        const entry = {
          marketingOptIn: b.marketingOptIn ? 1 : 0,
          id: `REG-${id.slice(0, 8).toUpperCase()}`,
          campaignId: campaign.campaignId,
          campaignTitle: campaign.title,
          answers: answers!,
          fieldLabels: Object.fromEntries(
            fields.map((field) => [field.id, field.label]),
          ),
          name:
            answers!.name ||
            fields
              .filter((field) => field.type === "text")
              .map((field) => answers![field.id])
              .find(Boolean) ||
            "",
          phone:
            fields
              .filter((field) => field.type === "tel")
              .map((field) => answers![field.id])
              .find(Boolean) || "",
          email:
            fields
              .filter((field) => field.type === "email")
              .map((field) => answers![field.id])
              .find(Boolean) || "",
          status: "New",
          requestKey: b.requestKey,
          createdAt: now,
          updatedAt: now,
        };
        ops.push(
          db.insert(t.operationGuards).values({
            id: crypto.randomUUID(),
            verified: sql`CASE WHEN (SELECT data FROM documents WHERE id = 'popup-campaign') = ${JSON.stringify(document.data)} THEN 1 ELSE 0 END`,
          }),
        );
        ops.push(db.insert(t.campaignRegistrations).values(entry));
        ops.push(
          audit(db, "Campaign registration", `${entry.id} · ${campaign.title}`),
        );
        result = { id: entry.id, registered: true };
        break;
      }
      case "campaignRegistrationStatus": {
        const b = z
          .object({
            id: z.string(),
            status: z.enum(["New", "Contacted", "Closed"]),
          })
          .parse(body);
        const existing = (
          await db
            .select()
            .from(t.campaignRegistrations)
            .where(eq(t.campaignRegistrations.id, b.id))
        )[0];
        if (!existing) fail("Registration not found.");
        ops.push(
          db
            .update(t.campaignRegistrations)
            .set({ status: b.status, updatedAt: now })
            .where(eq(t.campaignRegistrations.id, b.id)),
        );
        ops.push(audit(db, "Registration status", `${b.id} → ${b.status}`));
        break;
      }
      case "heroCampaign": {
        const b = z
          .object({
            text: z.string().trim().min(3).max(300),
            enabled: z.boolean(),
            speed: z.number().int().min(15).max(90),
          })
          .parse(body);
        ops.push(
          db
            .insert(t.documents)
            .values({ id: "hero-announcement", type: "heroCampaign", data: b })
            .onConflictDoUpdate({ target: t.documents.id, set: { data: b } }),
        );
        ops.push(
          audit(
            db,
            "Hero campaign",
            `${b.enabled ? "enabled" : "disabled"} · ${b.text}`,
          ),
        );
        break;
      }
      case "campaign": {
        const b = z.object({ id: z.string(), active: z.boolean() }).parse(body);
        const d = (
          await db.select().from(t.documents).where(eq(t.documents.id, b.id))
        )[0];
        if (!d || d.type !== "campaign") fail("Campaign not found.");
        if (b.id !== "camp-first" && b.active)
          fail("Configure this draft campaign before activating it.");
        ops.push(
          db
            .update(t.documents)
            .set({ data: { ...d.data, active: b.active } })
            .where(eq(t.documents.id, b.id)),
        );
        ops.push(
          audit(
            db,
            "Campaign changed",
            `${d.data.name} · ${b.active ? "active" : "paused"}`,
          ),
        );
        break;
      }
      case "reply": {
        const b = z
          .object({ id: z.string(), reply: z.string().trim().min(1).max(1000) })
          .parse(body);
        const d = (
          await db.select().from(t.documents).where(eq(t.documents.id, b.id))
        )[0];
        if (!d || d.type !== "message") fail("Conversation not found.");
        ops.push(
          db
            .update(t.documents)
            .set({ data: { ...d.data, reply: b.reply, unread: false } })
            .where(eq(t.documents.id, b.id)),
        );
        ops.push(audit(db, "Demo reply saved", d.data.name));
        break;
      }
      default:
        return response({ error: "Unknown action." }, 400);
    }
    ops.push(
      db
        .insert(t.realtimeClock)
        .values({ id: "workspace", version: 1 })
        .onConflictDoUpdate({
          target: t.realtimeClock.id,
          set: { version: sql`${t.realtimeClock.version}+1` },
        }),
    );
    let emailId = "";
    const finalCourtBill =
      body.action === "bookingStatus" && body.status === "Completed";
    if (
      (["order", "booking"].includes(body.action) || finalCourtBill) &&
      result.email
    ) {
      const config = await communicationSettings();
      if (config.emailEnabled) {
        const business =
          (
            await db
              .select()
              .from(t.settings)
              .where(eq(t.settings.key, "business"))
          )[0]?.value || {};
        const notification = queuedNotification(
          "email",
          result.id,
          result.email,
          {
            kind: finalCourtBill ? "booking" : body.action,
            record: result,
            business,
            subject: finalCourtBill
              ? `Your court bill · ${result.id}`
              : body.action === "booking"
                ? `Booking confirmed · ${result.id}`
                : `Order confirmed · ${result.id}`,
          },
          `${finalCourtBill ? "completed-bill-email" : "confirmation-email"}:${result.id}`,
        );
        emailId = notification.id;
        ops.push(
          db
            .insert(notificationJobs)
            .values(notification)
            .onConflictDoNothing(),
        );
      } else result.emailDelivery = { status: "Disabled" };
    }
    await db.batch(ops);
    if (emailId)
      result.emailDelivery = await submitNotification(emailId).catch(() => ({
        status: "Pending",
        detail: "Your transaction is saved. Email delivery is pending.",
      }));
    return response(result);
  } catch (e: any) {
    if (e instanceof z.ZodError)
      return response({ error: e.errors[0].message }, 400);
    if (e instanceof BusinessError) return response({ error: e.message }, 400);
    const message = [
      e?.message,
      e?.cause?.message,
      e?.cause?.cause?.message,
    ].join(" ");
    if (
      /court_date_slot|booking_slots.*UNIQUE|UNIQUE.*booking_slots/.test(
        message,
      )
    )
      return response(
        { error: "Someone just booked that slot. Please choose another." },
        409,
      );
    if (/UNIQUE|nonnegative_stock|CHECK constraint/.test(message))
      return response(
        {
          error:
            "This record changed while you were working. Refresh and try again.",
        },
        409,
      );
    console.error(e);
    return response(
      { error: "The database could not save this change. Please try again." },
      500,
    );
  }
}
