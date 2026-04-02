import { useCallback, useEffect, useMemo, useState } from "react";

import type { Id } from "../../convex/_generated/dataModel";

interface StoredIdentity {
  participantId: Id<"participants">;
  displayName: string;
}

function getStorageKey(roomCode: string) {
  return `poker_room_${roomCode}`;
}

function readIdentity(roomCode: string): StoredIdentity | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawIdentity = window.localStorage.getItem(getStorageKey(roomCode));
  if (!rawIdentity) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawIdentity) as Partial<StoredIdentity>;
    if (typeof parsed?.participantId === "string" && typeof parsed?.displayName === "string") {
      return {
        displayName: parsed.displayName,
        participantId: parsed.participantId as Id<"participants">,
      };
    }
  } catch {
    window.localStorage.removeItem(getStorageKey(roomCode));
  }

  return null;
}

export function useIdentity(roomCode: string) {
  const storageKey = useMemo(() => getStorageKey(roomCode), [roomCode]);
  const [identity, setIdentityState] = useState<StoredIdentity | null>(() =>
    readIdentity(roomCode),
  );

  useEffect(() => {
    setIdentityState(readIdentity(roomCode));
  }, [roomCode]);

  const setIdentity = useCallback(
    (participantId: Id<"participants">, displayName: string) => {
      const nextIdentity = { displayName, participantId };
      window.localStorage.setItem(storageKey, JSON.stringify(nextIdentity));
      setIdentityState(nextIdentity);
    },
    [storageKey],
  );

  const clearIdentity = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setIdentityState(null);
  }, [storageKey]);

  return {
    clearIdentity,
    displayName: identity?.displayName ?? null,
    participantId: identity?.participantId ?? null,
    setIdentity,
  };
}
