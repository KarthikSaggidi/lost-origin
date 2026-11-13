import test from "node:test";
import assert from "node:assert/strict";
import {
  csvText,
  parseCSV,
  readImport,
  planImport,
  rupeesToPaise,
  stableRequestKey,
  pageData,
} from "../lib/workspace-data.ts";
import { receiptHTML, pageHTML, escapeHTML } from "../lib/print-documents.ts";
const data = {
  products: [
    {
      id: "espresso",
      name: "Espresso",
      price: 11000,
      active: 1,
      variants: [
        { label: "Hot", price: 11000 },
        { label: "Cold", price: 12000 },
      ],
      recipe: { beans: 18 },
    },
  ],
  inventory: [{ id: "beans", name: "Coffee beans", quantity: 100, unit: "g" }],
  orders: [{ id: "LO-existing", paymentStatus: "Pending", status: "Received" }],
  bookings: [],
  payments: [],
  expenses: [],
  documents: [],
  settings: {
    business: {
      shopName: "Lost Origin",
      courts: [{ name: "Court 01", active: true }],
      partnerShares: [34, 33, 33],
    },
  },
  auditLogs: [],
};
test("CSV preserves commas, escaped quotes, embedded newlines and structured JSON", () => {
  const rows = [
    {
      id: "one",
      name: 'A, "quoted"\nname',
      variants: [{ label: "Cold", price: 12000 }],
    },
  ];
  const parsed = parseCSV(csvText(rows));
  assert.equal(parsed[0].name, rows[0].name);
  assert.deepEqual(JSON.parse(parsed[0].variants), rows[0].variants);
});
test("malformed CSV and unsafe/duplicate headers are rejected", () => {
  assert.throws(() => parseCSV('id,name\n"unfinished,x'));
  assert.throws(() => parseCSV("id,id\n1,2"));
  assert.throws(() => parseCSV("__proto__,id\nx,1"));
  assert.throws(() => parseCSV("id,name\n1"));
  assert.throws(() =>
    readImport(
      JSON.stringify(Array.from({ length: 101 }, () => ({ id: 1 }))),
      true,
    ),
  );
});
test("spreadsheet formula-like text is neutralized while numeric values stay numeric", () => {
  const rows = parseCSV(
    csvText([{ name: "=1+1", amount: -50, extra: "@SUM(A1)" }]),
  );
  assert.equal(rows[0].name, "'=1+1");
  assert.equal(rows[0].amount, "-50");
  assert.equal(rows[0].extra, "'@SUM(A1)");
});
test("rupee conversion uses exact decimal paise and rejects hidden rounding", () => {
  assert.equal(rupeesToPaise("₹1,234.05"), 123405);
  assert.throws(() => rupeesToPaise("1.005"));
  assert.throws(() => rupeesToPaise("-10"));
  assert.throws(() => rupeesToPaise("0"));
});
test("stock snapshots are counts, movement files are deltas, and unchanged counts are skipped", () => {
  const count = planImport(
    "inventory",
    [{ id: "beans", quantity: "120" }],
    data,
  )[0];
  assert.equal(count.values.targetQuantity, 120);
  assert.equal(count.values.reason, "Physical count");
  assert.equal(
    planImport("inventory", [{ id: "beans", quantity: "100" }], data)[0].skip,
    true,
  );
  assert.equal(
    planImport(
      "inventory",
      [{ id: "beans", delta: "20", reason: "Purchase" }],
      data,
    )[0].values.quantity,
    20,
  );
  assert.throws(() =>
    planImport(
      "inventory",
      [{ id: "beans", delta: -101, reason: "Wastage" }],
      data,
    ),
  );
});
test("existing financial histories remain unchanged and expenses respect explicit units", () => {
  const order = planImport(
    "orders",
    [
      {
        id: "LO-existing",
        customer: "Test",
        phone: "9876543210",
        product_id: "espresso",
        pickup_at: "2026-11-11T10:00:00+05:30",
      },
    ],
    data,
  )[0];
  assert.equal(order.skip, true);
  assert.equal(
    planImport(
      "expenses",
      [{ description: "Supplies", amount_rupees: "123.45" }],
      data,
    )[0].values.amount,
    12345,
  );
  assert.equal(
    planImport(
      "expenses",
      [{ description: "Supplies", amount: 12345 }],
      data,
    )[0].values.amount,
    12345,
  );
});
test("partner allocations validate all three identities and a 100% total", () => {
  assert.deepEqual(
    planImport(
      "partners",
      [
        { partner: 1, share_percent: 40 },
        { partner: 2, share_percent: 30 },
        { partner: 3, share_percent: 30 },
      ],
      data,
    )[0].values.value.partnerShares,
    [40, 30, 30],
  );
  assert.throws(() =>
    planImport(
      "partners",
      [
        { partner: 1, share_percent: 40 },
        { partner: 1, share_percent: 30 },
        { partner: 3, share_percent: 30 },
      ],
      data,
    ),
  );
});
test("import retry keys are deterministic UUIDs and distinguish rows", async () => {
  const first = await stableRequestKey("file\n1");
  assert.equal(first, await stableRequestKey("file\n1"));
  assert.notEqual(first, await stableRequestKey("file\n2"));
  assert.match(
    first,
    /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
  );
});
test("every admin page has a corresponding export dataset", () => {
  for (const view of [
    "overview",
    "orders",
    "pos",
    "kitchen",
    "courts",
    "inventory",
    "products",
    "payments",
    "accounting",
    "partners",
    "campaigns",
    "website",
    "whatsapp",
    "reports",
    "settings",
  ])
    assert.ok(Array.isArray(pageData(view, data).rows), view);
});
const order = {
  id: "LO-test",
  customer: "A <script>alert(1)</script>",
  phone: "9876543210",
  source: "Counter",
  status: "Received",
  paymentStatus: "Demo paid",
  paymentMode: "Cash",
  subtotal: 24000,
  discount: 0,
  tax: 1200,
  total: 25200,
  items: [{ name: "Espresso", variant: "Cold", price: 12000, quantity: 2 }],
  createdAt: "2026-11-10T10:00:00+05:30",
  pickupAt: "2026-11-10T10:15:00+05:30",
  notes: "Less ice",
};
test("thermal receipts use physical paper widths and retain item/tax/total/payment details", () => {
  for (const width of [58, 80]) {
    const html = receiptHTML(
      order,
      data.settings.business,
      width,
      "http://127.0.0.1:5173",
    );
    assert.ok(html.includes(`size:${width}mm`));
    assert.ok(html.includes("₹252.00"));
    assert.ok(html.includes("Tax (5%)"));
    assert.ok(html.includes("Cold"));
    assert.ok(html.includes("DEMO RECEIPT"));
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  }
  assert.ok(
    receiptHTML(
      { ...order, status: "Cancelled" },
      data.settings.business,
      80,
      "http://localhost",
    ).includes("CANCELLED / VOID"),
  );
});
test("A4 snapshots include the requested development credit", () => {
  assert.ok(
    pageHTML(
      "<p>Report</p>",
      "Reports",
      data.settings.business,
      false,
      "http://localhost",
    ).includes("Designed and developed by DropXcorp Pvt Ltd"),
  );
  assert.equal(escapeHTML("<b>"), "&lt;b&gt;");
});

test("new menu items accept exact variant JSON without a redundant base price", () => {
  const plan = planImport(
    "products",
    [
      {
        id: "new-cold-coffee",
        name: "New coffee",
        category: "Coffee",
        variants: [{ label: "Cold", price: 18000 }],
      },
    ],
    data,
  )[0];
  assert.equal(plan.values.price, 18000);
  assert.equal(plan.values.name, "New coffee");
  assert.throws(() =>
    planImport(
      "products",
      [{ id: "x", name: "Broken", category: "Coffee", variants: [] }],
      data,
    ),
  );
});
test("new inventory rows produce opening-balance actions, never accidental movements", () => {
  const plan = planImport(
    "inventory",
    [
      {
        id: "new-beans",
        name: "New beans",
        unit: "g",
        quantity: 100,
        reorder: 20,
        cost_rupees: "1.50",
      },
    ],
    data,
  )[0];
  assert.equal(plan.action, "inventoryItem");
  assert.equal(plan.values.cost, 150);
  assert.equal(plan.values.quantity, 100);
});
