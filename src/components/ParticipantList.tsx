import { CheckCircle2 } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";

interface Participant {
  _id: string;
  displayName: string;
  isConnected: boolean;
}

interface ParticipantListProps {
  participants: Participant[];
  votedIds?: string[];
  showVoteStatus?: boolean;
}

export function ParticipantList({
  participants,
  votedIds = [],
  showVoteStatus = false,
}: ParticipantListProps) {
  return (
    <div className="flex h-full flex-col" data-testid="participant-list">
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <span className="text-[13px] font-medium">Participants</span>
        <span className="text-muted-foreground font-mono text-[11px]">{participants.length}</span>
      </div>
      <ScrollArea className="flex-1">
        {participants.length === 0 ? (
          <div className="text-muted-foreground p-4 text-center text-[12px]">
            Waiting for participants...
          </div>
        ) : (
          <div className="py-1">
            {participants.map((p) => {
              const hasVoted = votedIds.includes(p._id);
              return (
                <div key={p._id} className="flex items-center justify-between px-4 py-1.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.isConnected ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    />
                    <span
                      className={`truncate text-[13px] ${p.isConnected ? "text-foreground/80" : "text-muted-foreground"}`}
                    >
                      {p.displayName}
                    </span>
                  </div>
                  {showVoteStatus && hasVoted && (
                    <CheckCircle2 className="text-primary h-3 w-3 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
