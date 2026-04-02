import { ChevronRight } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecentRooms } from "@/hooks/useRecentRooms";
import { useSessionMutation } from "@/hooks/useSession";
import { FIBONACCI, FIBONACCI_EXTENDED } from "@/lib/cards";

import { api } from "../../convex/_generated/api";

function extractRoomCode(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{8}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/room\/([a-zA-Z0-9_-]{8})/);
    if (match) {
      return match[1];
    }
  } catch {
    /* Not a URL */
  }
  const pathMatch = trimmed.match(/\/room\/([a-zA-Z0-9_-]{8})/);
  if (pathMatch) {
    return pathMatch[1];
  }
  return null;
}

export default function Home() {
  const navigate = useNavigate();
  const createRoom = useSessionMutation(api.rooms.createRoom);

  const [roomName, setRoomName] = useState("");
  const [projectKey, setProjectKey] = useState("BRV");
  const [cardSetType, setCardSetType] = useState<"fibonacci" | "extended" | "custom">("fibonacci");
  const [customCards, setCustomCards] = useState("");
  const [createError, setCreateError] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const { recentRooms } = useRecentRooms();

  const joinCode = extractRoomCode(joinInput);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!roomName.trim()) {
      setCreateError("Room name is required.");
      return;
    }

    let cardSet: string[] = [];
    if (cardSetType === "fibonacci") {
      cardSet = FIBONACCI.values;
    } else if (cardSetType === "extended") {
      cardSet = FIBONACCI_EXTENDED.values;
    } else {
      cardSet = customCards
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (cardSet.length === 0) {
        setCreateError("Please provide at least one custom card value.");
        return;
      }
    }

    try {
      const { roomCode } = await createRoom({
        cardSet,
        jiraProjectKey: projectKey.trim().toUpperCase() || undefined,
        name: roomName.trim(),
      });
      navigate(`/room/${roomCode}`);
    } catch {
      setCreateError("ERROR! Failed to create room. Please try again. ");
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode) {
      navigate(`/room/${joinCode}`);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-10">
        <h1 className="text-lg font-semibold tracking-tight">Planning Poker</h1>
        <p className="text-muted-foreground mt-1 text-[13px]">
          Estimate tasks collaboratively with your team.
        </p>
      </div>

      {/* Join */}
      <section className="mb-8">
        <h2 className="text-muted-foreground mb-3 text-[11px] font-medium tracking-widest uppercase">
          Join a room
        </h2>
        <form onSubmit={handleJoinRoom} className="flex gap-2">
          <Input
            placeholder="Room code or invite link"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            className="h-8 flex-1 font-mono text-[13px]"
          />
          <Button type="submit" size="sm" disabled={!joinCode} className="h-8 px-3 text-[13px]">
            Join
          </Button>
        </form>
      </section>

      {/* Recent */}
      {recentRooms.length > 0 && (
        <section className="mb-8">
          <h2 className="text-muted-foreground mb-2 text-[11px] font-medium tracking-widest uppercase">
            Your rooms
          </h2>
          <div className="bg-accent/50 overflow-hidden rounded-lg">
            {recentRooms.slice(0, 5).map((room, i) => (
              <button
                key={room.roomCode}
                className={`hover:bg-accent group flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${i > 0 ? "border-border/30 border-t" : ""}`}
                onClick={() => navigate(`/room/${room.roomCode}`)}
              >
                <span className="text-foreground/90 truncate text-[13px]">{room.name}</span>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <code className="text-muted-foreground font-mono text-[11px]">
                    {room.roomCode}
                  </code>
                  <ChevronRight className="text-muted-foreground/40 group-hover:text-muted-foreground h-3 w-3 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="border-border/30 mb-8 border-t" />

      {/* Create */}
      <section>
        <h2 className="text-muted-foreground mb-4 text-[11px] font-medium tracking-widest uppercase">
          Create a room
        </h2>
        <form onSubmit={handleCreateRoom} className="space-y-4">
          {createError && (
            <div className="border-destructive/20 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-[13px]">
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
            <label htmlFor="project-key" className="text-[13px] font-medium">
              Jira Project Key
            </label>
            <Input
              id="project-key"
              placeholder="e.g. BRV"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
              className="h-8 font-mono text-[13px] uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="card-set" className="text-[13px] font-medium">
              Card Set
            </label>
            <Select
              value={cardSetType}
              onValueChange={(val) => setCardSetType(val as "fibonacci" | "extended" | "custom")}
            >
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
              <label htmlFor="custom-cards" className="text-[13px] font-medium">
                Custom Card Values
              </label>
              <Input
                id="custom-cards"
                placeholder="Comma separated: S, M, L, XL"
                value={customCards}
                onChange={(e) => setCustomCards(e.target.value)}
                className="h-8 text-[13px]"
              />
            </div>
          )}

          <Button type="submit" className="h-8 w-full text-[13px]">
            Create Room
          </Button>
        </form>
      </section>
    </div>
  );
}
