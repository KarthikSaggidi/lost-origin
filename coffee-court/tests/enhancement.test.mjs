import test from "node:test";
import assert from "node:assert/strict";
import {
  productVisible,
  bookingCharges,
  defaultCourts,
} from "../lib/domain.ts";
import { bookingReceiptHTML } from "../lib/print-documents.ts";
import { hasAdminIdentity } from "../lib/admin-policy.ts";
import { heroCampaign } from "../lib/campaign.ts";
import { planImport } from "../lib/workspace-data.ts";
const base = {
  id: "p",
  name: "Coffee",
  active: 1,
  price: 11000,
  recipe: {},
  category: "Espresso",
};
test("POS and website visibility are independent and never override an archived product", () => {
  assert.equal(
    productVisible({ ...base, showOnPos: 1, showOnWebsite: 0 }, "pos"),
    true,
  );
  assert.equal(
    productVisible({ ...base, showOnPos: 1, showOnWebsite: 0 }, "website"),
    false,
  );
  assert.equal(
    productVisible({ ...base, showOnPos: 0, showOnWebsite: 1 }, "pos"),
    false,
  );
  assert.equal(
    productVisible(
      { ...base, active: 0, showOnPos: 1, showOnWebsite: 1 },
      "website",
    ),
    false,
  );
  assert.equal(productVisible(base, "website"), true);
});
test("hosted admin actions require a platform identity on the configured allowlist", () => {
  const config = {
    production: true,
    allowedEmails: "owner@example.test,staff@example.test",
  };
  assert.equal(hasAdminIdentity(config), false);
  assert.equal(
    hasAdminIdentity({ ...config, email: "owner@example.test" }),
    false,
  );
  assert.equal(
    hasAdminIdentity({
      ...config,
      email: "customer@example.test",
      userId: "customer-id",
    }),
    false,
  );
  assert.equal(
    hasAdminIdentity({
      ...config,
      email: "OWNER@EXAMPLE.TEST",
      userId: "owner-id",
    }),
    true,
  );
  assert.equal(
    hasAdminIdentity({
      ...config,
      allowedEmails: "",
      email: "owner@example.test",
      userId: "owner-id",
    }),
    false,
  );
});
const pricing = bookingCharges(990, 90, true, "2026-11-13", {
  ...defaultCourts[0],
  taxRate: 5,
});
const booking = {
  id: "PB-RECEIPT01",
  court: "Court 01",
  customer: "Riya <script>",
  phone: "9000000011",
  date: "2026-11-13",
  start: 990,
  duration: 90,
  players: 4,
  equipment: 1,
  total: pricing.total,
  pricing,
  status: "Confirmed",
  createdAt: "2026-11-10T10:00:00Z",
  source: "Website",
};
test("booking receipt and completed bill preserve the stored charge breakdown and customer contact", () => {
  assert.deepEqual(pricing, {
    courtSubtotal: 110000,
    equipmentSubtotal: 10000,
    subtotal: 120000,
    tax: 6000,
    taxRate: 5,
    total: 126000,
  });
  const receipt = bookingReceiptHTML(
    booking,
    { shopName: "Lost Origin" },
    80,
    "https://example.test",
  );
  const bill = bookingReceiptHTML(
    { ...booking, status: "Completed", completedAt: "2026-11-13T13:00:00Z" },
    { courts: [{ taxRate: 28, baseRate: 999999 }] },
    58,
    "https://example.test",
  );
  for (const html of [receipt, bill]) {
    assert.match(html, /9000000011/);
    assert.match(html, /₹1,260\.00/);
    assert.match(html, /Tax \(5%\)/);
    assert.match(html, /Riya &lt;script&gt;/);
    assert.ok(!html.includes("Riya <script>"));
  }
  assert.match(receipt, /BOOKING RECEIPT/);
  assert.match(bill, /COURT BILL/);
  assert.match(bill, /CB-RECEIPT01/);
  assert.match(bill, /width:58mm/);
  assert.match(bill, /GAME COMPLETED/);
});
test("earlier booking receipts show tax-inclusive totals without inventing a missing breakdown", () => {
  const html = bookingReceiptHTML(
    { ...booking, pricing: {} },
    {},
    80,
    "https://example.test",
  );
  assert.match(html, /itemised tax breakdown was not recorded/);
  assert.ok(!html.includes("Tax (0%)"));
  assert.match(html, /₹1,260\.00/);
});
test("disabled hero campaigns retain their text and imports preserve independent visibility flags", () => {
  assert.deepEqual(heroCampaign({ documents: [] }).enabled, false);
  const configured = heroCampaign({
    documents: [
      {
        id: "hero-announcement",
        type: "heroCampaign",
        data: {
          text: "Evening games and good coffee.",
          enabled: false,
          speed: 45,
        },
      },
    ],
  });
  assert.equal(configured.enabled, false);
  assert.equal(configured.text, "Evening games and good coffee.");
  const state = {
    products: [{ ...base, showOnPos: 0, showOnWebsite: 1 }],
    inventory: [],
    orders: [],
    bookings: [],
    payments: [],
    expenses: [],
    journals: [],
    stockLedger: [],
    documents: [],
    settings: {},
    auditLogs: [],
  };
  const changes = planImport(
    "products",
    [{ id: "p", name: "Coffee", showOnPos: 1, showOnWebsite: 0 }],
    state,
  );
  assert.equal(changes[0].values.showOnPos, 1);
  assert.equal(changes[0].values.showOnWebsite, 0);
});

test("customer ingredient lists exclude packaging, prepared stock portions and quantities", async () => {
  const { productIngredients, parseIngredients } =
    await import("../lib/product-details.ts");
  const inventory = [
    { id: "beans", name: "Coffee beans", quantity: 900, cost: 500 },
    { id: "milk", name: "Milk" },
    { id: "cups", name: "Paper cup" },
    { id: "portion-food", name: "Prepared food stock" },
  ];
  const product = {
    ...base,
    recipe: { beans: 18, milk: 150, cups: 1, "portion-food": 1 },
  };
  assert.deepEqual(productIngredients(product, inventory), [
    "Coffee beans",
    "Milk",
  ]);
  assert.deepEqual(
    productIngredients(
      { ...product, ingredients: ["Oat milk", "Coffee"] },
      inventory,
    ),
    ["Oat milk", "Coffee"],
  );
  assert.deepEqual(
    productIngredients({ ...product, ingredients: [] }, inventory),
    [],
  );
  assert.deepEqual(parseIngredients(" Coffee, Milk\nCoffee, , Cocoa "), [
    "Coffee",
    "Milk",
    "Cocoa",
  ]);
});

test("product imports preserve explicit ingredient lists and reject malformed lists before applying rows", () => {
  const data = {
    products: [{ ...base, name: "Coffee", recipe: {} }],
    inventory: [],
    documents: [],
    settings: { business: {} },
    orders: [],
    bookings: [],
    payments: [],
    expenses: [],
    journals: [],
    stockLedger: [],
    auditLogs: [],
  };
  const row = { id: "p", ingredients: '["Coffee", "Milk"]' };
  assert.deepEqual(planImport("products", [row], data)[0].values.ingredients, [
    "Coffee",
    "Milk",
  ]);
  assert.throws(
    () => planImport("products", [{ id: "p", ingredients: "[99]" }], data),
    /Ingredients must be/,
  );
  assert.throws(
    () =>
      planImport(
        "products",
        [{ id: "p", ingredients: '{"name":"Coffee"}' }],
        data,
      ),
    /Ingredients must be/,
  );
  assert.equal(
    planImport("products", [{ id: "p" }], data)[0].values.ingredients,
    undefined,
  );
});

test("popup schedules, required fields and image paths are validated before publication", async () => {
  const { popupCampaignSchema, defaultPopupCampaign, popupCampaignStatus } =
    await import("../lib/popup-campaign.ts");
  const campaign = structuredClone(defaultPopupCampaign);
  assert.equal(popupCampaignSchema.safeParse(campaign).success, true);
  assert.equal(
    popupCampaignSchema.safeParse({ ...campaign, pages: [] }).success,
    false,
  );
  assert.equal(
    popupCampaignSchema.safeParse({
      ...campaign,
      image: "https://untrusted.example/image.png",
      imageAlt: "Offer",
    }).success,
    false,
  );
  assert.equal(
    popupCampaignSchema.safeParse({
      ...campaign,
      image: "/images/coffee.jpg",
      imageAlt: "",
    }).success,
    false,
  );
  assert.equal(
    popupCampaignSchema.safeParse({
      ...campaign,
      startAt: "2026-11-13T09:00:00Z",
      endAt: "2026-11-13T08:00:00Z",
    }).success,
    false,
  );
  assert.equal(
    popupCampaignSchema.safeParse({
      ...campaign,
      fields: [campaign.fields[0], campaign.fields[0]],
    }).success,
    false,
  );
  assert.equal(
    popupCampaignSchema.safeParse({ ...campaign, fields: [] }).success,
    false,
  );
  assert.equal(
    popupCampaignSchema.safeParse({
      ...campaign,
      fields: [],
      registrationEnabled: false,
    }).success,
    true,
  );
  const now = Date.parse("2026-11-13T08:00:00Z");
  assert.equal(popupCampaignStatus(campaign, now), "Disabled");
  assert.equal(
    popupCampaignStatus({ ...campaign, enabled: true }, now),
    "Live",
  );
  assert.equal(
    popupCampaignStatus(
      { ...campaign, enabled: true, startAt: "2026-11-13T09:00:00Z" },
      now,
    ),
    "Scheduled",
  );
  assert.equal(
    popupCampaignStatus(
      { ...campaign, enabled: true, endAt: "2026-11-13T07:00:00Z" },
      now,
    ),
    "Ended",
  );
});

test("registration answers follow saved enabled fields and validate contact details server-side", async () => {
  const { registrationAnswers, defaultPopupCampaign } =
    await import("../lib/popup-campaign.ts");
  assert.deepEqual(
    registrationAnswers(defaultPopupCampaign, {
      name: " Riya ",
      phone: "9000000011",
    }),
    { name: "Riya", phone: "9000000011" },
  );
  assert.throws(
    () =>
      registrationAnswers(defaultPopupCampaign, {
        name: "",
        phone: "9000000011",
      }),
    /Enter your name/,
  );
  assert.throws(
    () =>
      registrationAnswers(defaultPopupCampaign, { name: "Riya", phone: "123" }),
    /10-digit/,
  );
  assert.throws(
    () =>
      registrationAnswers(defaultPopupCampaign, {
        name: "Riya",
        phone: "9000000011",
        email: "private@example.test",
      }),
    /fields changed/,
  );
  const custom = {
    ...defaultPopupCampaign,
    fields: [
      {
        id: "contact",
        label: "Email",
        type: "email",
        enabled: true,
        required: false,
      },
    ],
  };
  assert.deepEqual(registrationAnswers(custom, {}), { contact: "" });
  assert.throws(
    () => registrationAnswers(custom, { contact: "invalid" }),
    /valid email/,
  );
  assert.deepEqual(
    registrationAnswers(custom, { contact: "hello@example.test" }),
    { contact: "hello@example.test" },
  );
});
