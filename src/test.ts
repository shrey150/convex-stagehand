/**
 * Test helpers for the Browserbase component
 *
 * Use this with the convex-test library to test your Convex app
 * that uses the Browserbase component.
 *
 * @example
 * ```typescript
 * import { convexTest } from "convex-test";
 * import { describe, expect, test } from "vitest";
 * import { register } from "@convex-dev/browserbase/test";
 * import schema from "./schema";
 *
 * describe("Browserbase component", () => {
 *   test("should schedule a job", async () => {
 *     const t = convexTest(schema);
 *     register(t);
 *
 *     const jobId = await t.mutation(api.example.scheduleJob, {
 *       url: "https://example.com"
 *     });
 *
 *     expect(jobId).toBeDefined();
 *   });
 * });
 * ```
 */

/// <reference types="vite/client" />
import type { TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";
import schema from "./component/schema.js";

const modules = import.meta.glob("./component/**/*.ts");

/**
 * Register the Browserbase component for testing
 *
 * @param t - The convex-test context
 * @param name - Component name (default: "browserbase")
 *
 * @example
 * ```typescript
 * import { convexTest } from "convex-test";
 * import { register } from "@convex-dev/browserbase/test";
 * import schema from "./schema";
 *
 * const t = convexTest(schema);
 * register(t); // Uses default name "browserbase"
 *
 * // Or with custom name:
 * register(t, "myBrowserbase");
 * ```
 */
export function register(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
  name: string = "browserbase",
) {
  t.registerComponent(name, schema, modules);
}

export default { register, schema, modules };
