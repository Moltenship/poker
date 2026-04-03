import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface SessionKickedBannerProps {
  roomId: Id<"rooms">;
  participantId: Id<"participants">;
  currentSessionId: string;
  onReclaim: () => void;
}

export function SessionKickedBanner({
  roomId,
  participantId,
  currentSessionId,
  onReclaim,
}: SessionKickedBannerProps) {
  const navigate = useNavigate();
  const { data: participants } = useQuery(
    convexQuery(api.participants.getParticipants, { roomId }),
  );

  const participant = participants?.find((entry) => entry._id === participantId);

  if (!participant || participant.sessionId === currentSessionId) {
    return null;
  }

  return (
    <div className="border-destructive/30 bg-destructive/10 border-b px-6 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-destructive text-sm font-medium">
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
