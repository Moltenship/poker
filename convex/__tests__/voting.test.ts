/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

async function createTestRoom(t: TestConvex<typeof schema>, status: "lobby" | "voting" | "revealed" = "voting") {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("rooms", {
      name: "Test Room",
      roomCode: "TESTCODE",
      cardSet: ["1", "2", "3", "5", "8", "13"],
      status,
      currentTaskIndex: 0,
      createdBy: "session-1",
      createdAt: Date.now(),
    });
  });
}

async function createParticipant(t: TestConvex<typeof schema>, roomId: Id<"rooms">, sessionId: string, displayName: string) {
  return await t.mutation(api.participants.joinRoom, { sessionId, roomId, displayName });
}

async function createTask(t: TestConvex<typeof schema>, roomId: Id<"rooms">, title = "Story 1") {
  return await t.mutation(api.tasks.addTask, { sessionId: "session-1", roomId, title });
}

describe("voting", () => {
  test("castVote stores vote for participant", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const participantId = await createParticipant(t, roomId, "session-1", "Tim");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, { sessionId: "session-1", taskId, participantId, value: "5" });

    const status = await t.query(api.voting.getVoteStatus, { taskId });
    const timsStatus = status.find((entry) => entry.participantId === participantId);
    expect(timsStatus?.hasVoted).toBe(true);
  });

  test("castVote upserts when a participant changes vote", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const participantId = await createParticipant(t, roomId, "session-1", "Tim");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, { sessionId: "session-1", taskId, participantId, value: "5" });
    await t.mutation(api.voting.castVote, { sessionId: "session-1", taskId, participantId, value: "8" });

    const status = await t.query(api.voting.getVoteStatus, { taskId });
    expect(status.filter((entry) => entry.participantId === participantId)).toHaveLength(1);
  });

  test("getVoteStatus does not reveal vote values before reveal", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const participantId = await createParticipant(t, roomId, "session-1", "Tim");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, { sessionId: "session-1", taskId, participantId, value: "5" });

    const status = await t.query(api.voting.getVoteStatus, { taskId });
    const timsStatus = status.find((entry) => entry.participantId === participantId);
    expect(timsStatus?.hasVoted).toBe(true);
    expect(timsStatus).not.toHaveProperty("value");
  });

  test("revealVotes changes room status to revealed", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.voting.revealVotes, { sessionId: "session-1", roomId });

    const room = await t.run(async (ctx) => ctx.db.get(roomId));
    expect(room?.status).toBe("revealed");
  });

  test("getVoteResults returns values and average after reveal", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const p1 = await createParticipant(t, roomId, "session-1", "Tim");
    const p2 = await createParticipant(t, roomId, "session-2", "Alice");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, { sessionId: "session-1", taskId, participantId: p1, value: "5" });
    await t.mutation(api.voting.castVote, { sessionId: "session-2", taskId, participantId: p2, value: "8" });
    await t.mutation(api.voting.revealVotes, { sessionId: "session-1", roomId });

    const results = await t.query(api.voting.getVoteResults, { taskId, roomId });
    expect(results).not.toBeNull();
    expect(results?.average).toBeCloseTo(6.5, 1);
    expect(results?.votes).toHaveLength(2);
  });

  test("getVoteResults returns null before reveal", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const taskId = await createTask(t, roomId);

    const results = await t.query(api.voting.getVoteResults, { taskId, roomId });
    expect(results).toBeNull();
  });

  test("resetVoting deletes votes and sets status back to voting", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const participantId = await createParticipant(t, roomId, "session-1", "Tim");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, { sessionId: "session-1", taskId, participantId, value: "5" });
    await t.mutation(api.voting.revealVotes, { sessionId: "session-1", roomId });
    await t.mutation(api.voting.resetVoting, { sessionId: "session-1", roomId });

    const room = await t.run(async (ctx) => ctx.db.get(roomId));
    expect(room?.status).toBe("voting");

    const status = await t.query(api.voting.getVoteStatus, { taskId });
    expect(status.every((entry) => !entry.hasVoted)).toBe(true);
  });

  test("castVote is rejected when room is in lobby status", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t, "lobby");
    const participantId = await createParticipant(t, roomId, "session-1", "Tim");
    const taskId = await createTask(t, roomId);

    await expect(
      t.mutation(api.voting.castVote, { sessionId: "session-1", taskId, participantId, value: "5" }),
    ).rejects.toThrow();
  });

  test("average is null when all votes are non-numeric", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const p1 = await createParticipant(t, roomId, "session-1", "Tim");
    const p2 = await createParticipant(t, roomId, "session-2", "Alice");
    const taskId = await createTask(t, roomId);

    await t.mutation(api.voting.castVote, { sessionId: "session-1", taskId, participantId: p1, value: "?" });
    await t.mutation(api.voting.castVote, { sessionId: "session-2", taskId, participantId: p2, value: "☕" });
    await t.mutation(api.voting.revealVotes, { sessionId: "session-1", roomId });

    const results = await t.query(api.voting.getVoteResults, { taskId, roomId });
    expect(results?.average).toBeNull();
  });

  test("startVoting changes room status from lobby to voting", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t, "lobby");

    await t.mutation(api.voting.startVoting, { sessionId: "session-1", roomId });

    const room = await t.run(async (ctx) => ctx.db.get(roomId));
    expect(room?.status).toBe("voting");
  });

  test("advanceToNextTask increments currentTaskIndex and sets status to voting", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t, "revealed");
    await createTask(t, roomId, "Story 1");
    await createTask(t, roomId, "Story 2");

    await t.mutation(api.voting.advanceToNextTask, { sessionId: "session-1", roomId });

    const room = await t.run(async (ctx) => ctx.db.get(roomId));
    expect(room?.currentTaskIndex).toBe(1);
    expect(room?.status).toBe("voting");
  });
});
