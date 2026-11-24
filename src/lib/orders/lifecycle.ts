import { ConfigurationSchema } from "../../server/portal/schemas.ts";

export const ORDER_STATUS_TRANSITIONS = {
  draft: ["issued", "cancelled"],
  issued: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS_TRANSITIONS;

export function canTransitionOrder(current: string, next: string) {
  return (
    (ORDER_STATUS_TRANSITIONS[current as OrderStatus] as readonly string[] | undefined)?.includes(
      next,
    ) ?? false
  );
}

export function isDoorConfigurationComplete(configuration: unknown) {
  const parsed = ConfigurationSchema.safeParse(configuration);
  return Boolean(
    parsed.success &&
    parsed.data.design_id &&
    parsed.data.particulars.length &&
    Object.keys(parsed.data.picks).length,
  );
}

export function incompleteDoorLines(items: Array<{ line_number: number; configuration: unknown }>) {
  return items
    .filter((item) => !isDoorConfigurationComplete(item.configuration))
    .map((item) => item.line_number);
}
