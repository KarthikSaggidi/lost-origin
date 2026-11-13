import { testClient } from "./test-client.mjs";
import assert from "node:assert/strict";
import { todayIST } from "../lib/domain.ts";
const { base, fetch } = await testClient();
const state = async () => {
  const r = await fetch(base + "/api/v1/state");
  assert.equal(r.status, 200);
  return r.json();
};
const post = async (action, values) => {
  const r = await fetch(base + "/api/v1/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...values }),
  });
  return { status: r.status, body: await r.json() };
};
const before = await state();
assert.equal(before.products.filter((p) => p.active).length, 35);
assert.equal(before.settings.business.courts.length, 4);
const stock = (s, id) => s.inventory.find((i) => i.id === id).quantity;
const day = todayIST(new Date(Date.now() + 86400000));
const request = {
  customer: "Lost Origin integration test",
  phone: "9876543210",
  email: "integration@example.invalid",
  source: "Online",
  paymentMode: "UPI",
  requestKey: crypto.randomUUID(),
  pickupAt: day + "T09:00:00+05:30",
  items: [
    { id: "espresso", variant: "Hot", quantity: 1, price: 1 },
    { id: "espresso", variant: "Cold", quantity: 1, price: 1 },
  ],
};
const order = await post("order", request);
assert.equal(order.status, 200, JSON.stringify(order));
assert.equal(order.body.subtotal, 23000);
assert.equal(
  order.body.tax,
  Math.round((23000 * before.settings.business.taxRate) / 100),
);
const id = order.body.id;
const after = await state();
assert.equal(stock(before, "beans") - stock(after, "beans"), 36);
assert.equal(stock(before, "cups") - stock(after, "cups"), 2);
assert.equal((await post("order", request)).body.id, id);
assert.equal(stock(await state(), "beans"), stock(after, "beans"));
assert.equal(
  (await post("orderStatus", { id, status: "Completed" })).status,
  400,
);
assert.equal(
  (await post("orderStatus", { id, status: "Cancelled" })).status,
  200,
);
assert.equal(
  (await post("orderStatus", { id, status: "Cancelled" })).status,
  200,
);
const restored = await state();
assert.equal(stock(restored, "beans"), stock(before, "beans"));
assert.equal(
  restored.payments
    .filter((p) => p.reference === id)
    .reduce((sum, p) => sum + p.amount, 0),
  0,
);
assert.equal(
  (
    await post("order", {
      ...request,
      requestKey: crypto.randomUUID(),
      items: [{ id: "espresso", variant: "Large", quantity: 1 }],
    })
  ).status,
  400,
);
assert.equal(
  (
    await post("order", {
      ...request,
      requestKey: crypto.randomUUID(),
      items: [{ id: "espresso", variant: "Hot", quantity: 1, size: "Large" }],
    })
  ).status,
  400,
);
assert.equal(
  (
    await post("order", {
      ...request,
      requestKey: crypto.randomUUID(),
      phone: "123",
    })
  ).status,
  400,
);
assert.equal(
  (
    await post("order", {
      ...request,
      requestKey: crypto.randomUUID(),
      coupon: "FIRSTBREW",
    })
  ).status,
  400,
);
const date = todayIST(new Date(Date.now() + 5 * 86400000));
const booking = {
  customer: "Four court test",
  email: "integration@example.invalid",
  phone: "9876543210",
  date,
  start: 600,
  duration: 60,
  players: 4,
  equipment: false,
};
const all = await Promise.all(
  before.settings.business.courts.map((c) =>
    post("booking", {
      ...booking,
      court: c.name,
      requestKey: crypto.randomUUID(),
    }),
  ),
);
assert.ok(
  all.every((r) => r.status === 200),
  JSON.stringify(all),
);
const collision = await post("booking", {
  ...booking,
  court: "Court 04",
  start: 630,
  requestKey: crypto.randomUUID(),
});
assert.equal(collision.status, 409, JSON.stringify(collision));
assert.equal(
  (
    await post("booking", {
      ...booking,
      court: "Court 05",
      requestKey: crypto.randomUUID(),
    })
  ).status,
  400,
);
for (const r of all)
  assert.equal(
    (await post("bookingStatus", { id: r.body.id, status: "Cancelled" }))
      .status,
    200,
  );
const contenders = await Promise.all([
  post("booking", {
    ...booking,
    court: "Court 04",
    requestKey: crypto.randomUUID(),
  }),
  post("booking", {
    ...booking,
    court: "Court 04",
    start: 630,
    requestKey: crypto.randomUUID(),
  }),
]);
assert.equal(contenders.filter((r) => r.status === 200).length, 1);
assert.equal(contenders.filter((r) => r.status === 409).length, 1);
await post("bookingStatus", {
  id: contenders.find((r) => r.status === 200).body.id,
  status: "Cancelled",
});
// Subscribe before a write: a new committed revision must arrive without a page refresh.
const controller = new AbortController();
const events = await fetch(base + "/api/v1/events", {
  signal: controller.signal,
});
assert.equal(events.status, 200);
const reader = events.body.getReader();
let buffer = "";
const decoder = new TextDecoder();
async function nextVersion() {
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    while (true) {
      const match = buffer.match(/data: (\{[^\n]+\})\n\n/);
      if (match) {
        buffer = buffer.slice(match.index + match[0].length);
        return JSON.parse(match[1]).version;
      }
      const { value, done } = await reader.read();
      assert.equal(done, false);
      buffer += decoder.decode(value);
    }
  } finally {
    clearTimeout(timeout);
  }
}
const first = await nextVersion();
const product = before.products.find((p) => p.id === "espresso");
const changed = await post("product", {
  id: product.id,
  name: product.name,
  price: product.price,
  active: 1,
  variants: product.variants.map((v) => ({ ...v, price: v.price + 100 })),
});
assert.equal(changed.status, 200);
assert.ok((await nextVersion()) > first);
controller.abort();
await post("product", {
  id: product.id,
  name: product.name,
  price: product.price,
  active: 1,
  variants: product.variants,
});
const final = await state();
assert.ok(
  final.journals.every(
    (j) =>
      j.lines.reduce((sum, line) => sum + line.debit - line.credit, 0) === 0,
  ),
);
console.log(
  "PASS: 35-item import, four independent courts, exact Hot/Cold prices and separate tax, tamper protection, idempotency, stock/reversal integrity, invalid option rejection, concurrent conflicts, cancellation release, SSE live revisions, balanced journals.",
);
