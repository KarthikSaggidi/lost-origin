import test from "node:test";
import assert from "node:assert/strict";
import {
  billPDF,
  billLines,
  renderMessage,
  notificationDefaults,
} from "../lib/bill.ts";
import { PDFDocument } from "pdf-lib";
const order = {
  id: "LO-TEST",
  customer: "Coffee lover",
  phone: "9000000098",
  email: "test@example.invalid",
  status: "Received",
  source: "Online",
  total: 23100,
  subtotal: 22000,
  discount: 0,
  tax: 1100,
  items: [{ name: "Latte", price: 11000, quantity: 2, variant: "Hot" }],
  paymentMode: "Pay at counter",
  paymentStatus: "Pending",
  pickupAt: "2026-11-14T05:00:00Z",
  createdAt: "2026-11-13T05:00:00Z",
};
test("bill PDF preserves recorded totals, tax and booking details", async () => {
  const business = {
    shopName: "Lost Origin Coffee House",
    address: "Hyderabad",
    receiptFooter: "Thank you!",
  };
  const lines = billLines("order", order, business);
  assert.ok(lines.includes("TOTAL: INR 231.00"));
  assert.ok(lines.includes("Tax: INR 11.00"));
  assert.ok(lines.some((v) => v.includes("Pay at counter / Pending")));
  const bytes = await billPDF("order", order, business);
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), "%PDF-");
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
  const booking = {
    ...order,
    id: "PB-TEST",
    court: "Court 04",
    date: "2026-11-14",
    start: 1080,
    duration: 90,
    players: 4,
    equipment: 1,
    total: 94500,
    pricing: { subtotal: 90000, tax: 4500, taxRate: 5 },
  };
  const detail = billLines("booking", booking, business);
  assert.ok(detail.includes("Court: Court 04"));
  assert.ok(detail.includes("Time: 6:00 PM - 7:30 PM IST"));
  assert.ok(detail.includes("TOTAL: INR 945.00"));
  const long = {
    ...order,
    items: Array.from({ length: 100 }, () => order.items[0]),
  };
  assert.ok(
    (
      await PDFDocument.load(await billPDF("order", long, business))
    ).getPageCount() > 1,
  );
});
test("message templates interpolate only supported fields without evaluating content", () => {
  assert.match(
    renderMessage(notificationDefaults.billMessage, order),
    /Coffee lover/,
  );
  assert.match(
    renderMessage("{reference}: {total} / {status}", order),
    /LO-TEST: INR 231.00 \/ Received/,
  );
  assert.equal(renderMessage("{unrecognised}", order), "{unrecognised}");
});
