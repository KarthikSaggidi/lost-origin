import { timeLabel, type Order, type Booking } from "./domain.ts";
import { LOST_ORIGIN_LOGO_PNG } from "./pdf-logo";
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
    bold = await doc.embedFont(StandardFonts.HelveticaBold),
    logo = await doc.embedPng(
      Uint8Array.from(atob(LOST_ORIGIN_LOGO_PNG), (character) =>
        character.charCodeAt(0),
      ),
    );
  const width = 595,
    height = 842,
    ink = rgb(0.12, 0.13, 0.12),
    muted = rgb(0.39, 0.4, 0.38),
    green = rgb(0.16, 0.27, 0.19),
    cream = rgb(0.97, 0.955, 0.925),
    pale = rgb(0.988, 0.982, 0.963),
    divider = rgb(0.87, 0.85, 0.81),
    white = rgb(1, 1, 1),
    money = (value: number) => `INR ${((value || 0) / 100).toFixed(2)}`;
  doc.setTitle(`${record.id} - Lost Origin`);
  doc.setAuthor(business.shopName || "Lost Origin Coffee House");
  doc.setSubject(kind === "booking" ? "Court booking bill" : "Coffee house order bill");
  const safe = (s: string) =>
    [
      ...s
        .replace(/₹/g, "INR ")
        .replace(/[–—]/g, "-")
        .replace(/[’‘]/g, "'")
        .replace(/×/g, "x")
        .replace(/·/g, "|")
        .replace(/•/g, "|")
        .replace(/₨/g, "INR "),
    ]
      .map((ch) => {
        try {
          font.encodeText(ch);
          return ch;
        } catch {
          return "?";
        }
      })
      .join("");
  const text = (
    page: any,
    value: string,
    x: number,
    top: number,
    size = 10,
    face = font,
    color = ink,
  ) =>
    page.drawText(safe(value), {
      x,
      y: height - top - size,
      size,
      font: face,
      color,
    });
  const rightText = (
    page: any,
    value: string,
    right: number,
    top: number,
    size = 10,
    face = font,
    color = ink,
  ) => {
    const valueSafe = safe(value);
    text(
      page,
      valueSafe,
      right - face.widthOfTextAtSize(valueSafe, size),
      top,
      size,
      face,
      color,
    );
  };
  const rectangle = (
    page: any,
    x: number,
    top: number,
    w: number,
    h: number,
    color: any,
  ) =>
    page.drawRectangle({
      x,
      y: height - top - h,
      width: w,
      height: h,
      color,
    });
  const line = (page: any, x1: number, x2: number, top: number) =>
    page.drawLine({
      start: { x: x1, y: height - top },
      end: { x: x2, y: height - top },
      thickness: 0.7,
      color: divider,
    });
  const wrap = (value: string, maxWidth: number, size: number) => {
    const words = safe(value).split(/\s+/);
    const rows: string[] = [];
    let row = "";
    for (const word of words) {
      if (row && font.widthOfTextAtSize(`${row} ${word}`, size) > maxWidth) {
        rows.push(row);
        row = word;
      } else row += (row ? " " : "") + word;
    }
    if (row || !rows.length) rows.push(row);
    return rows;
  };
  const pages: any[] = [];
  let page = doc.addPage([width, height]),
    top = 0;
  pages.push(page);
  const drawFirstHeader = () => {
    rectangle(page, 0, 0, width, 143, cream);
    page.drawImage(logo, {
      x: (width - 204) / 2,
      y: height - 25 - 61,
      width: 204,
      height: 61,
    });
    const shop = business.shopName || "Lost Origin Coffee House";
    text(page, shop, 45, 93, 10, bold, green);
    const businessLine = [business.address, business.phone]
      .filter(Boolean)
      .join("  |  ");
    if (businessLine) text(page, businessLine, 45, 111, 8.5, font, muted);
    if (business.gstin)
      rightText(page, `GSTIN ${business.gstin}`, 550, 111, 8.5, font, muted);
    line(page, 45, 550, 143);
  };
  const drawContinuationHeader = () => {
    rectangle(page, 0, 0, width, 78, cream);
    page.drawImage(logo, {
      x: 45,
      y: height - 18 - 39,
      width: 130,
      height: 39,
    });
    rightText(page, `${kind === "booking" ? "COURT BOOKING" : "ORDER"}  |  ${record.id}`, 550, 34, 9, bold, green);
    line(page, 45, 550, 78);
  };
  drawFirstHeader();
  const issued = new Date((record as any).completedAt || record.createdAt);
  const issuedLabel = Number.isNaN(issued.getTime())
    ? ""
    : issued.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " IST";
  const heading = kind === "booking" ? "COURT BOOKING BILL" : "TAKEAWAY ORDER BILL";
  text(page, heading, 45, 164, 17, bold, green);
  rightText(page, record.id, 550, 165, 10, bold, ink);
  text(page, `Issued ${issuedLabel}`, 45, 189, 9, font, muted);
  rightText(page, `Status  ${(record as any).status || "Confirmed"}`, 550, 189, 9, font, muted);

  rectangle(page, 45, 216, 505, 78, pale);
  const details: [string, string, number][] = [
    ["BILLED TO", (record as any).customer || "Customer", 60],
    ["MOBILE", (record as any).phone ? `+91 ${(record as any).phone}` : "-", 235],
    ["EMAIL", (record as any).email || "-", 405],
  ];
  for (const [label, value, x] of details) {
    text(page, label, x, 231, 7.5, bold, muted);
    for (const [index, row] of wrap(value, x === 405 ? 130 : 150, 9).entries())
      text(page, row, x, 249 + index * 13, 9, font, ink);
  }

  let runningTop = 316;
  rectangle(page, 45, runningTop, 505, 29, green);
  text(page, "DESCRIPTION", 57, runningTop + 9, 8, bold, white);
  rightText(page, "QTY", 398, runningTop + 9, 8, bold, white);
  rightText(page, "RATE", 474, runningTop + 9, 8, bold, white);
  rightText(page, "AMOUNT", 539, runningTop + 9, 8, bold, white);
  runningTop += 29;
  const newPage = () => {
    page = doc.addPage([width, height]);
    pages.push(page);
    drawContinuationHeader();
    top = 111;
    rectangle(page, 45, top, 505, 29, green);
    text(page, "DESCRIPTION", 57, top + 9, 8, bold, white);
    rightText(page, "QTY", 398, top + 9, 8, bold, white);
    rightText(page, "RATE", 474, top + 9, 8, bold, white);
    rightText(page, "AMOUNT", 539, top + 9, 8, bold, white);
    top += 29;
  };
  const ensureSpace = (needed: number) => {
    if (runningTop + needed > 770) {
      newPage();
      runningTop = top;
    }
  };
  const addRow = (
    description: string,
    detail: string,
    quantity: number,
    rate: number,
    amount: number,
  ) => {
    const descriptionRows = wrap(description, 280, 9.5),
      detailRows = detail ? wrap(detail, 280, 8) : [],
      rowHeight = Math.max(42, 17 + descriptionRows.length * 12 + detailRows.length * 11);
    ensureSpace(rowHeight);
    rectangle(page, 45, runningTop, 505, rowHeight, pale);
    descriptionRows.forEach((row, i) =>
      text(page, row, 57, runningTop + 9 + i * 12, 9.5, i ? font : bold, ink),
    );
    detailRows.forEach((row, i) =>
      text(page, row, 57, runningTop + 10 + descriptionRows.length * 12 + i * 11, 8, font, muted),
    );
    rightText(page, String(quantity), 398, runningTop + 13, 9, font, ink);
    rightText(page, money(rate), 474, runningTop + 13, 9, font, ink);
    rightText(page, money(amount), 539, runningTop + 13, 9, font, ink);
    runningTop += rowHeight;
    line(page, 45, 550, runningTop);
  };

  if (kind === "order") {
    const order = record as Order;
    for (const item of order.items || []) {
      const options = [
        item.variant,
        item.size && item.size !== "Regular" ? item.size : "",
        item.milk,
        item.shot ? "Extra espresso shot" : "",
      ].filter(Boolean);
      addRow(
        item.name,
        options.join("  |  "),
        item.quantity,
        item.price,
        item.price * item.quantity,
      );
    }
  } else {
    const booking = record as Booking,
      pricing = booking.pricing || {},
      dateLabel = new Date(`${booking.date}T12:00:00+05:30`).toLocaleDateString(
        "en-IN",
        { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" },
      );
    addRow(
      `${booking.court} court session`,
      `${dateLabel}  |  ${timeLabel(booking.start)} - ${timeLabel(booking.start + booking.duration)} IST  |  ${booking.duration} minutes  |  ${booking.players} players`,
      1,
      pricing.courtSubtotal ?? pricing.subtotal ?? booking.total - (pricing.tax || 0),
      pricing.courtSubtotal ?? pricing.subtotal ?? booking.total - (pricing.tax || 0),
    );
    if (booking.equipment)
      addRow(
        "Paddle rental",
        "Equipment for the booking",
        1,
        pricing.equipmentSubtotal || 0,
        pricing.equipmentSubtotal || 0,
      );
  }

  const totals =
    kind === "order"
      ? record as Order
      : {
          subtotal: (record as Booking).pricing?.subtotal ?? record.total,
          discount: 0,
          tax: (record as Booking).pricing?.tax ?? 0,
          total: record.total,
        };
  const totalRows: [string, string, boolean][] = [
    ["Subtotal", money(totals.subtotal), false],
    ...(kind === "order" && (totals as Order).discount
      ? [["Discount", `- ${money((totals as Order).discount)}`, false] as [string, string, boolean]]
      : []),
    [
      kind === "booking" && (record as Booking).pricing?.taxRate
        ? `Tax (${(record as Booking).pricing?.taxRate}%)`
        : "Tax",
      money(totals.tax),
      false,
    ],
  ];
  const totalBlockHeight = 24 + totalRows.length * 21 + 43;
  ensureSpace(totalBlockHeight);
  runningTop += 18;
  totalRows.forEach(([label, value], index) => {
    text(page, label, 355, runningTop + index * 21, 9, font, muted);
    rightText(page, value, 539, runningTop + index * 21, 9, font, ink);
  });
  runningTop += totalRows.length * 21 + 10;
  rectangle(page, 330, runningTop, 220, 38, cream);
  text(page, "TOTAL  (tax included)", 343, runningTop + 12, 9, bold, green);
  rightText(page, money(record.total), 537, runningTop + 10, 13, bold, green);
  runningTop += 52;
  if (kind === "order") {
    const order = record as Order;
    const payment = `Payment  ${(order as any).paymentMode || "At café"}  |  ${(order as any).paymentStatus || "Pending"}`;
    ensureSpace(22);
    text(page, payment, 45, runningTop, 8.5, font, muted);
    runningTop += 23;
  } else if ((record as Booking).refund) {
    ensureSpace(22);
    text(page, `Recorded refund  ${money((record as Booking).refund || 0)}`, 45, runningTop, 8.5, font, muted);
    runningTop += 23;
  }
  const footerMessage = business.receiptFooter || "Thank you for choosing Lost Origin.";
  const wrappedFooter = wrap(footerMessage, 480, 9);
  ensureSpace(20 + wrappedFooter.length * 13);
  text(page, "A good cup. A great game. See you again soon.", 45, runningTop + 4, 9, bold, green);
  wrappedFooter.forEach((row, index) =>
    text(page, row, 45, runningTop + 21 + index * 13, 8, font, muted),
  );

  for (const [index, current] of pages.entries()) {
    current.drawLine({
      start: { x: 45, y: 35 },
      end: { x: 550, y: 35 },
      thickness: 0.7,
      color: divider,
    });
    current.drawText(safe(`${business.shopName || "Lost Origin Coffee House"}  |  ${record.id}`), {
      x: 45,
      y: 20,
      size: 7.5,
      font,
      color: muted,
    });
    const pageLabel = `${index + 1} / ${pages.length}`;
    current.drawText(pageLabel, {
      x: 550 - font.widthOfTextAtSize(pageLabel, 7.5),
      y: 20,
      size: 7.5,
      font,
      color: muted,
    });
  }
  return doc.save();
}
