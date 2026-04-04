import type { Id } from "@convex/_generated/dataModel";
import { useEffect } from "react";

/** How often (ms) to send a heartbeat to keep the participant connected. */
const HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * Sends periodic heartbeats while the room is active and calls
 * `leaveFn` on unmount so the server can mark the participant offline.
 */
export function useHeartbeat(
  roomId: Id<"rooms"> | undefined,
  heartbeatFn: (args: { roomId: Id<"rooms"> }) => Promise<unknown>,
  leaveFn: (args: { roomId: Id<"rooms"> }) => Promise<unknown>,
): void {
  useEffect(() => {
    if (!roomId) {
      return;
    }
    const send = () => heartbeatFn({ roomId }).catch(() => {});
    send();
    const interval = setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      leaveFn({ roomId }).catch(() => {});
    };
  }, [roomId, heartbeatFn, leaveFn]);
}
