import { useQuery } from "convex/react";

import { useSessionMutation } from "@/hooks/useSession";
import { findNearestCard } from "@/lib/average";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { JiraEstimateInput } from "./JiraEstimateInput";
import { JiraSprintSelector } from "./JiraSprintSelector";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { VoteDistribution } from "./VoteDistribution";

export interface ResultsPanelProps {
  roomId: Id<"rooms">;
  taskId: Id<"tasks"> | null;
  roomStatus: "lobby" | "voting" | "revealed";
  cardSet: string[];
  participantCount: number;
  votedCount: number;
  isHost?: boolean;
  hasAnyHost?: boolean;
  projectKey?: string;
  currentSprintName?: string;
}

export function ResultsPanel({
  roomId,
  taskId,
  roomStatus,
  cardSet,
  participantCount,
  votedCount,
  isHost = false,
  hasAnyHost = false,
  projectKey,
  currentSprintName,
}: ResultsPanelProps) {
  const revealVotes = useSessionMutation(api.voting.revealVotes);
  const resetVoting = useSessionMutation(api.voting.resetVoting);
  const advanceToNextTask = useSessionMutation(api.voting.advanceToNextTask);

  const voteResults = useQuery(
    api.voting.getVoteResults,
    taskId && roomStatus === "revealed" ? { roomId, taskId } : "skip",
  );

  const participants = useQuery(api.participants.getParticipants, { roomId });
  const currentTask = useQuery(api.tasks.getCurrentTask, { roomId });

  if (roomStatus === "lobby" || !taskId) {
    return null;
  }

  const progressPct = participantCount > 0 ? (votedCount / participantCount) * 100 : 0;
  const canControl = isHost || !hasAnyHost;

  if (roomStatus === "voting") {
    return (
      <Card className="w-full max-w-md border-none bg-transparent">
        <CardContent className="flex items-center gap-3 px-4 py-1.5">
          <div className="flex shrink-0 items-baseline gap-1">
            <span className="text-base font-bold">{votedCount}</span>
            <span className="text-muted-foreground text-xs">/ {participantCount}</span>
          </div>
          <Progress value={progressPct} className="min-w-0 flex-1" />
          <Button
            size="sm"
            className="shrink-0"
            disabled={!canControl}
            onClick={() => revealVotes({ roomId })}
          >
            Reveal Votes
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formattedVotes = (voteResults?.votes ?? []).map((vote) => {
    const participant = participants?.find((p) => p._id === vote.participantId);
    return { displayName: participant?.displayName ?? "Unknown", value: vote.value ?? "?" };
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
                  className="bg-muted/50 flex items-center justify-between rounded-md px-3 py-1.5 text-sm"
                >
                  <span className="text-muted-foreground">{v.displayName}</span>
                  <span className="font-semibold tabular-nums">{v.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-stretch gap-6 px-1">
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
                  Average
                </p>
                <p className="text-2xl font-bold tabular-nums">{averageDisplay}</p>
              </div>
              {suggestedEstimate && (
                <>
                  <Separator orientation="vertical" className="h-auto" />
                  <div>
                    <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
                      Suggested
                    </p>
                    <p className="text-2xl font-bold">{suggestedEstimate}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: distribution + estimate controls */}
          <div className="flex flex-col gap-4 border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <VoteDistribution votes={formattedVotes} cardSet={cardSet} />
            {currentTask?.jiraKey && (
              <>
                <JiraEstimateInput
                  taskId={taskId}
                  syncStatus={currentTask?.jiraEstimateSyncStatus}
                  syncError={currentTask?.jiraEstimateSyncError}
                />
                {projectKey && (
                  <JiraSprintSelector
                    taskId={taskId}
                    projectKey={projectKey}
                    currentSprintName={currentSprintName}
                    syncStatus={currentTask?.jiraSprintSyncStatus}
                    syncError={currentTask?.jiraSprintSyncError}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {canControl && (
          <>
            <Separator />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => resetVoting({ roomId })}>
                Re-vote
              </Button>
              <Button size="sm" onClick={() => advanceToNextTask({ roomId })}>
                Next Task
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
