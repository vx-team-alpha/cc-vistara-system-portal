import { ConfigurationSchema } from "../../server/portal/schemas.ts";

export const ALL_ORDER_STATUSES = [
  "draft",
  "issued",
  "confirmed",
  "in_production",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ALL_ORDER_STATUSES)[number];

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["issued", "confirmed", "in_production", "completed", "cancelled"],
  issued: ["draft", "confirmed", "in_production", "completed", "cancelled"],
  confirmed: ["draft", "issued", "in_production", "completed", "cancelled"],
  in_production: ["draft", "issued", "confirmed", "completed", "cancelled"],
  completed: ["draft", "issued", "confirmed", "in_production", "cancelled"],
  cancelled: ["draft", "issued", "confirmed", "in_production", "completed"],
};

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
