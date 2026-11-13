import test from "node:test";
import assert from "node:assert/strict";
import {
  calculate,
  quoteBooking,
  isBalanced,
  available,
  validBooking,
  todayIST,
} from "../lib/domain.ts";
test("tax and capped discounts use integer paise, including odd amounts", () => {
  const item = { price: 19999, quantity: 3 };
  assert.deepEqual(calculate([item], "FIRSTBREW"), {
    subtotal: 59997,
    discount: 6000,
    tax: 2700,
    total: 56697,
  });
  assert.equal(
    calculate([{ price: 200000, quantity: 1 }], "FIRSTBREW").discount,
    10000,
  );
});
test("court pricing handles a session crossing the peak boundary", () => {
  assert.equal(quoteBooking(990, 60, false, "2026-11-10"), 82600);
  assert.equal(quoteBooking(990, 60, true, "2026-11-10"), 94400);
  assert.equal(quoteBooking(600, 60, false, "2026-11-14"), 94400);
});
test("court slots stay on 30-minute boundaries and within operating hours", () => {
  assert.equal(validBooking(360, 30), true);
  assert.equal(validBooking(1290, 30), true);
  assert.equal(validBooking(1290, 60), false);
  assert.equal(validBooking(361, 60), false);
  assert.equal(validBooking(300, 60), false);
  assert.equal(validBooking(600, 45), false);
});
test("journal validation rejects unbalanced, negative or fractional lines", () => {
  assert.equal(
    isBalanced([
      { account: "Cash", debit: 10001, credit: 0 },
      { account: "Revenue", debit: 0, credit: 10001 },
    ]),
    true,
  );
  assert.equal(
    isBalanced([
      { account: "Cash", debit: 10001, credit: 0 },
      { account: "Revenue", debit: 0, credit: 10000 },
    ]),
    false,
  );
  assert.equal(
    isBalanced([
      { account: "Cash", debit: -1, credit: 0 },
      { account: "Revenue", debit: 0, credit: -1 },
    ]),
    false,
  );
  assert.equal(
    isBalanced([
      { account: "Cash", debit: 1.5, credit: 0 },
      { account: "Revenue", debit: 0, credit: 1.5 },
    ]),
    false,
  );
});
test("availability respects every recipe line and archive flag", () => {
  const p = { active: 1, recipe: { beans: 18, milk: 200 } };
  assert.equal(
    available(p, [
      { id: "beans", quantity: 18 },
      { id: "milk", quantity: 199 },
    ]),
    false,
  );
  assert.equal(
    available(p, [
      { id: "beans", quantity: 18 },
      { id: "milk", quantity: 200 },
    ]),
    true,
  );
  assert.equal(
    available({ ...p, active: 0 }, [
      { id: "beans", quantity: 18 },
      { id: "milk", quantity: 200 },
    ]),
    false,
  );
});
test("business dates use IST even near a UTC date boundary", () => {
  assert.equal(todayIST(new Date("2026-11-10T20:00:00Z")), "2026-11-11");
});

test("court booking dates reject nonexistent days and obey the IST 30-day window", async () => {
  const { validBookingDate } = await import("../lib/domain.ts");
  const now = new Date("2026-11-10T20:00:00Z");
  assert.equal(validBookingDate("2026-11-10", now), false); // Already Nov 11 in IST.
  assert.equal(validBookingDate("2026-11-11", now), true);
  assert.equal(validBookingDate("2026-12-11", now), true);
  assert.equal(validBookingDate("2026-12-12", now), false);
  assert.equal(validBookingDate("2026-11-31", now), false);
  assert.equal(validBookingDate("", now), false);
});
test("availability reserves the entire duration while allowing adjacent and cancelled sessions", async () => {
  const { bookingSlotAvailability, defaultCourts } =
    await import("../lib/domain.ts");
  const now = new Date("2026-11-10T04:30:00Z");
  const c = defaultCourts[0];
  const booked = {
    court: c.name,
    date: "2026-11-10",
    start: 660,
    duration: 60,
    status: "Confirmed",
  };
  assert.equal(
    bookingSlotAvailability(c, booked.date, 600, 60, [booked], now),
    "Available",
  );
  assert.equal(
    bookingSlotAvailability(c, booked.date, 600, 90, [booked], now),
    "Booked",
  );
  assert.equal(
    bookingSlotAvailability(c, booked.date, 690, 60, [booked], now),
    "Booked",
  );
  assert.equal(
    bookingSlotAvailability(c, booked.date, 720, 60, [booked], now),
    "Available",
  );
  assert.equal(
    bookingSlotAvailability(
      c,
      booked.date,
      660,
      60,
      [{ ...booked, status: "Cancelled" }],
      now,
    ),
    "Available",
  );
  assert.equal(
    bookingSlotAvailability(
      defaultCourts[1],
      booked.date,
      660,
      60,
      [booked],
      now,
    ),
    "Available",
  );
});
test("customer starts and modal availability respect closures, elapsed starts and duration limits", async () => {
  const { bookingSlotAvailability, bookingStarts, defaultCourts } =
    await import("../lib/domain.ts");
  const c = { ...defaultCourts[0], open: 600, close: 720 };
  const now = new Date("2026-11-10T04:45:00Z");
  assert.deepEqual(bookingStarts(c, 60), [600, 630, 660]);
  assert.deepEqual(bookingStarts(c, 120), [600]);
  assert.equal(
    bookingSlotAvailability(c, "2026-11-10", 600, 60, [], now),
    "Past",
  );
  assert.equal(
    bookingSlotAvailability(c, "2026-11-10", 630, 60, [], now),
    "Available",
  );
  assert.equal(
    bookingSlotAvailability(
      { ...c, active: false },
      "2026-11-10",
      630,
      60,
      [],
      now,
    ),
    "Closed",
  );
  assert.equal(
    bookingSlotAvailability(c, "2026-11-10", 690, 60, [], now),
    "Closed",
  );
  assert.equal(
    bookingSlotAvailability(c, "2026-11-10", 630, 45, [], now),
    "Closed",
  );
});

test("weekend court rates follow the booked calendar date in every browser time zone", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    assert.equal(quoteBooking(600, 60, false, "2026-11-16"), 70800);
    assert.equal(quoteBooking(600, 60, false, "2026-11-14"), 94400);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
