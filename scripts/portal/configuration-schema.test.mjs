import assert from "node:assert/strict";
import test from "node:test";

import { ConfigurationSchema } from "../../src/server/portal/schemas.ts";

test("accepts stable catalogue option keys as configuration picks", () => {
  const result = ConfigurationSchema.safeParse({
    picks: {
      "Threshold|door": "rehau-thresh-exitex-silver",
    },
  });

  assert.equal(result.success, true, result.error?.message);
});

test("rejects empty or oversized configuration pick values", () => {
  assert.equal(ConfigurationSchema.safeParse({ picks: { "Threshold|door": "" } }).success, false);
  assert.equal(
    ConfigurationSchema.safeParse({ picks: { "Threshold|door": "x".repeat(201) } }).success,
    false,
  );
});
