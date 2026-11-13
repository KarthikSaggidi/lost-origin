import test from "node:test";
import assert from "node:assert/strict";
import { lostOriginMenu } from "../lib/lost-origin-catalogue.ts";
import {
  defaultCourts,
  quoteBooking,
  validBooking,
  money,
} from "../lib/domain.ts";
const expected = {
  Espresso: [110, 120],
  Cortado: [140],
  Cappuccino: [150],
  "Long black": [150, 160],
  "Flat white": [160],
  Latte: [160, 170],
  "Spanish latte": [170],
  Mocha: [170, 180],
  "Vietnamese coffee": [180],
  "Cranberry Infusion": [180],
  "Orange Infusion": [180],
  "Espresso Tonic": [180],
  "Estate Special": [180],
  "Classic Cold Coffee": [200],
  "Brownie Cold Coffee": [220],
  "Biscoff Cold Coffee": [230],
  "Plain Cold Brew": [180],
  "Vanilla Cold Brew": [200],
  "Coconut Cold Brew": [220],
  "Matcha Latte": [240, 250],
  "Coconut Matcha": [280],
  "Strawberry Matcha latte": [280],
  "Matcha Cream": [300],
  "Hot chocolate": [200],
  "Strawberry Latte": [220],
  "Salted Fries": [200],
  "Peri Peri Fries": [220],
  "Veg Sandwich": [270],
  "Chicken Sandwich": [300],
  "Alfredo Veg Pasta": [270],
  "Alfredo Chicken Pasta": [300],
  "Red Sauce Veg Pasta": [270],
  "Red Sauce Chicken Pasta": [300],
  "Avacado Toast": [230],
  "Scrambled Egg Toast": [200],
};
test("all 35 owner-supplied products and temperature prices match the menu images", () => {
  assert.equal(lostOriginMenu.length, 35);
  for (const [name, prices] of Object.entries(expected)) {
    const p = lostOriginMenu.find((p) => p.name === name);
    assert.ok(p, name);
    assert.deepEqual(
      p.variants.map((v) => v.price / 100),
      prices,
      name,
    );
    if (prices.length === 2)
      assert.deepEqual(
        p.variants.map((v) => v.label),
        ["Hot", "Cold"],
      );
  }
});
test("chicken and egg are not labelled vegetarian", () => {
  assert.equal(lostOriginMenu.filter((p) => p.diet === "nonveg").length, 3);
  assert.equal(
    lostOriginMenu.find((p) => p.id === "scrambled-egg-toast").diet,
    "egg",
  );
});
test("four courts have independent configuration and exact price calculations", () => {
  assert.equal(defaultCourts.length, 4);
  const court = {
    ...defaultCourts[3],
    baseRate: 70000,
    peakRate: 90000,
    taxRate: 12,
    equipmentRate: 15000,
    open: 480,
    close: 1200,
  };
  assert.equal(quoteBooking(600, 60, true, "2026-11-10", court), 95200);
  assert.equal(validBooking(450, 30, court), false);
  assert.equal(validBooking(1170, 60, court), false);
  assert.equal(validBooking(1170, 30, court), true);
});
test("whole menu amounts omit redundant decimals but tax paise remain visible", () => {
  assert.equal(money(11000), "₹110");
  assert.equal(money(11550), "₹115.5");
});
