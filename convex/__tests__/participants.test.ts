/// <reference types="vite/client" />
import { type TestConvex, convexTest } from "convex-test";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

async function createTestRoom(t: TestConvex<typeof schema>) {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("rooms", {
        name: "Test Room",
        roomCode: "TESTCODE",
        cardSet: ["1", "2", "3", "5", "8"],
        status: "lobby",
        currentTaskIndex: 0,
        createdBy: "session-creator",
        createdAt: Date.now(),
      }),
  );
}

describe("participants", () => {
  it("joinRoom creates a participant", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    const participantId = await t.mutation(api.participants.joinRoom, {
      displayName: "Tim",
      roomId,
      sessionId: "session-1",
    });
    expect(participantId).toBeDefined();

    const result = await t.query(api.participants.getParticipants, { roomId });
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe("Tim");
    expect(result[0].isConnected).toBeTruthy();
  });

  it("joinRoom again with same session returns same participant (no duplicate)", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    const id1 = await t.mutation(api.participants.joinRoom, {
      displayName: "Tim",
      roomId,
      sessionId: "session-1",
    });
    const id2 = await t.mutation(api.participants.joinRoom, {
      displayName: "Tim",
      roomId,
      sessionId: "session-1",
    });

    expect(id1).toStrictEqual(id2);
    const result = await t.query(api.participants.getParticipants, { roomId });
    expect(result).toHaveLength(1);
  });

  it("leaveRoom sets isConnected to false", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.participants.joinRoom, {
      displayName: "Tim",
      roomId,
      sessionId: "session-1",
    });
    await t.mutation(api.participants.leaveRoom, {
      roomId,
      sessionId: "session-1",
    });

    const result = await t.query(api.participants.getParticipants, { roomId });
    expect(result[0].isConnected).toBeFalsy();
  });

  it("takeoverSession transfers identity to new session", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    const participantId = await t.mutation(api.participants.joinRoom, {
      displayName: "Tim",
      roomId,
      sessionId: "session-A",
    });

    await t.mutation(api.participants.takeoverSession, {
      roomId,
      sessionId: "session-B",
      targetParticipantId: participantId,
    });

    const result = await t.query(api.participants.getParticipants, { roomId });
    const tim = result.find((p) => p.displayName === "Tim");
    expect(tim?.sessionId).toBe("session-B");
    expect(tim?.isConnected).toBeTruthy();
  });

  it("getParticipants returns all participants including disconnected", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.participants.joinRoom, {
      displayName: "Tim",
      roomId,
      sessionId: "session-1",
    });
    await t.mutation(api.participants.joinRoom, {
      displayName: "Alice",
      roomId,
      sessionId: "session-2",
    });
    await t.mutation(api.participants.leaveRoom, {
      roomId,
      sessionId: "session-1",
    });

    const result = await t.query(api.participants.getParticipants, { roomId });
    expect(result).toHaveLength(2);
  });

  it("heartbeat updates isConnected to true", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.participants.joinRoom, {
      displayName: "Tim",
      roomId,
      sessionId: "session-1",
    });
    await t.mutation(api.participants.leaveRoom, {
      roomId,
      sessionId: "session-1",
    });

    let result = await t.query(api.participants.getParticipants, { roomId });
    expect(result[0].isConnected).toBeFalsy();

    await t.mutation(api.participants.heartbeat, {
      roomId,
      sessionId: "session-1",
    });

    result = await t.query(api.participants.getParticipants, { roomId });
    expect(result[0].isConnected).toBeTruthy();
  });

  it("takeoverSession with invalid participantId throws", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    const fakeId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("participants", {
        displayName: "Old User",
        isConnected: false,
        joinedAt: Date.now(),
        roomId,
        sessionId: "session-old",
      });
      await ctx.db.delete(id);
      return id;
    });

    await expect(
      t.mutation(api.participants.takeoverSession, {
        roomId,
        sessionId: "session-new",
        targetParticipantId: fakeId,
      }),
    ).rejects.toThrow("Target participant not found");
  });
});
