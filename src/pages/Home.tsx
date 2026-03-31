import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIBONACCI, FIBONACCI_EXTENDED } from "@/lib/cards";
import { useSessionMutation } from "@/hooks/useSession";
import { api } from "../../convex/_generated/api";
import { ChevronRight } from "lucide-react";

type RecentRoom = {
  roomCode: string;
  name: string;
  visitedAt: number;
};

function extractRoomCode(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{8}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/room\/([a-zA-Z0-9_-]{8})/);
    if (match) return match[1];
  } catch { /* not a URL */ }
  const pathMatch = trimmed.match(/\/room\/([a-zA-Z0-9_-]{8})/);
  if (pathMatch) return pathMatch[1];
  return null;
}

export default function Home() {
  const navigate = useNavigate();
  const createRoom = useSessionMutation((api as any).rooms.createRoom);

  const [roomName, setRoomName] = useState("");
  const [cardSetType, setCardSetType] = useState<"fibonacci" | "extended" | "custom">("fibonacci");
  const [customCards, setCustomCards] = useState("");
  const [createError, setCreateError] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("poker_recent_rooms");
      if (stored) setRecentRooms(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const joinCode = extractRoomCode(joinInput);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!roomName.trim()) {
      setCreateError("Room name is required.");
      return;
    }

    let cardSet: string[] = [];
    if (cardSetType === "fibonacci") cardSet = FIBONACCI.values;
    else if (cardSetType === "extended") cardSet = FIBONACCI_EXTENDED.values;
    else {
      cardSet = customCards.split(",").map((c) => c.trim()).filter((c) => c.length > 0);
      if (cardSet.length === 0) {
        setCreateError("Please provide at least one custom card value.");
        return;
      }
    }

    try {
      const { roomCode } = await createRoom({ name: roomName.trim(), cardSet });
      const newRoom = { roomCode, name: roomName.trim(), visitedAt: Date.now() };
      const updatedRooms = [newRoom, ...recentRooms.filter(r => r.roomCode !== roomCode)].slice(0, 5);
      localStorage.setItem("poker_recent_rooms", JSON.stringify(updatedRooms));
      navigate(`/room/${roomCode}`);
    } catch {
      setCreateError("Failed to create room. Please try again.");
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode) navigate(`/room/${joinCode}`);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-10">
        <h1 className="text-lg font-semibold tracking-tight">Planning Poker</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Estimate tasks collaboratively with your team.
        </p>
      </div>

      {/* Join */}
      <section className="mb-8">
        <h2 className="mb-3 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Join a room</h2>
        <form onSubmit={handleJoinRoom} className="flex gap-2">
          <Input
            placeholder="Room code or invite link"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            className="flex-1 h-8 text-[13px] font-mono"
          />
          <Button type="submit" size="sm" disabled={!joinCode} className="h-8 px-3 text-[13px]">
            Join
          </Button>
        </form>
      </section>

      {/* Recent */}
      {recentRooms.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Recent</h2>
          <div className="rounded-lg bg-accent/50 overflow-hidden">
            {recentRooms.slice(0, 5).map((room, i) => (
              <button
                key={room.roomCode}
                className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-accent group ${i > 0 ? "border-t border-border/30" : ""}`}
                onClick={() => navigate(`/room/${room.roomCode}`)}
              >
                <span className="text-[13px] text-foreground/90 truncate">{room.name}</span>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <code className="text-[11px] text-muted-foreground font-mono">{room.roomCode}</code>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mb-8 border-t border-border/30" />

      {/* Create */}
      <section>
        <h2 className="mb-4 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Create a room</h2>
        <form onSubmit={handleCreateRoom} className="space-y-4">
          {createError && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {createError}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="room-name" className="text-[13px] font-medium">
              Room Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="room-name"
              placeholder="e.g. Sprint 42 Planning"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="h-8 text-[13px]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="card-set" className="text-[13px] font-medium">Card Set</label>
            <Select value={cardSetType} onValueChange={(val: any) => setCardSetType(val)}>
              <SelectTrigger id="card-set" aria-label="Card Set" className="h-8 text-[13px]">
                <SelectValue placeholder="Select card set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fibonacci">Fibonacci (1, 2, 3, 5, 8...)</SelectItem>
                <SelectItem value="extended">Extended (0, ½, 1... ?, ☕)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {cardSetType === "custom" && (
            <div className="space-y-1.5">
              <label htmlFor="custom-cards" className="text-[13px] font-medium">Custom Card Values</label>
              <Input
                id="custom-cards"
                placeholder="Comma separated: S, M, L, XL"
                value={customCards}
                onChange={(e) => setCustomCards(e.target.value)}
                className="h-8 text-[13px]"
              />
            </div>
          )}

          <Button type="submit" className="w-full h-8 text-[13px]">
            Create Room
          </Button>
        </form>
      </section>
    </div>
  );
}
