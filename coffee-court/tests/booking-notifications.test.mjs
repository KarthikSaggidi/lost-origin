import test from "node:test";
import assert from "node:assert/strict";
import {
  websiteBookingNotification,
  freshBookingNotifications,
} from "../lib/booking-notifications.ts";
const booking = {
  id: "PB-ALERT-TEST",
  customer: "Test player",
  phone: "9000000098",
  email: "private@example.invalid",
  source: "Website",
  court: "Court 04",
  date: "2026-11-15",
  start: 1080,
  duration: 60,
  players: 4,
  equipment: 0,
  total: 63000,
  status: "Confirmed",
  createdAt: "2026-11-13T05:00:00.000Z",
  requestKey: "private-request-key",
};
test("only website court reservations generate a stable admin notification", () => {
  const notification = websiteBookingNotification(booking);
  assert.equal(notification.id, "court-booked:PB-ALERT-TEST");
  assert.equal(notification.reference, booking.id);
  assert.equal(notification.readAt, null);
  assert.equal(notification.data.customer, booking.customer);
  assert.equal(notification.data.phone, booking.phone);
  assert.equal(notification.data.court, "Court 04");
  assert.equal(notification.data.total, 63000);
  assert.deepEqual(websiteBookingNotification({ ...booking }), notification);
  assert.equal(
    websiteBookingNotification({ ...booking, source: "Admin" }),
    null,
  );
  assert.equal(
    websiteBookingNotification({ ...booking, source: "Legacy" }),
    null,
  );
  assert.equal(notification.data.email, undefined);
  assert.equal(notification.data.requestKey, undefined);
});
test("already read, previously presented and repeated notifications do not replay", () => {
  const first = websiteBookingNotification(booking),
    second = websiteBookingNotification({
      ...booking,
      id: "PB-NEW",
      createdAt: "2026-11-13T06:00:00.000Z",
    });
  assert.deepEqual(
    freshBookingNotifications([second, first, first], new Set()).map(
      (n) => n.reference,
    ),
    [booking.id, "PB-NEW"],
  );
  assert.deepEqual(
    freshBookingNotifications([first, second], new Set([first.id])).map(
      (n) => n.reference,
    ),
    ["PB-NEW"],
  );
  assert.deepEqual(
    freshBookingNotifications(
      [{ ...first, readAt: "2026-11-13T05:05:00Z" }, second],
      new Set([second.id]),
    ),
    [],
  );
  assert.equal(first.readAt, null);
});
