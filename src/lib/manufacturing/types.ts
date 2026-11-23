export type ProfileSystemId = "doorco" | "eurocell" | "rehau";

export type FrameDetails = {
  width_mm: number;
  height_mm: number;
  quantity: number;
  location: string;
};

export type ManufacturingInput = {
  system: ProfileSystemId;
  style: string;
  designName: string;
  frame: FrameDetails;
  particulars: Array<{
    question: string;
    answer: string;
    original_name?: string;
    section?: string;
  }>;
};

export type EndPrep = "mitre" | "square" | "none";

export type ManufacturingPartLine = {
  lineId: string;
  category: "profile" | "cill" | "hardware" | "slab";
  partCode: string;
  description: string;
  quantityPerDoor: number;
  totalQuantity: number;
  widthMm: number | null;
  heightMm: number | null;
  leftEndPrep: EndPrep;
  rightEndPrep: EndPrep;
  formula: string;
};

export type ManufacturingSnapshot = {
  ruleSetId: string;
  ruleSetVersion: number;
  systemId: ProfileSystemId;
  systemName: string;
  style: string;
  overallWidthMm: number;
  overallHeightMm: number;
  finishedFrameWidthMm: number;
  finishedFrameHeightMm: number;
  checkDiagonalMm: number;
  quantity: number;
  location: string;
  parts: ManufacturingPartLine[];
  warnings: string[];
};
