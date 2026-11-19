import { attachDoorDimensions } from "./dimensions.js";
import { glassUnits } from "./glass-units.js";

const NS = "http://www.w3.org/2000/svg";
const XL = "http://www.w3.org/1999/xlink";
const cache = new Map();
export async function loadSvg(src) {
  if (!cache.has(src))
    cache.set(
      src,
      fetch(src)
        .then((r) => {
          if (!r.ok) throw Error("The door drawing could not be loaded.");
          return r.text();
        })
        .catch((error) => {
          cache.delete(src);
          throw error;
        }),
    );
  return cache.get(src);
}
const parse = (text) => new DOMParser().parseFromString(text, "image/svg+xml");
const imageUrl = (e) => e.getAttributeNS(XL, "href") || e.getAttribute("href") || "";
const selected = (q, picks) =>
  q.options.find((o) => o.id === picks[q.key]) ??
  q.options.find((o) => o.id === q.currentId) ??
  q.options.find((o) => o.isCurrentOption) ??
  q.options[0];
const make = (doc, tag, attrs) => {
  const el = doc.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

function namespace(doc, prefix) {
  for (const el of doc.querySelectorAll("[id]")) {
    const id = el.id;
    for (const target of doc.querySelectorAll("*"))
      for (const attr of target.attributes) {
        if (attr.value.includes(`#${id}`))
          target.setAttribute(attr.name, attr.value.replaceAll(`#${id}`, `#${prefix}${id}`));
      }
    el.id = prefix + id;
  }
}

function colour(doc, rgb, selector) {
  if (!rgb) return;
  const id = `finish-${rgb.join("-")}`;
  const defs = doc.querySelector("defs");
  if (!doc.getElementById(id)) {
    const filter = make(doc, "filter", { id });
    filter.append(
      make(doc, "feColorMatrix", {
        in: "SourceGraphic",
        type: "matrix",
        result: `${id}-matrix`,
        values: `${rgb[0] / 255} 0 0 0 0 0 ${rgb[1] / 255} 0 0 0 0 0 ${rgb[2] / 255} 0 0 0 0 0 1 0`,
      }),
    );
    filter.append(
      make(doc, "feBlend", { mode: "multiply", in: `${id}-matrix`, in2: `${id}-matrix` }),
    );
    defs.append(filter);
  }
  for (const el of selector) el.setAttribute("filter", `url(#${id})`);
}

function leafScene(doc) {
  return [...doc.querySelectorAll('g[layertype="Diagram"]')].filter(
    (g) =>
      !g.querySelector("[memberid]") &&
      ![...g.childNodes].some(
        (c) =>
          c.nodeType === 8 &&
          /Profile_member|Glass_sightline_component|^\s*Glass_component/.test(c.textContent),
      ),
  );
}

function assetUrl(data, el) {
  const src = imageUrl(el);
  return Object.entries(data.assets).find(([, asset]) => asset.src === src)?.[0] ?? "";
}

function srcNamed(data, fragment) {
  const hit = Object.entries(data.assets).find(
    ([url, asset]) => asset.src && decodeURIComponent(url).includes(fragment),
  );
  return hit?.[1].src ?? "";
}

// Scraped from Quotila Doorco portal (external_image_black_1200_inline_bar.png).
// Portal only publishes a black elevation; chrome reuses it (tintFlat covers Gold/White).
const INLINE_BAR_ASSETS = {
  chrome: "/hardware/inline-bar-chrome.png",
  black: "/hardware/inline-bar-black.png",
};

// Quotila elevation slot on a ~914×2013 slab: x≈726 y≈400 w≈39 h≈1200
const INLINE_BAR_FX = { w: 39 / 914, h: 1200 / 2013, y: 400 / 2013 };

const ESCUTCHEON_ASSETS = {
  chrome: "/hardware/escutcheon-chrome.png",
  black: "/hardware/escutcheon-black.png",
  steel: "/hardware/escutcheon-steel.png",
};

// Quotila elevation slot on a ~914×2013 slab: w≈32, h≈72, y≈607.5, xRight≈786, xLeft≈64
const ESCUTCHEON_FX = {
  w: 32 / 914,
  h: 72 / 2013,
  y: 607.5 / 2013,
  xRight: 786 / 914,
  xLeft: 64 / 914,
};

function ensureInlineBarAssets(data) {
  for (const [tone, src] of Object.entries(INLINE_BAR_ASSETS)) {
    const key = `handle_(slab)/inline_bar_${tone}.png`;
    if (!data.assets[key]) data.assets[key] = { src };
  }
}

function ensureEscutcheonAssets(data) {
  if (!data.assets) data.assets = {};
  for (const [tone, src] of Object.entries(ESCUTCHEON_ASSETS)) {
    const key = `hardware/escutcheon_${tone}.png`;
    if (!data.assets[key]) data.assets[key] = { src };
  }
}

function fitInlineBarHandle(el, slab) {
  if (slab) {
    const sy = Number(slab.getAttribute("y") || 0);
    const sw = Number(slab.getAttribute("width") || 1);
    const sh = Number(slab.getAttribute("height") || 1);
    const nw = INLINE_BAR_FX.w * sw;
    const nh = INLINE_BAR_FX.h * sh;
    const ox = Number(el.getAttribute("x") || 0);
    const ow = Number(el.getAttribute("width") || 0);
    const cx = ox + ow / 2;
    el.setAttribute("x", String(cx - nw / 2));
    el.setAttribute("y", String(sy + INLINE_BAR_FX.y * sh));
    el.setAttribute("width", String(nw));
    el.setAttribute("height", String(nh));
    el.setAttribute("preserveAspectRatio", "xMidYMid meet");
    return;
  }
  const h = Number(el.getAttribute("height") || 0);
  const w = Number(el.getAttribute("width") || 0);
  if (!h || !w) return;
  const nh = h * 2.8;
  const nw = nh * (31 / 1200);
  const x = Number(el.getAttribute("x") || 0);
  const y = Number(el.getAttribute("y") || 0);
  el.setAttribute("x", String(x + (w - nw) / 2));
  el.setAttribute("y", String(y + (h - nh) / 2));
  el.setAttribute("width", String(nw));
  el.setAttribute("height", String(nh));
  el.setAttribute("preserveAspectRatio", "xMidYMid meet");
}

const SIDE_CASSETTE = {
  "Sidelight Birkdale": "image_twin_arch_square_to_round",
  "Sidelight Carnoustie": "image_twin_vertical",
  "Sidelight Medinah": "image_twin_vertical",
  "Sidelight Muirfield": "image_twin_top",
  "Sidelight Penina Left": "image_twin_eyebrow_square_to_taper_left",
  "Sidelight Penina Right": "image_twin_eyebrow_square_to_taper_right",
  "Sidelight Troon": "image_half_glazed",
};

function toneFor(name = "") {
  if (/black/i.test(name)) return "black";
  if (/chrome|stainless|satin silver/i.test(name)) return "chrome";
  return "";
}

const HARDWARE_TINT = {
  Gold: [198, 161, 91],
  "Rose Gold": [183, 110, 121],
  White: [236, 236, 236],
};

function tintFlat(doc, rgb, el) {
  if (!rgb) return;
  const id = `hardware-${rgb.join("-")}`;
  if (!doc.getElementById(id)) {
    const filter = make(doc, "filter", { id });
    filter.append(make(doc, "feColorMatrix", { type: "saturate", values: "0" }));
    const transfer = make(doc, "feComponentTransfer", {});
    for (const [index, channel] of ["R", "G", "B"].entries()) {
      const value = rgb[index] / 255;
      transfer.append(
        make(doc, "feFunc" + channel, {
          type: "table",
          tableValues: `0 ${value * 0.35} ${value * 0.78} ${value} ${value + (1 - value) * 0.75}`,
        }),
      );
    }
    filter.append(transfer);
    doc.querySelector("defs").append(filter);
  }
  el.setAttribute("filter", `url(#${id})`);
}

function swapTone(data, localSrc, tone) {
  if (!tone) return localSrc;
  const current = Object.entries(data.assets).find(([, asset]) => asset.src === localSrc);
  if (!current) return localSrc;
  const decoded = decodeURIComponent(current[0]).replace(/black|chrome/gi, tone);
  const found = Object.entries(data.assets).find(
    ([url, asset]) => asset.src && decodeURIComponent(url) === decoded,
  );
  return found?.[1].src || localSrc;
}

function glassUnit(optionId, width, height) {
  const list = glassUnits[optionId];
  if (!list?.length || !height) return null;
  const aspect = width / height;
  return list
    .slice()
    .sort((a, b) => Math.abs(a.w / a.h - aspect) - Math.abs(b.w / b.h - aspect))[0];
}

function paintGlass(doc, elements, chosen, parent) {
  if (!chosen || /standard glass \(clear\)/i.test(chosen.description)) return;
  for (const el of elements) {
    const width = Number(el.getAttribute("width") || 0);
    const height = Number(el.getAttribute("height") || 0);
    const unit = glassUnit(chosen.id, width, height);
    if (!unit) continue;
    const host = parent || el.parentElement;
    if (!host) continue;
    const tile = unit.w < 360 && unit.h < 360;
    if (tile) {
      const svg = el.ownerSVGElement || doc.documentElement;
      let defs = svg.querySelector(":scope > defs") || svg.querySelector("defs");
      if (!defs) {
        defs = make(doc, "defs", {});
        svg.prepend(defs);
      }
      const scope = svg.getAttribute("data-section") || "frame";
      const id = `glass-tile-${scope}-${chosen.id}`;
      if (!svg.querySelector(`[id="${id}"]`)) {
        const pattern = make(doc, "pattern", {
          id,
          patternUnits: "userSpaceOnUse",
          width: unit.w,
          height: unit.h,
        });
        const image = make(doc, "image", {
          x: 0,
          y: 0,
          width: unit.w,
          height: unit.h,
          preserveAspectRatio: "none",
        });
        image.setAttributeNS(XL, "href", unit.src);
        pattern.append(image);
        defs.append(pattern);
      }
      const rect = make(doc, "rect", {
        x: el.getAttribute("x") || 0,
        y: el.getAttribute("y") || 0,
        width,
        height,
        fill: `url(#${id})`,
      });
      for (const attr of ["transform", "clip-path", "mask"])
        if (el.hasAttribute(attr)) rect.setAttribute(attr, el.getAttribute(attr));
      rect.setAttribute("data-glass", "true");
      el.replaceWith(rect);
      continue;
    }
    const fit =
      Math.abs(unit.w / unit.h - width / height) < 0.04 ? "xMidYMid meet" : "xMidYMid slice";
    if (el.localName === "image") {
      el.setAttributeNS(XL, "href", unit.src);
      el.setAttribute("preserveAspectRatio", fit);
      const viewport = make(doc, "svg", {
        x: el.getAttribute("x") || 0,
        y: el.getAttribute("y") || 0,
        width,
        height,
        viewBox: `0 0 ${width} ${height}`,
        overflow: "hidden",
        "data-glass": "true",
      });
      if (el.hasAttribute("transform")) {
        viewport.setAttribute("transform", el.getAttribute("transform"));
        el.removeAttribute("transform");
      }
      el.replaceWith(viewport);
      el.setAttribute("x", "0");
      el.setAttribute("y", "0");
      viewport.append(el);
      continue;
    }
    const image = make(doc, "image", {
      x: el.getAttribute("x") || 0,
      y: el.getAttribute("y") || 0,
      width,
      height,
      preserveAspectRatio: fit,
      opacity: "1",
    });
    image.setAttributeNS(XL, "href", unit.src);
    host.append(image);
  }
}

function glassPanes(doc) {
  const panes = [];
  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 8) {
        const id = child.textContent.trim().match(/^Glass_component_([0-9a-f-]{36})$/i)?.[1];
        const group = child.nextElementSibling;
        const rect = [...(group?.children ?? [])].find(
          (el) => el.localName === "rect" && /gradient-glass/.test(el.getAttribute("fill") || ""),
        );
        if (id && rect) panes.push({ id, group, rect });
      } else if (child.childNodes?.length) walk(child);
    }
  };
  walk(doc.documentElement || doc);
  return panes;
}

export async function renderDoor({
  data,
  layout,
  design,
  sideDesigns,
  questions,
  picks,
  texts,
  internal,
}) {
  const face = internal ? "2" : "1";
  const base = parse(await loadSvg(layout.views[face].src));
  const sections = layout.views[face].sections;
  const choice = (name, sectionId) => {
    const q = sectionId
      ? questions.find((item) => item.originalName === name && item.section === sectionId)
      : (questions.find(
          (item) =>
            item.originalName === name && (item.section === "door" || item.section === "layout"),
        ) ?? questions.find((item) => item.originalName === name));
    return q ? selected(q, picks) : null;
  };
  const external = choice(internal ? "Door Colour (Internal)" : "Door Colour (External)");
  const hardware = choice("Hardware Colour");
  const glass = choice("Glass Design (Door)");
  const cassette = choice("Cassette Type");
  let sourceDesign = design ?? layout;
  const variant = data.variants.find(
    (v) =>
      v.range === design?.range &&
      v.designId === design?.designId &&
      v.questionName === "Glass Design (Door)" &&
      v.optionId === glass?.id,
  );
  if (variant) sourceDesign = variant;
  const cassetteVariant = data.variants.find(
    (v) =>
      v.range === design?.range &&
      v.designId === design?.designId &&
      v.questionName === "Cassette Type" &&
      v.optionId === cassette?.id,
  );
  if (cassetteVariant && !variant) sourceDesign = cassetteVariant;
  const docs = await Promise.all(
    sections.map(async (section) => {
      const state = section.role === "side" ? (sideDesigns[section.id] ?? layout) : sourceDesign;
      const doc = parse(await loadSvg(state.views[face].src));
      const sourceSection =
        state.views[face].sections.find((s) => s.role === section.role) ??
        state.views[face].sections[0];
      return { section, state, doc, sourceSection };
    }),
  );
  // Keep exact outer frame, cill, toplight and sidelight geometry from the chosen
  // layout. Replace only the leaf/cassette/accessory scene, never the whole SVG.
  const diagrams = leafScene(base);
  const insertion = diagrams[0];
  if (!insertion) throw Error("This layout has no door drawing.");
  const parent = insertion.parentElement;
  const marker = make(base, "g", { "data-leaves": "true" });
  parent.insertBefore(marker, insertion);
  for (const diagram of diagrams) diagram.remove();
  for (const [index, { section, doc, sourceSection }] of docs.entries()) {
    if (!sourceSection) continue;
    namespace(doc, `section-${index}-`);
    const scene = leafScene(doc);
    const rgb = external?.description === "White" ? null : external?.rgb;
    const materialImages = [...doc.querySelectorAll("image")].filter((e) => {
      const a = Object.entries(data.assets).find(([, a]) => a.src === imageUrl(e));
      return a && /slab_blank|cassette|unknown.*flat_grain/.test(a[0]);
    });
    for (const image of materialImages) image.removeAttribute("filter");
    const recipe = data.finishes?.[external?.id];
    if (recipe) {
      for (const text of recipe.filters)
        doc.querySelector("defs").append(doc.importNode(parse(text).documentElement, true));
      for (const image of materialImages) {
        if (recipe.filter) image.setAttribute("filter", recipe.filter);
        if (
          /slab_blank/.test(
            Object.entries(data.assets).find(([, a]) => a.src === imageUrl(image))?.[0] ?? "",
          ) &&
          !/image_farmhouse_cottage/.test(recipe.sourceTexture)
        )
          image.setAttributeNS(XL, "href", recipe.texture);
      }
    } else colour(doc, external?.description === "Azure" ? [0, 102, 177] : rgb, materialImages);
    const box = section.box,
      sourceBox = sourceSection.box;
    const nested = make(base, "svg", {
      x: box[0],
      y: box[1],
      width: box[2],
      height: box[3],
      viewBox: sourceBox.join(" "),
      preserveAspectRatio: "none",
      overflow: "hidden",
      "data-section": section.role,
    });
    nested.append(base.importNode(doc.querySelector("defs"), true));
    for (const g of scene) nested.append(base.importNode(g, true));
    const localImages = () => [...nested.querySelectorAll("image")];
    const glassImages = () =>
      localImages().filter((el) => /glass/i.test(decodeURIComponent(assetUrl(data, el))));
    const cassetteImages = () =>
      localImages().filter((el) => {
        const url = decodeURIComponent(assetUrl(data, el));
        return (
          /cassette|image_twin_|augusta_|half_glazed|flat_grain/i.test(url) &&
          !/glass|slab_blank|side_panel/i.test(url)
        );
      });
    if (section.role === "side") {
      const sideDesign = choice("Door Design (Side)", section.id);
      const fragment = SIDE_CASSETTE[sideDesign?.description];
      if (sideDesign?.description === "Sidelight Solid") {
        for (const el of [...glassImages(), ...cassetteImages()]) el.remove();
      } else if (fragment) {
        const href = srcNamed(data, fragment);
        const fit = (el) => {
          const y = Number(el.getAttribute("y") || 0);
          const h = Number(el.getAttribute("height") || 0);
          const x = Number(el.getAttribute("x") || 0);
          const w = Number(el.getAttribute("width") || 0);
          if (sideDesign.description === "Sidelight Muirfield") el.setAttribute("height", h * 0.28);
          if (sideDesign.description === "Sidelight Troon") {
            el.setAttribute("y", y + h * 0.34);
            el.setAttribute("height", h * 0.32);
          }
          if (sideDesign.description === "Sidelight Medinah") {
            el.setAttribute("x", x + w * 0.18);
            el.setAttribute("width", w * 0.64);
          }
        };
        for (const el of cassetteImages()) {
          if (href) el.setAttributeNS(XL, "href", href);
          fit(el);
        }
        for (const el of glassImages()) fit(el);
      }
    }
    const glassChoice = choice(
      section.role === "side" ? "Glass Design (Side)" : "Glass Design (Door)",
      section.role === "side" ? section.id : undefined,
    );
    // Reuse the captured glass aperture, including arches and curved tops.
    // Its selector transform maps the path into the scene's image coordinates.
    const aperture = [...nested.querySelectorAll("g[clip-path]")].find(
      (g) =>
        g.previousSibling?.textContent?.includes("Slab_glass_component_selector") ||
        g.previousElementSibling?.textContent?.includes("Slab_glass_component_selector"),
    );
    // XML whitespace separates the selector comment from its group.
    const apertureGroup =
      aperture ||
      [...nested.querySelectorAll("g[clip-path]")].find((g) => {
        let node = g.previousSibling;
        while (node && node.nodeType === 3) node = node.previousSibling;
        return node?.nodeType === 8 && node.textContent.includes("Slab_glass_component_selector");
      });
    if (apertureGroup) {
      const path = apertureGroup.querySelector("clipPath");
      if (path) {
        const clip = path.cloneNode(true);
        clip.id = `pane-aperture-${index}`;
        if (apertureGroup.hasAttribute("transform")) {
          let transform = apertureGroup.getAttribute("transform");
          // Inside-face paths are already mirrored by the catalogue. Their
          // selector translation is not, so carrying its positive x offset
          // across clips away half of a centred pane.
          if (
            glassImages().some((image) =>
              /scale\(\s*-1[\s,]+1\s*\)/.test(image.getAttribute("transform") || ""),
            )
          ) {
            transform = transform.replace(
              /translate\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(-?\d+(?:\.\d+)?)\s*\)/,
              (_, x, y) => `translate(${-Number(x)} ${y})`,
            );
          }
          clip.setAttribute("transform", transform);
        }
        nested.querySelector("defs").append(clip);
        for (const image of glassImages()) {
          const group = make(base, "g", { "clip-path": `url(#${clip.id})` });
          image.replaceWith(group);
          group.append(image);
        }
      }
    }
    paintGlass(base, glassImages(), glassChoice);
    const tone = toneFor(hardware?.description);
    const tint = HARDWARE_TINT[hardware?.description] ?? null;
    const handle = choice("Handle");
    ensureInlineBarAssets(data);
    ensureEscutcheonAssets(data);
    const slabForHandle = localImages().find(
      (el) =>
        /slab_blank/i.test(decodeURIComponent(assetUrl(data, el))) &&
        !/side_panel/i.test(decodeURIComponent(assetUrl(data, el))),
    );
    let handleOnLeft = Boolean(internal);
    for (const el of localImages().filter((el) =>
      /handle_/i.test(decodeURIComponent(assetUrl(data, el))),
    )) {
      const ox = Number(el.getAttribute("x") || 0);
      const ow = Number(el.getAttribute("width") || 0);
      const cx = ox + ow / 2;
      const sw = Number(slabForHandle?.getAttribute("width") || 914);
      handleOnLeft = cx <= sw / 2;
      if (handle && handle.description.startsWith("No ")) {
        el.remove();
        continue;
      }
      let href = imageUrl(el);
      if (handle && /inline bar/i.test(handle.description)) {
        href =
          INLINE_BAR_ASSETS[tone || "chrome"] ||
          srcNamed(data, `inline_bar_${tone || "chrome"}`) ||
          srcNamed(data, "1200_inline_bar") ||
          href;
        fitInlineBarHandle(el, slabForHandle);
      } else if (handle && /pad/i.test(handle.description))
        href = srcNamed(data, `lever_pad_${tone || "chrome"}`) || href;
      else if (handle && /lever\/lever/i.test(handle.description))
        href = srcNamed(data, `lever_lever_${tone || "chrome"}`) || href;
      else href = swapTone(data, href, tone || "chrome");
      if (href) el.setAttributeNS(XL, "href", href);
      if (tint) tintFlat(base, tint, el);
    }
    if (section.role === "door") {
      for (const el of localImages().filter(
        (el) =>
          /letterplate|spyhole|knocker|escutcheon/i.test(decodeURIComponent(assetUrl(data, el))) ||
          el.getAttribute("data-hardware") === "escutcheon",
      ))
        el.remove();
      const slab =
        slabForHandle ||
        localImages().find(
          (el) =>
            /slab_blank/i.test(decodeURIComponent(assetUrl(data, el))) &&
            !/side_panel/i.test(decodeURIComponent(assetUrl(data, el))),
        );
      const place = (fragment, fx, fy, fw, fh) => {
        if (!slab) return;
        const href = srcNamed(data, fragment);
        if (!href) return;
        const sx = Number(slab.getAttribute("x") || 0);
        const sy = Number(slab.getAttribute("y") || 0);
        const sw = Number(slab.getAttribute("width") || 1);
        const sh = Number(slab.getAttribute("height") || 1);
        const el = make(base, "image", {
          x: sx + fx * sw,
          y: sy + fy * sh,
          width: fw * sw,
          height: fh * sh,
          preserveAspectRatio: "xMidYMid",
          opacity: "1",
        });
        el.setAttributeNS(XL, "href", href);
        if (tint) tintFlat(base, tint, el);
        (slab.parentElement ?? nested).append(el);
      };
      const letter = choice("Letterplate");
      if (letter && !letter.description.startsWith("No ")) {
        const position = choice("Letterplate Position")?.description || "";
        const fy =
          /bottom rail|\bposition 34\b/i.test(position) || !position
            ? 1860 / 2013
            : /between cassette|\bposition (?:26|30|17)\b/i.test(position)
              ? 1699 / 2013
              : /midrail|\bposition (?:14|7|1|2|3|25|27)\b/i.test(position)
                ? 1045.5 / 2013
                : /\bposition (?:49|47|48|35|8|9|10|15|16|28|29|60)\b/i.test(position)
                  ? 760 / 2013
                  : 1860 / 2013;
        place(
          tone === "black" ? "black_letterplate" : "chrome_letterplate",
          295 / 914,
          fy,
          310 / 914,
          76 / 2013,
        );
      }
      const drip = choice("Drip Bar");
      if (drip && !/^None$/i.test(drip.description) && slab) {
        const matched = /matched/i.test(drip.description);
        const rgb =
          !matched && /^gold$/i.test(drip.description)
            ? [198, 161, 91]
            : !matched && /silver/i.test(drip.description)
              ? [186, 190, 194]
              : !matched && /white/i.test(drip.description)
                ? [244, 244, 244]
                : tint || (tone === "black" ? [42, 42, 42] : [200, 204, 208]);
        const sx = Number(slab.getAttribute("x") || 0);
        const sy = Number(slab.getAttribute("y") || 0);
        const sw = Number(slab.getAttribute("width") || 1);
        const sh = Number(slab.getAttribute("height") || 1);
        const bar = make(base, "rect", {
          x: sx + sw * 0.08,
          y: sy + sh * 0.978,
          width: sw * 0.84,
          height: sh * 0.01,
          rx: sw * 0.004,
        });
        bar.setAttribute("fill", `rgb(${rgb.join(",")})`);
        (slab.parentElement ?? nested).append(bar);
      }
      const knocker = choice("Knocker");
      const knockerOn = knocker && !knocker.description.startsWith("No ");
      const knockerHasSpy = knockerOn && /spy|peep/i.test(knocker.description);
      if (knockerOn) {
        const fragment =
          tone === "black"
            ? knockerHasSpy
              ? "black_urn_with_spy"
              : "black_urn_knocker"
            : knockerHasSpy
              ? "chrome_knocker_with_spyhole"
              : "knocker/chrome_knocker.png";
        place(fragment, 410 / 914, 555.5 / 2013, 76 / 914, 162 / 2013);
      }
      const spyhole = choice("Spyhole");
      if (spyhole && !spyhole.description.startsWith("No ") && !knockerHasSpy) {
        // A separate spyhole sits above the knocker. The knocker plate already
        // occupies the usual spyhole height, and a knocker with a spy hole
        // carries that hole in its own artwork.
        const spyY = knockerOn ? 555.5 - 32 - 18 : 583;
        place(
          tone === "black" ? "black_spyhole" : "chrome_spyhole",
          434 / 914,
          spyY / 2013,
          32 / 914,
          32 / 2013,
        );
      }
      const numeral = choice("Numeral");
      const numberQuestion = questions.find((q) => q.originalName === "House Number");
      if (numeral?.description === "Numerals" && numberQuestion && texts[numberQuestion.key]) {
        const panes = [...doc.querySelectorAll("image")].filter((el) =>
          /glass/i.test(decodeURIComponent(assetUrl(data, el))),
        );
        const top = panes.length
          ? Math.min(...panes.map((el) => Number(el.getAttribute("y") || 0)))
          : sourceBox[3] * 0.25;
        // SVG text uses a baseline: reserve the glyph height as well as
        // clearance below the leaf's top edge, including toplight layouts.
        const numberY = Math.max(sourceBox[1] + 120, Math.min(sourceBox[1] + 180, top * 0.57));
        const number = make(base, "text", {
          x: sourceBox[0] + sourceBox[2] / 2,
          y: numberY,
          "text-anchor": "middle",
          "font-family": "Arial, sans-serif",
          "font-size": 70,
          fill: tint ? `rgb(${tint.join(",")})` : tone === "black" ? "#252525" : "#c5c8cc",
          stroke: "#353535",
          "stroke-width": 1,
          "paint-order": "stroke fill",
          "data-house-number": "true",
        });
        number.textContent = texts[numberQuestion.key];
        if (/^Door Right Hand|^Right Hand Door/.test(layout.layoutName))
          number.setAttribute(
            "transform",
            `translate(${2 * sourceBox[0] + sourceBox[2]} 0) scale(-1 1)`,
          );
        nested.append(number);
      }
      const escutcheon = choice("Escutcheon (Slab)");
      if (escutcheon && !/^None$/i.test(escutcheon.description) && slab) {
        const escFx = handleOnLeft ? ESCUTCHEON_FX.xLeft : ESCUTCHEON_FX.xRight;
        const escHref =
          tone === "black"
            ? srcNamed(data, "fingerpull_black") || ESCUTCHEON_ASSETS.black
            : tone === "chrome"
              ? srcNamed(data, "hardexchrome_finger_pull") || ESCUTCHEON_ASSETS.chrome
              : srcNamed(data, "escutcheon_(slab)_steel") ||
                srcNamed(data, "hardexchrome_finger_pull") ||
                ESCUTCHEON_ASSETS.chrome;
        const sx = Number(slab.getAttribute("x") || 0);
        const sy = Number(slab.getAttribute("y") || 0);
        const sw = Number(slab.getAttribute("width") || 1);
        const sh = Number(slab.getAttribute("height") || 1);
        const el = make(base, "image", {
          x: sx + escFx * sw,
          y: sy + ESCUTCHEON_FX.y * sh,
          width: ESCUTCHEON_FX.w * sw,
          height: ESCUTCHEON_FX.h * sh,
          preserveAspectRatio: "xMidYMid",
          opacity: "1",
          "data-hardware": "escutcheon",
        });
        el.setAttributeNS(XL, "href", escHref);
        if (tint) tintFlat(base, tint, el);
        (slab.parentElement ?? nested).append(el);
      }
    }
    const mirror =
      section.role === "door" && /^Door Right Hand|^Right Hand Door/.test(layout.layoutName);
    if (mirror) {
      const flipped = make(base, "g", {
        transform: `translate(${2 * box[0] + box[2]} 0) scale(-1 1)`,
      });
      flipped.append(nested);
      marker.append(flipped);
    } else marker.append(nested);
  }
  for (const pane of glassPanes(base)) {
    paintGlass(base, [pane.rect], choice("Glass Design (Side)", pane.id), pane.group);
  }
  // Profile member IDs are distinct from slab IDs. Transfer only the affected
  // bottom member for cills/thresholds, rather than replacing a whole frame.
  for (const name of ["Threshold", "Cill"]) {
    const chosen = choice(name);
    const donorState = data.variants.find(
      (v) =>
        v.kind === "accessory" &&
        v.range === layout.range &&
        v.questionName === name &&
        v.optionId === chosen?.id,
    );
    const targetQuestion = layout.questions.find((q) => q.name === name);
    const donorQuestion = donorState?.questions.find((q) => q.name === name);
    if (!donorState || !targetQuestion?.members?.length || !donorQuestion?.members?.length)
      continue;
    const donor = parse(await loadSvg(donorState.views[face].src));
    namespace(donor, `member-${name}-`);
    const findMember = (doc, id) =>
      [...doc.querySelectorAll("g")].find((g) =>
        [...g.childNodes].some(
          (c) => c.nodeType === 8 && c.textContent.trim() === `Profile_member_${id}`,
        ),
      );
    const container = findMember(base, targetQuestion.members[0].id);
    const donorContainer = findMember(donor, donorQuestion.members[0].id);
    const next = (container, id) => {
      const c = [...container.childNodes].find(
        (c) => c.nodeType === 8 && c.textContent.trim() === `Profile_member_${id}`,
      );
      return c?.nextElementSibling;
    };
    if (!container || !donorContainer) continue;
    const old = next(container, targetQuestion.members[0].id),
      member = next(donorContainer, donorQuestion.members[0].id);
    if (!old || !member) continue;
    const dx =
      (layout.size?.["Overall width"] ?? 900) - (donorState.size?.["Overall width"] ?? 900);
    const dy =
      (layout.size?.["Overall height"] ?? 2050) - (donorState.size?.["Overall height"] ?? 2050);
    const replacement = base.importNode(member, true);
    replacement.setAttribute(
      "transform",
      replacement
        .getAttribute("transform")
        .replace(
          /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/,
          (_, x, y) => `translate(${Number(x) + dx} ${Number(y) + dy})`,
        ),
    );
    for (const path of replacement.querySelectorAll("path")) {
      let coordinate = 0;
      path.setAttribute(
        "d",
        path.getAttribute("d").replace(/-?\d+(?:\.\d+)?/g, (value) => {
          const x = Number(value);
          return coordinate++ % 2 === 0 && x > 450 ? String(x + dx) : value;
        }),
      );
    }
    for (const rect of replacement.querySelectorAll("rect"))
      if (Number(rect.getAttribute("width")) < 6500 && Number(rect.getAttribute("width")) >= 900)
        rect.setAttribute("width", Number(rect.getAttribute("width")) + dx);
    base
      .querySelector("defs")
      .append(...[...donor.querySelector("defs").children].map((e) => base.importNode(e, true)));
    old.replaceWith(replacement);
  }
  // DoorCo changes the whole bottom frame geometry with the cill/threshold pair.
  // Aluminium thresholds are a 13mm strip; Standard PVC is a 70mm mitred member.
  const cillChoice = choice("Cill");
  const thresholdChoice = choice("Threshold");
  const width = layout.size?.["Overall width"] ?? 900;
  const height = layout.size?.["Overall height"] ?? 2050;
  const cillFitted = Boolean(cillChoice && !/^No Cill$/i.test(cillChoice.description));
  const frameBottom = height - (cillFitted ? 30 : 0);
  const standardThreshold = /pvc|standard/i.test(thresholdChoice?.description || "");
  const thresholdMemberId = "fc745b90-0fc1-4f76-b31b-9aab1ee78035";
  const topMemberId = "9f4f121d-f1a5-4da9-b817-f9aaae4633e8";
  const rightMemberId = "a42e2e4f-9907-4c66-9bcc-db46ef4838f5";
  const leftMemberId = "403b32be-67a4-4cf3-8ddf-723a52d5e16e";
  const cillMemberId = "1f5d5ec6-2776-4c6f-a10c-e4a49c11a3f5";
  const findProfileContainer = (doc, id) =>
    [...doc.querySelectorAll("g")].find((g) =>
      [...g.childNodes].some(
        (c) => c.nodeType === 8 && c.textContent.trim() === `Profile_member_${id}`,
      ),
    );
  const profileInner = (container, id) => {
    const comment = [...(container?.childNodes || [])].find(
      (node) => node.nodeType === 8 && node.textContent.trim() === `Profile_member_${id}`,
    );
    let node = comment?.nextSibling;
    while (node && node.nodeType !== 1) node = node.nextSibling;
    return node;
  };
  const thresholdMember = findProfileContainer(base, thresholdMemberId);
  const thresholdInner = profileInner(thresholdMember, thresholdMemberId);
  const topInner = profileInner(thresholdMember, topMemberId);
  const rightInner = profileInner(thresholdMember, rightMemberId);
  const leftInner = profileInner(thresholdMember, leftMemberId);

  if (thresholdInner && rightInner && leftInner) {
    const thresholdRects = [...thresholdInner.querySelectorAll(":scope > rect")];
    const lightEdge =
      thresholdRects
        .find((rect) => /inverted-light/.test(rect.getAttribute("fill") || ""))
        ?.getAttribute("fill") || "white";
    const setRect = (rect, attributes) => {
      if (!rect) return;
      for (const [name, value] of Object.entries(attributes)) {
        if (value === null) rect.removeAttribute(name);
        else rect.setAttribute(name, String(value));
      }
    };
    const setPath = (group, path) => group.querySelector("path")?.setAttribute("d", path);
    const setProfileWidths = (group, value) => {
      for (const rect of group.querySelectorAll(":scope > rect")) {
        if (rect.getAttribute("width") !== "6500") rect.setAttribute("width", String(value));
      }
    };

    thresholdInner.setAttribute("transform", `translate(${width} ${frameBottom}) rotate(180)`);
    if (standardThreshold) {
      setPath(thresholdInner, `M 70 70 L -0 0 L ${width} -0 L ${width - 70} 70 Z`);
      setRect(thresholdRects[0], { fill: "rgba(255, 255, 255, 1)" });
      setRect(thresholdRects[1], {
        x: 0,
        y: 50,
        width,
        height: 20,
        fill: "white",
        opacity: 0.25,
      });
    } else {
      setPath(thresholdInner, `M 0 13 L -0 0 L ${width} -0 L ${width} 13 Z`);
      setRect(thresholdRects[0], {
        fill: /gold/i.test(thresholdChoice?.description || "")
          ? "rgba(150, 150, 24, 1)"
          : "rgba(169, 169, 169, 1)",
      });
      setRect(thresholdRects[1], {
        x: 0,
        y: 11,
        width,
        height: 2,
        fill: lightEdge,
        opacity: null,
      });
    }
    setRect(thresholdRects[2], { x: 0, y: 0, width, height: 2, opacity: null });

    rightInner.setAttribute("transform", `translate(${width} 0) rotate(90)`);
    if (standardThreshold) {
      setPath(rightInner, `M 70 70 L 0 -0 L ${frameBottom} -0 L ${frameBottom - 70} 70 Z`);
      leftInner.setAttribute("transform", `translate(0 ${frameBottom}) rotate(270)`);
      setPath(leftInner, `M 70 70 L -0 0 L ${frameBottom} 0 L ${frameBottom - 70} 70 Z`);
    } else {
      const sideLength = frameBottom - 13;
      setPath(
        rightInner,
        `M 70 70 L 0 -0 L ${sideLength} -0 L ${sideLength} 50 L ${sideLength} 70 Z`,
      );
      leftInner.setAttribute("transform", `translate(-0 ${sideLength}) rotate(270)`);
      setPath(leftInner, `M -0 70 L -0 50 L -0 0 L ${sideLength} 0 L ${sideLength - 70} 70 Z`);
    }
    setProfileWidths(rightInner, frameBottom);
    setProfileWidths(leftInner, frameBottom);

    const interfaceComments = [...thresholdMember.childNodes].filter(
      (node) =>
        node.nodeType === 8 &&
        /^Profile_(?:start|end)_joint_interface$/.test(node.textContent.trim()),
    );
    const diagramId = interfaceComments
      .map((comment) => {
        let node = comment.nextSibling;
        while (node && node.nodeType !== 1) node = node.nextSibling;
        return node?.querySelector("path")?.getAttribute("diagramid");
      })
      .find(Boolean);
    for (const comment of interfaceComments) {
      let node = comment.nextSibling;
      while (node && node.nodeType !== 1) node = node.nextSibling;
      node?.remove();
      comment.remove();
    }
    const pairs = [
      [topMemberId, topInner],
      [rightMemberId, rightInner],
      [thresholdMemberId, thresholdInner],
      [leftMemberId, leftInner],
    ];
    if (!standardThreshold) pairs.unshift(pairs.splice(2, 1)[0]);
    for (const [id, inner] of pairs) {
      const comment = [...thresholdMember.childNodes].find(
        (node) => node.nodeType === 8 && node.textContent.trim() === `Profile_member_${id}`,
      );
      if (comment && inner) thresholdMember.append(comment, inner);
    }
    const appendJoint = (kind, transform, d) => {
      thresholdMember.appendChild(base.createComment(`\nProfile_${kind}_joint_interface\n`));
      const group = make(base, "g", { transform });
      const attributes = {
        d,
        fill: "transparent",
        opacity: "1",
        "stroke-width": "3",
        stroke: "rgba(0, 0, 0, 0.1960784313725490196078431373)",
      };
      if (diagramId) attributes.diagramid = diagramId;
      group.appendChild(make(base, "path", attributes));
      thresholdMember.appendChild(group);
    };
    appendJoint("start", "translate(0 0) rotate(0)", "M70 70L0 0");
    appendJoint("end", "translate(0 0) rotate(0)", `M${width} 0L${width - 70} 70`);
    appendJoint("start", `translate(${width} 0) rotate(90)`, "M70 70L0 -0");
    if (standardThreshold) {
      appendJoint(
        "end",
        `translate(${width} 0) rotate(90)`,
        `M${frameBottom} -0L${frameBottom - 70} 70`,
      );
      appendJoint("start", `translate(${width} ${frameBottom}) rotate(180)`, "M70 70L-0 0");
      appendJoint(
        "end",
        `translate(${width} ${frameBottom}) rotate(180)`,
        `M${width} -0L${width - 70} 70`,
      );
      appendJoint("start", `translate(0 ${frameBottom}) rotate(270)`, "M70 70L-0 0");
      appendJoint(
        "end",
        `translate(0 ${frameBottom}) rotate(270)`,
        `M${frameBottom} 0L${frameBottom - 70} 70`,
      );
    } else {
      const sideLength = frameBottom - 13;
      appendJoint(
        "end",
        `translate(-0 ${sideLength}) rotate(270)`,
        `M${sideLength} 0L${sideLength - 70} 70`,
      );
    }
  }

  const existingCill = findProfileContainer(base, cillMemberId);

  if (cillFitted) {
    const cillWidth = width + 100;
    marker.setAttribute("transform", "translate(0 -12.5)");
    const grad = base.querySelector("defs linearGradient[id*='gradient-profile-edge']");
    const layoutId = grad?.id
      ? grad.id.replace(/^gradient-profile-edge-(?:inverted-)?(?:light|dark)-/, "")
      : "cill";

    if (!existingCill) {
      const parentGroup =
        thresholdMember?.parentElement ||
        base.querySelector("#matrix-group") ||
        base.querySelector("svg");

      const cillG = make(base, "g", {
        layertype: "Diagram",
        filter: `url(#profile-shadow-${layoutId})`,
      });
      cillG.appendChild(base.createComment(`\nProfile_member_${cillMemberId}\n`));

      const clipId = `clippath-${layoutId}-cill-member`;
      const innerG = make(base, "g", {
        "clip-path": `url(#${clipId})`,
        transform: `translate(${width + 50} ${height}) rotate(180)`,
      });

      const clipPath = make(base, "clipPath", { id: clipId });
      const clipShape = make(base, "path", {
        d: `M 0 30 L -0 0 L ${cillWidth} -0 L ${cillWidth} 30 Z`,
      });
      clipPath.appendChild(clipShape);
      (base.querySelector("defs") || parentGroup).appendChild(clipPath);

      const rectMain = make(base, "rect", {
        x: "0",
        y: "0",
        width: "6500",
        height: "150",
        fill: "rgba(255, 255, 255, 1)",
        class: "interact",
        componentid: "62ea6a13-bca6-4054-89f6-020dc6e21f3b",
        memberid: cillMemberId,
      });
      innerG.appendChild(rectMain);

      const rectEdgeLight = make(base, "rect", {
        x: "0",
        y: "28",
        width: String(cillWidth),
        height: "2",
        fill: `url(#gradient-profile-edge-inverted-light-${layoutId})`,
      });
      innerG.appendChild(rectEdgeLight);

      const rectEdgeDark = make(base, "rect", {
        x: "0",
        y: "0",
        width: String(cillWidth),
        height: "2",
        fill: `url(#gradient-profile-edge-dark-${layoutId})`,
      });
      innerG.appendChild(rectEdgeDark);

      cillG.appendChild(innerG);
      if (thresholdMember) {
        parentGroup.insertBefore(cillG, thresholdMember.nextSibling);
      } else {
        parentGroup.appendChild(cillG);
      }
    } else {
      const innerG = existingCill.querySelector("g[transform]");
      if (innerG) {
        innerG.setAttribute("transform", `translate(${width + 50} ${height}) rotate(180)`);
        const path =
          base.querySelector(`#clippath-${layoutId}-cill-member path`) ||
          innerG.querySelector("clipPath path");
        if (path) path.setAttribute("d", `M 0 30 L -0 0 L ${cillWidth} -0 L ${cillWidth} 30 Z`);
        for (const rect of innerG.querySelectorAll("rect")) {
          if (rect.getAttribute("width") !== "6500") rect.setAttribute("width", String(cillWidth));
        }
      }
      if (thresholdMember?.parentElement === existingCill.parentElement) {
        existingCill.parentElement.insertBefore(existingCill, thresholdMember.nextSibling);
      }
    }
  } else if (existingCill) {
    existingCill.remove();
  }
  const profile =
    choice(internal ? "Profile Colour (Internal)" : "Profile Colour (External)") ??
    choice("Profile Colour (External)");
  if (profile?.rgb && profile.description !== "White") {
    for (const g of base.querySelectorAll('g[layertype="Diagram"]')) {
      if (
        ![...g.childNodes].some(
          (c) => c.nodeType === 8 && /Profile_member/.test(c.textContent || ""),
        )
      )
        continue;
      for (const rect of g.querySelectorAll("rect")) {
        const fill = rect.getAttribute("fill") || "";
        if (fill === "white" || /^#fff(?:fff)?$/i.test(fill) || /255,\s*255,\s*255/.test(fill))
          rect.setAttribute("fill", `rgb(${profile.rgb.join(",")})`);
      }
    }
  }
  attachDoorDimensions(base, layout);
  base.documentElement.setAttribute(
    "aria-label",
    `${internal ? "Internal" : "External"} view of ${layout.layoutName}`,
  );
  return new XMLSerializer().serializeToString(base.documentElement);
}
