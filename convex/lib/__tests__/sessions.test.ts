import { convexTest } from "convex-test";
import { v } from "convex/values";

import * as api from "../../_generated/api";
import schema from "../../schema";
import { sessionMutation } from "../sessions";

function createTestContext() {
  return convexTest(schema, {
    "../_generated/api": () => Promise.resolve({ default: api }),
  });
}

const rejectBlankSessionMutation = sessionMutation({
  args: { value: v.string() },
  handler: async (_ctx, args) => args.value,
});

describe(sessionMutation, () => {
  it("sessions module exports sessionMutation and sessionQuery", async () => {
    expect(createTestContext).toBeDefined();

    const { sessionMutation, sessionQuery } = await import("../sessions");

    expect(sessionMutation).toBeDefined();
    expect(sessionQuery).toBeDefined();
  });

  it("rejects an empty sessionId", async () => {
    const t = createTestContext();

    await expect(
      t.mutation(rejectBlankSessionMutation, {
        sessionId: "   ",
        value: "hello",
      }),
    ).rejects.toThrow("sessionId is required");
  });
});
