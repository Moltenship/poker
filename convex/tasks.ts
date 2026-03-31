import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { sessionMutation } from "./lib/sessions";

async function upsertImportedTasks(
  ctx: MutationCtx,
  args: {
    roomId: Id<"rooms">;
    tasks: Array<{
      jiraKey: string;
      title: string;
      description: string | null;
      jiraUrl: string | null;
    }>;
  }
) {
  const existingTasks = await ctx.db
    .query("tasks")
    .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
    .collect();
  let maxOrder =
    existingTasks.length > 0 ? Math.max(...existingTasks.map((t) => t.order)) : 0;

  for (const task of args.tasks) {
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_room_jira_key", (q) =>
        q.eq("roomId", args.roomId).eq("jiraKey", task.jiraKey)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: task.title,
        description: task.description ?? undefined,
        jiraUrl: task.jiraUrl ?? undefined,
      });
    } else {
      maxOrder += 1;
      await ctx.db.insert("tasks", {
        roomId: args.roomId,
        jiraKey: task.jiraKey,
        title: task.title,
        description: task.description ?? undefined,
        jiraUrl: task.jiraUrl ?? undefined,
        order: maxOrder,
        isManual: false,
      });
    }
  }
}

export const ensureQuickVoteTask = sessionMutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const existing = tasks.find((t) => t.isQuickVote);
    if (existing) {
      const sorted = tasks.sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((t) => t._id === existing._id);
      await ctx.db.patch(args.roomId, { currentTaskIndex: idx });
      return existing._id;
    }
    const id = await ctx.db.insert("tasks", {
      roomId: args.roomId,
      title: "Quick Vote",
      order: 0,
      isManual: false,
      isQuickVote: true,
    });
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const sorted = allTasks.sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((t) => t._id === id);
    await ctx.db.patch(args.roomId, { currentTaskIndex: idx });
    return id;
  },
});

export const addTask = sessionMutation({
  args: {
    roomId: v.id("rooms"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const maxOrder = existing.length > 0 ? Math.max(...existing.map((t) => t.order)) : 0;

    return await ctx.db.insert("tasks", {
      roomId: args.roomId,
      title: args.title,
      description: args.description,
      order: maxOrder + 1,
      isManual: true,
    });
  },
});

export const importTasks = mutation({
  args: {
    roomId: v.id("rooms"),
    tasks: v.array(
      v.object({
        jiraKey: v.string(),
        title: v.string(),
        description: v.union(v.string(), v.null()),
        jiraUrl: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await upsertImportedTasks(ctx, args);
  },
});

export const importTasksInternal = internalMutation({
  args: {
    roomId: v.id("rooms"),
    tasks: v.array(
      v.object({
        jiraKey: v.string(),
        title: v.string(),
        description: v.union(v.string(), v.null()),
        jiraUrl: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await upsertImportedTasks(ctx, args);
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
    if (!room) return null;
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
    taskId: v.id("tasks"),
    hours: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { hoursEstimate: args.hours });
  },
});

export const setFinalEstimate = sessionMutation({
  args: {
    taskId: v.id("tasks"),
    estimate: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { finalEstimate: args.estimate });
  },
});

export const setCurrentTask = sessionMutation({
  args: {
    roomId: v.id("rooms"),
    taskIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

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
    taskId: v.id("tasks"),
    newOrder: v.number(),
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
    if (!task) throw new Error("Task not found");
    if (!task.isManual) throw new Error("Cannot delete imported tasks");

    const roomId = task.roomId;
    await ctx.db.delete(args.taskId);

    const room = await ctx.db.get(roomId);
    if (!room) return;

    if (room.status === "voting" || room.status === "revealed") {
      const remaining = await ctx.db
        .query("tasks")
        .withIndex("by_room", (q) => q.eq("roomId", roomId))
        .collect();
      const sorted = remaining.sort((a, b) => a.order - b.order);

      if (sorted.length === 0) {
        await ctx.db.insert("tasks", {
          roomId,
          title: "Quick Vote",
          order: 0,
          isManual: false,
          isQuickVote: true,
        });
        await ctx.db.patch(roomId, { currentTaskIndex: 0 });
      } else if (room.currentTaskIndex >= sorted.length) {
        await ctx.db.patch(roomId, { currentTaskIndex: sorted.length - 1 });
      }
    }
  },
});
