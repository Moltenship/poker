import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import * as api from "../../_generated/api";
import schema from "../../schema";
import { sessionMutation } from "../sessions";
import { v } from "convex/values";

function createTestContext() {
  return convexTest(schema, {
    "../_generated/api": () => Promise.resolve({ default: api }),
  });
}

const rejectBlankSessionMutation = sessionMutation({
  args: { value: v.string() },
  handler: async (_ctx, args) => args.value,
});

describe("sessionMutation", () => {
  test("sessions module exports sessionMutation and sessionQuery", async () => {
    expect(createTestContext).toBeDefined();

    const { sessionMutation, sessionQuery } = await import("../sessions");

    expect(sessionMutation).toBeDefined();
    expect(sessionQuery).toBeDefined();
  });

  test("rejects an empty sessionId", async () => {
    const t = createTestContext();

    await expect(
      t.mutation(rejectBlankSessionMutation, {
        sessionId: "   ",
        value: "hello",
      }),
    ).rejects.toThrow("sessionId is required");
  });
});
