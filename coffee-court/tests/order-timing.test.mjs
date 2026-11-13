import test from "node:test";
import assert from "node:assert/strict";
import { resolveOrderTime } from "../lib/order-timing.ts";
import { receiptHTML } from "../lib/print-documents.ts";
import { planImport } from "../lib/workspace-data.ts";
const settings = { openTime: "09:00", closeTime: "22:00", prepMinutes: 15 };
test("POS has no slot: it uses the current instant even outside online ordering hours", () => {
  const now = new Date("2026-11-10T23:40:00+05:30");
  assert.equal(
    resolveOrderTime({ source: "Counter" }, settings, now),
    now.toISOString(),
  );
  assert.equal(
    resolveOrderTime({ source: "Counter", pickupAt: "invalid" }, settings, now),
    now.toISOString(),
  );
  assert.equal(
    resolveOrderTime(
      { source: "Counter", pickupAt: "2026-11-12T11:00:00+05:30" },
      settings,
      now,
    ),
    now.toISOString(),
  );
});
test("offline POS preserves the instant it was billed, not a future pickup slot", () => {
  const now = new Date("2026-11-10T23:40:00+05:30");
  const createdAt = "2026-11-10T23:00:00+05:30";
  assert.equal(
    resolveOrderTime(
      { source: "Counter", offline: true, createdAt },
      settings,
      now,
    ),
    new Date(createdAt).toISOString(),
  );
  assert.throws(() =>
    resolveOrderTime(
      { source: "Counter", offline: true, createdAt: "invalid" },
      settings,
      now,
    ),
  );
});
test("online orders still need a valid pickup slot, opening hours and preparation time", () => {
  const now = new Date("2026-11-10T10:00:00+05:30");
  assert.throws(
    () => resolveOrderTime({ source: "Online" }, settings, now),
    /pickup time/,
  );
  assert.throws(
    () =>
      resolveOrderTime(
        { source: "Online", pickupAt: "2026-11-10T10:05:00+05:30" },
        settings,
        now,
      ),
    /15 minutes/,
  );
  assert.throws(
    () =>
      resolveOrderTime(
        { source: "Online", pickupAt: "2026-11-10T23:00:00+05:30" },
        settings,
        now,
      ),
    /opening hours/,
  );
  assert.equal(
    resolveOrderTime(
      { source: "Online", pickupAt: "2026-11-10T10:15:00+05:30" },
      settings,
      now,
    ),
    new Date("2026-11-10T10:15:00+05:30").toISOString(),
  );
});
test("counter imports do not require customer details or a pickup time", () => {
  const data = {
    products: [{ id: "espresso", variants: [{ label: "Hot", price: 11000 }] }],
    orders: [],
  };
  const plan = planImport(
    "orders",
    [{ product_id: "espresso", quantity: 1 }],
    data,
  )[0];
  assert.equal(plan.values.customer, "Walk-in customer");
  assert.equal(plan.values.phone, "");
  assert.equal(plan.values.pickupAt, undefined);
});
test("counter receipts omit pickup scheduling; online receipts retain it", () => {
  const order = {
    id: "LO-test",
    customer: "Walk-in customer",
    phone: "",
    source: "Counter",
    status: "Received",
    paymentStatus: "Demo paid",
    paymentMode: "Cash",
    subtotal: 11000,
    discount: 0,
    tax: 550,
    total: 11550,
    items: [{ name: "Espresso", quantity: 1, price: 11000 }],
    createdAt: "2026-11-10T10:00:00Z",
    pickupAt: "2026-11-10T10:00:00Z",
  };
  const counter = receiptHTML(order, {}, 80, "http://localhost");
  assert.ok(!counter.includes("Pickup:"));
  assert.ok(!counter.includes("PICKUP CODE"));
  assert.ok(counter.includes("COUNTER BILL"));
  const online = receiptHTML(
    { ...order, source: "Online" },
    {},
    80,
    "http://localhost",
  );
  assert.ok(online.includes("Pickup:"));
  assert.ok(online.includes("PICKUP CODE"));
});
