export const REHAU_TOTAL_70 = {
  id: "rehau-total-70",
  version: 1,
  name: "Rehau Total70",
  supportedStyle: "Style 1",
  limits: {
    widthMm: { min: 300, max: 2800 },
    heightMm: { min: 1750, max: 2500 },
  },
  frame: {
    partCode: "546760",
    description: "Rehau 72mm Outer Frame",
    weldAllowanceMm: 5,
  },
  cills: {
    "95mm stub cill": { partCode: "246320", description: "95mm stub cill", heightMm: 30 },
    "95mm cill": { partCode: "246320", description: "95mm stub cill", heightMm: 30 },
    "150mm cill": { partCode: "246330", description: "150mm cill", heightMm: 30 },
    "150mm standard cill": { partCode: "246330", description: "150mm cill", heightMm: 30 },
    "180mm cill": { partCode: "246340", description: "180mm cill", heightMm: 30 },
  },
  cillExtensionMm: 100,
  slab: {
    widthDeductionMm: 120,
    heightDeductionMm: 150,
  },
} as const;
