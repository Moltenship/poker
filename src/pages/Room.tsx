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
import { Check, ArrowLeft, Users, Link as LinkIcon, ChevronDown, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useJiraDetails } from "@/hooks/useJiraDetails";
// eslint-disable-next-line @typescript-eslint/no-unused-vars

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const sessionId = useSessionId();
  const { participantId, displayName, setIdentity } = useIdentity(roomCode ?? "");

  const joinRoom = useSessionMutation((api as any).participants.joinRoom);
  const leaveRoom = useSessionMutation((api as any).participants.leaveRoom);
  const heartbeat = useSessionMutation((api as any).participants.heartbeat);
  const takeoverSession = useSessionMutation((api as any).participants.takeoverSession);
  const startVoting = useSessionMutation((api as any).voting.startVoting);
  const ensureQuickVote = useSessionMutation((api as any).tasks.ensureQuickVoteTask);

  const room = useQuery((api as any).rooms.getRoom, roomCode ? { roomCode } : "skip");
  const tasks = useQuery((api as any).tasks.getTasksForRoom, room?._id ? { roomId: room._id } : "skip");
  const participants = useQuery((api as any).participants.getParticipants, room?._id ? { roomId: room._id } : "skip");

  const jiraKeys = (tasks || []).filter((t: any) => t.jiraKey).map((t: any) => t.jiraKey!);
  const { details: jiraDetails } = useJiraDetails(jiraKeys);

  const currentTask = tasks && room ? tasks[room.currentTaskIndex] : null;
  const currentEnriched = currentTask?.jiraKey ? jiraDetails[currentTask.jiraKey] : undefined;
  const voteStatus = useQuery((api as any).voting.getVoteStatus, currentTask?._id ? { taskId: currentTask._id } : "skip");
  const myVote = useQuery((api as any).voting.getMyVote,
    currentTask?._id && participantId ? { taskId: currentTask._id, participantId } : "skip"
  );

  const votedIds = voteStatus?.filter((v: any) => v.hasVoted).map((v: any) => v.participantId) || [];
  const showVoteStatus = room?.status === "voting";
  const autoRejoinKeyRef = useRef<string | null>(null);
  const [currentVote, setCurrentVote] = useState<string | null>(null);

  useEffect(() => {
    if (myVote !== undefined) setCurrentVote(myVote);
  }, [myVote]);

  useEffect(() => {
    if (room?.name) {
      document.title = `${room.name} — Planning Poker`;
    }
    return () => { document.title = "Planning Poker"; };
  }, [room?.name]);
  const [copied, setCopied] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(() => {
    try { return localStorage.getItem("participants_sidebar_open") !== "false"; } catch { return true; }
  });

  const toggleParticipants = (value: boolean) => {
    setParticipantsOpen(value);
    try { localStorage.setItem("participants_sidebar_open", String(value)); } catch { /* ignore */ }
  };
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  useEffect(() => { setDescriptionOpen(false); }, [currentTask?._id]);

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

  // Heartbeat: keep isConnected alive; leave on unmount / tab close
  useEffect(() => {
    if (!room?._id) return;
    const send = () => heartbeat({ roomId: room._id }).catch(() => {});
    send();
    const interval = setInterval(send, 25_000);
    const onUnload = () => leaveRoom({ roomId: room._id }).catch(() => {});
    window.addEventListener("beforeunload", onUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onUnload);
      onUnload();
    };
  }, [room?._id, heartbeat, leaveRoom]);

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
      <aside className="w-full md:w-72 shrink-0 h-[30vh] md:h-full overflow-hidden bg-[var(--sidebar)]">
        <TaskListManager
          roomId={room._id}
          tasks={tasks || []}
          currentTaskIndex={room.currentTaskIndex}
          jiraEnabled={(room as any).jiraEnabled ?? false}
          projectKey={(room as any).jiraProjectKey ?? "BRV"}
          sprintFilter={(room as any).jiraSprintFilter ?? []}
          typeFilter={(room as any).jiraTypeFilter ?? []}
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
          {(room as any).jiraProjectKey && (
            <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              {(room as any).jiraProjectKey}
            </code>
          )}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="hidden md:flex text-muted-foreground"
                  onClick={() => toggleParticipants(!participantsOpen)}
                >
                  {participantsOpen ? <PanelRightClose /> : <PanelRightOpen />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{participantsOpen ? "Hide participants" : "Show participants"}</TooltipContent>
            </Tooltip>
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
                  <h2 className="text-sm font-semibold mb-0.5">
                    {currentEnriched?.url ? (
                      <a
                        href={currentEnriched.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline underline-offset-2"
                      >
                        {(currentTask as any).jiraKey && (
                          <span className="text-muted-foreground font-normal">{(currentTask as any).jiraKey}: </span>
                        )}
                        {currentEnriched?.title ?? currentTask.title ?? (currentTask as any).jiraKey}
                      </a>
                    ) : (currentEnriched?.title ?? currentTask.title ?? (currentTask as any).jiraKey ?? "Untitled")}
                  </h2>
                  {currentEnriched?.description && (
                    <div className="mt-1">
                      <button
                        onClick={() => setDescriptionOpen(o => !o)}
                        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronDown className={cn("size-3.5 transition-transform duration-200", descriptionOpen && "rotate-180")} />
                        {descriptionOpen ? "Hide description" : "Show description"}
                      </button>
                      {descriptionOpen && (
                        <div className="mt-2 text-left text-[13px]">
                          <Streamdown mode="static">{currentEnriched.description}</Streamdown>
                        </div>
                      )}
                    </div>
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
                  projectKey={(room as any).jiraProjectKey}
                  currentSprintName={currentEnriched?.sprintName}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Participants */}
      <aside className={cn(
        "shrink-0 overflow-hidden bg-[var(--sidebar)] transition-[width] duration-200 ease-in-out",
        "w-full h-[20vh] md:h-auto",
        participantsOpen ? "md:w-56" : "md:w-14"
      )}>
        {participantsOpen ? (
          <ParticipantList participants={participants || []} votedIds={votedIds} showVoteStatus={showVoteStatus} />
        ) : (
          <div className="hidden md:flex flex-col items-center gap-2 pt-3">
            {(participants || []).map((p: any) => (
              <Tooltip key={p._id}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar className="size-10">
                      <AvatarFallback className="text-sm font-medium">
                        {p.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-[var(--sidebar)]",
                      p.isConnected ? "bg-emerald-500" : "bg-muted-foreground/40"
                    )} />
                    {showVoteStatus && votedIds.includes(p._id) && (
                      <span className="absolute -top-1 -right-1 size-4 rounded-full bg-primary border-2 border-[var(--sidebar)] flex items-center justify-center">
                        <Check className="size-2.5 text-primary-foreground" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">{p.displayName}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
