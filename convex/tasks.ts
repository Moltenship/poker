import { v } from "convex/values";

import { query } from "./_generated/server";
import { sessionMutation } from "./lib/sessions";

export const addTask = sessionMutation({
  args: {
    roomId: v.id("rooms"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((t) => t.order)) : 0;

    return await ctx.db.insert("tasks", {
      isManual: true,
      order: maxOrder + 1,
      roomId: args.roomId,
      title: args.title,
    });
  },
});

export const getTasksForRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    return tasks.sort((a, b) => a.order - b.order);
  },
});

export const getTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => ctx.db.get(args.taskId),
});

export const getCurrentTask = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      return null;
    }
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const sorted = tasks.sort((a, b) => a.order - b.order);
    return sorted[room.currentTaskIndex] ?? null;
  },
});

export const setHoursEstimate = sessionMutation({
  args: {
    hours: v.number(),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { hoursEstimate: args.hours });
  },
});

export const setCurrentTask = sessionMutation({
  args: {
    roomId: v.id("rooms"),
    taskIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const sorted = tasks.sort((a, b) => a.order - b.order);

    if (args.taskIndex < 0 || args.taskIndex >= sorted.length) {
      throw new Error(`Task index ${args.taskIndex} out of range (${sorted.length} tasks)`);
    }

    // Clear votes for the task we're leaving
    const currentTask = sorted[room.currentTaskIndex];
    if (currentTask && args.taskIndex !== room.currentTaskIndex) {
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_task", (q) => q.eq("taskId", currentTask._id))
        .collect();
      for (const vote of votes) {
        await ctx.db.delete(vote._id);
      }
    }

    await ctx.db.patch(args.roomId, {
      currentTaskIndex: args.taskIndex,
      status: "voting",
    });
  },
});

export const reorderTask = sessionMutation({
  args: {
    newOrder: v.number(),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { order: args.newOrder });
  },
});

export const clearTasks = sessionMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }
    await ctx.db.patch(args.roomId, { currentTaskIndex: 0, status: "lobby" });
  },
});

export const deleteTask = sessionMutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }
    if (!task.isManual) {
      throw new Error("Cannot delete imported tasks");
    }

    const { roomId } = task;
    await ctx.db.delete(args.taskId);

    const room = await ctx.db.get(roomId);
    if (!room) {
      return;
    }

    if (room.status === "voting" || room.status === "revealed") {
      const remaining = await ctx.db
        .query("tasks")
        .withIndex("by_room", (q) => q.eq("roomId", roomId))
        .collect();
      const sorted = remaining.sort((a, b) => a.order - b.order);

      if (sorted.length === 0) {
        await ctx.db.patch(roomId, { currentTaskIndex: 0, status: "lobby" });
      } else if (room.currentTaskIndex >= sorted.length) {
        await ctx.db.patch(roomId, { currentTaskIndex: sorted.length - 1 });
      }
    }
  },
});
