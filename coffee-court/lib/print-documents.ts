import type { Order, Booking } from "./domain";
export function escapeHTML(value: any) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
const currency = (n: number) =>
  "₹" +
  (n / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const at = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
function thermalStyles(width: 58 | 80) {
  return `@page{size:${width}mm 250mm;margin:0}*{box-sizing:border-box}html{background:#e9e9e5}body{width:${width}mm;margin:12px auto;background:#fff;color:#000;padding:3mm;font: ${width === 58 ? "10" : "11"}px/1.45 'Courier New',Courier,monospace;overflow-wrap:anywhere}h1{font:700 ${width === 58 ? "17" : "20"}px Georgia,serif;margin:0 0 2mm}.center{text-align:center}.brand img{width:${width === 58 ? "40" : "53"}mm;height:13mm;object-fit:contain}.brand p{margin:1mm 0;font-size:9px}.rule{border:0;border-top:1px dashed #000;margin:3mm 0}h2{font-size:12px;letter-spacing:1px;margin:2mm 0}p{margin:1mm 0}.meta{display:flex;justify-content:space-between;gap:2mm;font-size:9px}.meta span:last-child{text-align:right}table{width:100%;border-collapse:collapse;table-layout:fixed}th{text-align:left;font-size:9px;border-bottom:1px dashed #000;padding:2mm 0}td{vertical-align:top;padding:2mm 0;border-bottom:1px dotted #bdbdbd}th:first-child,td:first-child{width:58%;padding-right:1.5mm}.qty{width:10%;text-align:center}.amount{width:32%;text-align:right;white-space:nowrap;font-size:${width === 58 ? "8" : "10"}px}small{display:block;font-size:8px;line-height:1.5}.line{display:flex;justify-content:space-between;gap:2mm;margin:1.5mm 0}.total{border-top:1px dashed #000;border-bottom:2px solid #000;padding:2mm 0;margin:3mm 0;font-size:${width === 58 ? "14" : "17"}px;font-weight:700}.pickup{font-size:14px;font-weight:700;letter-spacing:2px;margin:3mm 0}.fine{font-size:8px}.label{font-weight:700;border:1px solid #000;padding:1.5mm;margin:3mm 0}.footer{margin-top:4mm;padding-bottom:3mm}@media screen{body{zoom:var(--print-preview-scale,1)}}@media print{html{background:#fff}body{margin:0;box-shadow:none;zoom:1!important}}
`;
}
export function receiptHTML(
  order: Order,
  business: Record<string, any>,
  width: 58 | 80,
  origin: string,
) {
  const itemRows = order.items
    .map(
      (i) =>
        `<tr><td>${escapeHTML(i.name)}${i.variant && i.variant !== "Standard" ? `<small>${escapeHTML(i.variant)}</small>` : ""}<small>${escapeHTML(currency(i.price))} each</small></td><td class="qty">${i.quantity}</td><td class="amount">${escapeHTML(currency(i.price * i.quantity))}</td></tr>`,
    )
    .join("");
  const taxBase = order.subtotal - order.discount;
  const rate =
    taxBase > 0 ? Math.round((order.tax / taxBase) * 10000) / 100 : 0;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'self'"><base href="${escapeHTML(origin)}/"><title>${escapeHTML(order.id)} · Receipt</title><style>
${thermalStyles(width)}</style><style id="paper-size"></style></head><body><header class="brand center"><img src="/lost-origin-logo.svg" alt="${escapeHTML(business.shopName || "Lost Origin")}"><p>${escapeHTML(business.address || "")}</p>${business.phone ? `<p>Phone: ${escapeHTML(business.phone)}</p>` : ""}${business.gstin ? `<p>GSTIN: ${escapeHTML(business.gstin)}</p>` : ""}${business.fssai ? `<p>FSSAI: ${escapeHTML(business.fssai)}</p>` : ""}<hr class="rule"><h2>${order.status === "Queued offline" ? "TEMPORARY RECEIPT" : "SALE RECEIPT"}</h2></header><div class="meta"><span>Bill: ${escapeHTML(order.id)}</span><span>${escapeHTML(order.source)}</span></div><p class="fine">${escapeHTML(at(order.createdAt))} IST</p><p>Customer: ${escapeHTML(order.customer)}</p>${order.phone ? `<p class="fine">Mobile: ${escapeHTML(order.phone)}</p>` : ""}${order.source === "Online" ? `<p class="fine">Pickup: ${escapeHTML(at(order.pickupAt))} IST</p>` : ""}${order.status === "Cancelled" ? '<p class="label center">CANCELLED / VOID</p>' : ""}<table><thead><tr><th>ITEM</th><th class="qty">QTY</th><th class="amount">AMOUNT</th></tr></thead><tbody>${itemRows}</tbody></table><div class="line"><span>Subtotal</span><span>${escapeHTML(currency(order.subtotal))}</span></div>${order.discount ? `<div class="line"><span>Discount</span><span>-${escapeHTML(currency(order.discount))}</span></div>` : ""}<div class="line"><span>Tax (${rate}%)</span><span>${escapeHTML(currency(order.tax))}</span></div><div class="line total"><span>TOTAL</span><span>${escapeHTML(currency(order.total))}</span></div><div class="line"><span>Payment</span><span>${escapeHTML(order.paymentMode)}</span></div><p class="fine">${escapeHTML(order.paymentStatus)}</p>${order.paymentStatus === "Pending" ? '<p class="label center">PAYMENT DUE AT COUNTER</p>' : ""}${order.notes ? `<hr class="rule"><p class="fine">Note: ${escapeHTML(order.notes)}</p>` : ""}<div class="footer center"><hr class="rule">${order.source === "Online" ? `<p>TAKEAWAY · PICKUP CODE</p><p class="pickup">${escapeHTML(order.id.slice(-4))}</p>` : "<p>TAKEAWAY · COUNTER BILL</p>"}<p>${escapeHTML(business.receiptFooter || "Thank you for choosing Lost Origin.")}</p><p class="fine">${order.status === "Queued offline" ? "Device copy · final reference assigned after sync." : "Please retain this receipt for your records."}</p>${/Demo|Queued offline/i.test(order.paymentStatus) ? '<p class="fine">DEMO RECEIPT · No gateway payment collected.</p>' : ""}</div></body></html>`;
}
export function capturePage(source: HTMLElement) {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".admin-court-schedule").forEach((schedule) => {
    const events = [
      ...schedule.querySelectorAll<HTMLElement>(".schedule-booking-event"),
    ];
    const table = document.createElement("table");
    const heading = table.createTHead().insertRow();
    for (const text of [
      "Booking",
      "Court",
      "Customer",
      "Mobile",
      "Session · IST",
    ]) {
      const cell = document.createElement("th");
      cell.textContent = text;
      heading.appendChild(cell);
    }
    const body = table.createTBody();
    for (const event of events) {
      const row = body.insertRow();
      for (const value of [
        event.dataset.reference,
        event.dataset.court,
        event.dataset.customer,
        event.dataset.phone,
        event.dataset.session,
      ])
        row.insertCell().textContent = value || "—";
    }
    if (!events.length) {
      const row = body.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.textContent = "No bookings on this day.";
    }
    schedule.replaceWith(table);
  });
  const originalControls = [
    ...source.querySelectorAll("input,select,textarea"),
  ];
  clone.querySelectorAll("input,select,textarea").forEach((element, index) => {
    const original = originalControls[index];
    const value =
      original instanceof HTMLInputElement && original.type === "checkbox"
        ? original.checked
          ? "Yes"
          : "No"
        : original instanceof HTMLSelectElement
          ? original.selectedOptions[0]?.textContent
          : (original as HTMLInputElement).value;
    const span = document.createElement("span");
    span.className = "printed-value";
    span.textContent = value || "—";
    element.replaceWith(span);
  });
  clone
    .querySelectorAll(
      ".workspace-data-toolbar,.workspace-footer,.page-heading .heading-actions,.loading-state,.error-banner,.offline-notice",
    )
    .forEach((e) => e.remove());
  clone
    .querySelectorAll(
      "button.calendar-event,button.pos-product,.kitchen-ticket-reference>button",
    )
    .forEach((button) => {
      const block = document.createElement("div");
      block.className = button.className;
      block.innerHTML = button.innerHTML;
      button.replaceWith(block);
    });
  clone
    .querySelectorAll(
      "button,script,iframe,video,audio,.tabs,.settings-nav,.quick-replies,.filter-bar,.calendar-toolbar",
    )
    .forEach((e) => e.remove());
  clone.querySelectorAll("*").forEach((element) => {
    for (const attr of [...element.attributes])
      if (
        attr.name.startsWith("on") ||
        attr.name === "style" ||
        attr.name === "tabindex"
      )
        element.removeAttribute(attr.name);
  });
  // Expand internally scrolling calendars/tables in the printable snapshot.
  clone.querySelectorAll(".calendar-grid").forEach((grid) => {
    const count = grid.querySelectorAll(".calendar-court-head").length;
    (grid as HTMLElement).style.gridTemplateColumns =
      `60px repeat(${count},minmax(0,1fr))`;
  });
  return clone.innerHTML;
}
export function pageHTML(
  content: string,
  title: string,
  business: Record<string, any>,
  landscape: boolean,
  origin: string,
) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'self'"><base href="${escapeHTML(origin)}/"><title>${escapeHTML(title)} · Lost Origin</title><style>@page{size:A4 ${landscape ? "landscape" : "portrait"};margin:12mm}*{box-sizing:border-box}html{background:#e9e9e5}body{width:${landscape ? "273" : "186"}mm;margin:16px auto;padding:8mm;background:#fff;color:#171717;font:11px/1.5 Arial,sans-serif;overflow-wrap:anywhere}.print-header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #222;padding-bottom:4mm;margin-bottom:6mm}.print-header img{width:45mm;height:15mm;object-fit:contain}.print-header div{text-align:right}.print-header h1{font-size:20px;margin:0}.print-header p{font-size:9px;margin:2px 0}.page-heading{margin:6mm 0}.page-heading h1{font-size:22px;margin:0}.page-heading p{font-size:10px}h2{font-size:15px;margin:4mm 0 2mm}h3{font-size:12px;margin:3mm 0 1mm}p{margin:2mm 0}table{width:100%;border-collapse:collapse;table-layout:auto;font-size:9px}th,td{padding:2.5mm 2mm;border:1px solid #d5d5d0;text-align:left;vertical-align:top;overflow-wrap:anywhere;max-width:65mm}th{background:#f2f2ee;font-size:9px}thead{display:table-header-group}tr{break-inside:avoid}small{display:block;font-size:8px;color:#555}img{max-width:100%;max-height:32mm;object-fit:cover}.table-photo,.bestseller img,.cart-item>img{width:10mm;height:10mm}.panel{margin:0 0 5mm;border:1px solid #deded7;padding:3mm;break-inside:auto}.panel-heading,.row,.pnl-line,.mix-row>div,.total-line,.recipe-line,.recipe-cost{display:flex;align-items:center;justify-content:space-between;gap:3mm}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3mm;margin-bottom:5mm}.stats-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.stat-card{padding:3mm;border:1px solid #ddd;break-inside:avoid}.stat-top{font-size:9px}.stat-value{font-size:20px;font-weight:bold}.stat-foot{font-size:8px}.sparkline,.stat-icon,.tiny-dot,.rank,.info-circle,.eyebrow{display:none}.badge{font-size:8px;border:1px solid #ccc;padding:1mm 2mm;display:inline-block}.revenue-chart svg{width:100%;max-height:65mm}.chart-legend{display:flex;gap:5mm;font-size:8px}.bestseller{display:flex;align-items:center;gap:3mm;padding:2mm 0}.pos-products,.kitchen-grid,.kitchen-board-grid,.partner-grid,.recipe-grid,.product-admin-grid,.export-grid,.campaign-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4mm}.pos-product,.kitchen-ticket,.kitchen-live-ticket,.recipe-card,.product-admin-card,.partner-card,.campaign-card{padding:3mm;border:1px solid #ddd;margin-bottom:3mm;break-inside:avoid}.kitchen-ticket h3{margin:1mm 0}.kitchen-column>h2{border-bottom:1px solid #555;padding-bottom:2mm}.calendar-grid{display:grid;font-size:8px}.calendar-row{display:contents}.calendar-time,.calendar-time-head,.calendar-court-head,.calendar-cell{padding:2mm;border:1px solid #ddd;min-height:7mm}.calendar-court-head{font-weight:bold}.calendar-cell{background:#fafaf7}.calendar-cell::after{content:'—';color:#aaa}.calendar-event{display:block!important;font-size:8px}.calendar-event+*{display:none}.calendar-event span{display:block}.calendar-cell:has(.calendar-event)::after{content:''}.calendar-legend{font-size:8px;margin-top:3mm}.field{margin:3mm 0;padding:2mm;border-bottom:1px solid #ddd}.field>label,.field>span:first-child{display:block;color:#555;font-size:9px;margin-bottom:1mm}.printed-value{white-space:pre-wrap;font-size:11px;font-weight:500}.notice,.note{padding:3mm;background:#f4f4ef;font-size:9px}.court-thumb svg,.booking-detail-art svg{max-width:40mm}.chart-tooltip,.toast{display:none}.footer{margin-top:8mm;border-top:1px solid #bbb;padding-top:3mm;display:flex;justify-content:space-between;font-size:8px}.print-header,.footer{break-inside:avoid}@media screen{body{zoom:var(--print-preview-scale,1)}}@media print{html{background:#fff}body{margin:0;padding:0;width:auto;zoom:1!important}a{color:inherit;text-decoration:none}}</style></head><body><header class="print-header"><img src="/lost-origin-logo.svg" alt="Lost Origin Coffee House"><div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(business.shopName || "Lost Origin")} · ${escapeHTML(business.address || "")}</p><p>Prepared ${escapeHTML(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))} IST</p></div></header>${content}<footer class="footer"><span>© ${new Date().getFullYear()} ${escapeHTML(business.shopName || "Lost Origin")}. All rights reserved.</span><span>Designed and developed by DropXcorp Pvt Ltd · www.dropxcorp.in</span></footer></body></html>`;
}

export function bookingReceiptHTML(
  booking: Booking,
  business: Record<string, any>,
  width: 58 | 80,
  origin: string,
) {
  const p = booking.pricing,
    detailed =
      Number.isSafeInteger(p?.subtotal) && Number.isSafeInteger(p?.tax);
  const completed = booking.status === "Completed",
    heading = completed ? "COURT BILL" : "BOOKING RECEIPT";
  const number = completed
    ? `CB-${booking.id.replace(/^PB-/, "")}`
    : booking.id;
  const clock = (minute: number) =>
    `${Math.floor(minute / 60) % 12 || 12}:${String(minute % 60).padStart(2, "0")} ${Math.floor(minute / 60) >= 12 ? "PM" : "AM"}`;
  const date = new Date(booking.date + "T12:00:00+05:30").toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    },
  );
  const rows = detailed
    ? `<tr><td>${escapeHTML(booking.court)}<small>${booking.duration} minute session</small></td><td class="qty">1</td><td class="amount">${escapeHTML(currency(p!.courtSubtotal || 0))}</td></tr>${p!.equipmentSubtotal ? `<tr><td>Paddle rental</td><td class="qty">1</td><td class="amount">${escapeHTML(currency(p!.equipmentSubtotal))}</td></tr>` : ""}`
    : `<tr><td>${escapeHTML(booking.court)}<small>${booking.duration} minute session · tax inclusive</small></td><td class="qty">1</td><td class="amount">${escapeHTML(currency(booking.total))}</td></tr>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none';img-src 'self' data:;style-src 'unsafe-inline';base-uri 'self'"><base href="${escapeHTML(origin)}/"><title>${escapeHTML(number)} · ${heading}</title><style>${thermalStyles(width)}</style><style id="paper-size"></style></head><body><header class="brand center"><img src="/lost-origin-logo.svg" alt="Lost Origin Coffee House"><p>${escapeHTML(business.address || "")}</p>${business.phone ? `<p>Phone: ${escapeHTML(business.phone)}</p>` : ""}${business.gstin ? `<p>GSTIN: ${escapeHTML(business.gstin)}</p>` : ""}<hr class="rule"><h2>${heading}</h2></header><div class="meta"><span>${completed ? "Bill" : "Booking"}: ${escapeHTML(number)}</span><span>${escapeHTML(booking.source || "Reservation")}</span></div><p class="fine">Issued: ${escapeHTML(at(booking.completedAt || booking.createdAt))} IST</p>${completed ? `<p class="fine">Booking reference: ${escapeHTML(booking.id)}</p>` : ""}<hr class="rule"><p>Customer: ${escapeHTML(booking.customer)}</p><p>Mobile: ${escapeHTML(booking.phone)}</p><p>Date: ${escapeHTML(date)}</p><p>Session: ${clock(booking.start)} – ${clock(booking.start + booking.duration)} IST</p><p>Players: ${booking.players}</p><p>Status: ${escapeHTML(booking.status)}</p>${booking.status === "Cancelled" ? '<p class="label center">CANCELLED RESERVATION</p>' : ""}<table><thead><tr><th>ITEM</th><th class="qty">QTY</th><th class="amount">AMOUNT</th></tr></thead><tbody>${rows}</tbody></table>${detailed ? `<div class="line"><span>Subtotal</span><span>${escapeHTML(currency(p!.subtotal!))}</span></div><div class="line"><span>Tax (${p!.taxRate ?? 0}%)</span><span>${escapeHTML(currency(p!.tax!))}</span></div>` : '<p class="fine">Booked total includes tax. An itemised tax breakdown was not recorded for this earlier reservation.</p>'}<div class="line total"><span>TOTAL</span><span>${escapeHTML(currency(booking.total))}</span></div>${booking.refund ? `<div class="line"><span>Recorded refund</span><span>${escapeHTML(currency(booking.refund))}</span></div>` : ""}<p class="fine">Payment: UPI · demo record</p><div class="footer center"><hr class="rule"><p>${completed ? "GAME COMPLETED" : "SHOW THIS RECEIPT AT THE COURT DESK"}</p><p>${escapeHTML(business.receiptFooter || "Great coffee. Good games. Thank you for choosing Lost Origin.")}</p><p class="fine">Please retain this copy for your records.</p><p class="fine">DEMO RECEIPT · No gateway payment collected.</p></div></body></html>`;
}
