import test from "node:test";
import assert from "node:assert/strict";
import { filterWorkspace, emptyFilters } from "../lib/admin-filters.ts";
import {
  heroSlidesSchema,
  defaultHeroSlides,
  heroSlides,
} from "../lib/hero.ts";
const state = {
  products: [],
  inventory: [],
  orders: [],
  bookings: [],
  payments: [],
  expenses: [],
  journals: [],
  stockLedger: [],
  documents: [],
  settings: { business: {} },
  auditLogs: [],
};
const filter = (extra) => ({ ...emptyFilters, ...extra });
test("payment date boundaries use IST and source filters preserve reversal amounts", () => {
  const data = {
    ...state,
    payments: [
      {
        id: "refund",
        reference: "CC-1",
        source: "Counter",
        amount: -12500,
        createdAt: "2026-11-09T20:00:00Z",
      },
      {
        id: "other",
        reference: "PB-1",
        source: "Court",
        amount: 50000,
        createdAt: "2026-11-10T10:00:00Z",
      },
      { id: "yesterday", source: "Counter", createdAt: "2026-11-09T10:00:00Z" },
    ],
  };
  const rows = filterWorkspace(
    data,
    "payments",
    filter({ from: "2026-11-10", to: "2026-11-10", source: "Counter" }),
  ).payments;
  assert.deepEqual(
    rows.map((p) => p.id),
    ["refund"],
  );
  assert.equal(rows[0].amount, -12500);
  assert.equal(data.payments.length, 3);
});
test("account filters keep complete balanced entries and include matching expenses", () => {
  const lines = [
    { account: "Cash in hand", debit: 0, credit: 9000 },
    { account: "Rent expense", debit: 9000, credit: 0 },
  ];
  const data = {
    ...state,
    journals: [
      {
        id: "J1",
        reference: "EXP-1",
        description: "Rent",
        createdAt: "2026-11-10T10:00:00Z",
        lines,
      },
    ],
    expenses: [
      {
        category: "Rent",
        description: "Rent",
        createdAt: "2026-11-10T10:00:00Z",
        amount: 9000,
      },
    ],
  };
  const result = filterWorkspace(
    data,
    "accounting",
    filter({ category: "Rent expense" }),
  );
  assert.equal(result.journals[0].lines.length, 2);
  assert.equal(
    result.journals[0].lines.reduce((s, l) => s + l.debit - l.credit, 0),
    0,
  );
  assert.equal(result.expenses.length, 1);
});
test("report court filters use play date rather than booking creation date", () => {
  const data = {
    ...state,
    bookings: [
      {
        id: "B1",
        court: "Court 4",
        date: "2026-11-15",
        createdAt: "2026-11-10T10:00:00Z",
        status: "Confirmed",
      },
    ],
    orders: [
      {
        id: "C1",
        createdAt: "2026-11-15T10:00:00Z",
        source: "Counter",
        items: [],
      },
    ],
  };
  const result = filterWorkspace(
    data,
    "reports",
    filter({ from: "2026-11-15", to: "2026-11-15", source: "Court" }),
  );
  assert.equal(result.bookings.length, 1);
  assert.equal(result.orders.length, 0);
});
test("document filters separate campaign and conversation statuses without mutating the source", () => {
  const data = {
    ...state,
    documents: [
      {
        id: "c",
        type: "campaign",
        data: { name: "Weekend", active: false, channel: "Website" },
      },
      {
        id: "m",
        type: "message",
        data: { name: "Riya", unread: true, message: "Coffee" },
      },
    ],
  };
  assert.equal(
    filterWorkspace(
      data,
      "campaigns",
      filter({ status: "Active" }),
    ).documents.some((d) => d.id === "c"),
    false,
  );
  assert.equal(
    filterWorkspace(
      data,
      "whatsapp",
      filter({ status: "Unread", query: "Riya" }),
    ).documents.some((d) => d.id === "m"),
    true,
  );
  assert.equal(
    filterWorkspace(
      data,
      "whatsapp",
      filter({ status: "Read" }),
    ).documents.some((d) => d.id === "m"),
    false,
  );
  assert.equal(data.documents.length, 2);
});
test("hero settings reject unsafe paths, duplicate IDs, empty or all hidden slides", () => {
  assert.equal(heroSlidesSchema.safeParse(defaultHeroSlides).success, true);
  for (const slides of [
    [],
    [{ ...defaultHeroSlides[0], image: "javascript:alert(1)" }],
    [{ ...defaultHeroSlides[0], image: "/api/v1/media/../../state" }],
    [{ ...defaultHeroSlides[0], active: false }],
    [defaultHeroSlides[0], defaultHeroSlides[0]],
  ])
    assert.equal(heroSlidesSchema.safeParse(slides).success, false);
  assert.equal(
    heroSlidesSchema.safeParse([
      {
        ...defaultHeroSlides[0],
        image: "/api/v1/media/00000000-0000-4000-8000-000000000000.webp",
      },
    ]).success,
    true,
  );
});

test("refreshing the built-in cafe keeps saved custom hero uploads and visibility", () => {
  const upload = {
    id: "my-photo",
    image: "/api/v1/media/00000000-0000-4000-8000-000000000000.jpg",
    alt: "My cafe photo",
    active: true,
    position: "right",
  };
  const legacy = {
    id: "lost-origin-cafe",
    image: "/images/lost-origin-cafe.png",
    alt: "Earlier built-in scene",
    active: false,
    position: "left",
  };
  const result = heroSlides({ heroSlides: [legacy, upload] });
  assert.equal(result[0].image, defaultHeroSlides[0].image);
  assert.equal(result[0].active, false);
  assert.equal(result[0].position, "left");
  assert.deepEqual(result[1], upload);
  assert.deepEqual(heroSlides({ heroSlides: [upload] }), [upload]);
});
