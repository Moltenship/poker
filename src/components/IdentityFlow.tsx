import { useEffect, useMemo, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useIdentity } from "@/hooks/useIdentity";
import { useSessionMutation, useSessionQuery } from "@/hooks/useSession";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type IdentityFlowProps = {
  roomId: Id<"rooms">;
  roomCode: string;
  onIdentitySet: (participantId: Id<"participants">, displayName: string) => void;
};

type RoomParticipantOption = {
  _id: Id<"participants">;
  displayName: string;
};

export function IdentityFlow({ roomId, roomCode, onIdentitySet }: IdentityFlowProps) {
  const { participantId, displayName } = useIdentity(roomCode);
  const joinRoom = useSessionMutation((api as any).participants.joinRoom);
  const takeoverSession = useSessionMutation((api as any).participants.takeoverSession);
  const roomParticipants = useSessionQuery(
    (api as any).participants.listRoomParticipants,
    { roomId },
  ) as RoomParticipantOption[] | undefined;

  const [joinName, setJoinName] = useState(displayName ?? "");
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (displayName) {
      setJoinName(displayName);
    }
  }, [displayName]);

  const selectedParticipant = useMemo(
    () =>
      roomParticipants?.find(
        (participant: RoomParticipantOption) => participant._id === selectedParticipantId,
      ) ?? null,
    [roomParticipants, selectedParticipantId],
  );

  const handleJoin = async () => {
    const trimmedName = joinName.trim();
    if (!trimmedName) {
      return;
    }

    setIsSubmitting(true);

    try {
      const nextParticipantId = await joinRoom({
        roomId,
        displayName: trimmedName,
      });

      onIdentitySet(nextParticipantId, trimmedName);
    } catch (error) {
      console.error("Failed to join room:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTakeover = async () => {
    if (!selectedParticipant) {
      return;
    }

    setIsSubmitting(true);

    try {
      await takeoverSession({
        roomId,
        targetParticipantId: selectedParticipant._id,
      });

      onIdentitySet(selectedParticipant._id, selectedParticipant.displayName);
      setIsConfirmOpen(false);
    } catch (error) {
      console.error("Failed to take over session:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (participantId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">Join this room</CardTitle>
          <CardDescription>
            Enter your name to join, or reclaim your identity if you&apos;ve used this room before.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="identity-name" className="text-sm font-medium">
              What&apos;s your name?
            </label>
            <Input
              id="identity-name"
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
              placeholder="Your name"
              autoFocus={!isReturningUser}
              maxLength={30}
              disabled={isReturningUser || isSubmitting}
            />
          </div>

          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={isReturningUser}
              onChange={(event) => setIsReturningUser(event.target.checked)}
              disabled={isSubmitting}
            />
            I&apos;ve joined this room before
          </label>

          {isReturningUser ? (
            <div className="space-y-3">
              <label htmlFor="participant-select" className="text-sm font-medium">
                Your name
              </label>
              <Select
                value={selectedParticipantId}
                onValueChange={(value: string | null) => {
                  setSelectedParticipantId(value ?? "");
                }}
              >
                <SelectTrigger id="participant-select" aria-label="Your name" className="w-full">
                  <SelectValue placeholder="Select your identity" />
                </SelectTrigger>
                <SelectContent>
                  {(roomParticipants ?? []).map((participant: RoomParticipantOption) => (
                    <SelectItem key={participant._id} value={participant._id as string}>
                      {participant.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="w-full"
                onClick={() => setIsConfirmOpen(true)}
                disabled={!selectedParticipantId || isSubmitting}
              >
                Rejoin and disconnect other session
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={handleJoin} disabled={!joinName.trim() || isSubmitting}>
              Join
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Reclaim this identity?</DialogTitle>
            <DialogDescription>
              This will disconnect your other session. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleTakeover} disabled={isSubmitting || !selectedParticipant}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
