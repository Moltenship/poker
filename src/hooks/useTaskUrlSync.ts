import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import type { Id } from "../../convex/_generated/dataModel";

/**
 * Keeps the browser URL in sync with the server's current task.
 *
 * Only navigates when the server-side current task actually changes,
 * preventing unnecessary `replace` calls during re-renders.
 */
export function useTaskUrlSync(
  roomCode: string | undefined,
  room: unknown | undefined,
  tasks: unknown[] | undefined,
  currentTaskId: Id<"tasks"> | undefined | null,
  taskIdentifier: string | null,
): void {
  const navigate = useNavigate();
  const prevTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Don't navigate until data is loaded
    if (room === undefined || tasks === undefined) {
      return;
    }

    const currentId = currentTaskId ?? null;

    // Only navigate when the server's current task actually changed
    if (prevTaskIdRef.current === currentId) {
      return;
    }
    prevTaskIdRef.current = currentId;

    const targetPath = taskIdentifier
      ? `/room/${roomCode}/task/${taskIdentifier}`
      : `/room/${roomCode}`;

    navigate(targetPath, { replace: true });
  }, [currentTaskId, taskIdentifier, roomCode, navigate, room, tasks]);
}
