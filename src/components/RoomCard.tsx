import { Id } from "../../convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
    year: "numeric",
  })

  const getStatusBadge = (status: RoomCardProps["room"]["status"]) => {
    switch (status) {
      case "lobby":
        return <Badge variant="secondary">In Lobby</Badge>
      case "voting":
        return <Badge variant="default">Voting</Badge>
      case "revealed":
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Results</Badge>
      default:
        return null
    }
  }

  const formatCardSet = (cardSet: string[]) => {
    if (cardSet.length <= 3) {
      return cardSet.join(", ")
    }
    return `${cardSet.slice(0, 3).join(", ")}...`
  }

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold line-clamp-1" title={room.name}>
          {room.name}
        </CardTitle>
        <div className="ml-4 shrink-0">{getStatusBadge(room.status)}</div>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            Code: <Badge variant="outline" className="font-mono">{room.roomCode}</Badge>
          </span>
          <span>{formattedDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Cards:</span>
          <span>{formatCardSet(room.cardSet)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
