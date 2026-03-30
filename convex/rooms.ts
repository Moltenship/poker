import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { sessionMutation, sessionQuery } from "./lib/sessions";
import { nanoid } from "nanoid";

export const createRoom = sessionMutation({
  args: {
    name: v.string(),
    cardSet: v.array(v.string()),
    jiraProjectKey: v.optional(v.string()),
    jiraEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const roomCode = nanoid(8);
    const roomId = await ctx.db.insert("rooms", {
      name: args.name,
      roomCode,
      cardSet: args.cardSet,
      jiraProjectKey: args.jiraProjectKey,
      jiraEnabled: args.jiraEnabled,
      status: "lobby",
      currentTaskIndex: 0,
      createdBy: ctx.sessionId,
      createdAt: Date.now(),
    });
    return { roomId, roomCode };
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
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  },
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

export const listMyRooms = sessionQuery({
  args: {},
  handler: async (ctx) => {
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", ctx.sessionId))
      .collect();

    const rooms = await Promise.all(
      participants.map((p) => ctx.db.get(p.roomId))
    );

    return rooms
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});
