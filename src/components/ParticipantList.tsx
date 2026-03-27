import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2 } from "lucide-react";

type Participant = {
  _id: string;
  displayName: string;
  isConnected: boolean;
};

interface ParticipantListProps {
  participants: Participant[];
  votedIds?: string[];
  showVoteStatus?: boolean;
}

export function ParticipantList({ participants, votedIds = [], showVoteStatus = false }: ParticipantListProps) {
  return (
    <div className="flex flex-col h-full" data-testid="participant-list">
      <div className="h-11 px-4 flex items-center justify-between shrink-0">
        <span className="text-[13px] font-medium">Participants</span>
        <span className="text-[11px] text-muted-foreground font-mono">{participants.length}</span>
      </div>
      <ScrollArea className="flex-1">
        {participants.length === 0 ? (
          <div className="p-4 text-center text-[12px] text-muted-foreground">
            Waiting for participants...
          </div>
        ) : (
          <div className="py-1">
            {participants.map((p) => {
              const hasVoted = votedIds.includes(p._id);
              return (
                <div key={p._id} className="flex items-center justify-between px-4 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.isConnected ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                    <span className={`text-[13px] truncate ${p.isConnected ? "text-foreground/80" : "text-muted-foreground"}`}>
                      {p.displayName}
                    </span>
                  </div>
                  {showVoteStatus && hasVoted && (
                    <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
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
