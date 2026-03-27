import { useMutation, useQuery } from "convex/react";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import type { OptionalRestArgsOrSkip } from "convex/react";

const SESSION_KEY = "poker_session_id";

type SessionFunction<Type extends "query" | "mutation"> = FunctionReference<
  Type,
  "public",
  { sessionId: string } & Record<string, unknown>
>;

type WithoutSessionId<T> = T extends { sessionId: string }
  ? Omit<T, "sessionId">
  : T;

function createSessionId() {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }

  throw new Error("crypto.randomUUID is not available");
}

export function getSessionId(): string {
  const existingSessionId = localStorage.getItem(SESSION_KEY);

  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = createSessionId();
  localStorage.setItem(SESSION_KEY, newSessionId);
  return newSessionId;
}

export function useSessionId(): string {
  return getSessionId();
}

export function useSessionMutation<Mutation extends SessionFunction<"mutation">>(
  mutationRef: Mutation,
) {
  const mutate = useMutation(mutationRef);
  const sessionId = useSessionId();

  return (args: WithoutSessionId<FunctionArgs<Mutation>>) => {
    const nextArgs = [
      { ...args, sessionId } as FunctionArgs<Mutation>,
    ] as OptionalRestArgs<Mutation>;

    return mutate(...nextArgs);
  };
}

export function useSessionQuery<Query extends SessionFunction<"query">>(
  queryRef: Query,
  args: WithoutSessionId<FunctionArgs<Query>>,
): FunctionReturnType<Query> | undefined {
  const sessionId = useSessionId();
  const nextArgs = [
    { ...args, sessionId } as FunctionArgs<Query>,
  ] as OptionalRestArgsOrSkip<Query>;

  return useQuery(queryRef, ...nextArgs);
}
