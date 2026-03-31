import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    name: v.string(),
    roomCode: v.string(),
    cardSet: v.array(v.string()),
    jiraProjectKey: v.optional(v.string()),
    jiraEnabled: v.optional(v.boolean()),
    jiraSprintFilter: v.optional(v.array(v.number())),
    jiraTypeFilter: v.optional(v.array(v.string())),
    importStatus: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("loading"),
        v.literal("success"),
        v.literal("error")
      )
    ),
    importError: v.optional(v.string()),
    status: v.union(
      v.literal("lobby"),
      v.literal("voting"),
      v.literal("revealed")
    ),
    currentTaskIndex: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
  }).index("by_code", ["roomCode"]),

  participants: defineTable({
    roomId: v.id("rooms"),
    sessionId: v.string(),
    displayName: v.string(),
    isConnected: v.boolean(),
    lastHeartbeatAt: v.optional(v.number()),
    joinedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_session", ["roomId", "sessionId"])
    .index("by_session", ["sessionId"]),

  tasks: defineTable({
    roomId: v.id("rooms"),
    jiraKey: v.optional(v.string()),
    title: v.optional(v.string()),
    /** @deprecated Kept for existing documents only */
    description: v.optional(v.string()),
    /** @deprecated Kept for existing documents only */
    jiraUrl: v.optional(v.string()),
    /** @deprecated Kept for existing documents only */
    jiraStatus: v.optional(v.string()),
    /** @deprecated Kept for existing documents only */
    jiraType: v.optional(v.string()),
    /** @deprecated Kept for existing documents only */
    jiraSprintName: v.optional(v.string()),
    order: v.number(),
    /** @deprecated Kept for existing documents. Use Jira originalEstimate via API instead. */
    finalEstimate: v.optional(v.string()),
    hoursEstimate: v.optional(v.number()),
    jiraEstimateSyncStatus: v.optional(v.union(v.literal("syncing"), v.literal("synced"), v.literal("error"))),
    jiraEstimateSyncError: v.optional(v.string()),
    isManual: v.boolean(),
    isQuickVote: v.optional(v.boolean()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_jira_key", ["roomId", "jiraKey"]),

  votes: defineTable({
    roomId: v.id("rooms"),
    taskId: v.id("tasks"),
    participantId: v.id("participants"),
    value: v.optional(v.string()),
    submittedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_task_participant", ["taskId", "participantId"]),
});
