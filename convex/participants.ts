import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { sessionMutation } from "./lib/sessions";

export const joinRoom = sessionMutation({
  args: {
    roomId: v.id("rooms"),
    displayName: v.string(),
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
        isConnected: true,
        displayName: args.displayName,
      });
      return existing._id;
    }

    return await ctx.db.insert("participants", {
      roomId: args.roomId,
      sessionId: ctx.sessionId,
      displayName: args.displayName,
      isConnected: true,
      joinedAt: Date.now(),
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
  handler: async (ctx, args) => {
    return await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
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
      sessionId: ctx.sessionId,
      isConnected: true,
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
        q.eq("isConnected", true).lt("lastHeartbeatAt", cutoff)
      )
      .collect();
    await Promise.all(stale.map((p) => ctx.db.patch(p._id, { isConnected: false })));
  },
});
