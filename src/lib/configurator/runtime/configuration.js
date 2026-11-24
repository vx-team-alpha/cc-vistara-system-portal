import doorPositions from "./door-letterplate-positions.js";
import { glassPanes } from "./glass-panes.js";
import { profileSystemQuestions } from "./profile-system-questions.js";

// Catalogue state is local. Backend IDs remain evidence; UI keys include the
// editable section because a heading can occur more than once in one product.
export const current = (q) =>
  q?.options.find((o) => o.id === q.currentId) ??
  q?.options.find((o) => o.isCurrentOption) ??
  q?.options[0];
export const option = (q, picks) => q?.options.find((o) => o.id === picks[q.key]) ?? current(q);
export const selected = (state, name) => current(state?.questions.find((q) => q.name === name));

export function hydrate(data) {
  const entries = [
    ...Object.values(data.layouts).flatMap(Object.values),
    ...Object.values(data.designs).flatMap((styles) => Object.values(styles).flat()),
    ...Object.values(data.sideDesigns ?? {}).flat(),
    ...Object.values(data.hardware ?? {}).flatMap(Object.values),
    ...data.variants,
    ...data.probes,
  ];
  for (const state of entries)
    for (const q of state.questions) {
      if (q.optionSet) q.options = data.optionSets[q.optionSet];
    }
  return data;
}

export function designsFor(data, range, style) {
  const styles = data.designs[range] ?? {};
  return styles[style] ?? Object.values(styles)[0] ?? [];
}

export function questionList(data, layout, design, sideDesigns, picks, system = "eurocell") {
  if (!layout) return [];
  const door = design ?? layout;
  const sideSections = layout.views["1"].sections.filter((s) => s.role === "side");
  const list = [];
  const add = (q, section = "door", label = q.name) => {
    const key = `${q.name}|${section}`;
    if (!list.some((v) => v.key === key))
      list.push({ ...q, key, section, name: label, originalName: q.name });
  };
  for (const q of door.questions) {
    if (!q.name.includes("(Side)")) add(q);
  }
  for (const q of layout.questions) {
    if (/\(Side\)/.test(q.name)) {
      for (const [index, s] of sideSections.entries()) {
        if (q.name.includes("Door Design") && !q.components.some((c) => c.id === s.id)) continue;
        if (q.name.includes("Glass") && q.components.length === 1) {
          const sideGlass = layout.questions.filter((v) => v.name === "Glass Design (Side)");
          if (sideGlass.length > 1 && sideGlass.indexOf(q) !== index) continue;
        }
        const position =
          index === 0 && sideSections.length > 1
            ? "Left side"
            : sideSections.length > 1
              ? "Right side"
              : "Side";
        const side = sideDesigns[s.id];
        const sidePick = picks[`Door Design (Side)|${s.id}`];
        const sideChoice = (
          layout.questions.find((v) => v.name === "Door Design (Side)")?.options ?? []
        ).find((o) => o.id === sidePick);
        if (
          q.name.includes("Glass") &&
          (side?.designName === "Sidelight Solid" || sideChoice?.description === "Sidelight Solid")
        )
          continue;
        const sideCatalogue =
          data.sideDesigns?.[layout.range]?.filter(
            (d) => d.styleName === design?.styleName || d.styleName === "Stable",
          ) ?? [];
        let sideQuestion = side?.questions?.find((v) => v.name === q.name) ?? q;
        if (q.name.includes("Door Design") && sideCatalogue.length) {
          const available = new Set(sideCatalogue.map((d) => d.designId));
          sideQuestion = {
            ...sideQuestion,
            options: sideQuestion.options.filter((o) => available.has(o.id)),
          };
        }
        add(sideQuestion, s.id, `${q.name.replace(" (Side)", "")} (${position})`);
      }
    } else if (!list.some((v) => v.originalName === q.name)) add(q, "layout");
  }
  const glazed = layout.questions.filter(
    (q) => q.name === "Add midrail" && /Glass/i.test(q.components?.[0]?.description ?? ""),
  );
  if (glazed.length && !list.some((q) => q.originalName === "Glass Design (Side)")) {
    const donor =
      Object.values(data.layouts?.[layout.range] ?? {})
        .map((item) => item.questions.find((q) => q.name === "Glass Design (Side)"))
        .find(Boolean) ?? layout.questions.find((q) => q.name === "Glass Design (Door)");
    if (donor?.options?.length) {
      const clear = donor.options.find((o) => /standard glass \(clear\)/i.test(o.description));
      glazed.forEach((panel, index) => {
        const place =
          glazed.length === 1
            ? /right hand sidelight/i.test(layout.layoutName)
              ? "Right side"
              : /left hand sidelight/i.test(layout.layoutName)
                ? "Left side"
                : "Side"
            : index === 0
              ? "Left side"
              : "Right side";
        add(
          {
            ...donor,
            currentId: clear?.id ?? donor.currentId,
            consumerListOrder: 6.1 + index * 0.1,
          },
          panel.components[0].id,
          `Glass Design (${place})`,
        );
      });
    }
  }
  const covered = new Set(
    list.filter((q) => q.originalName === "Glass Design (Side)").map((q) => q.section),
  );
  const pending = (glassPanes[layout.views?.["1"]?.src] ?? []).filter(
    (pane) => !covered.has(pane.id),
  );
  if (pending.length) {
    const donor =
      Object.values(data.layouts?.[layout.range] ?? {})
        .map((item) => item.questions.find((q) => q.name === "Glass Design (Side)"))
        .find(Boolean) ?? layout.questions.find((q) => q.name === "Glass Design (Door)");
    const clear = donor?.options?.find((o) => /standard glass \(clear\)/i.test(o.description));
    const label = (index, total, kind) => {
      if (total === 1) return kind === "top" ? "Toplight" : "Side";
      if (index === 0) return kind === "top" ? "Left toplight" : "Left side";
      if (index === total - 1) return kind === "top" ? "Right toplight" : "Right side";
      return kind === "top" ? "Toplight" : "Side";
    };
    if (donor?.options?.length) {
      for (const [kind, panes] of [
        ["side", pending.filter((pane) => pane.h >= pane.w)],
        ["top", pending.filter((pane) => pane.h < pane.w)],
      ]) {
        panes
          .sort((a, b) => a.x - b.x)
          .forEach((pane, index) => {
            add(
              {
                ...donor,
                currentId: clear?.id ?? donor.currentId,
                consumerListOrder: (kind === "top" ? 6.4 : 6.2) + index * 0.01,
              },
              pane.id,
              `Glass Design (${label(index, panes.length, kind)})`,
            );
          });
      }
    }
  }
  // Dependencies verified in the portal: obscure glass, letterplate and numerals
  // introduce secondary questions. Use captured catalogues when present.
  const enabled = (name) => list.find((q) => q.originalName === name);
  const letter = option(enabled("Letterplate"), picks);
  const numeral = option(enabled("Numeral"), picks);
  const glass = option(enabled("Glass Design (Door)"), picks);
  const knocker = option(enabled("Knocker"), picks);
  const handle = option(enabled("Handle"), picks);
  const knockerHasSpy = /spy|peep/i.test(knocker?.description ?? "");

  const designName = design?.description || design?.designName || "";
  const normalizeDesign = (s) =>
    (s || "")
      .replace(/\s+(?:Farmhouse|Flush|Cottage|Standard|Solid)\b/gi, "")
      .trim()
      .toLowerCase();

  const findPositions = (name) => {
    if (!name) return null;
    const direct =
      data.letterplatePositions?.[name]?.positions ?? doorPositions?.designs?.[name]?.positions;
    if (direct) return direct;
    const norm = normalizeDesign(name);
    const all = { ...doorPositions?.designs, ...data.letterplatePositions };
    for (const [key, val] of Object.entries(all)) {
      if (normalizeDesign(key) === norm) return val.positions;
    }
    for (const [key, val] of Object.entries(all)) {
      const kNorm = normalizeDesign(key);
      if (norm && (kNorm.startsWith(norm) || norm.startsWith(kNorm))) return val.positions;
    }
    return null;
  };
  const positionsForDesign = findPositions(designName);

  if (Array.isArray(positionsForDesign)) {
    const existing = list.find((q) => q.originalName === "Letterplate Position");
    if (existing) {
      existing.options = positionsForDesign.map((p) => ({
        id: p.id,
        description: p.description,
        isCurrentOption: p.isCurrentOption,
        src: "",
      }));
    } else if (positionsForDesign.length > 0 && letter?.description === "Letterplate") {
      add({
        id: "6e9d2424-7f85-4ccb-b225-5730408b6697",
        name: "Letterplate Position",
        originalName: "Letterplate Position",
        consumerListOrder: 11.5,
        components: [],
        drawingType: 1,
        options: positionsForDesign.map((p) => ({
          id: p.id,
          description: p.description,
          isCurrentOption: p.isCurrentOption,
          src: "",
        })),
      });
    }
  } else if (letter?.description === "Letterplate") {
    for (const probe of data.probes) {
      for (const q of probe.questions) {
        if (q.name === "Letterplate Position") add(q);
      }
    }
  }

  for (const probe of data.probes) {
    for (const q of probe.questions) {
      if (q.name === "House Number" && numeral?.description === "Numerals") add(q);
      if (q.name === "Glass Pattern" && glass?.description.includes("Obscure")) add(q);
    }
  }

  const isInlineBarOrNoHandle =
    /inline bar/i.test(handle?.description || "") || /no handle/i.test(handle?.description || "");

  if (isInlineBarOrNoHandle) {
    const hwQuestion = list.find((q) => q.originalName === "Hardware Colour");
    const hwChoice = option(hwQuestion, picks);
    const hwName = hwChoice?.description || "Black";
    const escId =
      hwName === "Black"
        ? "7741aa74-3f90-495c-a559-63b58aa5893e"
        : hwName === "Chrome"
          ? "dae040a2-c4e6-40d6-9e99-041057e69589"
          : `escutcheon-${hwName.toLowerCase().replace(/\s+/g, "-")}`;
    const escSrc =
      hwName === "Chrome"
        ? "/catalogue/assets/070549ff031eb199f54d.png"
        : "/catalogue/assets/40752e83b0e81293b3a3.png";

    add({
      id: "a3db4591-9e7b-4ea4-8e3d-ec1b7a952671",
      name: "Escutcheon (Slab)",
      originalName: "Escutcheon (Slab)",
      consumerListOrder: 8.5,
      components: [],
      drawingType: 1,
      options: [
        {
          id: escId,
          description: `Escutcheon (${hwName})`,
          src: escSrc,
          isCurrentOption: true,
        },
        {
          id: "d56c69e4-97c9-4ef9-aece-21611f3ab300",
          description: "None",
          src: "/catalogue/assets/28685d2c609fa865bc51.png",
          isCurrentOption: false,
        },
      ],
    });
  }

  const hardwareQuestion = list.find((q) => q.originalName === "Hardware Colour");
  const hardware = option(hardwareQuestion, picks);
  const finishState = data.hardware?.[layout.range]?.[hardware?.id];
  for (const q of list) {
    if (
      !["Handle", "Letterplate", "Knocker", "Spyhole", "Drip Bar", "Escutcheon (Slab)"].includes(
        q.originalName,
      )
    )
      continue;
    const updated = finishState?.questions.find((v) => v.name === q.originalName);
    if (updated) {
      const allowed = new Set(q.options.map((o) => o.id));
      q.options = updated.options.filter((o) => allowed.has(o.id));
    }
  }
  for (const q of list) {
    if (q.originalName === "Handle") {
      // Keep catalogue pull handles (e.g. 1200 Inline Bar) visible when present.
      if (q.options.length && !q.options.some((o) => o.id === q.currentId))
        q.currentId = q.options[0].id;
    }
    if (q.originalName !== "Spyhole") continue;
    const duplicates = q.options.filter((o) => o.description === "Spyhole");
    if (duplicates.length > 1) {
      const drop = new Set(duplicates.slice(0, -1).map((o) => o.id));
      q.options = q.options.filter((o) => !drop.has(o.id));
    }
  }
  const diagramFor = {
    "Letterplate Position": (description) => {
      if (/bottom rail|\bposition 34\b/i.test(description)) return "/diagrams/letter-34.svg";
      if (/between cassette|\bposition (?:26|30|17)\b/i.test(description))
        return "/diagrams/letter-26.svg";
      if (/midrail|\bposition (?:14|7|1|2|3|25|27)\b/i.test(description))
        return "/diagrams/letter-7.svg";
      if (/\bposition (?:49|47|48|35|8|9|10|15|16|28|29|60)\b/i.test(description))
        return "/diagrams/letter-49.svg";
      return "/diagrams/letter-34.svg";
    },
    Threshold: (description) => {
      if (/gold/i.test(description)) return "/diagrams/threshold-gold.svg";
      if (/silver/i.test(description)) return "/diagrams/threshold-silver.svg";
      if (/pvc|standard/i.test(description)) return "/diagrams/threshold-pvc.svg";
      return "";
    },
    "Drip Bar": (description) =>
      ({
        None: "/diagrams/drip-none.svg",
        White: "/diagrams/drip-white.svg",
        Silver: "/diagrams/drip-silver.svg",
        Gold: "/diagrams/drip-gold.svg",
        "Colour Matched": "/diagrams/drip-matched.svg",
      })[description] || "",
  };
  for (const q of list) {
    if (system === "rehau") {
      if (q.originalName === "Cill") {
        const prevId = q.currentId;
        const prevDesc = q.options?.find((o) => o.id === prevId)?.description?.toLowerCase();
        q.options = [
          { id: "rehau-cill-150", description: "150mm cill", src: "", isCurrentOption: true },
          { id: "rehau-cill-180", description: "180mm cill", src: "" },
          { id: "rehau-cill-95", description: "95mm stub cill", src: "" },
          { id: "rehau-cill-none", description: "No cill", src: "" },
        ];
        const matched = q.options.find(
          (o) =>
            o.id === picks[q.key] ||
            (prevDesc && o.description.toLowerCase().includes(prevDesc.replace(/mm.*$/, ""))),
        );
        q.currentId = matched?.id ?? q.options[0].id;
      }
      if (q.originalName === "Threshold") {
        const prevId = q.currentId;
        const prevDesc = q.options?.find((o) => o.id === prevId)?.description?.toLowerCase();
        q.options = [
          {
            id: "rehau-thresh-72",
            description: "72mm PVCu threshold",
            src: "/diagrams/threshold-pvc.svg",
            isCurrentOption: true,
          },
          {
            id: "rehau-thresh-exitex-silver",
            description: "Exitex low threshold (silver)",
            src: "/diagrams/threshold-silver.svg",
          },
          {
            id: "rehau-thresh-exitex-gold",
            description: "Exitex low threshold (gold)",
            src: "/diagrams/threshold-gold.svg",
          },
          {
            id: "rehau-thresh-52",
            description: "52mm PVCu threshold",
            src: "/diagrams/threshold-pvc.svg",
          },
        ];
        const matched = q.options.find(
          (o) =>
            o.id === picks[q.key] ||
            (prevDesc &&
              ((prevDesc.includes("gold") && o.description.includes("gold")) ||
                (prevDesc.includes("silver") && o.description.includes("silver")) ||
                (prevDesc.includes("pvc") && o.description.includes("72mm")))),
        );
        q.currentId = matched?.id ?? q.options[0].id;
      }
    }
    const pick = diagramFor[q.originalName];
    if (!pick) continue;
    q.options = q.options.map((o) => ({ ...o, src: pick(o.description) || o.src }));
    if (q.originalName === "Letterplate Position") {
      const bottom = q.options.find((o) => /bottom rail/i.test(o.description));
      if (bottom) q.currentId = bottom.id;
    }
  }
  for (const profileQuestion of profileSystemQuestions(system)) add(profileQuestion, "frame");
  return list
    .filter((q) => {
      if (!q.options?.length && !q.hasText) return false;
      if (q.originalName === "Door Range") return false;
      if (/split position/i.test(q.originalName)) return false;
      if (q.originalName === "Letterplate Position")
        return letter?.description === "Letterplate" && q.options?.length > 0;
      if (q.originalName === "Escutcheon (Slab)") return isInlineBarOrNoHandle;
      if (q.originalName === "House Number") return numeral?.description === "Numerals";
      if (q.originalName === "Glass Pattern") return glass?.description.includes("Obscure");
      if (q.originalName === "Spyhole") return !knockerHasSpy;
      return true;
    })
    .sort((a, b) => (a.consumerListOrder ?? 999) - (b.consumerListOrder ?? 999));
}

export function reconcile(picks, questions) {
  return Object.fromEntries(
    questions.map((q) => [q.key, option(q, picks)?.id]).filter(([, id]) => id),
  );
}
