import { convexTest } from "convex-test";
import schema from "./schema";
import * as api from "./_generated/api";

test("convex-test round-trips a rooms document", async () => {
  const modules = {
    "../_generated/api": () => Promise.resolve({ default: api }),
  };
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const id = await ctx.db.insert("rooms", {
      name: "Sprint 1",
      roomCode: "ABC12345",
      cardSet: ["1", "2", "3", "5", "8", "13", "21"],
      status: "lobby",
      currentTaskIndex: 0,
      createdBy: "session-abc",
      createdAt: Date.now(),
    });
    const doc = await ctx.db.get(id);
    expect(doc?.name).toBe("Sprint 1");
    expect(doc?.roomCode).toBe("ABC12345");
    expect(doc?.status).toBe("lobby");
  });
});
