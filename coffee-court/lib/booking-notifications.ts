import type { Booking } from "./domain.ts";
export type BookingNotification = {
  id: string;
  kind: "court-booking";
  reference: string;
  createdAt: string;
  readAt: string | null;
  data: {
    customer: string;
    phone: string;
    court: string;
    date: string;
    start: number;
    duration: number;
    players: number;
    total: number;
  };
};
export function websiteBookingNotification(
  booking: Booking,
): BookingNotification | null {
  if (booking.source !== "Website") return null;
  return {
    id: `court-booked:${booking.id}`,
    kind: "court-booking",
    reference: booking.id,
    createdAt: booking.createdAt,
    readAt: null,
    data: {
      customer: booking.customer,
      phone: booking.phone,
      court: booking.court,
      date: booking.date,
      start: booking.start,
      duration: booking.duration,
      players: booking.players,
      total: booking.total,
    },
  };
}
export function freshBookingNotifications(
  records: BookingNotification[],
  seen: ReadonlySet<string>,
) {
  const unique = new Map<string, BookingNotification>();
  for (const record of records)
    if (
      record.kind === "court-booking" &&
      !record.readAt &&
      !seen.has(record.id)
    )
      unique.set(record.id, record);
  return [...unique.values()].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}
