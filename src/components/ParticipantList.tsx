import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
    <Card className="h-full border-l rounded-none shadow-none" data-testid="participant-list">
      <CardHeader className="py-4 px-4 bg-muted/30">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Participants</span>
          <Badge variant="secondary" className="font-mono">{participants.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-100px)]">
          {participants.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No participants yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {participants.map((p) => {
                const hasVoted = votedIds.includes(p._id);
                return (
                  <div key={p._id} className="p-4 border-b last:border-b-0 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${p.isConnected ? "bg-green-500" : "bg-gray-300"}`} title={p.isConnected ? "Online" : "Offline"} />
                      <span className={`text-sm ${p.isConnected ? "font-medium" : "text-muted-foreground"}`}>
                        {p.displayName}
                      </span>
                    </div>
                    {showVoteStatus && hasVoted && (
                      <div title="Voted">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
