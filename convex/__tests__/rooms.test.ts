import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import * as api from "../_generated/api";
import * as roomsFns from "../rooms";
import schema from "../schema";

const modules = {
  "./_generated/api.js": () => Promise.resolve({ default: api }),
  "./rooms.js": () => Promise.resolve(roomsFns),
};

describe("rooms", () => {
  it("createRoom returns roomCode and roomId", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.api.rooms.createRoom, {
      cardSet: ["1", "2", "3", "5", "8", "13", "21"],
      name: "Sprint 42",
      sessionId: "session-1",
    });
    expect(result.roomCode).toHaveLength(8);
    expect(result.roomId).toBeDefined();
  });

  it("getRoom returns room by code", async () => {
    const t = convexTest(schema, modules);
    const { roomCode } = await t.mutation(api.api.rooms.createRoom, {
      cardSet: ["1", "2", "3", "5", "8", "13", "21"],
      name: "Sprint 42",
      sessionId: "session-1",
    });
    const room = await t.query(api.api.rooms.getRoom, { roomCode });
    expect(room?.name).toBe("Sprint 42");
    expect(room?.status).toBe("lobby");
    expect(room?.cardSet).toStrictEqual(["1", "2", "3", "5", "8", "13", "21"]);
  });

  it("getRoom returns null for non-existent room", async () => {
    const t = convexTest(schema, modules);
    const room = await t.query(api.api.rooms.getRoom, { roomCode: "NONEXIST" });
    expect(room).toBeNull();
  });

  it("room code is 8 characters", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.api.rooms.createRoom, {
      cardSet: ["1", "2", "5"],
      name: "Test Room",
      sessionId: "session-1",
    });
    expect(result.roomCode).toMatch(/^[A-Za-z0-9_-]{8}$/);
  });

  it("getRoomById returns room by ID", async () => {
    const t = convexTest(schema, modules);
    const { roomId } = await t.mutation(api.api.rooms.createRoom, {
      cardSet: ["1", "2"],
      name: "My Room",
      sessionId: "session-1",
    });
    const room = await t.query(api.api.rooms.getRoomById, { roomId });
    expect(room?.name).toBe("My Room");
  });
});
