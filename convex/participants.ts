import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";
import { sessionMutation } from "./lib/sessions";

export const joinRoom = sessionMutation({
  args: {
    displayName: v.string(),
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_room_session", (q) =>
        q.eq("roomId", args.roomId).eq("sessionId", ctx.sessionId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        isConnected: true,
      });
      return existing._id;
    }

    return await ctx.db.insert("participants", {
      displayName: args.displayName,
      isConnected: true,
      joinedAt: Date.now(),
      roomId: args.roomId,
      sessionId: ctx.sessionId,
    });
  },
});

export const leaveRoom = sessionMutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_room_session", (q) =>
        q.eq("roomId", args.roomId).eq("sessionId", ctx.sessionId),
      )
      .unique();

    if (participant) {
      await ctx.db.patch(participant._id, { isConnected: false });
    }
  },
});

export const getParticipants = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect(),
});

export const takeoverSession = sessionMutation({
  args: {
    roomId: v.id("rooms"),
    targetParticipantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.targetParticipantId);
    if (!target) {
      throw new Error("Target participant not found");
    }
    if (target.roomId.toString() !== args.roomId.toString()) {
      throw new Error("Participant not in this room");
    }

    const oldParticipant = await ctx.db
      .query("participants")
      .withIndex("by_room_session", (q) =>
        q.eq("roomId", args.roomId).eq("sessionId", ctx.sessionId),
      )
      .unique();

    if (oldParticipant && oldParticipant._id !== args.targetParticipantId) {
      await ctx.db.patch(oldParticipant._id, { isConnected: false });
    }

    await ctx.db.patch(args.targetParticipantId, {
      isConnected: true,
      sessionId: ctx.sessionId,
    });
  },
});

export const heartbeat = sessionMutation({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_room_session", (q) =>
        q.eq("roomId", args.roomId).eq("sessionId", ctx.sessionId),
      )
      .unique();

    if (participant) {
      await ctx.db.patch(participant._id, { isConnected: true, lastHeartbeatAt: Date.now() });
    }
  },
});

export const markStaleOffline = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 60_000;
    const stale = await ctx.db
      .query("participants")
      .withIndex("by_isConnected_lastHeartbeatAt", (q) =>
        q.eq("isConnected", true).lt("lastHeartbeatAt", cutoff),
      )
      .collect();
    await Promise.all(stale.map((p) => ctx.db.patch(p._id, { isConnected: false })));
  },
});

export const toggleHost = sessionMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_room_session", (q) =>
        q.eq("roomId", args.roomId).eq("sessionId", ctx.sessionId),
      )
      .unique();

    if (!participant) {
      throw new Error("Participant not found");
    }

    const newIsHost = !(participant.isHost ?? false);

    // If toggling TO host: delete any existing vote for the current task
    if (newIsHost) {
      const room = await ctx.db.get(args.roomId);
      if (room) {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
          .collect();
        const sortedTasks = tasks.sort((a, b) => a.order - b.order);
        const currentTask = sortedTasks[room.currentTaskIndex] ?? null;

        if (currentTask) {
          const vote = await ctx.db
            .query("votes")
            .withIndex("by_task_participant", (q) =>
              q.eq("taskId", currentTask._id).eq("participantId", participant._id),
            )
            .unique();

          if (vote) {
            await ctx.db.delete(vote._id);
          }
        }
      }
    }

    await ctx.db.patch(participant._id, { isHost: newIsHost });
    return newIsHost;
  },
});

export const updateDisplayName = sessionMutation({
  args: {
    roomId: v.id("rooms"),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.displayName.trim();
    if (trimmed.length < 1 || trimmed.length > 30) {
      throw new Error("Display name must be 1-30 characters");
    }

    const participant = await ctx.db
      .query("participants")
      .withIndex("by_room_session", (q) =>
        q.eq("roomId", args.roomId).eq("sessionId", ctx.sessionId),
      )
      .unique();

    if (!participant) {
      throw new Error("Participant not found");
    }

    await ctx.db.patch(participant._id, { displayName: trimmed });
  },
});

export const removeParticipant = sessionMutation({
  args: {
    roomId: v.id("rooms"),
    targetParticipantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db
      .query("participants")
      .withIndex("by_room_session", (q) =>
        q.eq("roomId", args.roomId).eq("sessionId", ctx.sessionId),
      )
      .unique();

    if (!caller) {
      throw new Error("Caller not found");
    }
    if (!caller.isHost) {
      throw new Error("Only hosts can remove participants");
    }

    const target = await ctx.db.get(args.targetParticipantId);
    if (!target) {
      throw new Error("Target participant not found");
    }
    if (target.roomId.toString() !== args.roomId.toString()) {
      throw new Error("Target not in this room");
    }
    if (target._id.toString() === caller._id.toString()) {
      throw new Error("Cannot remove yourself");
    }

    // Delete all target's votes
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const task of tasks) {
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_task_participant", (q) =>
          q.eq("taskId", task._id).eq("participantId", target._id),
        )
        .collect();

      await Promise.all(votes.map((v) => ctx.db.delete(v._id)));
    }

    // Delete the participant
    await ctx.db.delete(target._id);
  },
});
