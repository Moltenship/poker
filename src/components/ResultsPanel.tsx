import type { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSessionMutation } from "@/hooks/useSession";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { VoteDistribution } from "./VoteDistribution";
import { JiraEstimateInput } from "./JiraEstimateInput";
import { JiraSprintSelector } from "./JiraSprintSelector";
import { findNearestCard } from "@/lib/average";
import { Progress } from "./ui/progress";

export interface ResultsPanelProps {
  roomId: Id<"rooms">;
  taskId: Id<"tasks"> | null;
  roomStatus: "lobby" | "voting" | "revealed";
  cardSet: string[];
  participantCount: number;
  votedCount: number;
  projectKey?: string;
  currentSprintName?: string;
}

export function ResultsPanel({ roomId, taskId, roomStatus, cardSet, participantCount, votedCount, projectKey, currentSprintName }: ResultsPanelProps) {
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

  const progressPct = participantCount > 0 ? (votedCount / participantCount) * 100 : 0;

  if (roomStatus === "voting") {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold">{votedCount}</span>
            <span className="text-sm text-muted-foreground">/ {participantCount} voted</span>
          </div>
          <Progress value={progressPct} className="w-full" />
          <Button size="sm" className="w-full" onClick={() => revealVotes({ roomId })}>
            Reveal Votes
          </Button>
        </CardContent>
      </Card>
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

  const isQuickVote = currentTask?.isQuickVote ?? false;

  return (
    <Card className="w-full max-w-2xl" data-testid="results-area">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: votes list + average/suggested */}
          <div className="flex flex-col gap-4 pr-0 md:pr-6">
            <div className="space-y-1">
              {formattedVotes.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm bg-muted/50"
                >
                  <span className="text-muted-foreground">{v.displayName}</span>
                  <span className="font-semibold tabular-nums">{v.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-stretch gap-6 px-1">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Average</p>
                <p className="text-2xl font-bold tabular-nums">{averageDisplay}</p>
              </div>
              {suggestedEstimate && (
                <>
                  <Separator orientation="vertical" className="h-auto" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Suggested</p>
                    <p className="text-2xl font-bold">{suggestedEstimate}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: distribution + estimate controls */}
          <div className="flex flex-col gap-4 border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <VoteDistribution votes={formattedVotes} cardSet={cardSet} />
            {!isQuickVote && (currentTask as any)?.jiraKey && (
              <>
                <JiraEstimateInput
                  taskId={taskId}
                  syncStatus={(currentTask as any)?.jiraEstimateSyncStatus}
                  syncError={(currentTask as any)?.jiraEstimateSyncError}
                />
                {projectKey && (
                  <JiraSprintSelector
                    taskId={taskId}
                    projectKey={projectKey}
                    currentSprintName={currentSprintName}
                    syncStatus={(currentTask as any)?.jiraSprintSyncStatus}
                    syncError={(currentTask as any)?.jiraSprintSyncError}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex gap-2">
          {isQuickVote ? (
            <Button size="sm" onClick={() => resetVoting({ roomId })}>
              New Vote
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => resetVoting({ roomId })}>
                Re-vote
              </Button>
              <Button size="sm" onClick={() => advanceToNextTask({ roomId })}>
                Next Task
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
