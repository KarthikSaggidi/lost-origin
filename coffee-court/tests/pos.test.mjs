import test from "node:test";
import assert from "node:assert/strict";
import * as bills from "../lib/pos-bills.ts";

const posItem = (id, name, price, quantity = 1) => ({
  id,
  name,
  price,
  quantity,
  size: "Regular",
  milk: "",
  shot: false,
  variant: "Standard",
});

test("parallel POS drafts isolate items, contact, coupon, notes, payment and billing keys", () => {
  let state = bills.newPosWorkspace();
  const a = state.activeId,
    keyA = bills.posBill(state, a).requestKey;
  state = bills.addPosItems(state, a, [
    posItem("brownie-cold-coffee", "Brownie Cold Coffee", 22000),
  ]);
  state = bills.changePosFields(state, a, {
    customer: "Customer A",
    phone: "9000000098",
    notes: "Less ice",
    coupon: "FIRSTBREW",
    paymentMode: "UPI",
  });
  state = bills.addPosBill(state);
  const b = state.activeId;
  state = bills.addPosItems(state, b, [
    posItem("cappuccino", "Cappuccino", 15000, 2),
  ]);
  state = bills.changePosFields(state, b, {
    customer: "Customer B",
    phone: "9000000097",
    notes: "Extra warm",
    paymentMode: "Card",
  });
  state = bills.selectPosBill(state, a);
  assert.equal(bills.posBill(state, a).items[0].id, "brownie-cold-coffee");
  assert.equal(bills.posBill(state, a).fields.phone, "9000000098");
  assert.equal(bills.posBill(state, b).items[0].quantity, 2);
  assert.equal(bills.posBill(state, b).fields.paymentMode, "Card");
  assert.notEqual(keyA, bills.posBill(state, b).requestKey);
  const beforeB = structuredClone(bills.posBill(state, b));
  state = bills.clearPosBill(state, a);
  assert.deepEqual(bills.posBill(state, b), beforeB);
  assert.notEqual(bills.posBill(state, a).requestKey, keyA);
});
test("pending bills freeze their original snapshot; recovery reuses the same reference", () => {
  let state = bills.newPosWorkspace(),
    a = state.activeId;
  state = bills.addPosItems(state, a, [
    posItem("brownie-cold-coffee", "Brownie Cold Coffee", 22000),
  ]);
  const start = bills.beginPosBilling(state, a);
  state = start.state;
  assert.throws(
    () => bills.beginPosBilling(state, a),
    /already being submitted/,
  );
  for (const change of [
    (s) => bills.clearPosBill(s, a),
    (s) => bills.changePosFields(s, a, { customer: "Other" }),
    (s) =>
      bills.addPosItems(s, a, [posItem("cappuccino", "Cappuccino", 15000)]),
  ])
    assert.throws(() => change(state), /locked/);
  const snapshot = structuredClone(start.payload);
  state = bills.restorePosWorkspace(JSON.parse(JSON.stringify(state)));
  assert.equal(bills.posBill(state, a).status, "uncertain");
  state = bills.repricePosBills(state, [
    {
      id: "brownie-cold-coffee",
      variants: [{ label: "Standard", price: 99900 }],
    },
  ]);
  const retry = bills.beginPosBilling(state, a);
  assert.equal(retry.recover, true);
  assert.deepEqual(retry.payload, snapshot);
  state = bills.failPosBilling(retry.state, a, true);
  assert.equal(bills.posBill(state, a).status, "draft");
  assert.equal(bills.posBill(state, a).submission, undefined);
});
test("a late bill completion removes only that draft and preserves the active customer", () => {
  let state = bills.newPosWorkspace(),
    a = state.activeId;
  state = bills.addPosItems(state, a, [
    posItem("cappuccino", "Cappuccino", 15000),
  ]);
  state = bills.beginPosBilling(state, a).state;
  state = bills.addPosBill(state);
  const b = state.activeId;
  state = bills.addPosItems(state, b, [
    posItem("brownie-cold-coffee", "Brownie Cold Coffee", 22000),
  ]);
  const before = structuredClone(bills.posBill(state, b));
  state = bills.finishPosBill(state, a);
  assert.equal(state.activeId, b);
  assert.deepEqual(bills.posBill(state, b), before);
  assert.strictEqual(bills.finishPosBill(state, a), state);
  assert.throws(() => bills.closePosBill(state, b), /Clear this draft/);
  const fresh = bills.finishPosBill(state, b);
  assert.equal(fresh.bills.length, 1);
  assert.equal(fresh.bills[0].items.length, 0);
  assert.notEqual(
    fresh.bills[0].requestKey,
    bills.posBill(state, b).requestKey,
  );
});
test("failed item merges are atomic and invalid saved billing references are rejected", () => {
  const current = [posItem("cappuccino", "Cappuccino", 15000, 20)],
    copy = structuredClone(current);
  assert.throws(
    () =>
      bills.mergePosItems(current, [
        posItem("brownie-cold-coffee", "Brownie Cold Coffee", 22000),
        posItem("cappuccino", "Cappuccino", 15000),
      ]),
    /Maximum 20/,
  );
  assert.deepEqual(current, copy);
  const state = bills.newPosWorkspace();
  state.bills[0].status = "submitting";
  assert.throws(() => bills.restorePosWorkspace(state), /needs review/);
});
