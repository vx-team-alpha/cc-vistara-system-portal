import {
  attachWindowDimensions,
  catalogueDimensions,
  hydrateWindowDimensions,
} from "./dimensions.js";
import { chosenLabel } from "./windows.js";

const SVG = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";

// Preserve the portal's profile geometry, clipping and shading. Replace only
// the materials and glass decoration inside each captured component.
export function renderWindow(markup, questions, picks, internal, materials = {}, source = null) {
  if (!markup) return "";
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  if (doc.querySelector("parsererror")) return "";
  const answer = (name) => {
    const q = questions.find((q) => q.name === name);
    return q ? chosenLabel(q, picks) : "";
  };
  const colour = answer(`Profile Colour (${internal ? "Internal" : "External"})`) || "White";
  const texture = materials.colours?.[colour];
  const handle = internal ? materials.handles?.[answer("Handle (Casement)")] : null;
  for (const image of doc.querySelectorAll("image")) {
    const href = image.getAttributeNS(XLINK, "href") || image.getAttribute("href") || "";
    const original = materials.originals?.[href] || href;
    let next = /foil|sharedprofile_colour/i.test(original) && texture ? texture : href;
    if (handle && /casement_handles/i.test(original)) {
      next = handle.url;
      image.setAttribute("x", String(Number(image.getAttribute("x")) + handle.dx));
      image.setAttribute("y", String(Number(image.getAttribute("y")) + handle.dy));
      image.setAttribute("width", String(handle.width));
      image.setAttribute("height", String(handle.height));
    }
    image.setAttributeNS(XLINK, "xlink:href", materials.assets?.[next] || next);
  }
  // Catalogue elevations already include dimension lines; swap HTML controls for
  // safe SVG labels filled from the item's millimetre dimensions. Inside faces
  // usually omit the layer, so synthesise the same catalogue sizes there.
  const dimensions = catalogueDimensions(source);
  hydrateWindowDimensions(doc, dimensions);
  for (const el of doc.querySelectorAll("script, foreignObject, style")) el.remove();
  attachWindowDimensions(doc, dimensions);
  for (const el of doc.querySelectorAll("*")) {
    for (const attr of Array.from(el.attributes))
      if (/^on/i.test(attr.name) || attr.name === "resize") el.removeAttribute(attr.name);
  }
  const noCill = answer("Cill") === "No";
  const cillIds = new Set(
    questions
      .flatMap((q) => q.components || [])
      .filter((c) => /^Cill/i.test(c.description))
      .map((c) => c.id),
  );
  for (const el of doc.querySelectorAll("[componentid]")) {
    if (noCill && cillIds.has(el.getAttribute("componentid")))
      el.parentElement?.setAttribute("display", "none");
  }
  const pattern = materials.patterns?.[answer("Glass Pattern")];
  const decoration = materials.decorations?.[answer("Glass Decoration (Design)")];
  for (const rect of [...doc.querySelectorAll("rect")].filter((r) =>
    /gradient-glass/.test(r.getAttribute("fill") || ""),
  )) {
    if (answer("Glazing Method") !== "Glazed") continue;
    const w = rect.getAttribute("width"),
      h = rect.getAttribute("height");
    if (pattern) {
      const image = doc.createElementNS(SVG, "image");
      image.setAttribute("width", w);
      image.setAttribute("height", h);
      image.setAttribute("preserveAspectRatio", "xMidYMid slice");
      image.setAttribute("opacity", "0.75");
      image.setAttributeNS(XLINK, "xlink:href", materials.assets?.[pattern] || pattern);
      rect.after(image);
    }
    if (decoration) {
      const overlay = doc.createElementNS(SVG, "svg");
      overlay.setAttribute("width", w);
      overlay.setAttribute("height", h);
      overlay.setAttribute("viewBox", "0 0 920 920");
      overlay.setAttribute("preserveAspectRatio", "none");
      const fragment = new DOMParser().parseFromString(
        `<svg xmlns="${SVG}" xmlns:xlink="${XLINK}">${decoration}</svg>`,
        "image/svg+xml",
      );
      for (const child of fragment.documentElement.children)
        overlay.append(doc.importNode(child, true));
      for (const image of overlay.querySelectorAll("image")) {
        const href = image.getAttributeNS(XLINK, "href");
        image.setAttributeNS(
          XLINK,
          "xlink:href",
          materials.assets?.[texture] || materials.assets?.[href] || href,
        );
      }
      for (const el of overlay.querySelectorAll("[fill]")) {
        const fill = el.getAttribute("fill");
        if (/url\(#gradient-profile/.test(fill))
          el.setAttribute(
            "fill",
            fill.replace(
              /[0-9a-f]{8}-[0-9a-f-]{27,}/gi,
              doc.documentElement.getAttribute("diagramid"),
            ),
          );
      }
      rect.parentNode.append(overlay);
    }
  }
  for (const el of doc.querySelectorAll("*")) {
    for (const attr of Array.from(el.attributes))
      if (/^on/i.test(attr.name) || attr.name === "resize") el.removeAttribute(attr.name);
  }
  return new XMLSerializer().serializeToString(doc.documentElement);
}
