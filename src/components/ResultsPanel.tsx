import type { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSessionMutation } from "@/hooks/useSession";
import { Button } from "./ui/button";
import { VoteDistribution } from "./VoteDistribution";
import { HoursInput } from "./HoursInput";
import { FinalEstimateSelector } from "./FinalEstimateSelector";
import { findNearestCard } from "@/lib/average";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export interface ResultsPanelProps {
  roomId: Id<"rooms">;
  taskId: Id<"tasks"> | null;
  roomStatus: "lobby" | "voting" | "revealed";
  cardSet: string[];
  participantCount: number;
  votedCount: number;
}

export function ResultsPanel({
  roomId,
  taskId,
  roomStatus,
  cardSet,
  participantCount,
  votedCount,
}: ResultsPanelProps) {
  const revealVotes = useSessionMutation(api.voting.revealVotes);
  const resetVoting = useSessionMutation(api.voting.resetVoting);
  const advanceToNextTask = useSessionMutation(api.voting.advanceToNextTask);

  const voteResults = useQuery(
    api.voting.getVoteResults,
    taskId && roomStatus === "revealed" ? { taskId, roomId } : "skip",
  );

  const participants = useQuery(api.participants.getParticipants, { roomId });
  const currentTask = useQuery(api.tasks.getCurrentTask, { roomId });

  if (roomStatus === "lobby" || !taskId) {
    return null;
  }

  if (roomStatus === "voting") {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
          <p className="text-lg font-medium">
            {votedCount} of {participantCount} voted
          </p>
          <Button onClick={() => revealVotes({ roomId })}>
            Reveal Votes
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formattedVotes = (voteResults?.votes ?? []).map((vote) => {
    const participant = participants?.find((p) => p._id === vote.participantId);
    return {
      value: vote.value ?? "?",
      displayName: participant?.displayName ?? "Unknown",
    };
  });

  const averageDisplay =
    voteResults?.average !== null && voteResults?.average !== undefined
      ? voteResults.average.toFixed(1)
      : "N/A";

  const suggestedEstimate =
    voteResults?.average !== null && voteResults?.average !== undefined
      ? findNearestCard(voteResults.average, cardSet)
      : null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Voting Results</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Individual Votes</h3>
              <ul className="flex flex-col gap-1">
                {formattedVotes.map((v, i) => (
                  <li key={i} className="flex justify-between items-center bg-muted/50 px-3 py-2 rounded-md">
                    <span>{v.displayName}</span>
                    <span className="font-bold">{v.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-1 p-4 bg-muted/30 rounded-lg">
              <p className="text-lg font-semibold">Average: {averageDisplay}</p>
              {suggestedEstimate && (
                <p className="text-sm text-muted-foreground">
                  Suggested estimate: {suggestedEstimate}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <VoteDistribution votes={formattedVotes} cardSet={cardSet} />
            <FinalEstimateSelector
              taskId={taskId}
              cardSet={cardSet}
              currentEstimate={currentTask?.finalEstimate}
            />
            <HoursInput
              taskId={taskId}
              currentHours={currentTask?.hoursEstimate}
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <Button variant="outline" onClick={() => resetVoting({ roomId })}>
            Reset & Re-vote
          </Button>
          <Button onClick={() => advanceToNextTask({ roomId })}>
            Next Task →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
