const SVG = "http://www.w3.org/2000/svg";

function make(doc, tag, attrs = {}) {
  const el = doc.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value != null) el.setAttribute(key, String(value));
  }
  return el;
}

function parseViewBox(raw) {
  const parts = String(raw || "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

function ensureViewBoxFits(doc, minX, minY, maxX, maxY, pad = 40) {
  const root = doc.documentElement;
  const box = parseViewBox(root.getAttribute("viewBox")) || {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
  const next = {
    x: Math.min(box.x, minX - pad),
    y: Math.min(box.y, minY - pad),
  };
  next.width = Math.max(box.x + box.width, maxX + pad) - next.x;
  next.height = Math.max(box.y + box.height, maxY + pad) - next.y;
  root.setAttribute("viewBox", `${next.x} ${next.y} ${next.width} ${next.height}`);
}

function dimensionMetrics(doc) {
  const box = parseViewBox(doc.documentElement.getAttribute("viewBox"));
  if (!box) return { fontSize: 72, offset: 84, tick: 18, pad: 54 };

  // SVG CSS pixels are viewBox units, so a literal 16px font can render at only
  // 2–4 screen pixels once a tall elevation is fitted into the preview. Size
  // annotations relative to the drawing instead, targeting roughly 17px in the
  // 420px-high desktop preview while keeping unusually large catalogues bounded.
  const fontSize = Math.round(Math.max(56, Math.min(112, box.height / 24)));
  return {
    fontSize,
    offset: Math.round(fontSize * 1.05),
    tick: Math.round(fontSize * 0.22),
    pad: Math.round(fontSize * 0.72),
  };
}

function dimensionLabel(doc, { x, y, rotate = 0, value, editable, title }) {
  const { fontSize } = dimensionMetrics(doc);
  const group = make(doc, "g", {
    transform: `translate(${x} ${y}) rotate(${rotate})`,
    "data-dimension": title || "",
    "data-dimension-kind": editable ? "input" : "readonly",
  });
  const text = make(doc, "text", {
    x: 0,
    y: Math.round(fontSize * 0.34),
    "text-anchor": "middle",
    "font-size": fontSize,
    // Colour comes from portal CSS so both themes stay readable.
    fill: "currentColor",
  });
  text.textContent = String(value);
  group.append(text);
  return group;
}

function dimensionLine(doc, x1, y1, x2, y2) {
  const { tick } = dimensionMetrics(doc);
  const horizontal = Math.abs(y2 - y1) < 0.01;
  const attrs = {
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.5",
    "data-dimension-line": "true",
  };
  if (horizontal) {
    return make(doc, "path", {
      ...attrs,
      d: `M${x1} ${y1 - tick} L${x1} ${y1 + tick} M${x1} ${y1} L${x2} ${y2} M${x2} ${y2 - tick} L${x2} ${y2 + tick}`,
    });
  }
  return make(doc, "path", {
    ...attrs,
    d: `M${x1 - tick} ${y1} L${x1 + tick} ${y1} M${x1} ${y1} L${x2} ${y2} M${x2 - tick} ${y2} L${x2 + tick} ${y2}`,
  });
}

function dimensionLookup(dimensions = []) {
  const byId = new Map();
  const byName = new Map();
  for (const dim of dimensions) {
    if (!dim || typeof dim !== "object") continue;
    if (dim.id) byId.set(String(dim.id).trim(), dim);
    if (dim.description) byName.set(String(dim.description).trim().toLowerCase(), dim);
  }
  return { byId, byName };
}

function resolveDimension(input, lookup) {
  const id = (input?.getAttribute("dimensionid") || "").trim();
  const title = input?.getAttribute("title") || "";
  const name = title.replace(/\s*\(.*\)\s*$/, "").trim();
  return (
    lookup.byId.get(id) ||
    lookup.byName.get(name.toLowerCase()) || {
      description: name || title,
      value: input?.getAttribute("value") || "",
      requiresInput: true,
    }
  );
}

function ensureLayer(doc) {
  let layer = doc.querySelector('g[layertype="Dimensions"]');
  if (!layer) {
    layer = make(doc, "g", { layertype: "Dimensions" });
    doc.documentElement.append(layer);
  }
  return layer;
}

function drawOverallDimensions(doc, layer, { x0, y0, width, height }) {
  const metrics = dimensionMetrics(doc);
  const x1 = x0 + width;
  const y1 = y0 + height;
  const topY = y0 - metrics.offset;
  const leftX = x0 - metrics.offset;

  layer.append(dimensionLine(doc, x0, topY, x1, topY));
  layer.append(
    dimensionLabel(doc, {
      x: (x0 + x1) / 2,
      y: topY,
      value: width,
      editable: true,
      title: "Overall width",
    }),
  );

  layer.append(dimensionLine(doc, leftX, y0, leftX, y1));
  const heightLabel = dimensionLabel(doc, {
    x: 0,
    y: 0,
    value: height,
    editable: true,
    title: "Overall height",
  });
  heightLabel.setAttribute("transform", `translate(${leftX} ${(y0 + y1) / 2}) rotate(270)`);
  layer.append(heightLabel);

  ensureViewBoxFits(doc, leftX, topY, x1, y1, metrics.pad);
}

function drawSpanDimensions(doc, layer, spans, { x0, y0, width, height }) {
  if (!spans.length) return;
  const metrics = dimensionMetrics(doc);
  const y1 = y0 + height;
  const spanY = y1 + metrics.offset;
  for (const span of spans) {
    const sx0 = span.x;
    const sx1 = span.x + span.w;
    layer.append(dimensionLine(doc, sx0, spanY, sx1, spanY));
    layer.append(
      dimensionLabel(doc, {
        x: (sx0 + sx1) / 2,
        y: spanY,
        value: span.w,
        editable: true,
        title: span.title || "Horizontal span",
      }),
    );
  }
  layer.append(
    dimensionLabel(doc, {
      x: x0 + width / 2,
      y: spanY + Math.round(metrics.fontSize * 0.7),
      value: width,
      editable: false,
      title: "Overall width",
    }),
  );
  ensureViewBoxFits(
    doc,
    x0,
    y0,
    x0 + width,
    spanY + Math.round(metrics.fontSize * 0.7),
    metrics.pad,
  );
}

/** Replace catalogue foreignObject controls with safe SVG labels; keep dimension lines. */
export function hydrateWindowDimensions(doc, dimensions = []) {
  const layer = doc.querySelector('g[layertype="Dimensions"]');
  if (!layer) return false;
  const lookup = dimensionLookup(dimensions);
  let labels = 0;
  for (const foreign of layer.querySelectorAll("foreignObject")) {
    const input = foreign.querySelector("input");
    const dim = resolveDimension(input, lookup);
    const parent = foreign.parentElement || layer;
    const editable = dim.requiresInput !== false;
    const label = dimensionLabel(doc, {
      x: 0,
      y: 0,
      value: dim.value ?? "",
      editable,
      title: dim.description || input?.getAttribute("title") || "",
    });
    foreign.replaceWith(label);
    labels += 1;
    if (parent !== layer) parent.setAttribute("data-dimension-control", "true");
  }
  return labels > 0 || layer.querySelector("path");
}

function contentSizeFromDimensions(dimensions = []) {
  const byName = Object.fromEntries(dimensions.map((d) => [d.description, d]));
  const width = Number(byName["Overall width"]?.value);
  const height = Number(byName["Overall height"]?.value);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const spans = dimensions
    .filter((d) => /^Horizontal span/i.test(d.description || ""))
    .map((d, index) => ({ description: d.description, value: Number(d.value), index }))
    .filter((d) => Number.isFinite(d.value) && d.value > 0);
  return { width, height, spans };
}

/** When an elevation face has no Dimensions layer (e.g. inside view), draw catalogue sizes. */
export function attachWindowDimensions(doc, dimensions = []) {
  if (
    doc.querySelector(
      'g[layertype="Dimensions"] [data-dimension], g[layertype="Dimensions"] foreignObject',
    )
  )
    return;
  const size = contentSizeFromDimensions(dimensions);
  if (!size) return;
  const layer = ensureLayer(doc);
  layer.replaceChildren();
  const frame = { x0: 0, y0: 0, width: size.width, height: size.height };
  drawOverallDimensions(doc, layer, frame);
  if (size.spans.length) {
    let x = 0;
    const spans = size.spans.map((span) => {
      const item = { x, w: span.value, title: span.description };
      x += span.value;
      return item;
    });
    drawSpanDimensions(doc, layer, spans, frame);
  }
}

function doorContentFrame(layout, doc) {
  const slim = parseViewBox(layout?.slim?.viewBox);
  if (slim) {
    return {
      x0: 0,
      y0: 0,
      width: layout?.size?.["Overall width"] ?? Math.round(slim.width - 40),
      height: layout?.size?.["Overall height"] ?? Math.round(slim.height - 40),
    };
  }
  const box = parseViewBox(doc.documentElement.getAttribute("viewBox"));
  if (!box) return null;
  // Stored door SVGs often include ~150u illustration padding already.
  const pad = Math.max(0, Math.min(-box.x, -box.y, 170));
  return {
    x0: 0,
    y0: 0,
    width: layout?.size?.["Overall width"] ?? Math.round(box.width - pad * 2),
    height: layout?.size?.["Overall height"] ?? Math.round(box.height - pad * 2),
  };
}

function horizontalSpans(layout) {
  const sections = layout?.views?.["1"]?.sections || layout?.views?.[1]?.sections || [];
  const boxes = sections
    .map((section) => section?.box)
    .filter((box) => Array.isArray(box) && box.length === 4)
    .map(([x, , w]) => ({ x, w: Math.round(w), title: "Panel width" }))
    .sort((a, b) => a.x - b.x);
  if (boxes.length < 2) return [];
  return boxes;
}

/** Draw overall (and side-panel) catalogue sizes onto door elevations. */
export function attachDoorDimensions(doc, layout, override = {}) {
  const catalogueFrame = doorContentFrame(layout, doc);
  const frame = catalogueFrame && {
    ...catalogueFrame,
    width:
      Number.isFinite(Number(override.width)) && Number(override.width) > 0
        ? Number(override.width)
        : catalogueFrame.width,
    height:
      Number.isFinite(Number(override.height)) && Number(override.height) > 0
        ? Number(override.height)
        : catalogueFrame.height,
  };
  if (!frame) return;
  const layer = ensureLayer(doc);
  layer.replaceChildren();
  drawOverallDimensions(doc, layer, frame);
  drawSpanDimensions(doc, layer, horizontalSpans(layout), frame);
}

export function catalogueDimensions(source) {
  if (Array.isArray(source?.dimensions)) return source.dimensions;
  if (Array.isArray(source?.style?.dimensions)) return source.style.dimensions;
  return [];
}
