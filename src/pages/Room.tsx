import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSessionMutation, useSessionId } from "@/hooks/useSession";
import { useIdentity } from "@/hooks/useIdentity";

import { TaskListManager } from "@/components/TaskListManager";
import { ParticipantList } from "@/components/ParticipantList";
import { IdentityFlow } from "@/components/IdentityFlow";
import { SessionKickedBanner } from "@/components/SessionKickedBanner";
import { CardDeck } from "@/components/CardDeck";
import { ResultsPanel } from "@/components/ResultsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const sessionId = useSessionId();
  const { participantId, displayName, setIdentity } = useIdentity(roomCode ?? "");
  
  const joinRoom = useSessionMutation((api as any).participants.joinRoom);
  const takeoverSession = useSessionMutation((api as any).participants.takeoverSession);
  const startVoting = useSessionMutation((api as any).voting.startVoting);

  const room = useQuery((api as any).rooms.getRoom, roomCode ? { roomCode } : "skip");
  
  const tasks = useQuery(
    (api as any).tasks.getTasksForRoom,
    room?._id ? { roomId: room._id } : "skip"
  );
  
  const participants = useQuery(
    (api as any).participants.getParticipants,
    room?._id ? { roomId: room._id } : "skip"
  );

  const currentTask = tasks && room ? tasks[room.currentTaskIndex] : null;
  const voteStatus = useQuery(
    (api as any).voting.getVoteStatus,
    currentTask?._id ? { taskId: currentTask._id } : "skip"
  );
  
  const votedIds = voteStatus?.filter((v: any) => v.hasVoted).map((v: any) => v.participantId) || [];
  const showVoteStatus = room?.status === "voting";
  const autoRejoinKeyRef = useRef<string | null>(null);
  const [currentVote, setCurrentVote] = useState<string | null>(null);

  useEffect(() => {
    if (!room?._id || !participantId || !displayName) {
      return;
    }

    const autoRejoinKey = `${room._id}:${participantId}:${displayName}`;
    if (autoRejoinKeyRef.current === autoRejoinKey) {
      return;
    }

    autoRejoinKeyRef.current = autoRejoinKey;

    joinRoom({
      roomId: room._id,
      displayName,
    })
      .then((nextParticipantId) => {
        setIdentity(nextParticipantId, displayName);
      })
      .catch((error) => {
        autoRejoinKeyRef.current = null;
        console.error("Failed to restore room identity:", error);
      });
  }, [displayName, joinRoom, participantId, room?._id, setIdentity]);

  if (room === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" data-testid="room-loading">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (room === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Room not found</CardTitle>
            <CardDescription>
              The room code <strong>{roomCode}</strong> is invalid or the room has been closed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleStartVoting = async () => {
    if (!room._id) return;
    try {
      await startVoting({ roomId: room._id });
    } catch (err) {
      console.error("Failed to start voting:", err);
    }
  };

  const hasTasks = tasks && tasks.length > 0;
  const hasParticipants = participants && participants.length > 0;
  const canStartVoting = hasTasks && hasParticipants;

  const handleReclaim = async () => {
    if (!room._id || !participantId) {
      return;
    }

    try {
      await takeoverSession({
        roomId: room._id,
        targetParticipantId: participantId,
      });

      const participant = participants?.find((entry: any) => entry._id === participantId);
      setIdentity(participantId, participant?.displayName ?? displayName ?? "");
    } catch (error) {
      console.error("Failed to reclaim session:", error);
    }
  };

  if (!participantId && roomCode) {
    return <IdentityFlow roomId={room._id} roomCode={roomCode} onIdentitySet={setIdentity} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background">
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r bg-muted/10 shrink-0 h-1/3 md:h-auto overflow-hidden">
        <TaskListManager
          roomId={room._id}
          tasks={tasks || []}
          currentTaskIndex={room.currentTaskIndex}
          importStatus={room.importStatus}
          importError={room.importError}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background relative h-1/3 md:h-auto">
        {participantId && (
          <SessionKickedBanner
            roomId={room._id}
            participantId={participantId}
            currentSessionId={sessionId}
            onReclaim={handleReclaim}
          />
        )}

        <header className="h-14 border-b flex items-center px-6 shrink-0 bg-card">
          <h1 className="text-lg font-semibold truncate">{room.name}</h1>
          <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
            <span>Code: <strong className="font-mono text-foreground tracking-widest">{room.roomCode}</strong></span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 flex flex-col">
          {room.status === "lobby" && (
            <div className="flex-1 flex items-center justify-center" data-testid="room-lobby">
              <div className="text-center max-w-md mx-auto space-y-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">Ready to estimate?</h2>
                  <p className="text-muted-foreground">
                    Wait for your team to join, or add tasks to get started.
                  </p>
                </div>
                <Button 
                  size="lg" 
                  className="w-full text-lg h-14"
                  onClick={handleStartVoting}
                  disabled={!canStartVoting}
                >
                  Start Voting
                </Button>
                {!hasTasks && (
                  <p className="text-sm text-destructive">Add at least one task to start voting.</p>
                )}
              </div>
            </div>
          )}

          {(room.status === "voting" || room.status === "revealed") && currentTask && participantId && (
            <div data-testid="voting-area" className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
              <div className="w-full max-w-2xl">
                <h2 className="text-xl font-semibold mb-2">{currentTask.title}</h2>
                {currentTask.description && (
                  <p className="text-sm text-muted-foreground mb-6">{currentTask.description}</p>
                )}
              </div>
              {room.status === "voting" && (
                <CardDeck
                  cardSet={room.cardSet}
                  currentVote={currentVote}
                  roomStatus={room.status}
                  taskId={currentTask._id}
                  participantId={participantId}
                  onVoteChange={setCurrentVote}
                />
              )}
              <ResultsPanel
                roomId={room._id}
                taskId={currentTask._id}
                roomStatus={room.status}
                cardSet={room.cardSet}
                participantCount={participants?.length ?? 0}
                votedCount={votedIds.length}
              />
            </div>
          )}
        </div>
      </main>

      <aside className="w-full md:w-72 border-t md:border-t-0 md:border-l bg-muted/10 shrink-0 h-1/3 md:h-auto overflow-hidden">
        <ParticipantList participants={participants || []} votedIds={votedIds} showVoteStatus={showVoteStatus} />
      </aside>
    </div>
  );
}
