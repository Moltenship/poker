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
  onVoteChange?: (value: string | null) => void;
}

export function CardDeck({ cardSet, currentVote, roomStatus, taskId, participantId, onVoteChange }: CardDeckProps) {
  const castVote = useSessionMutation((api as any).voting.castVote);
  const removeVote = useSessionMutation((api as any).voting.removeVote);

  const handleVote = useCallback(
    (value: string) => {
      if (value === currentVote) {
        removeVote({ taskId, participantId }).catch(console.error);
        onVoteChange?.(null);
      } else {
        castVote({ taskId, participantId, value }).catch(console.error);
        onVoteChange?.(value);
      }
    },
    [castVote, removeVote, taskId, participantId, currentVote, onVoteChange]
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
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
