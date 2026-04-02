import { useNavigate } from "react-router-dom";

import { RoomCard } from "@/components/RoomCard";
import { Button } from "@/components/ui/button";
import { useSessionQuery } from "@/hooks/useSession";

import { api } from "../../convex/_generated/api";

export default function History() {
  const rooms = useSessionQuery(api.rooms.listMyRooms, {});
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">History</h1>
        <p className="text-muted-foreground mt-0.5 text-[13px]">Your recent sessions</p>
      </div>

      {rooms === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-border bg-muted/30 h-14 animate-pulse rounded-lg border"
            />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-accent/30 flex flex-col items-center justify-center rounded-lg py-12 text-center">
          <h2 className="mb-1 text-sm font-medium">No rooms yet</h2>
          <p className="text-muted-foreground mb-4 text-[13px]">Create a room to get started.</p>
          <Button size="sm" className="h-7 text-[13px]" onClick={() => navigate("/")}>
            Create Room
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <RoomCard
              key={room._id}
              room={{
                _creationTime: room._creationTime,
                _id: room._id,
                cardSet: room.cardSet,
                name: room.name,
                roomCode: room.roomCode,
                status: room.status,
              }}
              onClick={() => navigate(`/room/${room.roomCode}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
