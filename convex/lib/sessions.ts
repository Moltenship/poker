import { customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { v } from "convex/values";

import { mutation, query } from "../_generated/server";

export const SessionIdArg = {
  sessionId: v.string(),
};

function validateSessionId(sessionId: string) {
  if (sessionId.trim() === "") {
    throw new Error("sessionId is required");
  }

  return sessionId;
}

export const sessionMutation = customMutation(mutation, {
  args: SessionIdArg,
  input: async (_ctx, { sessionId }) => ({
    ctx: { sessionId: validateSessionId(sessionId) },
    args: {},
  }),
});

export const sessionQuery = customQuery(query, {
  args: SessionIdArg,
  input: async (_ctx, { sessionId }) => ({
    ctx: { sessionId: validateSessionId(sessionId) },
    args: {},
  }),
});
