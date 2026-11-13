import { timeLabel, type Order, type Booking } from "./domain.ts";
export const notificationDefaults = {
  emailEnabled: true,
  billMessage:
    "Hi {name}, thank you for visiting Lost Origin Coffee House! Your bill {reference} for {total} is attached. We look forward to seeing you again.",
  orderUpdateMessage:
    "Hi {name}, your Lost Origin order {reference} is now {status}. Thank you for choosing us!",
};
export const renderMessage = (template: string, record: any) =>
  template.replace(
    /\{(name|reference|total|status|date|time|court)\}/g,
    (
      _,
      key:
        | "name"
        | "reference"
        | "total"
        | "status"
        | "date"
        | "time"
        | "court",
    ) =>
      ({
        name: record.customer || "there",
        reference: record.id || "",
        total: `INR ${(record.total / 100).toFixed(2)}`,
        status: record.status || "",
        date: record.date || "",
        court: record.court || "",
        time:
          record.start == null
            ? ""
            : `${timeLabel(record.start)} - ${timeLabel(record.start + record.duration)} IST`,
      })[key] || "",
  );
export function billLines(
  kind: "order" | "booking",
  record: Order | Booking,
  business: Record<string, any>,
) {
  const r: any = record,
    money = (v: number) => `INR ${(v / 100).toFixed(2)}`;
  const issued = new Date(r.completedAt || r.createdAt).toLocaleString(
    "en-IN",
    { timeZone: "Asia/Kolkata" },
  );
  const lines = [
    business.shopName || "Lost Origin Coffee House",
    business.address || "",
    business.phone || "",
    business.gstin ? `GSTIN: ${business.gstin}` : "",
    kind === "booking"
      ? r.status === "Completed"
        ? "COURT BILL"
        : "BOOKING CONFIRMATION / RECEIPT"
      : "TAKEAWAY BILL",
    `Reference: ${r.id}`,
    `Issued: ${issued} IST`,
    `Name: ${r.customer}`,
    `Phone: ${r.phone || "Not provided"}`,
    r.email ? `Email: ${r.email}` : "",
    `Status: ${r.status}`,
    "",
  ];
  if (kind === "order") {
    lines.push(
      `Pickup: ${r.source === "Counter" ? "As soon as possible" : new Date(r.pickupAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"}`,
    );
    for (const item of r.items)
      lines.push(
        `${item.quantity} x ${item.name}${item.variant ? ` (${item.variant})` : ""} | ${money(item.price * item.quantity)}`,
      );
    lines.push(
      "",
      `Subtotal: ${money(r.subtotal)}`,
      `Discount: ${money(r.discount || 0)}`,
      `Tax: ${money(r.tax)}`,
      `TOTAL: ${money(r.total)}`,
      `Payment: ${r.paymentMode} / ${r.paymentStatus}`,
    );
  } else {
    lines.push(
      `Court: ${r.court}`,
      `Date: ${r.date}`,
      `Time: ${timeLabel(r.start)} - ${timeLabel(r.start + r.duration)} IST`,
      `Duration: ${r.duration} minutes`,
      `Players: ${r.players}`,
      `Paddle rental: ${r.equipment ? "Yes" : "No"}`,
      "",
    );
    if (r.pricing?.subtotal != null)
      lines.push(
        `Subtotal: ${money(r.pricing.subtotal)}`,
        `Tax (${r.pricing.taxRate || 0}%): ${money(r.pricing.tax || 0)}`,
      );
    lines.push(`TOTAL: ${money(r.total)}`);
    if (r.refund) lines.push(`Recorded refund: ${money(r.refund)}`);
  }
  lines.push(
    "",
    "Payment preview: no payment gateway collection is implied.",
    business.receiptFooter || "Thank you for choosing Lost Origin.",
    "For changes or cancellation, please contact the cafe team.",
  );
  return lines.filter((line) => line !== undefined);
}
export async function billPDF(
  kind: "order" | "booking",
  record: Order | Booking,
  business: Record<string, any>,
) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica),
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.setTitle(`${record.id} - Lost Origin`);
  doc.setAuthor(business.shopName || "Lost Origin Coffee House");
  let page = doc.addPage([420, 595]),
    y = 560;
  const safe = (s: string) =>
    [...s.replace(/₹/g, "INR ").replace(/[–—]/g, "-").replace(/[’‘]/g, "'")]
      .map((ch) => {
        try {
          font.encodeText(ch);
          return ch;
        } catch {
          return "?";
        }
      })
      .join("");
  for (const [index, raw] of billLines(kind, record, business).entries()) {
    const words = safe(String(raw)).split(/\s+/);
    let row = "";
    const rows: string[] = [];
    for (const word of words) {
      if (row && font.widthOfTextAtSize(row + " " + word, 10) > 350) {
        rows.push(row);
        row = word;
      } else row += (row ? " " : "") + word;
    }
    rows.push(row);
    for (const line of rows) {
      if (y < 34) {
        page = doc.addPage([420, 595]);
        y = 560;
      }
      page.drawText(line, {
        x: 32,
        y,
        size: index === 0 ? 17 : 10,
        font: index === 0 || line.startsWith("TOTAL:") ? bold : font,
        color: rgb(0.08, 0.08, 0.08),
      });
      y -= index === 0 ? 27 : 16;
    }
  }
  return doc.save();
}
