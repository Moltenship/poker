import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSessionMutation, useSessionId } from "@/hooks/useSession";

import { TaskSidebar } from "@/components/TaskSidebar";
import { ParticipantList } from "@/components/ParticipantList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const sessionId = useSessionId();
  
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  
  const joinRoom = useSessionMutation((api as any).participants.joinRoom);
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

  useEffect(() => {
    if (participants && sessionId && !participantId) {
      const me = participants.find((p: any) => p.sessionId === sessionId);
      if (me) {
        setParticipantId(me._id);
      }
    }
  }, [participants, sessionId, participantId]);

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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim() || !room._id) return;
    
    try {
      const pid = await joinRoom({
        roomId: room._id,
        displayName: joinName.trim()
      });
      setParticipantId(pid);
    } catch (err) {
      console.error("Failed to join:", err);
    }
  };

  const handleStartVoting = async () => {
    if (!room._id) return;
    try {
      await startVoting({ roomId: room._id });
    } catch (err) {
      console.error("Failed to start voting:", err);
    }
  };

  const isJoined = !!participantId;
  const hasTasks = tasks && tasks.length > 0;
  const hasParticipants = participants && participants.length > 0;
  const canStartVoting = hasTasks && hasParticipants;

  if (!isJoined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Join {room.name}</CardTitle>
            <CardDescription>Enter your name to join the estimation session.</CardDescription>
          </CardHeader>
          <form onSubmit={handleJoin}>
            <CardContent className="space-y-4">
              <Input
                placeholder="Your Name"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                autoFocus
                maxLength={30}
              />
              <Button type="submit" className="w-full" disabled={!joinName.trim()}>
                Join Room
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background">
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r bg-muted/10 shrink-0 h-1/3 md:h-auto overflow-hidden">
        <TaskSidebar tasks={tasks || []} currentTaskIndex={room.currentTaskIndex} />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background relative h-1/3 md:h-auto">
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

          {room.status === "voting" && (
            <div data-testid="voting-area" className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Voting Area (Task 14)</p>
            </div>
          )}

          {room.status === "revealed" && (
            <div data-testid="results-area" className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Results Area (Task 15)</p>
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
