/// <reference types="vite/client" />
import { type TestConvex, convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

async function createTestRoom(
  t: TestConvex<typeof schema>,
  status: "lobby" | "voting" | "revealed" = "voting",
) {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("rooms", {
        name: "Test Room",
        roomCode: "TESTCODE",
        cardSet: ["1", "2", "3", "5", "8", "13"],
        status,
        currentTaskIndex: 0,
        createdBy: "session-1",
        createdAt: Date.now(),
      }),
  );
}

async function createParticipant(
  t: TestConvex<typeof schema>,
  roomId: Id<"rooms">,
  sessionId: string,
  displayName: string,
) {
  return await t.mutation(api.participants.joinRoom, { displayName, roomId, sessionId });
}

async function createTask(t: TestConvex<typeof schema>, roomId: Id<"rooms">, title = "Story 1") {
  return await t.mutation(api.tasks.addTask, { roomId, sessionId: "session-1", title });
}

describe("voting", () => {
  it("castVote stores vote for participant", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const participantId = await createParticipant(t, roomId, "session-1", "Tim");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, {
      participantId,
      sessionId: "session-1",
      taskId,
      value: "5",
    });

    const status = await t.query(api.voting.getVoteStatus, { taskId });
    const timsStatus = status.find((entry) => entry.participantId === participantId);
    expect(timsStatus?.hasVoted).toBeTruthy();
  });

  it("castVote upserts when a participant changes vote", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const participantId = await createParticipant(t, roomId, "session-1", "Tim");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, {
      participantId,
      sessionId: "session-1",
      taskId,
      value: "5",
    });
    await t.mutation(api.voting.castVote, {
      participantId,
      sessionId: "session-1",
      taskId,
      value: "8",
    });

    const status = await t.query(api.voting.getVoteStatus, { taskId });
    expect(status.filter((entry) => entry.participantId === participantId)).toHaveLength(1);
  });

  it("getVoteStatus does not reveal vote values before reveal", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const participantId = await createParticipant(t, roomId, "session-1", "Tim");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, {
      participantId,
      sessionId: "session-1",
      taskId,
      value: "5",
    });

    const status = await t.query(api.voting.getVoteStatus, { taskId });
    const timsStatus = status.find((entry) => entry.participantId === participantId);
    expect(timsStatus?.hasVoted).toBeTruthy();
    expect(timsStatus).not.toHaveProperty("value");
  });

  it("revealVotes changes room status to revealed", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.voting.revealVotes, { roomId, sessionId: "session-1" });

    const room = await t.run(async (ctx) => ctx.db.get(roomId));
    expect(room?.status).toBe("revealed");
  });

  it("getVoteResults returns values and average after reveal", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const p1 = await createParticipant(t, roomId, "session-1", "Tim");
    const p2 = await createParticipant(t, roomId, "session-2", "Alice");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, {
      participantId: p1,
      sessionId: "session-1",
      taskId,
      value: "5",
    });
    await t.mutation(api.voting.castVote, {
      participantId: p2,
      sessionId: "session-2",
      taskId,
      value: "8",
    });
    await t.mutation(api.voting.revealVotes, { roomId, sessionId: "session-1" });

    const results = await t.query(api.voting.getVoteResults, { roomId, taskId });
    expect(results).not.toBeNull();
    expect(results?.average).toBeCloseTo(6.5, 1);
    expect(results?.votes).toHaveLength(2);
  });

  it("getVoteResults returns null before reveal", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const taskId = await createTask(t, roomId);

    const results = await t.query(api.voting.getVoteResults, { roomId, taskId });
    expect(results).toBeNull();
  });

  it("resetVoting deletes votes and sets status back to voting", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const participantId = await createParticipant(t, roomId, "session-1", "Tim");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, {
      participantId,
      sessionId: "session-1",
      taskId,
      value: "5",
    });
    await t.mutation(api.voting.revealVotes, { roomId, sessionId: "session-1" });
    await t.mutation(api.voting.resetVoting, { roomId, sessionId: "session-1" });

    const room = await t.run(async (ctx) => ctx.db.get(roomId));
    expect(room?.status).toBe("voting");

    const status = await t.query(api.voting.getVoteStatus, { taskId });
    expect(status.every((entry) => !entry.hasVoted)).toBeTruthy();
  });

  it("castVote is rejected when room is in lobby status", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t, "lobby");
    const participantId = await createParticipant(t, roomId, "session-1", "Tim");
    const taskId = await createTask(t, roomId);

    await expect(
      t.mutation(api.voting.castVote, {
        participantId,
        sessionId: "session-1",
        taskId,
        value: "5",
      }),
    ).rejects.toThrow();
  });

  it("average is null when all votes are non-numeric", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const p1 = await createParticipant(t, roomId, "session-1", "Tim");
    const p2 = await createParticipant(t, roomId, "session-2", "Alice");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, {
      participantId: p1,
      sessionId: "session-1",
      taskId,
      value: "?",
    });
    await t.mutation(api.voting.castVote, {
      participantId: p2,
      sessionId: "session-2",
      taskId,
      value: "☕",
    });
    await t.mutation(api.voting.revealVotes, { roomId, sessionId: "session-1" });

    const results = await t.query(api.voting.getVoteResults, { roomId, taskId });
    expect(results?.average).toBeNull();
  });

  it("startVoting changes room status from lobby to voting", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t, "lobby");

    await t.mutation(api.voting.startVoting, { roomId, sessionId: "session-1" });

    const room = await t.run(async (ctx) => ctx.db.get(roomId));
    expect(room?.status).toBe("voting");
  });

  it("advanceToNextTask increments currentTaskIndex and sets status to voting", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t, "revealed");
    await createTask(t, roomId, "Story 1");
    await createTask(t, roomId, "Story 2");

    await t.mutation(api.voting.advanceToNextTask, { roomId, sessionId: "session-1" });

    const room = await t.run(async (ctx) => ctx.db.get(roomId));
    expect(room?.currentTaskIndex).toBe(1);
    expect(room?.status).toBe("voting");
  });
});
