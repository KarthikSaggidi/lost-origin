import { testClient } from "./test-client.mjs";
import assert from "node:assert/strict";
const { base, fetch } = await testClient();
const state = async () => await (await fetch(base + "/api/v1/state")).json();
const post = async (action, values) => {
  const response = await fetch(base + "/api/v1/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...values }),
  });
  return { status: response.status, body: await response.json() };
};
const before = await state();
const beans = before.inventory.find((i) => i.id === "beans");
const requestKey = crypto.randomUUID();
assert.equal(
  (
    await post("stock", {
      id: "beans",
      quantity: 1,
      reason: "Purchase",
      requestKey,
    })
  ).status,
  200,
);
assert.equal(
  (
    await post("stock", {
      id: "beans",
      quantity: 1,
      reason: "Purchase",
      requestKey,
    })
  ).body.duplicate,
  true,
);
const after = await state();
assert.equal(
  after.inventory.find((i) => i.id === "beans").quantity,
  beans.quantity + 1,
);
assert.equal(after.stockLedger.filter((l) => l.id === requestKey).length, 1);
assert.equal(
  (
    await post("stock", {
      id: "beans",
      targetQuantity: beans.quantity,
      reason: "Physical count",
      requestKey: crypto.randomUUID(),
    })
  ).status,
  200,
);
const unchanged = await post("stock", {
  id: "beans",
  targetQuantity: beans.quantity,
  reason: "Physical count",
});
assert.equal(unchanged.body.unchanged, true);
const expenseKey = crypto.randomUUID();
const expense = {
  description: "Import validation test",
  category: "Supplies",
  amount: 123,
  requestKey: expenseKey,
};
assert.equal((await post("expense", expense)).status, 200);
assert.equal((await post("expense", expense)).body.duplicate, true);
const suffix = crypto.randomUUID().slice(0, 8);
const itemId = "import-stock-" + suffix;
const item = {
  id: itemId,
  name: "Import test stock",
  unit: "pcs",
  quantity: 0,
  reorder: 0,
  cost: 100,
};
assert.equal((await post("inventoryItem", item)).status, 200);
assert.equal(
  (await post("inventoryItem", { ...item, quantity: 50 })).body.duplicate,
  true,
);
const productId = "import-product-" + suffix;
const product = {
  id: productId,
  name: "Import test product",
  category: "Coffee",
  description: "Import test",
  price: 12500,
  active: 0,
  variants: [{ label: "Standard", price: 12500 }],
  recipe: { [itemId]: 1 },
};
assert.equal((await post("product", product)).status, 200);
assert.equal(
  (await post("product", { ...product, name: "Updated import test product" }))
    .status,
  200,
);
const final = await state();
assert.equal(final.expenses.filter((e) => e.id === expenseKey).length, 1);
assert.equal(
  final.journals.filter((j) => j.id === "j-" + expenseKey).length,
  1,
);
assert.equal(final.inventory.find((i) => i.id === itemId).quantity, 0);
assert.equal(
  final.products.find((p) => p.id === productId).name,
  "Updated import test product",
);
assert.ok(
  final.journals.every(
    (j) =>
      j.lines.reduce((sum, line) => sum + line.debit - line.credit, 0) === 0,
  ),
);
console.log(
  "PASS: stock movement retry deduplication, guarded physical counts, expense retry deduplication, opening inventory, new catalogue imports and balanced journals.",
);

const instantStart = Date.now();
const counter = await post("order", {
  source: "Counter",
  paymentMode: "Cash",
  requestKey: crypto.randomUUID(),
  pickupAt: "not-a-slot",
  items: [{ id: "espresso", variant: "Cold", quantity: 1 }],
});
assert.equal(counter.status, 200, JSON.stringify(counter));
assert.equal(counter.body.customer, "Walk-in customer");
assert.equal(counter.body.phone, "");
assert.ok(new Date(counter.body.pickupAt).getTime() >= instantStart - 1000);
assert.ok(new Date(counter.body.pickupAt).getTime() <= Date.now() + 1000);
assert.equal(
  (await post("orderStatus", { id: counter.body.id, status: "Cancelled" }))
    .status,
  200,
);
const missingSlot = await post("order", {
  source: "Online",
  customer: "Online test",
  email: "integration@example.invalid",
  phone: "9876543210",
  paymentMode: "UPI",
  requestKey: crypto.randomUUID(),
  items: [{ id: "espresso", variant: "Hot", quantity: 1 }],
});
assert.equal(missingSlot.status, 400);
assert.match(missingSlot.body.error, /pickup time/);
console.log(
  "PASS: instant POS ignores scheduling, accepts walk-ins without phone details, and online checkout still requires a pickup time.",
);

const originalBillTime = new Date(Date.now() - 60000).toISOString();
const offline = await post("order", {
  source: "Counter",
  paymentMode: "Cash",
  requestKey: crypto.randomUUID(),
  offline: true,
  createdAt: originalBillTime,
  offlineTaxRate: 0,
  items: [{ id: "espresso", variant: "Cold", quantity: 1, price: 12000 }],
});
assert.equal(offline.status, 200, JSON.stringify(offline));
assert.equal(offline.body.total, 12000);
assert.equal(offline.body.tax, 0);
assert.equal(offline.body.pickupAt, originalBillTime);
assert.equal(
  (await post("orderStatus", { id: offline.body.id, status: "Cancelled" }))
    .status,
  200,
);
console.log(
  "PASS: offline counter bills retain their original bill time and tax rate, including a zero-tax configuration.",
);
