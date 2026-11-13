import test from "node:test";
import assert from "node:assert/strict";
import {
  passwordHash,
  verifyPassword,
  randomToken,
  tokenHash,
} from "../lib/auth-crypto.ts";
import { otpProvider, otpConfigured } from "../lib/otp-provider.ts";
import { customerState } from "../lib/public-state.ts";
test("admin passwords use salted scrypt and never accept altered values", () => {
  const first = passwordHash("Test password for hashing only!"),
    second = passwordHash("Test password for hashing only!");
  assert.notEqual(first, second);
  assert.ok(verifyPassword("Test password for hashing only!", first));
  assert.equal(verifyPassword("incorrect", first), false);
  assert.equal(verifyPassword("test", "scrypt$2$8$1$x$x"), false);
  const token = randomToken();
  assert.equal(token.length, 43);
  assert.notEqual(tokenHash(token), token);
});
test("SMS verification fails closed without configuration and requires provider approval", async () => {
  assert.equal(otpConfigured({}), false);
  await assert.rejects(otpProvider({}, "send", "9000000098"), /not configured/);
  const config = {
    TWILIO_ACCOUNT_SID: "AC" + "a".repeat(32),
    TWILIO_AUTH_TOKEN: "unit-test-token",
    TWILIO_VERIFY_SERVICE_SID: "VA" + "b".repeat(32),
  };
  assert.equal(otpConfigured(config), true);
  let request;
  const sent = await otpProvider(
    config,
    "send",
    "9000000098",
    undefined,
    async (url, init) => {
      request = { url, init };
      return Response.json({ sid: "VE" + "c".repeat(32), status: "pending" });
    },
  );
  assert.match(request.url, /\/Verifications$/);
  assert.equal(
    new URLSearchParams(request.init.body).get("To"),
    "+919000000098",
  );
  assert.equal(sent.status, "pending");
  const checked = await otpProvider(
    config,
    "check",
    "9000000098",
    "123456",
    async () => Response.json({ status: "pending" }),
  );
  assert.notEqual(checked.status, "approved");
  await assert.rejects(
    otpProvider(config, "send", "9000000098", undefined, async () =>
      Response.json({ error: "bad" }, { status: 400 }),
    ),
    /could not be sent/,
  );
});
test("customer responses exclude admin data and other customers records while keeping court availability", () => {
  const own = {
      id: "own",
      phone: "9000000098",
      customer: "Own name",
      court: "Court 01",
      date: "2026-11-15",
      start: 600,
      duration: 60,
      status: "Confirmed",
      requestKey: "secret-own",
      total: 5000,
    },
    other = {
      ...own,
      id: "other",
      phone: "9000000099",
      customer: "Other name",
      requestKey: "secret-other",
    };
  const data = {
    products: [
      {
        id: "p",
        name: "Coffee",
        active: 1,
        recipe: { beans: 18, cups: 1 },
        showOnWebsite: 1,
      },
    ],
    inventory: [
      { id: "beans", name: "Beans", quantity: 100, cost: 2500 },
      { id: "cups", name: "Cup", quantity: 100, cost: 20 },
    ],
    orders: [own, other],
    bookings: [own, other],
    payments: [{ amount: 5000 }],
    journals: [{}],
    stockLedger: [{}],
    expenses: [{}],
    auditLogs: [{}],
    registrations: [{ phone: "secret" }],
    documents: [
      { type: "message", data: { phone: "secret" } },
      { type: "popupCampaign", data: { title: "Public popup" } },
    ],
    settings: {
      business: {
        shopName: "Lost Origin",
        partnerShares: [50, 25, 25],
        phone: "public-phone",
      },
    },
    revision: 1,
  };
  const guest = customerState(data);
  assert.equal(guest.orders.length, 0);
  assert.deepEqual(guest.inventory, []);
  assert.deepEqual(guest.products[0].recipe, {});
  assert.equal(guest.products[0].stockAvailable, true);
  assert.deepEqual(guest.products[0].ingredients, ["Beans"]);
  assert.equal(guest.settings.business.partnerShares, undefined);
  assert.equal(guest.bookings[0].phone, "");
  assert.equal(guest.documents.length, 1);
  const member = customerState(data, {
    id: "customer",
    name: "Own name",
    phone: "9000000098",
  });
  assert.equal(member.orders.length, 1);
  assert.equal(member.bookings[0].requestKey, "secret-own");
  assert.equal(member.bookings[1].requestKey, "");
  for (const key of [
    "payments",
    "journals",
    "stockLedger",
    "expenses",
    "auditLogs",
    "registrations",
  ])
    assert.deepEqual(member[key], []);
});
