import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { type MutationCtx, query } from "./_generated/server";
import { sessionMutation } from "./lib/sessions";

function parseCardValue(value: string): number | null {
  if (value === "½") {
    return 0.5;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function calculateAverage(votes: string[]) {
  const numericValues = votes
    .map(parseCardValue)
    .filter((value): value is number => value !== null);
  if (numericValues.length === 0) {
    return { average: null, numericCount: 0, totalVotes: votes.length };
  }

  return {
    average: numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length,
    numericCount: numericValues.length,
    totalVotes: votes.length,
  };
}

async function getSortedTasksForRoom(ctx: MutationCtx, roomId: Id<"rooms">) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
  return tasks.sort((a, b) => a.order - b.order);
}

export const startVoting = sessionMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.status !== "lobby") {
      throw new Error("Room is not in lobby status");
    }

    await ctx.db.patch(args.roomId, { status: "voting" });
  },
});

export const castVote = sessionMutation({
  args: {
    participantId: v.id("participants"),
    taskId: v.id("tasks"),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const room = await ctx.db.get(task.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.status !== "voting") {
      throw new Error(`Cannot cast vote when room is in ${room.status} status`);
    }

    const participant = await ctx.db.get(args.participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }
    if (participant.roomId !== task.roomId) {
      throw new Error("Participant is not in the task room");
    }

    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_task_participant", (q) =>
        q.eq("taskId", args.taskId).eq("participantId", args.participantId),
      )
      .unique();

    if (existingVote) {
      await ctx.db.patch(existingVote._id, {
        submittedAt: Date.now(),
        value: args.value,
      });
      return existingVote._id;
    }

    return await ctx.db.insert("votes", {
      participantId: args.participantId,
      roomId: task.roomId,
      submittedAt: Date.now(),
      taskId: args.taskId,
      value: args.value,
    });
  },
});

export const removeVote = sessionMutation({
  args: {
    participantId: v.id("participants"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const existingVote = await ctx.db
      .query("votes")
      .withIndex("by_task_participant", (q) =>
        q.eq("taskId", args.taskId).eq("participantId", args.participantId),
      )
      .unique();

    if (existingVote) {
      await ctx.db.delete(existingVote._id);
    }
  },
});

export const getMyVote = query({
  args: { participantId: v.id("participants"), taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query("votes")
      .withIndex("by_task_participant", (q) =>
        q.eq("taskId", args.taskId).eq("participantId", args.participantId),
      )
      .unique();
    return vote?.value ?? null;
  },
});

export const getVoteStatus = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", task.roomId))
      .collect();
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    const votedParticipantIds = new Set(votes.map((vote) => vote.participantId.toString()));

    return participants.map((participant) => ({
      hasVoted: votedParticipantIds.has(participant._id.toString()),
      participantId: participant._id,
    }));
  },
});

export const getVoteResults = query({
  args: { roomId: v.id("rooms"), taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "revealed") {
      return null;
    }

    const task = await ctx.db.get(args.taskId);
    if (!task || task.roomId !== args.roomId) {
      return null;
    }

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    const { average, numericCount, totalVotes } = calculateAverage(
      votes.map((vote) => vote.value ?? ""),
    );

    return {
      average,
      numericCount,
      totalVotes,
      votes: votes.map((vote) => ({
        participantId: vote.participantId,
        value: vote.value,
      })),
    };
  },
});

export const revealVotes = sessionMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    await ctx.db.patch(args.roomId, { status: "revealed" });

    // Mark the current task as estimated
    const tasks = await getSortedTasksForRoom(ctx, args.roomId);
    const currentTask = tasks[room.currentTaskIndex] ?? null;
    if (currentTask) {
      await ctx.db.patch(currentTask._id, { isEstimated: true });
    }
  },
});

export const resetVoting = sessionMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const tasks = await getSortedTasksForRoom(ctx, args.roomId);
    const currentTask = tasks[room.currentTaskIndex] ?? null;

    if (currentTask) {
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_task", (q) => q.eq("taskId", currentTask._id))
        .collect();

      await Promise.all(votes.map((vote) => ctx.db.delete(vote._id)));
    }

    await ctx.db.patch(args.roomId, { status: "voting" });
  },
});

export const advanceToNextTask = sessionMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const tasks = await getSortedTasksForRoom(ctx, args.roomId);
    const currentTask = tasks[room.currentTaskIndex] ?? null;

    if (currentTask) {
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_task", (q) => q.eq("taskId", currentTask._id))
        .collect();
      await Promise.all(votes.map((vote) => ctx.db.delete(vote._id)));
    }

    const nextTaskIndex = room.currentTaskIndex + 1;
    if (nextTaskIndex >= tasks.length) {
      throw new Error("No more tasks");
    }

    await ctx.db.patch(args.roomId, {
      currentTaskIndex: nextTaskIndex,
      status: "voting",
    });
  },
});
