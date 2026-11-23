import assert from "node:assert/strict";
import test from "node:test";

import { calculateManufacturing } from "../../src/lib/manufacturing/calculate.ts";

const focusExample = {
  system: "eurocell",
  style: "Style 1",
  designName: "Carnoustie",
  frame: { width_mm: 950, height_mm: 2100, quantity: 1, location: "" },
  particulars: [
    { question: "Frame colour (Door)", answer: "Black" },
    { question: "Cill colour", answer: "Black" },
    { question: "Cill (Door)", answer: "150mm cill" },
    { question: "Handles", answer: "Chrome Lever/pad handles" },
    { question: "Cylinder", answer: "3* Thumbturn cylinder" },
    { question: "Hinges", answer: "VBH hinges" },
    { question: "Locking", answer: "ERA Lock" },
    { question: "Door colour", answer: "Black" },
  ],
};

test("reproduces the Eurocell Style 1 Focus works-order dimensions", () => {
  const result = calculateManufacturing(focusExample);
  assert.ok(result);
  assert.equal(result.finishedFrameHeightMm, 2070);
  assert.equal(result.checkDiagonalMm, 2305);
  assert.deepEqual(
    result.parts
      .slice(0, 3)
      .map((part) => [part.partCode, part.totalQuantity, part.widthMm, part.heightMm]),
    [
      ["EWS 7031BK", 2, 955, null],
      ["EWS 7031BK", 2, null, 2075],
      ["AC 150BK", 1, 1050, null],
    ],
  );
  const slab = result.parts.find((part) => part.lineId === "door-slab");
  assert.deepEqual([slab.widthMm, slab.heightMm], [830, 1950]);
});

test("scales quantities without merging distinct profile cuts", () => {
  const result = calculateManufacturing({
    ...focusExample,
    frame: { ...focusExample.frame, quantity: 3 },
  });
  assert.equal(result.parts[0].totalQuantity, 6);
  assert.equal(result.parts[1].totalQuantity, 6);
  assert.notEqual(result.parts[0].lineId, result.parts[1].lineId);
});

test("rejects dimensions outside the extracted Focus limits", () => {
  assert.throws(
    () =>
      calculateManufacturing({
        ...focusExample,
        frame: { ...focusExample.frame, width_mm: 299 },
      }),
    /between 300 and 2800/,
  );
});

test("uses the actual external and internal door colours from catalogue questions", () => {
  const result = calculateManufacturing({
    ...focusExample,
    particulars: [
      ...focusExample.particulars.filter((item) => item.question !== "Door colour"),
      { question: "Door Colour (External)", answer: "Pebble Grey" },
      { question: "Door Colour (Internal)", answer: "White" },
    ],
  });
  const slab = result.parts.find((part) => part.lineId === "door-slab");
  assert.equal(slab.description, "Carnoustie (Pebble Grey/White)");
});

test("never changes an unsupported selected profile finish to black", () => {
  const result = calculateManufacturing({
    ...focusExample,
    particulars: [
      ...focusExample.particulars.filter(
        (item) => !/^(frame|cill|door) colou?r/i.test(item.question),
      ),
      { question: "Profile Colour (External)", answer: "Agate Grey" },
      { question: "Profile Colour (Internal)", answer: "White" },
      { question: "Door Colour (External)", answer: "Pebble Grey" },
      { question: "Door Colour (Internal)", answer: "White" },
    ],
  });
  assert.equal(result.parts[0].partCode, "EWS 7031");
  assert.equal(result.parts[0].description, "EWS 7031 O/frame (Agate Grey/White)");
  assert.ok(result.warnings.some((warning) => /Agate Grey\/White/.test(warning)));
  assert.doesNotMatch(JSON.stringify(result), /\(Black\)|7031BK/);
});
