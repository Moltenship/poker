import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSessionMutation, useSessionId } from "@/hooks/useSession";
import { useIdentity } from "@/hooks/useIdentity";

import { TaskListManager } from "@/components/TaskListManager";
import { ParticipantList } from "@/components/ParticipantList";
import { IdentityFlow } from "@/components/IdentityFlow";
import { SessionKickedBanner } from "@/components/SessionKickedBanner";
import { ConnectionDot } from "@/components/ConnectionBanner";
import { CardDeck } from "@/components/CardDeck";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Users, Link as LinkIcon } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const sessionId = useSessionId();
  const { participantId, displayName, setIdentity } = useIdentity(roomCode ?? "");

  const joinRoom = useSessionMutation((api as any).participants.joinRoom);
  const takeoverSession = useSessionMutation((api as any).participants.takeoverSession);
  const startVoting = useSessionMutation((api as any).voting.startVoting);
  const ensureQuickVote = useSessionMutation((api as any).tasks.ensureQuickVoteTask);

  const room = useQuery((api as any).rooms.getRoom, roomCode ? { roomCode } : "skip");
  const tasks = useQuery((api as any).tasks.getTasksForRoom, room?._id ? { roomId: room._id } : "skip");
  const participants = useQuery((api as any).participants.getParticipants, room?._id ? { roomId: room._id } : "skip");

  const currentTask = tasks && room ? tasks[room.currentTaskIndex] : null;
  const voteStatus = useQuery((api as any).voting.getVoteStatus, currentTask?._id ? { taskId: currentTask._id } : "skip");

  const votedIds = voteStatus?.filter((v: any) => v.hasVoted).map((v: any) => v.participantId) || [];
  const showVoteStatus = room?.status === "voting";
  const autoRejoinKeyRef = useRef<string | null>(null);
  const [currentVote, setCurrentVote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!room?._id || !participantId || !displayName) return;
    const autoRejoinKey = `${room._id}:${participantId}:${displayName}`;
    if (autoRejoinKeyRef.current === autoRejoinKey) return;
    autoRejoinKeyRef.current = autoRejoinKey;

    joinRoom({ roomId: room._id, displayName })
      .then((nextParticipantId) => setIdentity(nextParticipantId, displayName))
      .catch((error) => {
        autoRejoinKeyRef.current = null;
        console.error("Failed to restore room identity:", error);
      });
  }, [displayName, joinRoom, participantId, room?._id, setIdentity]);

  // Auto-create quick vote task when room is voting but has no current task
  const ensureQuickVoteRef = useRef(false);
  useEffect(() => {
    if (!room?._id || room.status !== "voting" || currentTask || ensureQuickVoteRef.current) return;
    ensureQuickVoteRef.current = true;
    ensureQuickVote({ roomId: room._id })
      .catch(console.error)
      .finally(() => { ensureQuickVoteRef.current = false; });
  }, [room?._id, room?.status, currentTask, ensureQuickVote]);

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/room/${roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const input = document.createElement("input");
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (room === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" data-testid="room-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-[13px] text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (room === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-xs">
          <h2 className="text-sm font-semibold mb-1">Room not found</h2>
          <p className="text-[13px] text-muted-foreground mb-4">
            Code <code className="font-mono text-[12px] bg-muted px-1 py-0.5 rounded">{roomCode}</code> is invalid or expired.
          </p>
          <Link to="/">
            <Button variant="secondary" size="sm" className="h-7 text-[13px]">
              <ArrowLeft className="mr-1.5 h-3 w-3" />
              Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleStartVoting = async () => {
    if (!room._id) return;
    try { await startVoting({ roomId: room._id }); } catch (err) { console.error(err); }
  };

  const hasParticipants = participants && participants.length > 0;
  const canStartVoting = hasParticipants;

  const handleReclaim = async () => {
    if (!room._id || !participantId) return;
    try {
      await takeoverSession({ roomId: room._id, targetParticipantId: participantId });
      const p = participants?.find((entry: any) => entry._id === participantId);
      setIdentity(participantId, p?.displayName ?? displayName ?? "");
    } catch (error) { console.error(error); }
  };

  if (!participantId && roomCode) {
    return <IdentityFlow roomId={room._id} roomCode={roomCode} onIdentitySet={setIdentity} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background">
      {/* Tasks */}
      <aside className="w-full md:w-72 shrink-0 h-[30vh] md:h-auto overflow-hidden bg-[var(--sidebar)]">
        <TaskListManager
          roomId={room._id}
          tasks={tasks || []}
          currentTaskIndex={room.currentTaskIndex}
          jiraProjectKey={room.jiraProjectKey}
          importStatus={room.importStatus}
          importError={room.importError}
        />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 relative flex-[2]">
        {participantId && (
          <SessionKickedBanner
            roomId={room._id}
            participantId={participantId}
            currentSessionId={sessionId}
            onReclaim={handleReclaim}
          />
        )}

        <header className="h-11 flex items-center px-4 shrink-0 gap-2">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Home">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <span className="text-[13px] font-medium truncate">{room.name}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {room.roomCode}
            </code>
            <button
              onClick={handleCopyLink}
              className="flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {copied ? (
                <><Check className="h-3 w-3 text-primary" /><span className="text-primary">Copied</span></>
              ) : (
                <><LinkIcon className="h-3 w-3" /><span className="hidden sm:inline">Invite</span></>
              )}
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {participants?.length ?? 0}
            </div>
            <div className="w-px h-4 bg-border mx-0.5" />
            <ConnectionDot />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 flex flex-col">
          {room.status === "lobby" && (
            <div className="flex-1 flex items-center justify-center" data-testid="room-lobby">
              <div className="text-center max-w-xs space-y-4">
                <h2 className="text-base font-semibold">Ready to estimate?</h2>
                <p className="text-[13px] text-muted-foreground">
                  Share the invite link, add tasks, then start.
                </p>
                <Button
                  className="w-full h-8 text-[13px]"
                  onClick={handleStartVoting}
                  disabled={!canStartVoting}
                >
                  Start Voting
                </Button>
              </div>
            </div>
          )}

          {(room.status === "voting" || room.status === "revealed") && participantId && (
            <div data-testid="voting-area" className="flex-1 flex flex-col items-center justify-center gap-6">
              {currentTask && !currentTask.isQuickVote && (
                <div className="w-full max-w-xl text-center">
                  <h2 className="text-sm font-semibold mb-0.5">{currentTask.title}</h2>
                  {currentTask.description && (
                    <p className="text-[13px] text-muted-foreground">{currentTask.description}</p>
                  )}
                </div>
              )}
              {room.status === "voting" && currentTask && (
                <CardDeck
                  cardSet={room.cardSet}
                  currentVote={currentVote}
                  roomStatus={room.status}
                  taskId={currentTask._id}
                  participantId={participantId}
                  onVoteChange={setCurrentVote}
                />
              )}
              {currentTask && (
                <ResultsPanel
                  roomId={room._id}
                  taskId={currentTask._id}
                  roomStatus={room.status}
                  cardSet={room.cardSet}
                  participantCount={participants?.length ?? 0}
                  votedCount={votedIds.length}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Participants */}
      <aside className="w-full md:w-56 shrink-0 h-[20vh] md:h-auto overflow-hidden bg-[var(--sidebar)]">
        <ParticipantList participants={participants || []} votedIds={votedIds} showVoteStatus={showVoteStatus} />
      </aside>
    </div>
  );
}
