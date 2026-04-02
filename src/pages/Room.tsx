import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Link as LinkIcon,
  PanelRightClose,
  PanelRightOpen,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Streamdown } from "streamdown";

import { CardDeck } from "@/components/CardDeck";
import { ConnectionDot } from "@/components/ConnectionBanner";
import { EditCardSetDialog } from "@/components/EditCardSetDialog";
import { IdentityFlow } from "@/components/IdentityFlow";
import { ParticipantList } from "@/components/ParticipantList";
import { ResultsPanel } from "@/components/ResultsPanel";
import { SessionKickedBanner } from "@/components/SessionKickedBanner";
import { TaskListManager } from "@/components/TaskListManager";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIdentity } from "@/hooks/useIdentity";
import { useJiraDetails } from "@/hooks/useJiraDetails";
import { useSessionId, useSessionMutation } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

import { api } from "../../convex/_generated/api";

/** Image component with a skeleton placeholder to prevent layout shifts.
 *  Dimensions are read from a `#dim=WxH` URL hash fragment appended by the server.
 *  Clicking the image opens a full-size preview dialog. */
function DescriptionImage({ className: _className, src, ...props }: React.ComponentProps<"img">) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState(false);

  // Parse server-provided dimensions from URL hash (e.g., #dim=800x600)
  const { cleanSrc, width, height } = useMemo(() => {
    if (!src) {
      return { cleanSrc: src };
    }
    const hashIdx = src.indexOf("#dim=");
    if (hashIdx === -1) {
      return { cleanSrc: src };
    }
    const dimStr = src.slice(hashIdx + 5);
    const [w, h] = dimStr.split("x").map(Number);
    return {
      cleanSrc: src.slice(0, hashIdx),
      height: h || undefined,
      width: w || undefined,
    };
  }, [src]);

  if (error) {
    return <span className="text-muted-foreground text-xs italic">Image not available</span>;
  }

  return (
    <>
      {!loaded && (
        <span
          className="bg-muted block animate-pulse rounded-lg"
          style={
            width && height
              ? { aspectRatio: `${width}/${height}`, maxWidth: width, width: "100%" }
              : { height: 128, width: 192 }
          }
        />
      )}
      <img
        {...props}
        src={cleanSrc}
        width={width}
        height={height}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        onClick={() => setPreview(true)}
        className={cn(
          "max-w-full cursor-pointer rounded-lg",
          loaded
            ? "opacity-100 transition-opacity duration-300"
            : "!m-0 !h-0 !p-0 overflow-hidden opacity-0",
        )}
        style={width && height ? { height: "auto" } : undefined}
      />

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent
          className="w-auto max-w-[calc(100vw-2rem)] gap-0 border-0 bg-transparent p-0 shadow-none sm:max-w-[calc(100vw-2rem)]"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{props.alt || "Image preview"}</DialogTitle>
          <img
            src={cleanSrc}
            alt={props.alt}
            className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

const streamdownComponents = { img: DescriptionImage };

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const sessionId = useSessionId();
  const { participantId, displayName, setIdentity } = useIdentity(roomCode ?? "");

  const joinRoom = useSessionMutation(api.participants.joinRoom);
  const leaveRoom = useSessionMutation(api.participants.leaveRoom);
  const heartbeat = useSessionMutation(api.participants.heartbeat);
  const takeoverSession = useSessionMutation(api.participants.takeoverSession);
  const startVoting = useSessionMutation(api.voting.startVoting);

  const room = useQuery(api.rooms.getRoom, roomCode ? { roomCode } : "skip");
  const tasks = useQuery(api.tasks.getTasksForRoom, room?._id ? { roomId: room._id } : "skip");
  const participants = useQuery(
    api.participants.getParticipants,
    room?._id ? { roomId: room._id } : "skip",
  );

  const jiraKeys = (tasks || []).filter((t) => t.jiraKey).map((t) => t.jiraKey!);
  const { details: jiraDetails, loading: jiraLoading } = useJiraDetails(jiraKeys);

  const currentTask = tasks && room ? tasks[room.currentTaskIndex] : null;
  const taskIdentifier = currentTask?.jiraKey ?? currentTask?._id ?? null;
  const currentEnriched = currentTask?.jiraKey ? jiraDetails[currentTask.jiraKey] : undefined;
  const voteStatus = useQuery(
    api.voting.getVoteStatus,
    currentTask?._id ? { taskId: currentTask._id } : "skip",
  );
  const myVote = useQuery(
    api.voting.getMyVote,
    currentTask?._id && participantId ? { participantId, taskId: currentTask._id } : "skip",
  );

  const votedIds = voteStatus?.filter((v) => v.hasVoted).map((v) => v.participantId) || [];
  const showVoteStatus = room?.status === "voting";
  const autoRejoinKeyRef = useRef<string | null>(null);
  const [currentVote, setCurrentVote] = useState<string | null>(null);

  useEffect(() => {
    if (myVote !== undefined) {
      setCurrentVote(myVote);
    }
  }, [myVote]);

  useEffect(() => {
    if (room?.name) {
      document.title = `${room.name} — Planning Poker`;
    }
    return () => {
      document.title = "Planning Poker";
    };
  }, [room?.name]);

  // Track room in "Your rooms" localStorage list
  useEffect(() => {
    if (!room?.name || !roomCode) {
      return;
    }
    try {
      const key = "poker_recent_rooms";
      const stored = JSON.parse(localStorage.getItem(key) || "[]");
      const entry = { name: room.name, roomCode, visitedAt: Date.now() };
      const updated = [
        entry,
        ...stored.filter((r: { roomCode: string }) => r.roomCode !== roomCode),
      ].slice(0, 5);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      /* Ignore */
    }
  }, [room?.name, roomCode]);
  const [copied, setCopied] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(() => {
    try {
      return localStorage.getItem("participants_sidebar_open") !== "false";
    } catch {
      return true;
    }
  });

  const toggleParticipants = (value: boolean) => {
    setParticipantsOpen(value);
    try {
      localStorage.setItem("participants_sidebar_open", String(value));
    } catch {
      /* Ignore */
    }
  };

  useEffect(() => {
    if (!room?._id || !participantId || !displayName) {
      return;
    }
    const autoRejoinKey = `${room._id}:${participantId}:${displayName}`;
    if (autoRejoinKeyRef.current === autoRejoinKey) {
      return;
    }
    autoRejoinKeyRef.current = autoRejoinKey;

    joinRoom({ displayName, roomId: room._id })
      .then((nextParticipantId) => setIdentity(nextParticipantId, displayName))
      .catch((error) => {
        autoRejoinKeyRef.current = null;
        console.error("Failed to restore room identity:", error);
      });
  }, [displayName, joinRoom, participantId, room?._id, setIdentity]);

  // Heartbeat: keep isConnected alive; leave on unmount
  useEffect(() => {
    if (!room?._id) {
      return;
    }
    const send = () => heartbeat({ roomId: room._id }).catch(() => {});
    send();
    const interval = setInterval(send, 25_000);
    return () => {
      clearInterval(interval);
      leaveRoom({ roomId: room._id }).catch(() => {});
    };
  }, [room?._id, heartbeat, leaveRoom]);

  // Sync URL to current task
  const navigate = useNavigate();
  const prevTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Don't navigate until data is loaded
    if (room === undefined || tasks === undefined) {
      return;
    }

    const currentId = currentTask?._id ?? null;

    // Only navigate when the server's current task actually changed
    if (prevTaskIdRef.current === currentId) {
      return;
    }
    prevTaskIdRef.current = currentId;

    const targetPath = taskIdentifier
      ? `/room/${roomCode}/task/${taskIdentifier}`
      : `/room/${roomCode}`;

    navigate(targetPath, { replace: true });
  }, [currentTask?._id, taskIdentifier, roomCode, navigate, room, tasks]);

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
      <div
        className="bg-background flex h-screen items-center justify-center"
        data-testid="room-loading"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-muted-foreground text-[13px]">Loading...</p>
        </div>
      </div>
    );
  }

  if (room === null) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <div className="max-w-xs text-center">
          <h2 className="mb-1 text-sm font-semibold">Room not found</h2>
          <p className="text-muted-foreground mb-4 text-[13px]">
            Code{" "}
            <code className="bg-muted rounded px-1 py-0.5 font-mono text-[12px]">{roomCode}</code>{" "}
            is invalid or expired.
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
    if (!room._id) {
      return;
    }
    try {
      await startVoting({ roomId: room._id });
    } catch (err) {
      console.error(err);
    }
  };

  const hasParticipants = participants && participants.length > 0;
  const canStartVoting = hasParticipants;

  const handleReclaim = async () => {
    if (!room._id || !participantId) {
      return;
    }
    try {
      await takeoverSession({ roomId: room._id, targetParticipantId: participantId });
      const p = participants?.find((entry) => entry._id === participantId);
      setIdentity(participantId, p?.displayName ?? displayName ?? "");
    } catch (error) {
      console.error(error);
    }
  };

  if (!participantId && roomCode) {
    return <IdentityFlow roomId={room._id} roomCode={roomCode} onIdentitySet={setIdentity} />;
  }

  return (
    <div className="bg-background flex h-screen w-full flex-col overflow-hidden md:flex-row">
      {/* Tasks */}
      <aside className="h-[30vh] w-full shrink-0 overflow-hidden bg-[var(--sidebar)] md:h-full md:w-72">
        <TaskListManager
          roomId={room._id}
          roomCode={roomCode!}
          tasks={tasks || []}
          jiraEnabled={room.jiraEnabled ?? false}
          projectKey={room.jiraProjectKey ?? "BRV"}
          sprintFilter={room.jiraSprintFilter ?? []}
          typeFilter={room.jiraTypeFilter ?? []}
        />
      </aside>

      {/* Main */}
      <main className="relative flex min-w-0 flex-1 flex-[2] flex-col">
        {participantId && (
          <SessionKickedBanner
            roomId={room._id}
            participantId={participantId}
            currentSessionId={sessionId}
            onReclaim={handleReclaim}
          />
        )}

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
              {participants?.length ?? 0}
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
                  onClick={() => toggleParticipants(!participantsOpen)}
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

        <div className="flex flex-1 flex-col overflow-auto">
          {room.status === "lobby" && (
            <div className="flex flex-1 items-center justify-center p-6" data-testid="room-lobby">
              <div className="max-w-xs space-y-4 text-center">
                <h2 className="text-base font-semibold">Ready to estimate?</h2>
                <p className="text-muted-foreground text-[13px]">
                  Share the invite link, add tasks, then start.
                </p>
                <Button
                  className="h-8 w-full text-[13px]"
                  onClick={handleStartVoting}
                  disabled={!canStartVoting}
                >
                  Start Voting
                </Button>
              </div>
            </div>
          )}

          {(room.status === "voting" || room.status === "revealed") && participantId && (
            <>
              {room.status === "voting" && currentTask && (
                <div className="bg-background/95 sticky top-0 z-10 flex w-full justify-center py-3 backdrop-blur-sm">
                  <CardDeck
                    cardSet={room.cardSet}
                    currentVote={currentVote}
                    roomStatus={room.status}
                    taskId={currentTask._id}
                    participantId={participantId}
                    onVoteChange={setCurrentVote}
                  />
                </div>
              )}
              <div
                data-testid="voting-area"
                className={cn(
                  "flex-1 flex flex-col items-center gap-6 px-6 pt-2",
                  room.status === "voting" ? "pb-48" : "pb-6",
                )}
              >
                {room.status === "revealed" && currentTask && (
                  <ResultsPanel
                    roomId={room._id}
                    taskId={currentTask._id}
                    roomStatus={room.status}
                    cardSet={room.cardSet}
                    participantCount={participants?.length ?? 0}
                    votedCount={votedIds.length}
                    projectKey={room.jiraProjectKey}
                    currentSprintName={currentEnriched?.sprintName}
                  />
                )}
                {currentTask &&
                  (() => {
                    const isLoadingDetails =
                      jiraLoading && Boolean(currentTask.jiraKey) && !currentEnriched;
                    return (
                      <div className="w-full max-w-3xl">
                        {isLoadingDetails ? (
                          /* Blurred lorem-ipsum placeholder that mimics a real Jira ticket */
                          <div className="select-none" aria-hidden="true">
                            <h2 className="text-lg font-semibold blur-[6px]">
                              {currentTask.jiraKey && (
                                <span className="text-muted-foreground font-normal whitespace-nowrap">
                                  {currentTask.jiraKey}:&nbsp;
                                </span>
                              )}
                              Lorem ipsum dolor sit amet consectetur
                            </h2>
                            <div className="mt-5 space-y-4 text-left text-[13px] blur-[6px]">
                              <div>
                                <h3 className="mb-1 text-base font-semibold">Description</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                                  eiusmod tempor incididunt ut labore et dolore magna aliqua.
                                </p>
                              </div>
                              <div>
                                <h3 className="mb-1 text-base font-semibold">
                                  Acceptance criteria
                                </h3>
                                <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                                  <li>Ut enim ad minim veniam quis nostrud exercitation</li>
                                  <li>Duis aute irure dolor in reprehenderit</li>
                                  <li>Excepteur sint occaecat cupidatat non proident</li>
                                </ul>
                              </div>
                              <div>
                                <h3 className="mb-1 text-base font-semibold">Stakeholders</h3>
                                <p className="text-muted-foreground">@Lorem Ipsum @Dolor Sit</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Real content — fades in when ready */
                          <div className="animate-in fade-in duration-300">
                            <h2 className="text-lg font-semibold">
                              {currentEnriched?.url ? (
                                <a
                                  href={currentEnriched.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline-offset-2 hover:underline"
                                >
                                  {currentTask.jiraKey && (
                                    <span className="text-muted-foreground font-normal whitespace-nowrap">
                                      {currentTask.jiraKey}:&nbsp;
                                    </span>
                                  )}
                                  {currentEnriched?.title ??
                                    currentTask.title ??
                                    currentTask.jiraKey}
                                  <ExternalLink className="text-muted-foreground ml-1 inline size-3.5 align-[-1px]" />
                                </a>
                              ) : (
                                (currentEnriched?.title ??
                                currentTask.title ??
                                currentTask.jiraKey ??
                                "Untitled")
                              )}
                            </h2>
                            {currentEnriched?.description && (
                              <div className="mt-5 text-left text-[13px]">
                                <Streamdown mode="static" components={streamdownComponents}>
                                  {currentEnriched.description}
                                </Streamdown>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
            </>
          )}
        </div>

        {/* Floating vote status & reveal button — always visible during voting */}
        {room.status === "voting" && currentTask && participantId && (
          <div className="absolute right-4 bottom-4 z-20 w-72 drop-shadow-lg">
            <ResultsPanel
              roomId={room._id}
              taskId={currentTask._id}
              roomStatus={room.status}
              cardSet={room.cardSet}
              participantCount={participants?.length ?? 0}
              votedCount={votedIds.length}
              projectKey={room.jiraProjectKey}
              currentSprintName={currentEnriched?.sprintName}
            />
          </div>
        )}
      </main>

      {/* Participants */}
      <aside
        className={cn(
          "shrink-0 overflow-hidden bg-[var(--sidebar)] transition-[width] duration-200 ease-in-out",
          "w-full h-[20vh] md:h-auto",
          participantsOpen ? "md:w-56" : "md:w-14",
        )}
      >
        {participantsOpen ? (
          <ParticipantList
            participants={participants || []}
            votedIds={votedIds}
            showVoteStatus={showVoteStatus}
          />
        ) : (
          <div className="hidden flex-col items-center gap-2 pt-3 md:flex">
            {(participants || []).map((p) => (
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
        )}
      </aside>
    </div>
  );
}
