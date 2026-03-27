import { useNavigate } from "react-router-dom";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";

type SessionKickedBannerProps = {
  roomId: Id<"rooms">;
  participantId: Id<"participants">;
  currentSessionId: string;
  onReclaim: () => void;
};

type RoomParticipant = {
  _id: Id<"participants">;
  sessionId: string;
};

export function SessionKickedBanner({
  roomId,
  participantId,
  currentSessionId,
  onReclaim,
}: SessionKickedBannerProps) {
  const navigate = useNavigate();
  const participants = useQuery((api as any).participants.getParticipants, { roomId }) as
    | RoomParticipant[]
    | undefined;

  const participant = participants?.find(
    (entry: RoomParticipant) => entry._id === participantId,
  );

  if (!participant || participant.sessionId === currentSessionId) {
    return null;
  }

  return (
    <div className="border-b border-destructive/30 bg-destructive/10 px-6 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-destructive">
          Your session was taken over on another device.
        </p>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={onReclaim}>
            Reclaim
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
