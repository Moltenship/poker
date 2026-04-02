import { ChevronRight } from "lucide-react";

import type { Id } from "../../convex/_generated/dataModel";

interface RoomCardProps {
  room: {
    _id: Id<"rooms">;
    name: string;
    roomCode: string;
    cardSet: string[];
    status: "lobby" | "voting" | "revealed";
    _creationTime: number;
  };
  onClick: () => void;
}

export function RoomCard({ room, onClick }: RoomCardProps) {
  const formattedDate = new Date(room._creationTime).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });

  const statusLabel = { lobby: "Lobby", revealed: "Done", voting: "Voting" }[room.status];
  const statusColor = {
    lobby: "text-muted-foreground",
    revealed: "text-emerald-500",
    voting: "text-primary",
  }[room.status];

  return (
    <button
      type="button"
      className="hover:bg-accent group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{room.name}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <code className="text-muted-foreground font-mono text-[11px]">{room.roomCode}</code>
          <span className="text-muted-foreground text-[11px]">{formattedDate}</span>
        </div>
      </div>
      <span className={`text-[11px] font-medium ${statusColor}`}>{statusLabel}</span>
      <ChevronRight className="text-muted-foreground/40 group-hover:text-muted-foreground h-3 w-3 shrink-0 transition-colors" />
    </button>
  );
}
