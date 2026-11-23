import { EUROCELL_FINISH_SUFFIX, EUROCELL_NEW_STYLE_1 } from "./eurocell-new.ts";
import { resolveFinishSelections } from "./selections.ts";
import type { ManufacturingInput, ManufacturingPartLine, ManufacturingSnapshot } from "./types.ts";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function answers(particulars: ManufacturingInput["particulars"]) {
  return new Map(
    particulars.map((item) => [
      normalize(item.question.replace(/\s*\((Door|Side|Casement)\)/gi, "")),
      item.answer.trim(),
    ]),
  );
}

function answerMatching(values: Map<string, string>, pattern: RegExp) {
  for (const [question, answer] of values) {
    if (pattern.test(question)) return answer;
  }
  return "";
}

function finishSuffix(external: string, internal: string) {
  return EUROCELL_FINISH_SUFFIX[`${normalize(external)}/${normalize(internal)}`] || "";
}

function total(line: Omit<ManufacturingPartLine, "totalQuantity">, doorQuantity: number) {
  return { ...line, totalQuantity: line.quantityPerDoor * doorQuantity };
}

export function calculateManufacturing(input: ManufacturingInput): ManufacturingSnapshot | null {
  if (input.system !== "eurocell") return null;

  const rules = EUROCELL_NEW_STYLE_1;
  const width = Math.round(input.frame.width_mm);
  const height = Math.round(input.frame.height_mm);
  if (width < rules.limits.widthMm.min || width > rules.limits.widthMm.max) {
    throw new Error(
      `Eurocell width must be between ${rules.limits.widthMm.min} and ${rules.limits.widthMm.max} mm.`,
    );
  }
  if (height < rules.limits.heightMm.min || height > rules.limits.heightMm.max) {
    throw new Error(
      `Eurocell height must be between ${rules.limits.heightMm.min} and ${rules.limits.heightMm.max} mm.`,
    );
  }

  const values = answers(input.particulars);
  const finishes = resolveFinishSelections(input.particulars);
  const frameFinish = finishes.profile.label;
  const cillFinish = finishes.cill.label;
  const cillAnswer = answerMatching(values, /^(cill|sill)$/i) || "150mm cill";
  const cill =
    Object.entries(rules.cills).find(([name]) =>
      normalize(cillAnswer).includes(normalize(name)),
    )?.[1] || rules.cills["150mm cill"];
  const frameSuffix = finishSuffix(finishes.profile.external, finishes.profile.internal);
  const cillSuffix = finishSuffix(finishes.cill.external, finishes.cill.internal);
  const frameHeight = height - cill.heightMm;
  const frameCutWidth = width + rules.frame.weldAllowanceMm;
  const frameCutHeight = frameHeight + rules.frame.weldAllowanceMm;
  const quantity = input.frame.quantity;

  const parts: ManufacturingPartLine[] = [
    total(
      {
        lineId: "frame-horizontal",
        category: "profile",
        partCode: `${rules.frame.partCode}${frameSuffix}`,
        description: `${rules.frame.description}${finishes.profile.external ? ` (${frameFinish})` : ""}`,
        quantityPerDoor: 2,
        widthMm: frameCutWidth,
        heightMm: null,
        leftEndPrep: "mitre",
        rightEndPrep: "mitre",
        formula: `overall width + ${rules.frame.weldAllowanceMm} mm`,
      },
      quantity,
    ),
    total(
      {
        lineId: "frame-vertical",
        category: "profile",
        partCode: `${rules.frame.partCode}${frameSuffix}`,
        description: `${rules.frame.description}${finishes.profile.external ? ` (${frameFinish})` : ""}`,
        quantityPerDoor: 2,
        widthMm: null,
        heightMm: frameCutHeight,
        leftEndPrep: "mitre",
        rightEndPrep: "mitre",
        formula: `overall height - ${cill.heightMm} mm cill + ${rules.frame.weldAllowanceMm} mm`,
      },
      quantity,
    ),
    total(
      {
        lineId: "cill",
        category: "cill",
        partCode: `${cill.partCode}${cillSuffix}`,
        description: `${cill.description}${finishes.cill.external ? ` (${cillFinish})` : ""}`,
        quantityPerDoor: 1,
        widthMm: width + rules.cillExtensionMm,
        heightMm: null,
        leftEndPrep: "square",
        rightEndPrep: "square",
        formula: `overall width + ${rules.cillExtensionMm} mm`,
      },
      quantity,
    ),
  ];

  const handles = answerMatching(values, /handle/i);
  if (/lever\s*\/\s*pad|lever.*pad/i.test(handles)) {
    const handleFinish = /chrome/i.test(handles) ? "Chrome" : handles.split(/\s+/)[0] || "Chrome";
    for (const kind of ["Lever", "Pad"] as const) {
      parts.push(
        total(
          {
            lineId: `handle-${kind.toLowerCase()}`,
            category: "hardware",
            partCode: /chrome/i.test(handleFinish) ? "ML218" : "",
            description: `Pro-Linea door handle, ${kind} (${handleFinish})`,
            quantityPerDoor: 1,
            widthMm: null,
            heightMm: null,
            leftEndPrep: "none",
            rightEndPrep: "none",
            formula: "selected handle set",
          },
          quantity,
        ),
      );
    }
  }

  const hinges = answerMatching(values, /hinge/i);
  if (/vbh/i.test(hinges)) {
    parts.push(
      total(
        {
          lineId: "hinges",
          category: "hardware",
          partCode: "",
          description: "VBH Composite Door Hinge",
          quantityPerDoor: 3,
          widthMm: null,
          heightMm: null,
          leftEndPrep: "none",
          rightEndPrep: "none",
          formula: "3 per door",
        },
        quantity,
      ),
    );
  }

  const locking = answerMatching(values, /lock(ing)?/i);
  if (/era/i.test(locking)) {
    parts.push(
      total(
        {
          lineId: "lock",
          category: "hardware",
          partCode: "ERAL1",
          description: "ERA Door Lock Kit L/H (Aluminium)",
          quantityPerDoor: 1,
          widthMm: null,
          heightMm: null,
          leftEndPrep: "none",
          rightEndPrep: "none",
          formula: "selected locking system",
        },
        quantity,
      ),
    );
  }

  const cylinder = answerMatching(values, /cylinder/i);
  if (/3\*.*thumbturn/i.test(cylinder)) {
    parts.push(
      total(
        {
          lineId: "cylinder",
          category: "hardware",
          partCode: "3STARTCYL",
          description: "3* Thumbturn cylinder (Nickel)",
          quantityPerDoor: 1,
          widthMm: null,
          heightMm: null,
          leftEndPrep: "none",
          rightEndPrep: "none",
          formula: "selected cylinder",
        },
        quantity,
      ),
    );
  }

  parts.push(
    total(
      {
        lineId: "door-slab",
        category: "slab",
        partCode: "",
        description: `${input.designName || "Composite door"} (${finishes.door.label})`,
        quantityPerDoor: 1,
        widthMm: width - rules.slab.widthDeductionMm,
        heightMm: height - rules.slab.heightDeductionMm,
        leftEndPrep: "none",
        rightEndPrep: "none",
        formula: `overall width - ${rules.slab.widthDeductionMm} mm; overall height - ${rules.slab.heightDeductionMm} mm`,
      },
      quantity,
    ),
  );

  return {
    ruleSetId: rules.id,
    ruleSetVersion: rules.version,
    systemId: input.system,
    systemName: rules.name,
    style: rules.supportedStyle,
    overallWidthMm: width,
    overallHeightMm: height,
    finishedFrameWidthMm: width,
    finishedFrameHeightMm: frameHeight,
    checkDiagonalMm: Math.round(Math.hypot(width, height)),
    quantity,
    location: input.frame.location,
    parts,
    warnings: [
      ...(input.style && input.style !== rules.supportedStyle
        ? [`${input.style} currently uses the Style 1 manufacturing rules and needs verification.`]
        : []),
      ...(!finishes.profile.external
        ? ["Select an external frame colour to resolve the Eurocell profile part code."]
        : !frameSuffix
          ? [
              `No verified Eurocell profile suffix exists for ${frameFinish}; verify the frame part code.`,
            ]
          : []),
      ...(!finishes.cill.external
        ? ["Select a cill colour to resolve the Eurocell cill part code."]
        : !cillSuffix
          ? [
              `No verified Eurocell cill suffix exists for ${cillFinish}; verify the cill part code.`,
            ]
          : []),
    ],
  };
}
