import { v } from "convex/values";
import { nanoid } from "nanoid";

import { internalMutation, mutation, query } from "./_generated/server";
import { sessionMutation, sessionQuery } from "./lib/sessions";

export const createRoom = sessionMutation({
  args: {
    cardSet: v.array(v.string()),
    jiraEnabled: v.optional(v.boolean()),
    jiraProjectKey: v.optional(v.string()),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const roomCode = nanoid(8);
    const roomId = await ctx.db.insert("rooms", {
      cardSet: args.cardSet,
      createdAt: Date.now(),
      createdBy: ctx.sessionId,
      currentTaskIndex: 0,
      jiraEnabled: args.jiraEnabled,
      jiraProjectKey: args.jiraProjectKey,
      name: args.name,
      roomCode,
      status: "lobby",
    });
    return { roomCode, roomId };
  },
});

export const getRoom = query({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("roomCode", args.roomCode))
      .unique();
    return room ?? null;
  },
});

export const getRoomById = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => await ctx.db.get(args.roomId),
});

export const setSprintFilter = mutation({
  args: {
    roomId: v.id("rooms"),
    sprintIds: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, { jiraSprintFilter: args.sprintIds });
  },
});

export const enableJiraOnAllRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").collect();
    let count = 0;
    for (const room of rooms) {
      if (!room.jiraEnabled) {
        await ctx.db.patch(room._id, { jiraEnabled: true });
        count++;
      }
    }
    return { total: rooms.length, updated: count };
  },
});

export const setTypeFilter = mutation({
  args: {
    roomId: v.id("rooms"),
    types: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, { jiraTypeFilter: args.types });
  },
});

export const updateCardSet = mutation({
  args: {
    cardSet: v.array(v.string()),
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (args.cardSet.length === 0) {
      throw new Error("Card set must have at least one card");
    }
    await ctx.db.patch(args.roomId, { cardSet: args.cardSet });
  },
});

export const deleteRoom = sessionMutation({
  args: {
    roomId: v.id("rooms"),
    confirmName: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const caller = await ctx.db
      .query("participants")
      .withIndex("by_room_session", (q) =>
        q.eq("roomId", args.roomId).eq("sessionId", ctx.sessionId),
      )
      .unique();

    if (!caller?.isHost) {
      throw new Error("Only a host can delete the room");
    }

    if (args.confirmName !== room.name) {
      throw new Error("Room name does not match");
    }

    // 1. Delete all votes in this room
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const task of tasks) {
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();

      await Promise.all(votes.map((vote) => ctx.db.delete(vote._id)));
    }

    // 2. Delete all tasks in this room
    await Promise.all(tasks.map((task) => ctx.db.delete(task._id)));

    // 3. Delete all participants in this room
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    await Promise.all(participants.map((p) => ctx.db.delete(p._id)));

    // 4. Delete the room itself
    await ctx.db.delete(args.roomId);
  },
});

export const listMyRooms = sessionQuery({
  args: {},
  handler: async (ctx) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", ctx.sessionId))
      .collect();

    const rooms = await Promise.all(participants.map((p) => ctx.db.get(p.roomId)));

    return rooms
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});
