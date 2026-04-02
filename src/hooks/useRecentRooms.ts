import { useEffect, useState } from "react";

const STORAGE_KEY = "poker_recent_rooms";
const MAX_ROOMS = 5;

/** Bump when the stored shape changes so stale data is discarded. */
const SCHEMA_VERSION = 1;

export interface RecentRoom {
  roomCode: string;
  name: string;
  visitedAt: number;
  /** Schema version tag — older entries without it are silently dropped. */
  _v?: number;
}

function loadRooms(): RecentRoom[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown[] = JSON.parse(raw);
    // Keep only entries that match the current schema version (or have no version yet)
    return parsed.filter(
      (r): r is RecentRoom =>
        typeof r === "object" &&
        r !== null &&
        "roomCode" in r &&
        "name" in r &&
        ((r as RecentRoom)._v === undefined || (r as RecentRoom)._v === SCHEMA_VERSION),
    );
  } catch {
    return [];
  }
}

function saveRooms(rooms: RecentRoom[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    /* Ignore */
  }
}

export function useRecentRooms(): {
  recentRooms: RecentRoom[];
  trackRoom: (code: string, name: string) => void;
} {
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>(loadRooms);

  /** Called from Room.tsx when the room data loads. */
  const trackRoom = (roomCode: string, name: string) => {
    const entry: RecentRoom = { _v: SCHEMA_VERSION, name, roomCode, visitedAt: Date.now() };
    const updated = [
      entry,
      ...loadRooms().filter((r) => r.roomCode !== roomCode),
    ].slice(0, MAX_ROOMS);
    saveRooms(updated);
    setRecentRooms(updated);
  };

  return { recentRooms, trackRoom };
}

/**
 * Side-effect hook: tracks the given room in the recent-rooms list once
 * the room name is available.
 */
export function useTrackRoom(roomCode: string | undefined, roomName: string | undefined): void {
  useEffect(() => {
    if (!roomCode || !roomName) {
      return;
    }
    const entry: RecentRoom = { _v: SCHEMA_VERSION, name: roomName, roomCode, visitedAt: Date.now() };
    const updated = [
      entry,
      ...loadRooms().filter((r) => r.roomCode !== roomCode),
    ].slice(0, MAX_ROOMS);
    saveRooms(updated);
  }, [roomCode, roomName]);
}
