import type { ManufacturingInput } from "./types.ts";

type Particular = ManufacturingInput["particulars"][number];

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function questionName(particular: Particular) {
  return (particular.original_name || particular.question).replace(
    /\s*\((Door|Side|Casement)\)$/i,
    "",
  );
}

function exact(particulars: Particular[], ...names: string[]) {
  const wanted = new Set(names.map(normalized));
  const answer =
    particulars.find((item) => wanted.has(normalized(questionName(item))))?.answer.trim() || "";
  return /^(?:—|-|not selected|select|choose(?:\s+.+)?)$/i.test(answer) ? "" : answer;
}

function pair(external: string, internal: string) {
  const outside = external || "Not selected";
  const inside = internal || external || "Not selected";
  return {
    external: outside,
    internal: inside,
    label: outside === inside ? outside : `${outside}/${inside}`,
  };
}

export function resolveFinishSelections(particulars: Particular[]) {
  const doorExternal = exact(
    particulars,
    "Door Colour (External)",
    "External Door Colour",
    "Door Colour",
  );
  const doorInternal = exact(particulars, "Door Colour (Internal)", "Internal Door Colour");

  const profileExternal = exact(
    particulars,
    "Profile Colour (External)",
    "External Profile Colour",
    "Outer Frame Colour",
    "Frame Colour",
    "Outer Frame Colour (Door)",
  );
  const profileInternal = exact(
    particulars,
    "Profile Colour (Internal)",
    "Internal Profile Colour",
    "Outer Frame Colour (Internal)",
  );

  const cillExternal = exact(
    particulars,
    "Cill Colour (External)",
    "Sill Colour (External)",
    "Cill Colour",
    "Sill Colour",
  );
  const cillInternal = exact(particulars, "Cill Colour (Internal)", "Sill Colour (Internal)");

  const door = pair(doorExternal, doorInternal);
  const profile = pair(profileExternal, profileInternal);
  const cill = pair(
    cillExternal || profileExternal,
    cillInternal || profileInternal || cillExternal || profileExternal,
  );

  return { door, profile, cill };
}
