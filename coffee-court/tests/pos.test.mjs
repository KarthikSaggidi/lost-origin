import test from "node:test";
import assert from "node:assert/strict";
import { lostOriginMenu } from "../lib/lost-origin-catalogue.ts";
import { parseVoiceCommand, voiceItems } from "../lib/pos-voice.ts";
import * as bills from "../lib/pos-bills.ts";

const products = lostOriginMenu.map((p) => ({
  ...p,
  recipe: { beans: 1 },
  active: 1,
  showOnPos: 1,
}));
const inventory = [
  {
    id: "beans",
    name: "Coffee beans",
    quantity: 100,
    unit: "g",
    cost: 1,
    reorder: 1,
  },
];
const items = (text, cart = []) =>
  voiceItems(parseVoiceCommand(text, products), products, inventory, cart);

test("voice matches supplied menu, common transcription typo and spoken quantities", () => {
  const [item] = items("1 browine cold coffee");
  assert.equal(item.id, "brownie-cold-coffee");
  assert.equal(item.quantity, 1);
  assert.equal(item.price, 22000);
  const group = items("please add two cappuccinos and one veg sandwich please");
  assert.deepEqual(
    group.map((i) => [i.id, i.quantity, i.price]),
    [
      ["cappuccino", 2, 15000],
      ["sandwich", 1, 27000],
    ],
  );
  assert.equal(items("a cold coffee")[0].id, "classic-cold-coffee");
});
test("voice requires an explicit variant, and uses current catalogue prices", () => {
  assert.equal(parseVoiceCommand("one latte", products).needsChoice, true);
  assert.throws(() => items("one latte"), /Choose a variant/);
  assert.deepEqual(
    items("two cold lattes").map((i) => [i.variant, i.price]),
    [["Cold", 17000]],
  );
  assert.equal(items("one espresso hot")[0].price, 11000);
  const changed = products.map((p) =>
    p.id === "cappuccino"
      ? { ...p, variants: [{ label: "Standard", price: 15500 }] }
      : p,
  );
  assert.equal(
    voiceItems(
      parseVoiceCommand("one cappuccino", changed),
      changed,
      inventory,
      [],
    )[0].price,
    15500,
  );
});
test("unknown, ambiguous and unavailable items never produce a partial command", () => {
  assert.throws(
    () => parseVoiceCommand("one cappuccino and one pizza", products),
    /Could not match/,
  );
  assert.throws(
    () => parseVoiceCommand("one coffee", products),
    /Could not match/,
  );
  assert.throws(
    () =>
      parseVoiceCommand("one latte", [
        ...products,
        { ...products.find((p) => p.id === "latte"), id: "duplicate" },
      ]),
    /more than one/,
  );
  const hidden = products.map((p) =>
    p.id === "cappuccino" ? { ...p, showOnPos: 0 } : p,
  );
  assert.throws(
    () => parseVoiceCommand("one cappuccino", hidden),
    /Could not match/,
  );
  const sold = products.map((p) =>
    p.id === "cappuccino" ? { ...p, stockAvailable: false } : p,
  );
  assert.throws(
    () =>
      voiceItems(
        parseVoiceCommand("one cappuccino", sold),
        sold,
        inventory,
        [],
      ),
    /not available/,
  );
});
test("voice rejects invalid quantities and destructive commands and checks aggregate stock", () => {
  for (const text of [
    "zero cappuccinos",
    "21 cappuccinos",
    "-1 cappuccino",
    "1.5 cappuccino",
    "clear bill",
    "pay bill",
    "delete coffee",
  ])
    assert.throws(() => parseVoiceCommand(text, products));
  const command = parseVoiceCommand(
    "two cappuccinos and two veg sandwich",
    products,
  );
  assert.throws(
    () => voiceItems(command, products, [{ ...inventory[0], quantity: 3 }], []),
    /Not enough/,
  );
  assert.throws(
    () =>
      voiceItems(
        parseVoiceCommand("one cappuccino", products),
        products,
        inventory,
        items("twenty cappuccinos"),
      ),
    /Maximum 20/,
  );
});
test("parallel POS drafts isolate items, contact, coupon, notes, payment and billing keys", () => {
  let state = bills.newPosWorkspace();
  const a = state.activeId,
    keyA = bills.posBill(state, a).requestKey;
  state = bills.addPosItems(state, a, items("one brownie cold coffee"));
  state = bills.changePosFields(state, a, {
    customer: "Customer A",
    phone: "9000000098",
    notes: "Less ice",
    coupon: "FIRSTBREW",
    paymentMode: "UPI",
  });
  state = bills.addPosBill(state);
  const b = state.activeId;
  state = bills.addPosItems(state, b, items("two cappuccinos"));
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
  state = bills.addPosItems(state, a, items("one brownie cold coffee"));
  const start = bills.beginPosBilling(state, a);
  state = start.state;
  assert.throws(
    () => bills.beginPosBilling(state, a),
    /already being submitted/,
  );
  for (const change of [
    (s) => bills.clearPosBill(s, a),
    (s) => bills.changePosFields(s, a, { customer: "Other" }),
    (s) => bills.addPosItems(s, a, items("one cappuccino")),
  ])
    assert.throws(() => change(state), /locked/);
  const snapshot = structuredClone(start.payload);
  state = bills.restorePosWorkspace(JSON.parse(JSON.stringify(state)));
  assert.equal(bills.posBill(state, a).status, "uncertain");
  state = bills.repricePosBills(
    state,
    products.map((p) => ({
      ...p,
      variants: [{ label: "Standard", price: 99900 }],
    })),
  );
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
  state = bills.addPosItems(state, a, items("one cappuccino"));
  state = bills.beginPosBilling(state, a).state;
  state = bills.addPosBill(state);
  const b = state.activeId;
  state = bills.addPosItems(state, b, items("one brownie cold coffee"));
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
  const current = items("twenty cappuccinos"),
    copy = structuredClone(current);
  assert.throws(
    () =>
      bills.mergePosItems(
        current,
        items("one brownie cold coffee and one cappuccino"),
      ),
    /Maximum 20/,
  );
  assert.deepEqual(current, copy);
  const state = bills.newPosWorkspace();
  state.bills[0].status = "submitting";
  assert.throws(() => bills.restorePosWorkspace(state), /needs review/);
});
