import { testClient } from "./test-client.mjs";
import assert from "node:assert/strict";
import { todayIST } from "../lib/domain.ts";
const { base, fetch } = await testClient();
const post = async (action, values) => {
  const r = await fetch(base + "/api/v1/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...values }),
  });
  return { status: r.status, body: await r.json() };
};
const date = todayIST(new Date(Date.now() + 86400000));
const created = await post("order", {
  customer: "Concurrent action test",
  phone: "9876543210",
  source: "Counter",
  paymentMode: "Pay at counter",
  requestKey: crypto.randomUUID(),
  pickupAt: date + "T11:00:00+05:30",
  items: [
    { id: "americano", quantity: 1, size: "Regular", milk: "", shot: false },
  ],
});
assert.equal(created.status, 200);
const id = created.body.id;
const outcomes = await Promise.all([
  post("collectPayment", { id, mode: "Cash" }),
  post("orderStatus", { id, status: "Cancelled" }),
]);
assert.ok(
  outcomes.every((r) => [200, 400, 409].includes(r.status)),
  JSON.stringify(outcomes),
);
let state = await (await fetch(base + "/api/v1/state")).json();
if (state.orders.find((o) => o.id === id).status !== "Cancelled")
  assert.equal(
    (await post("orderStatus", { id, status: "Cancelled" })).status,
    200,
  );
state = await (await fetch(base + "/api/v1/state")).json();
assert.equal(
  state.payments
    .filter(
      (p) => p.reference === id && !["Pending", "Void"].includes(p.status),
    )
    .reduce((s, p) => s + p.amount, 0),
  0,
);
assert.ok(
  state.journals.every(
    (j) => j.lines.reduce((s, l) => s + l.debit - l.credit, 0) === 0,
  ),
);
const offline = await post("order", {
  customer: "Offline price test",
  phone: "9876543210",
  source: "Counter",
  paymentMode: "Cash",
  offline: true,
  createdAt: new Date().toISOString(),
  requestKey: crypto.randomUUID(),
  pickupAt: date + "T11:15:00+05:30",
  items: [
    {
      id: "americano",
      quantity: 1,
      size: "Regular",
      milk: "",
      shot: false,
      price: 11000,
    },
  ],
});
assert.equal(offline.status, 200, JSON.stringify(offline));
assert.equal(offline.body.total, 11550);
assert.equal(
  (await post("orderStatus", { id: offline.body.id, status: "Cancelled" }))
    .status,
  200,
);
console.log(
  "PASS: simultaneous collection/cancellation preserves zero net collections after cancellation; journals stay balanced; offline counter prices survive sync.",
);
