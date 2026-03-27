import { useNavigate, Link } from "react-router-dom"
import { api } from "../../convex/_generated/api"
import { useSessionQuery } from "@/hooks/useSession"
import { RoomCard } from "@/components/RoomCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function History() {
  const rooms = useSessionQuery(api.rooms.listMyRooms, {})
  const navigate = useNavigate()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Room History</h1>
      </div>

      {rooms === undefined ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row justify-between space-y-0 pb-2">
                <div className="h-6 w-3/4 rounded bg-muted"></div>
                <div className="h-5 w-16 rounded-full bg-muted"></div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="flex justify-between">
                  <div className="h-4 w-24 rounded bg-muted"></div>
                  <div className="h-4 w-24 rounded bg-muted"></div>
                </div>
                <div className="h-4 w-full rounded bg-muted"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight">
            No rooms yet
          </h2>
          <p className="mb-6 text-muted-foreground">
            You haven't participated in any planning poker rooms recently.
          </p>
          <Button onClick={() => navigate("/")}>
            Create a Room
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
