import { CheckCircle2, Crown, X } from "lucide-react";
import { useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";

interface Participant {
  _id: string;
  displayName: string;
  isConnected: boolean;
  isHost?: boolean;
}

interface ParticipantListProps {
  participants: Participant[];
  votedIds?: string[];
  showVoteStatus?: boolean;
  currentUserIsHost?: boolean;
  currentParticipantId?: string;
  onRemoveParticipant?: (id: string) => void;
  onUpdateDisplayName?: (name: string) => void;
}

export function ParticipantList({
  participants,
  votedIds = [],
  showVoteStatus = false,
  currentUserIsHost = false,
  currentParticipantId = "",
  onRemoveParticipant,
  onUpdateDisplayName,
}: ParticipantListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveName = (id: string) => {
    if (editingName.trim() && onUpdateDisplayName) {
      onUpdateDisplayName(editingName.trim());
    }
    setEditingId(null);
  };

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
              const isCurrentUser = p._id === currentParticipantId;
              const isEditing = editingId === p._id;

              return (
                <div
                  key={p._id}
                  className="flex items-center justify-between px-4 py-1.5 group"
                  onMouseEnter={() => setHoveredId(p._id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.isConnected ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    />
                    {isEditing && isCurrentUser ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleSaveName(p._id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveName(p._id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="bg-muted border-primary text-foreground min-w-0 flex-1 rounded border px-1 py-0.5 text-[13px]"
                      />
                    ) : (
                      <span
                        onClick={() => isCurrentUser && handleStartEdit(p._id, p.displayName)}
                        className={`min-w-0 flex-1 truncate text-[13px] ${
                          isCurrentUser ? "cursor-pointer hover:underline" : ""
                        } ${p.isConnected ? "text-foreground/80" : "text-muted-foreground"}`}
                      >
                        {p.displayName}
                      </span>
                    )}
                    {p.isHost && (
                      <Crown className="text-amber-600 dark:text-amber-500 h-3.5 w-3.5 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {showVoteStatus && hasVoted && (
                      <CheckCircle2 className="text-primary h-3 w-3 shrink-0" />
                    )}
                    {currentUserIsHost &&
                      !isCurrentUser &&
                      (hoveredId === p._id || editingId === p._id) && (
                        <button
                          onClick={() => onRemoveParticipant?.(p._id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
