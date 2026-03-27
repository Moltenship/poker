import { useNavigate } from "react-router-dom"
import { api } from "../../convex/_generated/api"
import { useSessionQuery } from "@/hooks/useSession"
import { RoomCard } from "@/components/RoomCard"
import { Button } from "@/components/ui/button"

export default function History() {
  const rooms = useSessionQuery(api.rooms.listMyRooms, {})
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">History</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Your recent sessions</p>
      </div>

      {rooms === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg border border-border animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg bg-accent/30 py-12 text-center">
          <h2 className="text-sm font-medium mb-1">No rooms yet</h2>
          <p className="text-[13px] text-muted-foreground mb-4">
            Create a room to get started.
          </p>
          <Button size="sm" className="h-7 text-[13px]" onClick={() => navigate("/")}>Create Room</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <RoomCard
              key={room._id}
              room={{
                _id: room._id,
                name: room.name,
                roomCode: room.roomCode,
                cardSet: room.cardSet,
                status: room.status,
                _creationTime: room._creationTime,
              }}
              onClick={() => navigate(`/room/${room.roomCode}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
