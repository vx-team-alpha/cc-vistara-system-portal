import assert from "node:assert/strict";
import fs from "node:fs";

import { JSDOM } from "jsdom";

import { hydrate, doorState } from "../src/lib/configurator/runtime/adapter.js";
import { renderDoor } from "../src/lib/configurator/runtime/rendering.js";

const dom = new JSDOM("");
globalThis.DOMParser = dom.window.DOMParser;
globalThis.XMLSerializer = dom.window.XMLSerializer;

globalThis.fetch = async (url) => {
  const urlStr = String(url);
  if (urlStr.startsWith("/catalogue")) {
    const localPath = "cc-/web/public" + urlStr;
    if (fs.existsSync(localPath)) {
      return new Response(fs.readFileSync(localPath));
    }
  }
  throw new Error(`Unmapped render dependency: ${url}`);
};

const manifest = hydrate(
  JSON.parse(fs.readFileSync("cc-/web/public/catalogue/manifest.json", "utf8")),
);
const layout = manifest.layouts.original["Door Left Hand"];

console.log("Running new features test suite...");

// 1. Test Letterplate Positions per Door Design
{
  console.log("Test 1: Letterplate positions per door design...");

  // A. Carnoustie
  const carnoustie = manifest.designs.original.Traditional.find(
    (d) => d.designName === "Carnoustie",
  );
  assert(carnoustie, "Carnoustie design must exist");

  const stateCarnoustieNoLetter = doorState(manifest, layout, {
    style: "Traditional",
    design_id: carnoustie.designId,
    picks: {},
  });
  assert(
    !stateCarnoustieNoLetter.questions.some((q) => q.originalName === "Letterplate Position"),
    "Letterplate Position must not appear when Letterplate is not selected",
  );

  const letterplateQ = stateCarnoustieNoLetter.questions.find(
    (q) => q.originalName === "Letterplate",
  );
  const letterOpt = letterplateQ.options.find((o) => o.description === "Letterplate");

  const stateCarnoustieWithLetter = doorState(manifest, layout, {
    style: "Traditional",
    design_id: carnoustie.designId,
    picks: { [letterplateQ.key]: letterOpt.id },
  });

  const posQ = stateCarnoustieWithLetter.questions.find(
    (q) => q.originalName === "Letterplate Position",
  );
  assert(posQ, "Letterplate Position must appear when Letterplate is selected");
  const posNames = posQ.options.map((o) => o.description);
  console.log("  Carnoustie letterplate positions:", posNames);
  assert.deepEqual(posNames, ["Position 14 - Midrail", "Position 34 - Bottom Rail"]);

  // B. Augusta Long 2 Farmhouse (should have NO letterplate position)
  const augustaLong2 = manifest.designs.original.Contemporary.find((d) =>
    d.designName.includes("Augusta Long 2"),
  );
  if (augustaLong2) {
    const stateLong2 = doorState(manifest, layout, {
      style: "Contemporary",
      design_id: augustaLong2.designId,
      picks: { [letterplateQ.key]: letterOpt.id },
    });
    const posQLong2 = stateLong2.questions.find((q) => q.originalName === "Letterplate Position");
    console.log("  Augusta Long 2 letterplate position question present?", Boolean(posQLong2));
    assert(!posQLong2, "Augusta Long 2 must NOT have Letterplate Position question");
  }

  // C. Augusta Centre Farmhouse
  const augustaCentre = manifest.designs.original.Contemporary.find((d) =>
    d.designName.includes("Augusta Centre"),
  );
  if (augustaCentre) {
    const stateCentre = doorState(manifest, layout, {
      style: "Contemporary",
      design_id: augustaCentre.designId,
      picks: { [letterplateQ.key]: letterOpt.id },
    });
    const posQCentre = stateCentre.questions.find((q) => q.originalName === "Letterplate Position");
    assert(posQCentre, "Augusta Centre must have Letterplate Position");
    const centrePositions = posQCentre.options.map((o) => o.description);
    console.log("  Augusta Centre letterplate positions:", centrePositions);
    assert.deepEqual(centrePositions, [
      "Position 26 - Between Cassette & Bottom Of Door",
      "Position 30 - Between Cassette & Bottom Of Door",
      "Position 34 - Bottom Rail",
    ]);
  }

  console.log("  ✔ Letterplate positions per design passed!");
}

// 2. Test Escutcheon (Slab) Flow
{
  console.log("Test 2: Dynamic Handle & Escutcheon Flow...");
  const carnoustie = manifest.designs.original.Traditional.find(
    (d) => d.designName === "Carnoustie",
  );

  const baseState = doorState(manifest, layout, {
    style: "Traditional",
    design_id: carnoustie.designId,
    picks: {},
  });

  const handleQ = baseState.questions.find((q) => q.originalName === "Handle");
  const hwQ = baseState.questions.find((q) => q.originalName === "Hardware Colour");
  const leverOpt = handleQ.options.find((o) => /lever\/lever/i.test(o.description));
  const barOpt = handleQ.options.find((o) => /inline bar/i.test(o.description));
  const blackHw = hwQ.options.find((o) => o.description === "Black");
  const chromeHw = hwQ.options.find((o) => o.description === "Chrome");

  // Lever/Lever -> No Escutcheon
  const stateLever = doorState(manifest, layout, {
    style: "Traditional",
    design_id: carnoustie.designId,
    picks: { [handleQ.key]: leverOpt.id },
  });
  assert(
    !stateLever.questions.some((q) => q.originalName === "Escutcheon (Slab)"),
    "Escutcheon (Slab) must not appear for Lever/Lever handle",
  );

  // 1200 Inline Bar + Black Hardware -> Escutcheon (Black), None
  const stateBarBlack = doorState(manifest, layout, {
    style: "Traditional",
    design_id: carnoustie.designId,
    picks: {
      [handleQ.key]: barOpt.id,
      [hwQ.key]: blackHw.id,
    },
  });
  const escQBlack = stateBarBlack.questions.find((q) => q.originalName === "Escutcheon (Slab)");
  assert(escQBlack, "Escutcheon (Slab) must appear when Inline Bar Handle is selected");
  console.log(
    "  Escutcheon options for Black hardware:",
    escQBlack.options.map((o) => o.description),
  );
  assert.equal(escQBlack.options[0].description, "Escutcheon (Black)");
  assert.equal(escQBlack.options[1].description, "None");

  // 1200 Inline Bar + Chrome Hardware -> Escutcheon (Chrome), None
  const stateBarChrome = doorState(manifest, layout, {
    style: "Traditional",
    design_id: carnoustie.designId,
    picks: {
      [handleQ.key]: barOpt.id,
      [hwQ.key]: chromeHw.id,
    },
  });
  const escQChrome = stateBarChrome.questions.find((q) => q.originalName === "Escutcheon (Slab)");
  assert(escQChrome, "Escutcheon (Slab) must appear when Inline Bar Handle is selected");
  console.log(
    "  Escutcheon options for Chrome hardware:",
    escQChrome.options.map((o) => o.description),
  );
  assert.equal(escQChrome.options[0].description, "Escutcheon (Chrome)");
  assert.equal(escQChrome.options[1].description, "None");

  console.log("  ✔ Escutcheon (Slab) flow passed!");
}

// 3. Test Cill Rendering
{
  console.log("Test 3: Cill Rendering...");
  const carnoustie = manifest.designs.original.Traditional.find(
    (d) => d.designName === "Carnoustie",
  );

  const baseState = doorState(manifest, layout, {
    style: "Traditional",
    design_id: carnoustie.designId,
    picks: {},
  });

  const cillQ = baseState.questions.find((q) => q.originalName === "Cill");
  const noCillOpt = cillQ.options.find((o) => /no cill/i.test(o.description));
  const cill155Opt = cillQ.options.find((o) => /155mm/i.test(o.description));
  const cill95Opt = cillQ.options.find((o) => /95mm/i.test(o.description));
  const profileQ = baseState.questions.find((q) => q.originalName.includes("Profile Colour"));
  const greyProfile = profileQ.options.find((o) => /anthracite grey/i.test(o.description));

  // Render with No Cill
  const svgNoCill = await renderDoor({
    data: manifest,
    layout,
    design: carnoustie,
    sideDesigns: {},
    questions: baseState.questions,
    picks: { [cillQ.key]: noCillOpt.id },
    texts: {},
    internal: false,
  });
  assert(
    !svgNoCill.includes("Profile_member_1f5d5ec6-2776-4c6f-a10c-e4a49c11a3f5"),
    "No Cill must NOT have cill member 1f5d5ec6...",
  );

  // Render with 155mm Cill
  const svg155 = await renderDoor({
    data: manifest,
    layout,
    design: carnoustie,
    sideDesigns: {},
    questions: baseState.questions,
    picks: { [cillQ.key]: cill155Opt.id },
    texts: {},
    internal: false,
  });
  assert(
    svg155.includes("Profile_member_1f5d5ec6-2776-4c6f-a10c-e4a49c11a3f5"),
    "155mm Cill must have cill member 1f5d5ec6...",
  );
  assert(svg155.includes("rotate(180)"), "Cill must be properly transformed");
  console.log("  155mm Cill successfully rendered with member 1f5d5ec6!");

  // Render with 95mm Cill + Anthracite Grey profile
  const svg95Grey = await renderDoor({
    data: manifest,
    layout,
    design: carnoustie,
    sideDesigns: {},
    questions: baseState.questions,
    picks: {
      [cillQ.key]: cill95Opt.id,
      [profileQ.key]: greyProfile.id,
    },
    texts: {},
    internal: false,
  });
  assert(
    svg95Grey.includes("Profile_member_1f5d5ec6-2776-4c6f-a10c-e4a49c11a3f5"),
    "95mm Cill must have cill member 1f5d5ec6...",
  );
  // Anthracite grey rgb is [65,70,76]
  assert(
    svg95Grey.includes("rgb(65,70,76)") || svg95Grey.includes("rgb(65, 70, 76)"),
    "Cill must be recoloured with profile colour",
  );
  console.log("  95mm Cill successfully recoloured with Anthracite Grey profile!");

  console.log("  ✔ Cill rendering passed!");
}

console.log("\nALL TESTS PASSED SUCCESSFULLY! 🎉");
