import { useEffect, useMemo, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useIdentity } from "@/hooks/useIdentity";
import { useQuery } from "convex/react";
import { useSessionMutation } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type IdentityFlowProps = {
  roomId: Id<"rooms">;
  roomCode: string;
  onIdentitySet: (participantId: Id<"participants">, displayName: string) => void;
};

export function IdentityFlow({ roomId, roomCode, onIdentitySet }: IdentityFlowProps) {
  const { participantId, displayName } = useIdentity(roomCode);
  const joinRoom = useSessionMutation(api.participants.joinRoom);
  const takeoverSession = useSessionMutation(api.participants.takeoverSession);
  const roomParticipants = useQuery(
    api.participants.getParticipants,
    { roomId },
  );

  const [joinName, setJoinName] = useState(displayName ?? "");
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (displayName) setJoinName(displayName);
  }, [displayName]);

  const selectedParticipant = useMemo(
    () => roomParticipants?.find((p) => p._id === selectedParticipantId) ?? null,
    [roomParticipants, selectedParticipantId],
  );

  const handleJoin = async () => {
    const trimmedName = joinName.trim();
    if (!trimmedName) return;
    setIsSubmitting(true);
    try {
      const nextParticipantId = await joinRoom({ roomId, displayName: trimmedName });
      onIdentitySet(nextParticipantId, trimmedName);
    } catch (error) {
      console.error("Failed to join room:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTakeover = async () => {
    if (!selectedParticipant) return;
    setIsSubmitting(true);
    try {
      await takeoverSession({ roomId, targetParticipantId: selectedParticipant._id });
      onIdentitySet(selectedParticipant._id, selectedParticipant.displayName);
      setIsConfirmOpen(false);
    } catch (error) {
      console.error("Failed to take over session:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (participantId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg bg-card p-5 shadow-2xl shadow-black/30">
        <h2 className="text-sm font-semibold mb-1">Join Room</h2>
        <p className="text-[13px] text-muted-foreground mb-5">
          Enter your name to join the session.
        </p>

        <div className="space-y-4">
          {!isReturningUser && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="identity-name" className="text-[13px] font-medium">
                  Name
                </label>
                <Input
                  id="identity-name"
                  value={joinName}
                  onChange={(event) => setJoinName(event.target.value)}
                  placeholder="Your name"
                  autoFocus
                  maxLength={30}
                  disabled={isSubmitting}
                  className="h-8 text-[13px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && joinName.trim()) handleJoin();
                  }}
                />
              </div>
              <Button className="w-full h-8 text-[13px]" onClick={handleJoin} disabled={!joinName.trim() || isSubmitting}>
                Join
              </Button>
            </>
          )}

          {isReturningUser && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="participant-select" className="text-[13px] font-medium">
                  Select your name
                </label>
                <Select value={selectedParticipantId} onValueChange={(value: string | null) => setSelectedParticipantId(value ?? "")}>
                  <SelectTrigger id="participant-select" aria-label="Your name" className="h-8 text-[13px]">
                    <SelectValue placeholder="Select identity" />
                  </SelectTrigger>
                  <SelectContent>
                    {(roomParticipants ?? []).map((p) => (
                      <SelectItem key={p._id} value={p._id as string}>{p.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full h-8 text-[13px]" onClick={() => setIsConfirmOpen(true)} disabled={!selectedParticipantId || isSubmitting}>
                Rejoin
              </Button>
            </>
          )}

          <button
            className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsReturningUser(!isReturningUser)}
            disabled={isSubmitting}
          >
            {isReturningUser ? "New here? Join with a name" : "Returning? Reclaim identity"}
          </button>
        </div>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-sm">Reclaim identity?</DialogTitle>
            <DialogDescription className="text-[13px]">
              This will disconnect the other session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" className="h-7 text-[13px]" onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-[13px]" onClick={handleTakeover} disabled={isSubmitting || !selectedParticipant}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
