import { EUROCELL_FINISH_SUFFIX, EUROCELL_NEW_STYLE_1 } from "./eurocell-new.ts";
import { REHAU_TOTAL_70 } from "./rehau.ts";
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

function isSelected(value: string | undefined): value is string {
  return Boolean(value && !/^(?:none|no|not selected|select|choose|-|—)$/i.test(value.trim()));
}

function finishSuffix(external: string, internal: string) {
  return EUROCELL_FINISH_SUFFIX[`${normalize(external)}/${normalize(internal)}`] || "";
}

function total(line: Omit<ManufacturingPartLine, "totalQuantity">, doorQuantity: number) {
  return { ...line, totalQuantity: line.quantityPerDoor * doorQuantity };
}

export function calculateManufacturing(input: ManufacturingInput): ManufacturingSnapshot | null {
  const isRehau = input.system === "rehau";
  const rules = isRehau ? REHAU_TOTAL_70 : EUROCELL_NEW_STYLE_1;

  const width = Math.round(input.frame.width_mm);
  const height = Math.round(input.frame.height_mm);
  if (width < rules.limits.widthMm.min || width > rules.limits.widthMm.max) {
    throw new Error(
      `${rules.name} width must be between ${rules.limits.widthMm.min} and ${rules.limits.widthMm.max} mm.`,
    );
  }
  if (height < rules.limits.heightMm.min || height > rules.limits.heightMm.max) {
    throw new Error(
      `${rules.name} height must be between ${rules.limits.heightMm.min} and ${rules.limits.heightMm.max} mm.`,
    );
  }

  const values = answers(input.particulars);
  const finishes = resolveFinishSelections(input.particulars);
  const frameFinish = finishes.profile.label;
  const cillFinish = finishes.cill.label;
  const cillAnswer = answerMatching(values, /^(cill|sill)$/i) || "150mm cill";
  const hasNoCill = /^no\s*cill$/i.test(cillAnswer.trim());
  const cill = hasNoCill
    ? { partCode: "", description: "No cill", heightMm: 0 }
    : Object.entries(rules.cills).find(([name]) =>
        normalize(cillAnswer).includes(normalize(name)),
      )?.[1] || rules.cills["150mm cill"];
  const outerFrameAnswer = answerMatching(values, /^outer frame$/i);
  const isUniversalFrame = isRehau && /universal/i.test(outerFrameAnswer);
  const frameSuffix = isRehau
    ? ""
    : finishSuffix(finishes.profile.external, finishes.profile.internal);
  const cillSuffix = isRehau ? "" : finishSuffix(finishes.cill.external, finishes.cill.internal);
  const framePartCode = isRehau
    ? isUniversalFrame
      ? "546185"
      : "546760"
    : `${rules.frame.partCode}${frameSuffix}`;
  const frameDescription = isRehau
    ? isUniversalFrame
      ? "Rehau Universal Outer Frame"
      : "Rehau 72mm Outer Frame"
    : `${rules.frame.description}${finishes.profile.external ? ` (${frameFinish})` : ""}`;
  const frameHeight = height - cill.heightMm;
  const frameCutWidth = width + rules.frame.weldAllowanceMm;
  const frameCutHeight = frameHeight + rules.frame.weldAllowanceMm;
  const quantity = input.frame.quantity;

  const parts: ManufacturingPartLine[] = [
    total(
      {
        lineId: "frame-horizontal",
        category: "profile",
        partCode: framePartCode,
        description: frameDescription,
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
        partCode: framePartCode,
        description: frameDescription,
        quantityPerDoor: 2,
        widthMm: null,
        heightMm: frameCutHeight,
        leftEndPrep: "mitre",
        rightEndPrep: "mitre",
        formula: hasNoCill
          ? `overall height + ${rules.frame.weldAllowanceMm} mm`
          : `overall height - ${cill.heightMm} mm cill + ${rules.frame.weldAllowanceMm} mm`,
      },
      quantity,
    ),
  ];

  if (!hasNoCill) {
    parts.push(
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
    );
  }

  const handles = answerMatching(values, /handle/i);
  if (isSelected(handles)) {
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
    } else {
      parts.push(
        total(
          {
            lineId: "handle",
            category: "hardware",
            partCode: "",
            description: /handle/i.test(handles) ? handles : `${handles} Handle`,
            quantityPerDoor: 1,
            widthMm: null,
            heightMm: null,
            leftEndPrep: "none",
            rightEndPrep: "none",
            formula: "selected handle",
          },
          quantity,
        ),
      );
    }
  }

  const hinges = answerMatching(values, /hinge/i);
  if (isSelected(hinges)) {
    const isVbh = /vbh/i.test(hinges);
    const isEra = /era/i.test(hinges);
    const isFlag = isRehau && /flag/i.test(hinges);
    const isChallenger = /challenger/i.test(hinges);
    parts.push(
      total(
        {
          lineId: "hinges",
          category: "hardware",
          partCode: isVbh ? "VBH-COMP-HG" : isEra ? "ERA-HG" : isFlag ? "FlagDoorHinge" : "",
          description: isVbh
            ? "VBH Composite Door Hinge"
            : isEra
              ? "ERA Door Hinge"
              : isChallenger
                ? "Challenger Door Hinge"
                : isFlag
                  ? "Flag Door Hinge"
                  : /hinge/i.test(hinges)
                    ? hinges
                    : `${hinges} Hinges`,
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
  if (isSelected(locking)) {
    const isEraInvincible = /era invincible/i.test(locking);
    const isEra = /era/i.test(locking);
    const isHook = /hook/i.test(locking);
    parts.push(
      total(
        {
          lineId: "lock",
          category: "hardware",
          partCode: isEraInvincible ? "ERAL3" : isEra ? "ERAL1" : isHook ? "CDL1" : "",
          description: isEraInvincible
            ? "ERA Invincible Lock Kit"
            : isEra
              ? "ERA Door Lock Kit L/H (Aluminium)"
              : isHook
                ? "Hook Lock (Lockmaster)"
                : /lock/i.test(locking)
                  ? locking
                  : `${locking} Lock`,
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
  if (isSelected(cylinder)) {
    const isThumbturn = /thumbturn/i.test(cylinder);
    const is3Star = /3\s*\*|3\s*star/i.test(cylinder);
    const is1Star = /1\s*\*|1\s*star/i.test(cylinder);
    const isStandard = /standard/i.test(cylinder);
    let partCode = "";
    let description = cylinder;
    if (is3Star) {
      partCode = "3STARTCYL";
      description = isThumbturn
        ? "3* Thumbturn cylinder (Nickel)"
        : "High Security 3 Star Anti-Snap cylinder";
    } else if (is1Star) {
      partCode = "1STARCYL";
      description = isThumbturn ? "1* Thumbturn cylinder" : "1 Star cylinder";
    } else if (isThumbturn) {
      partCode = "THUMBCL";
      description = "Thumbturn cylinder";
    } else if (isStandard) {
      partCode = "STDCYL";
      description = "Standard cylinder";
    }
    parts.push(
      total(
        {
          lineId: "cylinder",
          category: "hardware",
          partCode,
          description: /cylinder/i.test(description) ? description : `${description} Cylinder`,
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

  const letterplate = answerMatching(values, /letter(plate|box)/i);
  if (isSelected(letterplate)) {
    parts.push(
      total(
        {
          lineId: "letterplate",
          category: "hardware",
          partCode: "",
          description: /letter/i.test(letterplate) ? letterplate : `${letterplate} Letterplate`,
          quantityPerDoor: 1,
          widthMm: null,
          heightMm: null,
          leftEndPrep: "none",
          rightEndPrep: "none",
          formula: "selected letterplate",
        },
        quantity,
      ),
    );
  }

  const knocker = answerMatching(values, /knocker/i);
  if (isSelected(knocker)) {
    parts.push(
      total(
        {
          lineId: "knocker",
          category: "hardware",
          partCode: "",
          description: /knocker/i.test(knocker) ? knocker : `${knocker} Knocker`,
          quantityPerDoor: 1,
          widthMm: null,
          heightMm: null,
          leftEndPrep: "none",
          rightEndPrep: "none",
          formula: "selected knocker",
        },
        quantity,
      ),
    );
  }

  const dripBar = answerMatching(values, /drip\s*bar/i);
  if (isSelected(dripBar)) {
    parts.push(
      total(
        {
          lineId: "drip-bar",
          category: "hardware",
          partCode: "",
          description: /drip/i.test(dripBar) ? dripBar : `${dripBar} Drip Bar`,
          quantityPerDoor: 1,
          widthMm: null,
          heightMm: null,
          leftEndPrep: "none",
          rightEndPrep: "none",
          formula: "selected drip bar",
        },
        quantity,
      ),
    );
  }

  const numeral = answerMatching(values, /numeral/i);
  if (isSelected(numeral)) {
    parts.push(
      total(
        {
          lineId: "numeral",
          category: "hardware",
          partCode: "",
          description: /numeral/i.test(numeral) ? numeral : `Numeral (${numeral})`,
          quantityPerDoor: 1,
          widthMm: null,
          heightMm: null,
          leftEndPrep: "none",
          rightEndPrep: "none",
          formula: "selected numeral",
        },
        quantity,
      ),
    );
  }

  const restrictor = answerMatching(values, /^restrictor/i);
  if (isSelected(restrictor) && !/no\s*restrictor/i.test(restrictor)) {
    parts.push(
      total(
        {
          lineId: "restrictor",
          category: "hardware",
          partCode: "",
          description: /restrictor/i.test(restrictor) ? restrictor : `${restrictor} Restrictor`,
          quantityPerDoor: 1,
          widthMm: null,
          heightMm: null,
          leftEndPrep: "none",
          rightEndPrep: "none",
          formula: "selected restrictor",
        },
        quantity,
      ),
    );
  }

  const safeTBar = answerMatching(values, /safe\s*t\s*bar/i);
  if (isSelected(safeTBar) && !/no\s*safe/i.test(safeTBar) && /safe/i.test(safeTBar)) {
    parts.push(
      total(
        {
          lineId: "safe-t-bar",
          category: "hardware",
          partCode: "",
          description: "Safe T Bar",
          quantityPerDoor: 1,
          widthMm: null,
          heightMm: null,
          leftEndPrep: "none",
          rightEndPrep: "none",
          formula: "selected safe T bar",
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
    systemId: isRehau ? "rehau" : "eurocell",
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
      ...(!isRehau && !finishes.profile.external
        ? ["Select an external frame colour to resolve the Eurocell profile part code."]
        : !isRehau && !frameSuffix
          ? [
              `No verified Eurocell profile suffix exists for ${frameFinish}; verify the frame part code.`,
            ]
          : []),
      ...(!isRehau && !finishes.cill.external
        ? ["Select a cill colour to resolve the Eurocell cill part code."]
        : !isRehau && !cillSuffix
          ? [
              `No verified Eurocell cill suffix exists for ${cillFinish}; verify the cill part code.`,
            ]
          : []),
    ],
  };
}
