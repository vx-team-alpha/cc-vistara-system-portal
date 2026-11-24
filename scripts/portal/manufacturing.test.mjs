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

test("keeps empty part code and displays description and quantity for hardware", () => {
  const result = calculateManufacturing({
    ...focusExample,
    particulars: [
      { question: "Frame colour (Door)", answer: "White" },
      { question: "Cill colour", answer: "White" },
      { question: "Handles", answer: "Sweet Handle (Gold)" },
      { question: "Hinges", answer: "Standard Flag Hinges" },
      { question: "Locking", answer: "Winkhaus AutoLock" },
      { question: "Letterplate", answer: "Chrome Letterplate" },
    ],
  });
  const handle = result.parts.find((part) => part.lineId === "handle");
  assert.ok(handle);
  assert.equal(handle.partCode, "");
  assert.equal(handle.description, "Sweet Handle (Gold)");
  assert.equal(handle.totalQuantity, 1);

  const hinges = result.parts.find((part) => part.lineId === "hinges");
  assert.ok(hinges);
  assert.equal(hinges.partCode, "");
  assert.equal(hinges.description, "Standard Flag Hinges");
  assert.equal(hinges.totalQuantity, 3);

  const letterplate = result.parts.find((part) => part.lineId === "letterplate");
  assert.ok(letterplate);
  assert.equal(letterplate.partCode, "");
  assert.equal(letterplate.description, "Chrome Letterplate");
  assert.equal(letterplate.totalQuantity, 1);
});

test("calculates Rehau Total70 frame and cill cuts", () => {
  const result = calculateManufacturing({
    ...focusExample,
    system: "rehau",
    frame: { width_mm: 900, height_mm: 2050, quantity: 2, location: "Front" },
  });
  assert.ok(result);
  assert.equal(result.systemId, "rehau");
  assert.equal(result.finishedFrameHeightMm, 2020);
  assert.deepEqual(
    result.parts
      .slice(0, 3)
      .map((part) => [part.partCode, part.totalQuantity, part.widthMm, part.heightMm]),
    [
      ["546760", 4, 905, null],
      ["546760", 4, null, 2025],
      ["246330", 2, 1000, null],
    ],
  );
});

test("calculates Rehau Total70 with No cill and Universal outer frame", () => {
  const result = calculateManufacturing({
    ...focusExample,
    system: "rehau",
    frame: { width_mm: 920, height_mm: 2080, quantity: 1, location: "Back" },
    particulars: [
      { question: "Outer frame", answer: "Universal outer frame" },
      { question: "Cill (Door)", answer: "No cill" },
      { question: "Locking", answer: "ERA Invincible Lock" },
      { question: "Cylinder", answer: "High Security 3 Star Anti-Snap cylinder" },
      { question: "Hinges", answer: "Flag hinges" },
      { question: "Restrictor", answer: "Restrictor fitted" },
      { question: "Safe T bar", answer: "with safe T bar" },
    ],
  });
  assert.ok(result);
  assert.equal(result.finishedFrameHeightMm, 2080);
  assert.equal(
    result.parts.some((p) => p.lineId === "cill"),
    false,
  );

  const horizontal = result.parts.find((p) => p.lineId === "frame-horizontal");
  assert.equal(horizontal.partCode, "546185");
  assert.equal(horizontal.description, "Rehau Universal Outer Frame");
  assert.equal(horizontal.widthMm, 925);

  const vertical = result.parts.find((p) => p.lineId === "frame-vertical");
  assert.equal(vertical.partCode, "546185");
  assert.equal(vertical.heightMm, 2085);

  const lock = result.parts.find((p) => p.lineId === "lock");
  assert.equal(lock.partCode, "ERAL3");

  const cyl = result.parts.find((p) => p.lineId === "cylinder");
  assert.equal(cyl.partCode, "3STARTCYL");

  const hinges = result.parts.find((p) => p.lineId === "hinges");
  assert.equal(hinges.partCode, "FlagDoorHinge");

  const restrictor = result.parts.find((p) => p.lineId === "restrictor");
  assert.ok(restrictor);
  assert.equal(restrictor.description, "Restrictor fitted");

  const safeTBar = result.parts.find((p) => p.lineId === "safe-t-bar");
  assert.ok(safeTBar);
  assert.equal(safeTBar.description, "Safe T Bar");
});

test("calculates Rehau Total70 cills: 95mm and 180mm with Hook Lock", () => {
  const result95 = calculateManufacturing({
    ...focusExample,
    system: "rehau",
    frame: { width_mm: 880, height_mm: 2040, quantity: 1, location: "" },
    particulars: [
      { question: "Cill (Door)", answer: "95mm stub cill" },
      { question: "Locking", answer: "Hook lock" },
      { question: "Cylinder", answer: "1 Star cylinder" },
    ],
  });
  const cill95 = result95.parts.find((p) => p.lineId === "cill");
  assert.equal(cill95.partCode, "246320");
  assert.equal(cill95.widthMm, 980);

  const lockHook = result95.parts.find((p) => p.lineId === "lock");
  assert.equal(lockHook.partCode, "CDL1");

  const cyl1 = result95.parts.find((p) => p.lineId === "cylinder");
  assert.equal(cyl1.partCode, "1STARCYL");

  const result180 = calculateManufacturing({
    ...focusExample,
    system: "rehau",
    frame: { width_mm: 880, height_mm: 2040, quantity: 1, location: "" },
    particulars: [{ question: "Cill (Door)", answer: "180mm cill" }],
  });
  const cill180 = result180.parts.find((p) => p.lineId === "cill");
  assert.equal(cill180.partCode, "246340");
  assert.equal(cill180.widthMm, 980);
});
