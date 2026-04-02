import {
  ArrowLeft,
  Check,
  Crown,
  Link as LinkIcon,
  PanelRightClose,
  PanelRightOpen,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { ConnectionDot } from "@/components/ConnectionBanner";
import { EditCardSetDialog } from "@/components/EditCardSetDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";

import type { Id } from "../../convex/_generated/dataModel";

interface RoomHeaderProps {
  room: {
    _id: Id<"rooms">;
    name: string;
    roomCode: string;
    jiraProjectKey?: string;
    cardSet: string[];
  };
  isHost: boolean;
  participantCount: number;
  participantsOpen: boolean;
  onToggleHost: () => void;
  onToggleParticipants: (value: boolean) => void;
}

export function RoomHeader({
  room,
  isHost,
  participantCount,
  participantsOpen,
  onToggleHost,
  onToggleParticipants,
}: RoomHeaderProps) {
  const { copied, copy: handleCopyLink } = useCopyToClipboard(
    `${typeof window !== "undefined" ? window.location.origin : ""}/room/${room.roomCode}`,
  );

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 px-4">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </Link>
      <span className="truncate text-[13px] font-medium">{room.name}</span>
      {room.jiraProjectKey && (
        <code className="text-muted-foreground bg-muted shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
          {room.jiraProjectKey}
        </code>
      )}
      <EditCardSetDialog roomId={room._id} currentCardSet={room.cardSet} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className={cn(
              "text-muted-foreground",
              isHost && "text-amber-600 dark:text-amber-500",
            )}
            onClick={onToggleHost}
          >
            <Crown className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isHost ? "Become Voter" : "Become Host"}</TooltipContent>
      </Tooltip>
      <div className="ml-auto flex items-center gap-1.5">
        <code className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
          {room.roomCode}
        </code>
        <button
          onClick={handleCopyLink}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-6 items-center gap-1 rounded px-1.5 text-[11px] transition-colors"
        >
          {copied ? (
            <>
              <Check className="text-primary h-3 w-3" />
              <span className="text-primary">Copied</span>
            </>
          ) : (
            <>
              <LinkIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Invite</span>
            </>
          )}
        </button>
        <div className="bg-border mx-0.5 h-4 w-px" />
        <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
          <Users className="h-3 w-3" />
          {participantCount}
        </div>
        <div className="bg-border mx-0.5 h-4 w-px" />
        <ConnectionDot />
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hidden md:flex"
              onClick={() => onToggleParticipants(!participantsOpen)}
            >
              {participantsOpen ? <PanelRightClose /> : <PanelRightOpen />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {participantsOpen ? "Hide participants" : "Show participants"}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
