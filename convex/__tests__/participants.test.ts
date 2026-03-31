/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

async function createTestRoom(t: TestConvex<typeof schema>) {
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
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    const participantId = await t.mutation(api.participants.joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });
    expect(participantId).toBeDefined();

    const result = await t.query(api.participants.getParticipants, { roomId });
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe("Tim");
    expect(result[0].isConnected).toBe(true);
  });

  test("joinRoom again with same session returns same participant (no duplicate)", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    const id1 = await t.mutation(api.participants.joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });
    const id2 = await t.mutation(api.participants.joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });

    expect(id1).toEqual(id2);
    const result = await t.query(api.participants.getParticipants, { roomId });
    expect(result).toHaveLength(1);
  });

  test("leaveRoom sets isConnected to false", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.participants.joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });
    await t.mutation(api.participants.leaveRoom, {
      sessionId: "session-1",
      roomId,
    });

    const result = await t.query(api.participants.getParticipants, { roomId });
    expect(result[0].isConnected).toBe(false);
  });

  test("takeoverSession transfers identity to new session", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    const participantId = await t.mutation(api.participants.joinRoom, {
      sessionId: "session-A",
      roomId,
      displayName: "Tim",
    });

    await t.mutation(api.participants.takeoverSession, {
      sessionId: "session-B",
      roomId,
      targetParticipantId: participantId,
    });

    const result = await t.query(api.participants.getParticipants, { roomId });
    const tim = result.find((p) => p.displayName === "Tim");
    expect(tim?.sessionId).toBe("session-B");
    expect(tim?.isConnected).toBe(true);
  });

  test("getParticipants returns all participants including disconnected", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.participants.joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });
    await t.mutation(api.participants.joinRoom, {
      sessionId: "session-2",
      roomId,
      displayName: "Alice",
    });
    await t.mutation(api.participants.leaveRoom, {
      sessionId: "session-1",
      roomId,
    });

    const result = await t.query(api.participants.getParticipants, { roomId });
    expect(result).toHaveLength(2);
  });

  test("heartbeat updates isConnected to true", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.participants.joinRoom, {
      sessionId: "session-1",
      roomId,
      displayName: "Tim",
    });
    await t.mutation(api.participants.leaveRoom, {
      sessionId: "session-1",
      roomId,
    });

    let result = await t.query(api.participants.getParticipants, { roomId });
    expect(result[0].isConnected).toBe(false);

    await t.mutation(api.participants.heartbeat, {
      sessionId: "session-1",
      roomId,
    });

    result = await t.query(api.participants.getParticipants, { roomId });
    expect(result[0].isConnected).toBe(true);
  });

  test("takeoverSession with invalid participantId throws", async () => {
    const t = convexTest(schema, modules);
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
      t.mutation(api.participants.takeoverSession, {
        sessionId: "session-new",
        roomId,
        targetParticipantId: fakeId,
      }),
    ).rejects.toThrow("Target participant not found");
  });
});
