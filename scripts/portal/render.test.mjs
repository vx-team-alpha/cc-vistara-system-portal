import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

import {
  hydrate,
  installAssets,
  doorState,
  windowState,
} from "../../src/lib/configurator/runtime/adapter.js";
import { catalogueDimensions } from "../../src/lib/configurator/runtime/dimensions.js";
import { renderDoor } from "../../src/lib/configurator/runtime/rendering.js";
import { validateConfiguration } from "../../src/lib/configurator/runtime/validate.js";
import { renderWindow } from "../../src/lib/configurator/runtime/window-renderer.js";
const dir = ".frontage-seed/";
const rows = JSON.parse(fs.readFileSync(dir + "catalogue.json"));
const assets = JSON.parse(fs.readFileSync(dir + "assets.json"));
const aliases = JSON.parse(fs.readFileSync(dir + "asset-paths.json"));
const paths = Object.fromEntries(
  Object.entries(aliases).map(([key, value]) => [key, value.cdn_url]),
);
const read = (key) => JSON.parse(fs.readFileSync(dir + "objects/" + aliases[key].hash));
const byUrl = new Map(assets.map((a) => [a.cdn_url, a]));
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  const asset = byUrl.get(String(url));
  if (!asset) throw new Error(`Unmapped render dependency: ${url}`);
  return new Response(fs.readFileSync(dir + "objects/" + asset.hash));
};
const dom = new JSDOM("");
globalThis.DOMParser = dom.window.DOMParser;
globalThis.XMLSerializer = dom.window.XMLSerializer;
const purify = createDOMPurify(dom.window);
installAssets(paths);
const originalRange = rows.product_ranges.find((r) => r.slug === "original");
const door = rows.layouts.find(
  (l) =>
    l.range_id === originalRange.id && l.features.kind === "layout" && l.name === "Door Left Hand",
);
const manifest = hydrate(read("/catalogue/manifest.json"));
const configuration = { picks: {}, texts: {}, side_designs: {} };
test("door finish choice changes the stored-catalogue SVG and sanitizes safely", async () => {
  const state = doorState(manifest, door.features.source, configuration);
  const render = (state) =>
    renderDoor({
      data: manifest,
      layout: door.features.source,
      design: state.design,
      sideDesigns: state.sides,
      questions: state.questions,
      picks: state.picks,
      texts: {},
      internal: false,
    });
  const first = await render(state);
  assert.match(first, /<svg/);
  const colour = state.questions.find((q) => q.originalName === "Door Colour (External)");
  assert.ok(colour?.options.length > 1);
  const alternative = colour.options.find((o) => o.id !== state.picks[colour.key]);
  const next = doorState(manifest, door.features.source, {
    ...configuration,
    picks: { ...state.picks, [colour.key]: alternative.id },
  });
  const second = await render(next);
  assert.notEqual(first, second);
  const safe = purify.sanitize(second + "<script>alert(1)</script>", {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
  assert.doesNotMatch(safe, /<script|onload=/i);
  assert.match(safe, /<image/);
});
test("door snapshot uses catalogue labels and rejects forged choices", async () => {
  const state = doorState(manifest, door.features.source, configuration);
  assert.equal(
    state.questions.some((question) => question.originalName === "Door Range"),
    false,
  );
  assert.equal(state.design.designName, "Augusta Centre Farmhouse");
  const runtime = {
    kind: "door",
    source: door.features.source,
    paths,
    read: async (key) => read(key),
  };
  const result = await validateConfiguration(runtime, {
    ...configuration,
    picks: state.picks,
    style: state.style,
    design_id: state.design.designId,
  });
  assert.ok(result.particulars.length > 0);
  assert.equal(result.design_name, "Augusta Centre Farmhouse");
  assert.equal(
    result.particulars.some((item) => item.original_name === "Door Range"),
    false,
  );
  await assert.rejects(() =>
    validateConfiguration(runtime, {
      ...configuration,
      picks: { forged: "00000000-0000-4000-8000-000000000111" },
    }),
  );
});
test("window glazing reveals dependent questions and inside/outside SVGs render", async () => {
  const range = rows.product_ranges.find((r) => r.slug === "advance70-sculptured-casement");
  const window = rows.layouts.find((l) => l.range_id === range.id && l.features.kind === "layout");
  const source = window.features.source;
  const shared = read("/window-data/sculptured-casement/questions.json");
  const overrides = read("/window-data/sculptured-casement/questions-by-style.json");
  const initial = windowState(source, shared, overrides, {});
  const glazing = initial.questions.find((q) => q.name === "Glazing Method");
  assert.ok(glazing);
  const glazed = glazing.options.find((o) => o.description === "Glazed");
  assert.ok(glazed);
  const next = windowState(source, shared, overrides, {
    ...initial.picks,
    [glazing.key]: glazed.id,
  });
  assert.ok(next.questions.some((q) => q.name === "Glass Type"));
  const materials = read("/window-data/render-materials.json");
  for (const internal of [false, true]) {
    const face = source.images.find((i) => i.type === (internal ? 2 : 1));
    assert.ok(face);
    const svg = await (await fetch(face.path)).text();
    const output = renderWindow(svg, next.questions, next.picks, internal, materials, source);
    assert.match(output, /<svg/);
    assert.doesNotMatch(output, /<script|foreignObject/i);
    assert.match(output, /layertype="Dimensions"/);
    assert.match(output, /data-dimension="Overall width"/);
    assert.match(
      output,
      new RegExp(
        `>${catalogueDimensions(source).find((d) => d.description === "Overall width")?.value}<`,
      ),
    );
  }
  const result = await validateConfiguration(
    {
      kind: "window",
      source,
      paths,
      read: async (key) => read(key),
      layout: { product_ranges: { slug: range.slug } },
    },
    { ...configuration, picks: next.picks },
  );
  assert.ok(
    result.particulars.some((p) => p.question === "Glazing Method" && p.answer === "Glazed"),
  );
});

test("window and door elevations expose catalogue millimetre dimensions", async () => {
  const range = rows.product_ranges.find((r) => r.slug === "advance70-sculptured-casement");
  const window = rows.layouts.find(
    (l) =>
      l.range_id === range.id &&
      l.features.kind === "layout" &&
      (l.features.source?.dimensions || []).some((d) => d.description === "Horizontal span 1"),
  );
  const source = window.features.source;
  const materials = read("/window-data/render-materials.json");
  const face = source.images.find((i) => i.type === 1);
  const svg = await (await fetch(face.path)).text();
  const state = windowState(
    source,
    read("/window-data/sculptured-casement/questions.json"),
    read("/window-data/sculptured-casement/questions-by-style.json"),
    {},
  );
  const output = renderWindow(svg, state.questions, state.picks, false, materials, source);
  assert.doesNotMatch(output, /<foreignObject/i);
  assert.match(output, /data-dimension="Overall width"/);
  assert.match(output, /data-dimension="Overall height"/);
  assert.match(output, /data-dimension="Horizontal span 1"/);
  const width = String(
    catalogueDimensions(source).find((d) => d.description === "Overall width").value,
  );
  assert.match(output, new RegExp(`>${width}<`));

  const doorSvg = await renderDoor({
    data: manifest,
    layout: door.features.source,
    design: doorState(manifest, door.features.source, configuration).design,
    sideDesigns: {},
    questions: doorState(manifest, door.features.source, configuration).questions,
    picks: doorState(manifest, door.features.source, configuration).picks,
    texts: {},
    internal: false,
  });
  assert.match(doorSvg, /layertype="Dimensions"/);
  assert.match(doorSvg, /data-dimension="Overall width"/);
  assert.match(doorSvg, /data-dimension="Overall height"/);
  assert.match(doorSvg, /font-size="(?:8[0-9]|9[0-9]|10[0-9]|11[0-2])"/);
  assert.match(doorSvg, />900</);
  assert.match(doorSvg, />2050</);
  assert.doesNotMatch(doorSvg, /✎/);
});
test.after(() => {
  globalThis.fetch = originalFetch;
  dom.window.close();
});

test("hardware finish retains shading and reaches the inside handle", async () => {
  const state = doorState(manifest, door.features.source, configuration);
  const q = state.questions.find((q) => q.originalName === "Hardware Colour");
  const gold = q.options.find((o) => o.description === "Gold");
  assert.ok(gold);
  for (const internal of [false, true]) {
    const svg = await renderDoor({
      data: manifest,
      layout: door.features.source,
      design: state.design,
      sideDesigns: state.sides,
      questions: state.questions,
      picks: { ...state.picks, [q.key]: gold.id },
      texts: {},
      internal,
    });
    const doc = new dom.window.DOMParser().parseFromString(svg, "image/svg+xml");
    const handles = [...doc.querySelectorAll('[data-section="door"] image')].filter((el) =>
      /handle_/i.test(
        decodeURIComponent(
          Object.entries(manifest.assets).find(
            ([, a]) => a.src === el.getAttributeNS("http://www.w3.org/1999/xlink", "href"),
          )?.[0] || "",
        ),
      ),
    );
    assert.ok(handles.length);
    assert.ok(
      handles.every((el) => el.hasAttribute("filter")),
      "both faces must tint their handles",
    );
    assert.ok(
      doc.querySelector('filter[id^="hardware-"] feComponentTransfer'),
      "metal shading must survive tinting",
    );
  }
});

test("inside door glass aperture stays aligned with its mirrored image", async () => {
  const state = doorState(manifest, door.features.source, configuration);
  const svg = await renderDoor({
    data: manifest,
    layout: door.features.source,
    design: state.design,
    sideDesigns: state.sides,
    questions: state.questions,
    picks: state.picks,
    texts: {},
    internal: true,
  });
  const doc = new dom.window.DOMParser().parseFromString(svg, "image/svg+xml");
  const image = [...doc.querySelectorAll('[data-section="door"] image')].find((el) => {
    const href =
      el.getAttributeNS("http://www.w3.org/1999/xlink", "href") || el.getAttribute("href");
    const source =
      Object.entries(manifest.assets).find(([, asset]) => asset.src === href)?.[0] || "";
    return /glass/i.test(decodeURIComponent(source));
  });
  assert.ok(image, "the inside face must contain its glass image");
  const clip = image.closest('g[clip-path*="pane-aperture"]');
  const clipPath = doc.getElementById(clip.getAttribute("clip-path").match(/#([^)]+)/)[1]);
  const pathNumbers = (
    clipPath
      .querySelector("path")
      .getAttribute("d")
      .match(/-?\d+(?:\.\d+)?/g) || []
  ).map(Number);
  const pathXs = pathNumbers.filter((_, index) => index % 2 === 0);
  const translate = (
    clipPath
      .getAttribute("transform")
      ?.match(/translate\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(-?\d+(?:\.\d+)?)\s*\)/) || []
  )
    .slice(1)
    .map(Number);
  const clipBounds = [
    Math.min(...pathXs) + (translate[0] || 0),
    Math.max(...pathXs) + (translate[0] || 0),
  ];
  const x = Number(image.getAttribute("x")),
    width = Number(image.getAttribute("width"));
  const mirror = Number(
    image.getAttribute("transform").match(/translate\(\s*(-?\d+(?:\.\d+)?)/)?.[1],
  );
  const imageBounds = [mirror - x - width, mirror - x];
  assert.deepEqual(
    clipBounds,
    imageBounds,
    "inside glass must not be partially cut off by an offset aperture",
  );
});

test("numerals render entered text and obscure glass stays inside the captured aperture", async () => {
  const state = doorState(manifest, door.features.source, configuration);
  const numeral = state.questions.find((q) => q.originalName === "Numeral");
  const yes = numeral.options.find((o) => o.description === "Numerals");
  assert.ok(yes);
  const next = doorState(manifest, door.features.source, {
    ...configuration,
    picks: { ...state.picks, [numeral.key]: yes.id },
  });
  const number = next.questions.find((q) => q.originalName === "House Number");
  assert.ok(number?.hasText);
  const glass = next.questions.find((q) => q.originalName === "Glass Design (Door)");
  const obscure = glass.options.find((o) => /Obscure/.test(o.description));
  assert.ok(obscure);
  for (const internal of [false, true]) {
    const svg = await renderDoor({
      data: manifest,
      layout: door.features.source,
      design: next.design,
      sideDesigns: next.sides,
      questions: next.questions,
      picks: { ...next.picks, [glass.key]: obscure.id },
      texts: { [number.key]: "200" },
      internal,
    });
    const doc = new dom.window.DOMParser().parseFromString(svg, "image/svg+xml");
    assert.equal(doc.querySelector("[data-house-number]").textContent, "200");
    const panes = [...doc.querySelectorAll("[data-glass]")];
    assert.ok(panes.length);
    assert.ok(
      panes.every((p) => p.closest('g[clip-path*="pane-aperture"]')),
      "replacement glass must keep the design aperture",
    );
  }
});

test("letterplate positions dynamically adapt to door design and omit when none exist", async () => {
  const carnoustie = manifest.designs.original.Traditional.find(
    (d) => d.designName === "Carnoustie",
  );
  assert.ok(carnoustie);
  const stateNoLetter = doorState(manifest, door.features.source, {
    style: "Traditional",
    design_id: carnoustie.designId,
    picks: {},
  });
  assert.ok(!stateNoLetter.questions.some((q) => q.originalName === "Letterplate Position"));

  const letterQ = stateNoLetter.questions.find((q) => q.originalName === "Letterplate");
  const letterYes = letterQ.options.find((o) => o.description === "Letterplate");
  const stateWithLetter = doorState(manifest, door.features.source, {
    style: "Traditional",
    design_id: carnoustie.designId,
    picks: { [letterQ.key]: letterYes.id },
  });
  const posQ = stateWithLetter.questions.find((q) => q.originalName === "Letterplate Position");
  assert.ok(posQ);
  const posDescriptions = posQ.options.map((o) => o.description);
  assert.deepEqual(posDescriptions, ["Position 14 - Midrail", "Position 34 - Bottom Rail"]);

  const augustaLong2 = manifest.designs.original.Contemporary.find((d) =>
    d.designName.includes("Augusta Long 2"),
  );
  if (augustaLong2) {
    const stateLong2 = doorState(manifest, door.features.source, {
      style: "Contemporary",
      design_id: augustaLong2.designId,
      picks: { [letterQ.key]: letterYes.id },
    });
    assert.ok(!stateLong2.questions.some((q) => q.originalName === "Letterplate Position"));
  }
});

test("inline bar handle dynamically reveals matching Escutcheon (Slab) question", async () => {
  const state = doorState(manifest, door.features.source, configuration);
  const handleQ = state.questions.find((q) => q.originalName === "Handle");
  const hwQ = state.questions.find((q) => q.originalName === "Hardware Colour");
  const leverOpt = handleQ.options.find((o) => /lever\/lever/i.test(o.description));
  const barOpt = handleQ.options.find((o) => /inline bar/i.test(o.description));
  const blackHw = hwQ.options.find((o) => o.description === "Black");

  const stateLever = doorState(manifest, door.features.source, {
    ...configuration,
    picks: { [handleQ.key]: leverOpt.id },
  });
  assert.ok(!stateLever.questions.some((q) => q.originalName === "Escutcheon (Slab)"));

  const stateBarBlack = doorState(manifest, door.features.source, {
    ...configuration,
    picks: { [handleQ.key]: barOpt.id, [hwQ.key]: blackHw.id },
  });
  const escQ = stateBarBlack.questions.find((q) => q.originalName === "Escutcheon (Slab)");
  assert.ok(escQ);
  assert.equal(escQ.options[0].description, "Escutcheon (Black)");
  assert.equal(escQ.options[1].description, "None");

  const svgWithEsc = await renderDoor({
    data: manifest,
    layout: door.features.source,
    design: stateBarBlack.design,
    sideDesigns: stateBarBlack.sides,
    questions: stateBarBlack.questions,
    picks: { ...stateBarBlack.picks, [escQ.key]: escQ.options[0].id },
    texts: {},
    internal: false,
  });
  const docWithEsc = new dom.window.DOMParser().parseFromString(svgWithEsc, "image/svg+xml");
  const escImage = docWithEsc.querySelector('[data-hardware="escutcheon"]');
  assert.ok(escImage, "Escutcheon image must be rendered on the door elevation");
  assert.equal(Math.round(Number(escImage.getAttribute("width"))), 32);
  assert.equal(Math.round(Number(escImage.getAttribute("height"))), 72);
  assert.equal(Math.round(Number(escImage.getAttribute("x"))), 785);
  assert.equal(Math.round(Number(escImage.getAttribute("y"))), 608);

  const noneOpt = escQ.options.find((o) => o.description === "None");
  const svgNone = await renderDoor({
    data: manifest,
    layout: door.features.source,
    design: stateBarBlack.design,
    sideDesigns: stateBarBlack.sides,
    questions: stateBarBlack.questions,
    picks: { ...stateBarBlack.picks, [escQ.key]: noneOpt.id },
    texts: {},
    internal: false,
  });
  const docNone = new dom.window.DOMParser().parseFromString(svgNone, "image/svg+xml");
  assert.ok(
    !docNone.querySelector('[data-hardware="escutcheon"]'),
    "Escutcheon must be omitted when None is selected",
  );
});

test("cill profile member renders with 50mm overhang and removes when No Cill selected", async () => {
  const state = doorState(manifest, door.features.source, configuration);
  const cillQ = state.questions.find((q) => q.originalName === "Cill");
  const thresholdQ = state.questions.find((q) => q.originalName === "Threshold");
  const noCill = cillQ.options.find((o) => /no cill/i.test(o.description));
  const cill155 = cillQ.options.find((o) => /155mm/i.test(o.description));
  const standardThreshold = thresholdQ.options.find((o) => /standard pvc/i.test(o.description));
  const goldThreshold = thresholdQ.options.find((o) => /gold aluminium/i.test(o.description));
  const render = (picks) =>
    renderDoor({
      data: manifest,
      layout: door.features.source,
      design: state.design,
      sideDesigns: state.sides,
      questions: state.questions,
      picks: { ...state.picks, ...picks },
      texts: {},
      internal: false,
    });
  const parseSvg = (svg) => new dom.window.DOMParser().parseFromString(svg, "image/svg+xml");
  const profile = (doc, id) => {
    const container = [...doc.querySelectorAll("g")].find((g) =>
      [...g.childNodes].some(
        (c) => c.nodeType === 8 && c.textContent.trim() === `Profile_member_${id}`,
      ),
    );
    const comment = [...container.childNodes].find(
      (c) => c.nodeType === 8 && c.textContent.trim() === `Profile_member_${id}`,
    );
    return comment.nextElementSibling;
  };

  const svgNoCill = await render({
    [cillQ.key]: noCill.id,
    [thresholdQ.key]: standardThreshold.id,
  });
  assert.ok(!svgNoCill.includes("Profile_member_1f5d5ec6-2776-4c6f-a10c-e4a49c11a3f5"));
  const noCillDoc = parseSvg(svgNoCill);
  const noCillBottom = profile(noCillDoc, "fc745b90-0fc1-4f76-b31b-9aab1ee78035");
  assert.equal(noCillBottom.getAttribute("transform"), "translate(900 2050) rotate(180)");
  assert.equal(
    noCillBottom.querySelector("path").getAttribute("d"),
    "M 70 70 L -0 0 L 900 -0 L 830 70 Z",
  );
  assert.equal(noCillDoc.querySelector('g[data-leaves="true"]').getAttribute("transform"), null);

  const svg155 = await render({
    [cillQ.key]: cill155.id,
    [thresholdQ.key]: goldThreshold.id,
  });
  assert.ok(svg155.includes("Profile_member_1f5d5ec6-2776-4c6f-a10c-e4a49c11a3f5"));
  const doc = parseSvg(svg155);
  const cillG = [...doc.querySelectorAll("g")].find((g) =>
    [...g.childNodes].some(
      (c) =>
        c.nodeType === 8 &&
        c.textContent.trim() === "Profile_member_1f5d5ec6-2776-4c6f-a10c-e4a49c11a3f5",
    ),
  );
  assert.ok(cillG);
  assert.equal(cillG.getAttribute("layertype"), "Diagram");
  const thresholdG = [...doc.querySelectorAll("g")].find((g) =>
    [...g.childNodes].some(
      (c) => c.nodeType === 8 && c.textContent.trim().startsWith("Profile_member_fc745b90"),
    ),
  );
  assert.ok(thresholdG, "the threshold profile must remain present with a cill");
  assert.equal(
    thresholdG.querySelector("g[transform]").getAttribute("transform"),
    "translate(900 2020) rotate(180)",
  );
  assert.equal(
    thresholdG.querySelector("g[transform] path").getAttribute("d"),
    "M 0 13 L -0 0 L 900 -0 L 900 13 Z",
  );
  assert.equal(
    thresholdG.querySelector("g[transform] rect").getAttribute("fill"),
    "rgba(150, 150, 24, 1)",
  );
  const aluminiumRight = profile(doc, "a42e2e4f-9907-4c66-9bcc-db46ef4838f5");
  const aluminiumLeft = profile(doc, "403b32be-67a4-4cf3-8ddf-723a52d5e16e");
  assert.equal(
    aluminiumRight.querySelector("path").getAttribute("d"),
    "M 70 70 L 0 -0 L 2007 -0 L 2007 50 L 2007 70 Z",
  );
  assert.equal(aluminiumLeft.getAttribute("transform"), "translate(-0 2007) rotate(270)");
  assert.equal(
    cillG.querySelector("g[transform]").getAttribute("transform"),
    "translate(950 2050) rotate(180)",
  );
  assert.ok(
    [...cillG.parentElement.children].indexOf(cillG) >
      [...thresholdG.parentElement.children].indexOf(thresholdG),
    "the cill must be layered after the threshold, matching DoorCo",
  );
  assert.equal(
    doc.querySelector('g[data-leaves="true"]').getAttribute("transform"),
    "translate(0 -12.5)",
    "the fitted door must sit above the cill",
  );

  const standardSvg = await render({
    [cillQ.key]: cill155.id,
    [thresholdQ.key]: standardThreshold.id,
  });
  const standardDoc = parseSvg(standardSvg);
  const standardBottom = profile(standardDoc, "fc745b90-0fc1-4f76-b31b-9aab1ee78035");
  const standardRight = profile(standardDoc, "a42e2e4f-9907-4c66-9bcc-db46ef4838f5");
  const standardLeft = profile(standardDoc, "403b32be-67a4-4cf3-8ddf-723a52d5e16e");
  assert.equal(standardBottom.getAttribute("transform"), "translate(900 2020) rotate(180)");
  assert.equal(
    standardBottom.querySelector("path").getAttribute("d"),
    "M 70 70 L -0 0 L 900 -0 L 830 70 Z",
  );
  assert.equal(
    standardRight.querySelector("path").getAttribute("d"),
    "M 70 70 L 0 -0 L 2020 -0 L 1950 70 Z",
  );
  assert.equal(standardLeft.getAttribute("transform"), "translate(0 2020) rotate(270)");
  assert.equal(
    standardLeft.querySelector("path").getAttribute("d"),
    "M 70 70 L -0 0 L 2020 0 L 1950 70 Z",
  );
});

test("Rehau Total70 presents profile questions, adapted cills, and renders Exitex threshold", async () => {
  const rehauConfig = { picks: {}, texts: {}, side_designs: {}, system: "rehau" };
  const state = doorState(manifest, door.features.source, rehauConfig);

  const outerFrameQ = state.questions.find((q) => q.originalName === "Outer frame");
  assert.ok(outerFrameQ);
  assert.deepEqual(
    outerFrameQ.options.map((o) => o.description),
    ["Composite outer frame", "Universal outer frame"],
  );

  const lockQ = state.questions.find((q) => q.originalName === "Locking");
  assert.ok(lockQ);
  assert.deepEqual(
    lockQ.options.map((o) => o.description),
    ["ERA Lock", "ERA Invincible Lock", "Hook lock"],
  );

  const safeTQ = state.questions.find((q) => q.originalName === "Safe T bar");
  assert.ok(safeTQ);

  const restrictorQ = state.questions.find((q) => q.originalName === "Restrictor");
  assert.ok(restrictorQ);

  const cillQ = state.questions.find((q) => q.originalName === "Cill");
  assert.ok(cillQ);
  assert.deepEqual(
    cillQ.options.map((o) => o.description),
    ["150mm cill", "180mm cill", "95mm stub cill", "No cill"],
  );

  const thresholdQ = state.questions.find((q) => q.originalName === "Threshold");
  assert.ok(thresholdQ);
  assert.deepEqual(
    thresholdQ.options.map((o) => o.description),
    [
      "72mm PVCu threshold",
      "Exitex low threshold (silver)",
      "Exitex low threshold (gold)",
      "52mm PVCu threshold",
    ],
  );

  const exitexSilver = thresholdQ.options.find(
    (o) => o.description === "Exitex low threshold (silver)",
  );
  const cill95 = cillQ.options.find((o) => o.description === "95mm stub cill");
  const svg = await renderDoor({
    data: manifest,
    layout: door.features.source,
    design: state.design,
    sideDesigns: state.sides,
    questions: state.questions,
    picks: { ...state.picks, [thresholdQ.key]: exitexSilver.id, [cillQ.key]: cill95.id },
    texts: {},
    internal: false,
  });
  assert.match(svg, /<svg/);
  const doc = new dom.window.DOMParser().parseFromString(svg, "image/svg+xml");
  const thresholdG = [...doc.querySelectorAll("g")].find((g) =>
    [...g.childNodes].some(
      (c) => c.nodeType === 8 && c.textContent.trim().startsWith("Profile_member_fc745b90"),
    ),
  );
  assert.ok(thresholdG);
  assert.equal(
    thresholdG.querySelector("g[transform] path").getAttribute("d"),
    "M 0 13 L -0 0 L 900 -0 L 900 13 Z",
  );
  assert.equal(
    thresholdG.querySelector("g[transform] rect").getAttribute("fill"),
    "rgba(169, 169, 169, 1)",
  );
});
