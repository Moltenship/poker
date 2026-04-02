import { useCallback } from "react";

import { useSessionMutation } from "@/hooks/useSession";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { VoteCard } from "./VoteCard";

interface CardDeckProps {
  cardSet: string[];
  currentVote: string | null;
  roomStatus: "lobby" | "voting" | "revealed";
  taskId: Id<"tasks">;
  participantId: Id<"participants">;
  onVoteChange?: (value: string | null) => void;
}

export function CardDeck({
  cardSet,
  currentVote,
  roomStatus,
  taskId,
  participantId,
  onVoteChange,
}: CardDeckProps) {
  const castVote = useSessionMutation(api.voting.castVote);
  const removeVote = useSessionMutation(api.voting.removeVote);

  const handleVote = useCallback(
    (value: string) => {
      if (value === currentVote) {
        removeVote({ participantId, taskId }).catch(console.error);
        onVoteChange?.(null);
      } else {
        castVote({ participantId, taskId, value }).catch(console.error);
        onVoteChange?.(value);
      }
    },
    [castVote, removeVote, taskId, participantId, currentVote, onVoteChange],
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2">
      {cardSet.map((value) => (
        <VoteCard
          key={value}
          value={value}
          isSelected={value === currentVote}
          isDisabled={roomStatus !== "voting"}
          onClick={() => handleVote(value)}
        />
      ))}
    </div>
  );
}
