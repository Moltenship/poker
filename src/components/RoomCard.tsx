import { Id } from "../../convex/_generated/dataModel"
import { ChevronRight } from "lucide-react"

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
    month: "short",
    day: "numeric",
  })

  const statusLabel = { lobby: "Lobby", voting: "Voting", revealed: "Done" }[room.status]
  const statusColor = {
    lobby: "text-muted-foreground",
    voting: "text-primary",
    revealed: "text-emerald-500",
  }[room.status]

  return (
    <button
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent group"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">{room.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <code className="text-[11px] text-muted-foreground font-mono">{room.roomCode}</code>
          <span className="text-[11px] text-muted-foreground">{formattedDate}</span>
        </div>
      </div>
      <span className={`text-[11px] font-medium ${statusColor}`}>{statusLabel}</span>
      <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
    </button>
  )
}
