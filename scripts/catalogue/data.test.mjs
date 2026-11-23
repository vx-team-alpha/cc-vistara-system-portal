import assert from "node:assert/strict";
import test from "node:test";

import { buildCatalogue, stableId } from "./data.mjs";

const q = (current, when) => ({
  name: "Glass",
  optionHeadingId: "glass",
  currentId: current,
  when,
  options: [
    { id: "clear", description: "Clear" },
    { id: "patterned", description: "Patterned" },
  ],
});
const fixture = () =>
  buildCatalogue(
    { layouts: {}, designs: {}, optionSets: {} },
    [],
    [
      {
        product: { folder: "test", name: "Test" },
        styles: [{ slug: "one", name: "One", designId: "design-one" }],
        items: { one: { questions: [q("clear")], questionsWhenGlazed: [q("patterned")] } },
        shared: {
          questions: {
            Glass: {
              contexts: [q("clear", { Glazing: "Double" }), q("patterned", { Glazing: "Triple" })],
            },
          },
        },
        overrides: [],
      },
    ],
  );

test("context-specific defaults and conditions survive repeated question names", () => {
  const rows = fixture();
  assert.equal(rows.questions.length, 4);
  assert.equal(rows.options.length, 8);
  assert.equal(new Set(rows.questions.map((q) => q.id)).size, 4);
  const layout = rows.layouts[0];
  assert.notEqual(
    layout.features.question_contexts[0].id,
    layout.features.glazed_question_contexts[0].id,
  );
  assert.equal(
    rows.options.filter(
      (o) => o.question_id === layout.features.question_contexts[0].id && o.is_default,
    )[0].external_id,
    "clear",
  );
  assert.equal(
    rows.options.filter(
      (o) => o.question_id === layout.features.glazed_question_contexts[0].id && o.is_default,
    )[0].external_id,
    "patterned",
  );
  assert.deepEqual(rows.questions[1].condition, { when: { Glazing: "Triple" } });
  assert.ok(rows.questions.every((q) => q.section_scope === "shared"));
});

test("repeated imports generate identical data and all foreign keys resolve", () => {
  const a = fixture();
  assert.deepEqual(a, fixture());
  assert.match(
    stableId("example"),
    /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/,
  );
  const questions = new Set(a.questions.map((q) => q.id));
  assert.ok(a.options.every((o) => questions.has(o.question_id)));
  const ranges = new Set(a.product_ranges.map((r) => r.id));
  assert.ok(a.questions.every((q) => ranges.has(q.range_id)));
});
