import { Check, Crown } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { Id } from "../../convex/_generated/dataModel";

interface Participant {
  _id: Id<"participants">;
  displayName: string;
  isConnected: boolean;
  isHost?: boolean;
}

interface CollapsedParticipantListProps {
  participants: Participant[];
  showVoteStatus: boolean;
  votedIds: Id<"participants">[];
}

export function CollapsedParticipantList({
  participants,
  showVoteStatus,
  votedIds,
}: CollapsedParticipantListProps) {
  return (
    <div className="hidden flex-col items-center gap-3 pt-3 md:flex">
      {participants.map((p) => (
        <Tooltip key={p._id}>
          <TooltipTrigger asChild>
            <div className="relative">
              <Avatar className="size-10">
                <AvatarFallback className="text-sm font-medium">
                  {p.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-[var(--sidebar)]",
                  p.isConnected ? "bg-emerald-500" : "bg-muted-foreground/40",
                )}
              />
              {p.isHost && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full border-2 border-[var(--sidebar)] bg-[var(--sidebar)] text-amber-600 dark:text-amber-500">
                  <Crown className="size-2.5" />
                </span>
              )}
              {showVoteStatus && votedIds.includes(p._id) && (
                <span className="bg-primary absolute -bottom-1 -left-1 flex size-4 items-center justify-center rounded-full border-2 border-[var(--sidebar)]">
                  <Check className="text-primary-foreground size-2.5" strokeWidth={3} />
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">{p.displayName}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
