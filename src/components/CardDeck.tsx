import { Id } from "../../convex/_generated/dataModel";
import { VoteCard } from "./VoteCard";
import { useSessionMutation } from "@/hooks/useSession";
import { api } from "../../convex/_generated/api";
import { useCallback } from "react";

interface CardDeckProps {
  cardSet: string[];
  currentVote: string | null;
  roomStatus: "lobby" | "voting" | "revealed";
  taskId: Id<"tasks">;
  participantId: Id<"participants">;
  onVoteChange?: (value: string) => void;
}

export function CardDeck({
  cardSet,
  currentVote,
  roomStatus,
  taskId,
  participantId,
  onVoteChange,
}: CardDeckProps) {
  const castVote = useSessionMutation((api as any).voting.castVote);

  const handleVote = useCallback(
    (value: string) => {
      castVote({ taskId, participantId, value }).catch(console.error);
      onVoteChange?.(value);
    },
    [castVote, taskId, participantId, onVoteChange]
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {cardSet.map((value) => {
        const isSelected = value === currentVote;
        const isDisabled = roomStatus !== "voting";

        return (
          <VoteCard
            key={value}
            value={value}
            isSelected={isSelected}
            isDisabled={isDisabled}
            onClick={() => handleVote(value)}
          />
        );
      })}
    </div>
  );
}
