import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import * as api from "./_generated/api";
import schema from "./schema";

test("convex-test round-trips a rooms document", async () => {
  const modules = {
    "../_generated/api": () => Promise.resolve({ default: api }),
  };
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const id = await ctx.db.insert("rooms", {
      cardSet: ["1", "2", "3", "5", "8", "13", "21"],
      createdAt: Date.now(),
      createdBy: "session-abc",
      currentTaskIndex: 0,
      name: "Sprint 1",
      roomCode: "ABC12345",
      status: "lobby",
    });
    const doc = await ctx.db.get(id);
    expect(doc?.name).toBe("Sprint 1");
    expect(doc?.roomCode).toBe("ABC12345");
    expect(doc?.status).toBe("lobby");
  });
});
