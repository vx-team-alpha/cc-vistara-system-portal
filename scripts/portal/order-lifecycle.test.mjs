import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionOrder,
  incompleteDoorLines,
  isDoorConfigurationComplete,
} from "../../src/lib/orders/lifecycle.ts";

const completeConfiguration = {
  system: "eurocell",
  frame: { width_mm: 900, height_mm: 2100, quantity: 1, location: "Front" },
  style: "Contemporary",
  design_id: "11111111-1111-4111-8111-111111111111",
  design_name: "Example",
  side_designs: {},
  picks: { "Door Design|door": "22222222-2222-4222-8222-222222222222" },
  texts: {},
  particulars: [
    {
      question: "Door Design",
      original_name: "Door Design (Door)",
      section: "door",
      answer: "Example",
    },
  ],
};

test("allows valid order status transitions between distinct statuses", () => {
  assert.equal(canTransitionOrder("draft", "issued"), true);
  assert.equal(canTransitionOrder("draft", "cancelled"), true);
  assert.equal(canTransitionOrder("issued", "confirmed"), true);
  assert.equal(canTransitionOrder("confirmed", "in_production"), true);
  assert.equal(canTransitionOrder("in_production", "completed"), true);
  assert.equal(canTransitionOrder("completed", "draft"), true);
  assert.equal(canTransitionOrder("cancelled", "draft"), true);
  assert.equal(canTransitionOrder("draft", "draft"), false);
  assert.equal(canTransitionOrder("completed", "unknown_status"), false);
});

test("requires a design, picks, and particulars before issue", () => {
  assert.equal(isDoorConfigurationComplete(completeConfiguration), true);
  assert.equal(isDoorConfigurationComplete({}), false);
  assert.equal(isDoorConfigurationComplete({ ...completeConfiguration, design_id: "" }), false);
  assert.equal(isDoorConfigurationComplete({ ...completeConfiguration, picks: {} }), false);
  assert.equal(isDoorConfigurationComplete({ ...completeConfiguration, particulars: [] }), false);
});

test("reports the exact incomplete door line numbers", () => {
  assert.deepEqual(
    incompleteDoorLines([
      { line_number: 1, configuration: completeConfiguration },
      { line_number: 2, configuration: { ...completeConfiguration, system: "rehau" } },
      { line_number: 3, configuration: {} },
      { line_number: 7, configuration: { ...completeConfiguration, picks: {} } },
    ]),
    [3, 7],
  );
});
