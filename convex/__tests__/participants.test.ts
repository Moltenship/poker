import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import * as api from "../_generated/api";
import schema from "../schema";
import {
  joinRoom,
  leaveRoom,
  getParticipants,
  listRoomParticipants,
  takeoverSession,
  heartbeat,
} from "../participants";

const modules = {
  "../_generated/api": () => Promise.resolve({ default: api }),
};

function createTestContext() {
  return convexTest(schema, modules);
}

async function createTestRoom(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("rooms", {
      name: "Test Room",
      roomCode: "TESTCODE",
      cardSet: ["1", "2", "3", "5", "8"],
      status: "lobby",
      currentTaskIndex: 0,
      createdBy: "session-creator",
      createdAt: Date.now(),
    });
  });
}

describe("participants", () => {
  test("joinRoom creates a participant", async () => {
    const t = createTestContext();
    const roomId = await createTestRoom(t);

    const participantId = await t.mutation(joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });
    expect(participantId).toBeDefined();

    const result = await t.query(getParticipants, { roomId });
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe("Tim");
    expect(result[0].isConnected).toBe(true);
  });

  test("joinRoom again with same session returns same participant (no duplicate)", async () => {
    const t = createTestContext();
    const roomId = await createTestRoom(t);

    const id1 = await t.mutation(joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });
    const id2 = await t.mutation(joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });

    expect(id1).toEqual(id2);
    const result = await t.query(getParticipants, { roomId });
    expect(result).toHaveLength(1);
  });

  test("leaveRoom sets isConnected to false", async () => {
    const t = createTestContext();
    const roomId = await createTestRoom(t);

    await t.mutation(joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });
    await t.mutation(leaveRoom, {
      sessionId: "session-1",
      roomId,
    });

    const result = await t.query(getParticipants, { roomId });
    expect(result[0].isConnected).toBe(false);
  });

  test("takeoverSession transfers identity to new session", async () => {
    const t = createTestContext();
    const roomId = await createTestRoom(t);

    const participantId = await t.mutation(joinRoom, {
      sessionId: "session-A",
      roomId,
      displayName: "Tim",
    });

    await t.mutation(takeoverSession, {
      sessionId: "session-B",
      roomId,
      targetParticipantId: participantId,
    });

    const result = await t.query(getParticipants, { roomId });
    const tim = result.find((p: { displayName: string }) => p.displayName === "Tim");
    expect(tim?.sessionId).toBe("session-B");
    expect(tim?.isConnected).toBe(true);
  });

  test("getParticipants returns all participants including disconnected", async () => {
    const t = createTestContext();
    const roomId = await createTestRoom(t);

    await t.mutation(joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });
    await t.mutation(joinRoom, {
      sessionId: "session-2",
      roomId,
      displayName: "Alice",
    });
    await t.mutation(leaveRoom, {
      sessionId: "session-1",
      roomId,
    });

    const result = await t.query(getParticipants, { roomId });
    expect(result).toHaveLength(2);
  });

  test("heartbeat updates isConnected to true", async () => {
    const t = createTestContext();
    const roomId = await createTestRoom(t);

    await t.mutation(joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });
    await t.mutation(leaveRoom, {
      sessionId: "session-1",
      roomId,
    });

    let result = await t.query(getParticipants, { roomId });
    expect(result[0].isConnected).toBe(false);

    await t.mutation(heartbeat, {
      sessionId: "session-1",
      roomId,
    });

    result = await t.query(getParticipants, { roomId });
    expect(result[0].isConnected).toBe(true);
  });

  test("listRoomParticipants returns all participants", async () => {
    const t = createTestContext();
    const roomId = await createTestRoom(t);

    await t.mutation(joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });
    await t.mutation(joinRoom, {
      sessionId: "session-2",
      roomId,
      displayName: "Alice",
    });

    const result = await t.query(listRoomParticipants, { roomId });
    expect(result).toHaveLength(2);
    const names = result.map((p: { displayName: string }) => p.displayName);
    expect(names).toContain("Tim");
    expect(names).toContain("Alice");
  });

  test("takeoverSession with invalid participantId throws", async () => {
    const t = createTestContext();
    const roomId = await createTestRoom(t);

    const fakeId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("participants", {
        roomId,
        sessionId: "session-old",
        displayName: "Old User",
        isConnected: false,
        joinedAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });

    await expect(
      t.mutation(takeoverSession, {
        sessionId: "session-new",
        roomId,
        targetParticipantId: fakeId,
      }),
    ).rejects.toThrow("Target participant not found");
  });
});
