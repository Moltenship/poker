import { useConvexMutation } from "@convex-dev/react-query";
import type { FunctionArgs, FunctionReference, OptionalRestArgs } from "convex/server";

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
  const mutate = useConvexMutation(mutationRef as Ref);
  const sessionId = useSessionId();

  return (args: Omit<FunctionArgs<Ref>, "sessionId">) => {
    const fullArgs = [{ ...args, sessionId } as FunctionArgs<Ref>] as OptionalRestArgs<Ref>;
    return mutate(...fullArgs);
  };
}
