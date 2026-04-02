import { type OptionalRestArgsOrSkip, useMutation, useQuery } from "convex/react";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";

const SESSION_KEY = "poker_session_id";

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

export function useSessionMutation<Ref extends FunctionReference<"mutation", "public">>(
  mutationRef: FunctionArgs<Ref> extends { sessionId: string } ? Ref : never,
) {
  const mutate = useMutation(mutationRef as Ref);
  const sessionId = useSessionId();

  return (args: Omit<FunctionArgs<Ref>, "sessionId">) => {
    const fullArgs = [{ ...args, sessionId } as FunctionArgs<Ref>] as OptionalRestArgs<Ref>;
    return mutate(...fullArgs);
  };
}

export function useSessionQuery<Ref extends FunctionReference<"query", "public">>(
  queryRef: FunctionArgs<Ref> extends { sessionId: string } ? Ref : never,
  args: Omit<FunctionArgs<Ref>, "sessionId">,
): FunctionReturnType<Ref> | undefined {
  const sessionId = useSessionId();
  const fullArgs = [{ ...args, sessionId } as FunctionArgs<Ref>] as OptionalRestArgsOrSkip<Ref>;
  return useQuery(queryRef as Ref, ...fullArgs);
}
