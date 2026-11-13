import { getDb } from "../db";
import * as t from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { demoData, menu, initialStock } from "./seed";
import { ensureLostOriginCatalogue } from "./catalogue-sync";
import { lostOriginMenu } from "./lost-origin-catalogue";
import { isBalanced, type JournalLine } from "./domain";

export function journal(
  id: string,
  reference: string,
  description: string,
  lines: JournalLine[],
  createdAt = new Date().toISOString(),
) {
  if (!isBalanced(lines))
    throw new Error("Journal debits and credits must balance.");
  return { id, reference, description, lines, createdAt };
}
export function saleJournal(
  id: string,
  source: string,
  total: number,
  tax: number,
  mode: string,
  createdAt?: string,
) {
  return journal(
    `j-${id}`,
    id,
    `${source} sale`,
    [
      {
        account:
          mode === "Pay at counter"
            ? "Accounts receivable"
            : mode === "Cash"
              ? "Cash in hand"
              : "Demo payment clearing",
        debit: total,
        credit: 0,
      },
      {
        account: source === "Court" ? "Court revenue" : "Café revenue",
        debit: 0,
        credit: total - tax,
      },
      { account: "Output tax", debit: 0, credit: tax },
    ],
    createdAt,
  );
}
export async function seed() {
  const db: any = getDb();
  if (
    (await db.select().from(t.settings).where(eq(t.settings.key, "seeded")))
      .length
  ) {
    await ensureLostOriginCatalogue();
    return;
  }
  const { orders, bookings } = demoData();
  const ops: any[] = [];
  for (const p of menu)
    ops.push(db.insert(t.products).values(p).onConflictDoNothing());
  for (const s of initialStock) {
    ops.push(db.insert(t.inventory).values(s).onConflictDoNothing());
    ops.push(
      db
        .insert(t.stockLedger)
        .values({
          id: `opening-${s.id}`,
          item: s.id,
          delta: s.quantity,
          reason: "Opening balance",
          reference: "DEMO-OPEN",
          createdAt: new Date().toISOString(),
        })
        .onConflictDoNothing(),
    );
  }
  for (const o of orders) {
    ops.push(db.insert(t.orders).values(o).onConflictDoNothing());
    ops.push(
      db
        .insert(t.payments)
        .values({
          id: `pay-${o.id}`,
          reference: o.id,
          source: o.source,
          mode: o.paymentMode,
          amount: o.total,
          status: "Demo paid",
          createdAt: o.createdAt,
        })
        .onConflictDoNothing(),
    );
    ops.push(
      db
        .insert(t.journals)
        .values(
          saleJournal(
            o.id,
            o.source,
            o.total,
            o.tax,
            o.paymentMode,
            o.createdAt,
          ),
        )
        .onConflictDoNothing(),
    );
    const cost = o.items.reduce(
      (sum: number, i: any) =>
        sum +
        Object.entries(menu.find((p) => p.id === i.id)!.recipe).reduce(
          (c, [id, q]) =>
            c + q * (initialStock.find((s) => s.id === id)?.cost || 0),
          0,
        ) *
          i.quantity,
      0,
    );
    ops.push(
      db
        .insert(t.journals)
        .values(
          journal(
            `cogs-${o.id}`,
            o.id,
            "Ingredient cost",
            [
              { account: "Cost of goods sold", debit: cost, credit: 0 },
              { account: "Inventory", debit: 0, credit: cost },
            ],
            o.createdAt,
          ),
        )
        .onConflictDoNothing(),
    );
  }
  for (const b of bookings) {
    ops.push(db.insert(t.bookings).values(b).onConflictDoNothing());
    for (let slot = b.start; slot < b.start + b.duration; slot += 30)
      ops.push(
        db
          .insert(t.bookingSlots)
          .values({
            id: `${b.id}-${slot}`,
            bookingId: b.id,
            court: b.court,
            date: b.date,
            slot,
          })
          .onConflictDoNothing(),
      );
    ops.push(
      db
        .insert(t.payments)
        .values({
          id: `pay-${b.id}`,
          reference: b.id,
          source: "Court",
          mode: "UPI",
          amount: b.total,
          status: "Demo paid",
          createdAt: b.createdAt,
        })
        .onConflictDoNothing(),
    );
    ops.push(
      db
        .insert(t.journals)
        .values(
          saleJournal(
            b.id,
            "Court",
            b.total,
            b.total - Math.round(b.total / 1.18),
            "UPI",
            b.createdAt,
          ),
        )
        .onConflictDoNothing(),
    );
  }
  const config = {
    shopName: "Coffee & Court",
    tagline: "Good coffee. Great games.",
    headline: "A little coffee.\nA little court time.",
    announcement: "A good first sip, on us. Use FIRSTBREW for 10% off.",
    phone: "",
    address: "Hyderabad, Telangana",
    openTime: "06:00",
    closeTime: "22:00",
    paused: false,
    slotCapacity: 12,
    prepMinutes: 15,
    taxRate: 5,
    partnerShares: [34, 33, 33],
  };
  ops.push(
    db
      .insert(t.settings)
      .values({ key: "business", value: config })
      .onConflictDoNothing(),
  );
  const docs = [
    {
      id: "camp-first",
      type: "campaign",
      data: {
        name: "Your first brew",
        code: "FIRSTBREW",
        discount: 10,
        audience: "Everyone",
        channel: "Website",
        active: true,
        description: "10% off, up to ₹100. One active preview coupon.",
      },
    },
    {
      id: "camp-play",
      type: "campaign",
      data: {
        name: "Coffee meets court",
        code: "PLAYMORE",
        discount: 20,
        audience: "Court players",
        channel: "WhatsApp",
        active: false,
        description: "Draft campaign. Not redeemable until configured.",
      },
    },
    {
      id: "msg-one",
      type: "message",
      data: {
        name: "Ananya Rao",
        message: "Hi! Do you have oat milk available?",
        time: "10:42 AM",
        unread: true,
        reply: "",
      },
    },
    {
      id: "msg-two",
      type: "message",
      data: {
        name: "Rahul Mehta",
        message: "Can I rent paddles for our game this evening?",
        time: "10:18 AM",
        unread: false,
        reply: "Paddle rental is available for ₹100 per booking.",
      },
    },
    {
      id: "msg-three",
      type: "message",
      data: {
        name: "Priya Sharma",
        message: "Thank you! The cold brew was lovely ☕",
        time: "Yesterday",
        unread: false,
        reply: "",
      },
    },
  ];
  for (const d of docs)
    ops.push(db.insert(t.documents).values(d).onConflictDoNothing());
  for (let i = 0; i < ops.length; i += 60) await db.batch(ops.slice(i, i + 60));
  await db
    .insert(t.settings)
    .values({ key: "seeded", value: true })
    .onConflictDoNothing();
  await ensureLostOriginCatalogue();
}
export async function getState() {
  await seed();
  const db: any = getDb();
  const [
    products,
    inventory,
    orders,
    bookings,
    payments,
    expenses,
    journals,
    stockLedger,
    documents,
    settings,
    auditLogs,
    revisionRows,
    registrations,
  ] = await db.batch([
    db.select().from(t.products),
    db.select().from(t.inventory),
    db.select().from(t.orders).orderBy(desc(t.orders.createdAt)),
    db.select().from(t.bookings).orderBy(desc(t.bookings.date)),
    db.select().from(t.payments).orderBy(desc(t.payments.createdAt)),
    db.select().from(t.expenses).orderBy(desc(t.expenses.createdAt)),
    db.select().from(t.journals).orderBy(desc(t.journals.createdAt)),
    db.select().from(t.stockLedger).orderBy(desc(t.stockLedger.createdAt)),
    db.select().from(t.documents),
    db.select().from(t.settings),
    db
      .select()
      .from(t.auditLogs)
      .orderBy(desc(t.auditLogs.createdAt))
      .limit(100),
    db
      .select()
      .from(t.realtimeClock)
      .where(eq(t.realtimeClock.id, "workspace")),
    db
      .select()
      .from(t.campaignRegistrations)
      .orderBy(desc(t.campaignRegistrations.createdAt)),
  ]);
  const revision = revisionRows[0]?.version || 0;
  products.sort(
    (a: any, b: any) =>
      (lostOriginMenu.findIndex((p) => p.id === a.id) + 1 || 999) -
      (lostOriginMenu.findIndex((p) => p.id === b.id) + 1 || 999),
  );
  return {
    revision,
    registrations,
    products: products.map((product: any) => {
      const details = documents.find(
        (document: any) =>
          document.id === `product-details-${product.id}` &&
          document.type === "productDetails",
      );
      return details
        ? { ...product, ingredients: details.data.ingredients }
        : product;
    }),
    inventory,
    orders,
    bookings,
    payments,
    expenses,
    journals,
    stockLedger,
    documents,
    settings: Object.fromEntries(settings.map((s: any) => [s.key, s.value])),
    auditLogs,
  };
}
export const audit = (db: any, action: string, detail: string) =>
  db.insert(t.auditLogs).values({
    id: crypto.randomUUID(),
    action,
    detail,
    createdAt: new Date().toISOString(),
  });
export { t, eq, sql };
