import type { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSessionMutation } from "@/hooks/useSession";
import { Button } from "./ui/button";
import { VoteDistribution } from "./VoteDistribution";
import { HoursInput } from "./HoursInput";
import { FinalEstimateSelector } from "./FinalEstimateSelector";
import { findNearestCard } from "@/lib/average";

export interface ResultsPanelProps {
  roomId: Id<"rooms">;
  taskId: Id<"tasks"> | null;
  roomStatus: "lobby" | "voting" | "revealed";
  cardSet: string[];
  participantCount: number;
  votedCount: number;
}

export function ResultsPanel({ roomId, taskId, roomStatus, cardSet, participantCount, votedCount }: ResultsPanelProps) {
  const revealVotes = useSessionMutation(api.voting.revealVotes);
  const resetVoting = useSessionMutation(api.voting.resetVoting);
  const advanceToNextTask = useSessionMutation(api.voting.advanceToNextTask);

  const voteResults = useQuery(
    api.voting.getVoteResults,
    taskId && roomStatus === "revealed" ? { taskId, roomId } : "skip",
  );

  const participants = useQuery(api.participants.getParticipants, { roomId });
  const currentTask = useQuery(api.tasks.getCurrentTask, { roomId });

  if (roomStatus === "lobby" || !taskId) return null;

  if (roomStatus === "voting") {
    return (
      <div className="w-full max-w-sm rounded-lg bg-muted/40 p-4 flex flex-col items-center gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold text-primary">{votedCount}</span>
          <span className="text-[13px] text-muted-foreground">/ {participantCount} voted</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${participantCount > 0 ? (votedCount / participantCount) * 100 : 0}%` }}
          />
        </div>
        <Button size="sm" className="h-7 text-[13px]" onClick={() => revealVotes({ roomId })}>
          Reveal Votes
        </Button>
      </div>
    );
  }

  const formattedVotes = (voteResults?.votes ?? []).map((vote) => {
    const participant = participants?.find((p) => p._id === vote.participantId);
    return { value: vote.value ?? "?", displayName: participant?.displayName ?? "Unknown" };
  });

  const averageDisplay = voteResults?.average !== null && voteResults?.average !== undefined
    ? voteResults.average.toFixed(1)
    : "N/A";

  const suggestedEstimate = voteResults?.average !== null && voteResults?.average !== undefined
    ? findNearestCard(voteResults.average, cardSet)
    : null;

  return (
    <div className="w-full max-w-2xl rounded-lg bg-muted/40" data-testid="results-area">
      <div className="p-4 border-b border-border/30">
        <span className="text-[13px] font-medium">Results</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              {formattedVotes.map((v, i) => (
                <div key={i} className="flex justify-between items-center px-2 py-1 rounded text-[13px] bg-muted/40">
                  <span className="text-foreground/70">{v.displayName}</span>
                  <span className="font-semibold text-primary">{v.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 px-2">
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Average</div>
                <div className="text-lg font-semibold text-primary">{averageDisplay}</div>
              </div>
              {suggestedEstimate && (
                <div className="border-l border-border pl-4">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Suggested</div>
                  <div className="text-lg font-semibold">{suggestedEstimate}</div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <VoteDistribution votes={formattedVotes} cardSet={cardSet} />
            <FinalEstimateSelector taskId={taskId} cardSet={cardSet} currentEstimate={currentTask?.finalEstimate} />
            <HoursInput taskId={taskId} currentHours={currentTask?.hoursEstimate} />
          </div>
        </div>
        <div className="flex gap-2 pt-3 border-t border-border/30">
          <Button variant="secondary" size="sm" className="h-7 text-[13px]" onClick={() => resetVoting({ roomId })}>
            Re-vote
          </Button>
          <Button size="sm" className="h-7 text-[13px]" onClick={() => advanceToNextTask({ roomId })}>
            Next Task
          </Button>
        </div>
      </div>
    </div>
  );
}
