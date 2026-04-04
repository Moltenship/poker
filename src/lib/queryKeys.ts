import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
/**
 * Query key factory for TanStack Query + Convex adapter.
 *
 * The adapter generates keys in the shape:
 *   ["convexQuery",  functionName, args]   — reactive queries
 *   ["convexAction", functionName, args]   — one-shot actions
 *
 * This factory mirrors that structure so keys can be used with
 * `queryClient.invalidateQueries()`, `removeQueries()`, etc.
 *
 * Each domain follows TkDodo's hierarchy:
 *   all  →  lists / details  →  specific(params)
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */
import { getFunctionName } from "convex/server";

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
export const roomKeys = {
  all: ["convexQuery", getFunctionName(api.rooms.getRoom)] as const,
  detail: (roomCode: string) => [...roomKeys.all, { roomCode }] as const,
};

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
export const taskKeys = {
  lists: () => ["convexQuery", getFunctionName(api.tasks.getTasksForRoom)] as const,
  list: (roomId: Id<"rooms">) => [...taskKeys.lists(), { roomId }] as const,

  currents: () => ["convexQuery", getFunctionName(api.tasks.getCurrentTask)] as const,
  current: (roomId: Id<"rooms">) => [...taskKeys.currents(), { roomId }] as const,
};

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------
export const participantKeys = {
  all: ["convexQuery", getFunctionName(api.participants.getParticipants)] as const,
  forRoom: (roomId: Id<"rooms">) => [...participantKeys.all, { roomId }] as const,
};

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------
export const votingKeys = {
  statuses: () => ["convexQuery", getFunctionName(api.voting.getVoteStatus)] as const,
  status: (taskId: Id<"tasks">) => [...votingKeys.statuses(), { taskId }] as const,

  myVotes: () => ["convexQuery", getFunctionName(api.voting.getMyVote)] as const,
  myVote: (participantId: Id<"participants">, taskId: Id<"tasks">) =>
    [...votingKeys.myVotes(), { participantId, taskId }] as const,

  results: () => ["convexQuery", getFunctionName(api.voting.getVoteResults)] as const,
  result: (roomId: Id<"rooms">, taskId: Id<"tasks">) =>
    [...votingKeys.results(), { roomId, taskId }] as const,
};

// ---------------------------------------------------------------------------
// Jira  (actions — non-reactive, cached by TanStack Query)
// ---------------------------------------------------------------------------
export const jiraKeys = {
  sprints: () => ["convexAction", getFunctionName(api.jira.fetchJiraSprints)] as const,
  sprintsByProject: (projectKey: string) => [...jiraKeys.sprints(), { projectKey }] as const,

  comments: () => ["convexAction", getFunctionName(api.jira.fetchTaskComments)] as const,
  commentsByKey: (jiraKey: string) => [...jiraKeys.comments(), { jiraKey }] as const,

  details: () => ["convexAction", getFunctionName(api.jira.fetchTaskDetails)] as const,
  detailsByKeys: (jiraKeys_: string[]) => [...jiraKeys.details(), { jiraKeys: jiraKeys_ }] as const,
};
