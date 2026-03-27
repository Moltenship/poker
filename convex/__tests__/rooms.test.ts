import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import * as api from "../_generated/api";
import * as rooms from "../rooms";

const modules = {
  "./_generated/api.js": () => Promise.resolve({ default: api }),
  "./rooms.js": () => Promise.resolve(rooms),
};

describe("rooms", () => {
  test("createRoom returns roomCode and roomId", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.api.rooms.createRoom, {
      sessionId: "session-1",
      name: "Sprint 42",
      cardSet: ["1", "2", "3", "5", "8", "13", "21"],
    });
    expect(result.roomCode).toHaveLength(8);
    expect(result.roomId).toBeDefined();
  });

  test("getRoom returns room by code", async () => {
    const t = convexTest(schema, modules);
    const { roomCode } = await t.mutation(api.api.rooms.createRoom, {
      sessionId: "session-1",
      name: "Sprint 42",
      cardSet: ["1", "2", "3", "5", "8", "13", "21"],
    });
    const room = await t.query(api.api.rooms.getRoom, { roomCode });
    expect(room?.name).toBe("Sprint 42");
    expect(room?.status).toBe("lobby");
    expect(room?.cardSet).toEqual(["1", "2", "3", "5", "8", "13", "21"]);
  });

  test("getRoom returns null for non-existent room", async () => {
    const t = convexTest(schema, modules);
    const room = await t.query(api.api.rooms.getRoom, { roomCode: "NONEXIST" });
    expect(room).toBeNull();
  });

  test("room code is 8 characters", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.api.rooms.createRoom, {
      sessionId: "session-1",
      name: "Test Room",
      cardSet: ["1", "2", "5"],
    });
    expect(result.roomCode).toMatch(/^[A-Za-z0-9_-]{8}$/);
  });

  test("getRoomById returns room by ID", async () => {
    const t = convexTest(schema, modules);
    const { roomId } = await t.mutation(api.api.rooms.createRoom, {
      sessionId: "session-1",
      name: "My Room",
      cardSet: ["1", "2"],
    });
    const room = await t.query(api.api.rooms.getRoomById, { roomId });
    expect(room?.name).toBe("My Room");
  });
});
