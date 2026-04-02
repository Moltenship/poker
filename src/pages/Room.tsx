import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { CardDeck } from "@/components/CardDeck";
import { CollapsedParticipantList } from "@/components/CollapsedParticipantList";
import { IdentityFlow } from "@/components/IdentityFlow";
import { ParticipantList } from "@/components/ParticipantList";
import { ResultsPanel } from "@/components/ResultsPanel";
import { RoomHeader } from "@/components/RoomHeader";
import { RoomLobby } from "@/components/RoomLobby";
import { RoomLoading, RoomNotFound, RoomRemoved } from "@/components/RoomStatusScreens";
import { SessionKickedBanner } from "@/components/SessionKickedBanner";
import { TaskDetails } from "@/components/TaskDetails";
import { TaskListManager } from "@/components/TaskListManager";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { useIdentity } from "@/hooks/useIdentity";
import { useJiraDetails } from "@/hooks/useJiraDetails";
import { useTrackRoom } from "@/hooks/useRecentRooms";
import { useSessionId, useSessionMutation } from "@/hooks/useSession";
import { useTaskUrlSync } from "@/hooks/useTaskUrlSync";
import { cn } from "@/lib/utils";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/** Stable empty arrays to avoid re-render from new references each render. */
const EMPTY_SPRINT_FILTER: number[] = [];
const EMPTY_TYPE_FILTER: string[] = [];

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const sessionId = useSessionId();
  const { participantId, displayName, setIdentity, clearIdentity } = useIdentity(roomCode ?? "");

  const joinRoom = useSessionMutation(api.participants.joinRoom);
  const leaveRoom = useSessionMutation(api.participants.leaveRoom);
  const heartbeat = useSessionMutation(api.participants.heartbeat);
  const takeoverSession = useSessionMutation(api.participants.takeoverSession);
  const startVoting = useSessionMutation(api.voting.startVoting);
  const toggleHost = useSessionMutation(api.participants.toggleHost);
  const removeParticipant = useSessionMutation(api.participants.removeParticipant);
  const updateDisplayName = useSessionMutation(api.participants.updateDisplayName);

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

  // Derive host status and filter voters (exclude hosts from vote counting)
  const myParticipant = participants?.find((p) => p._id === participantId);
  const isHost = myParticipant?.isHost ?? false;
  const hasAnyHost = participants?.some((p) => p.isHost) ?? false;

  const voters = voteStatus?.filter((v) => !v.isHost) || [];
  const votedIds = voters.filter((v) => v.hasVoted).map((v) => v.participantId) || [];
  const voterCount = voters.length;

  // Detect removal: participantId is set but not found in loaded participants list
  const wasRemoved =
    Boolean(participantId) &&
    participants !== undefined &&
    !participants.some((p) => p._id === participantId);

  const showVoteStatus = room?.status === "voting";
  const autoRejoinKeyRef = useRef<string | null>(null);

  // Derive currentVote from server state (no useEffect sync needed).
  // Optimistic vote stores the user's selection while the server round-trips.
  const [optimisticVote, setOptimisticVote] = useState<string | null>(null);
  const currentVote = myVote !== undefined ? myVote : optimisticVote;

  useDocumentTitle(room?.name);
  useTrackRoom(roomCode, room?.name);

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

  useHeartbeat(room?._id, heartbeat, leaveRoom);
  useTaskUrlSync(roomCode, room, tasks, currentTask?._id, taskIdentifier);

  // --- Early returns for status screens ---

  if (room === undefined) {
    return <RoomLoading />;
  }

  if (room === null) {
    return <RoomNotFound roomCode={roomCode} />;
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

  if (wasRemoved) {
    return <RoomRemoved onRejoin={() => clearIdentity()} />;
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
          sprintFilter={room.jiraSprintFilter ?? EMPTY_SPRINT_FILTER}
          typeFilter={room.jiraTypeFilter ?? EMPTY_TYPE_FILTER}
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

        <RoomHeader
          room={room}
          isHost={isHost}
          participantCount={participants?.length ?? 0}
          participantsOpen={participantsOpen}
          onToggleHost={() => toggleHost({ roomId: room._id }).catch(() => {})}
          onToggleParticipants={toggleParticipants}
        />

        <div className="flex flex-1 flex-col overflow-auto">
          {room.status === "lobby" ? (
            <RoomLobby canStartVoting={Boolean(canStartVoting)} onStartVoting={handleStartVoting} />
          ) : null}

          {(room.status === "voting" || room.status === "revealed") && participantId ? (
            <>
              {room.status === "voting" && currentTask ? (
                <div className="bg-background/95 sticky top-0 z-10 flex w-full justify-center py-3 backdrop-blur-sm">
                  {isHost ? (
                    <ResultsPanel
                      roomId={room._id}
                      taskId={currentTask._id}
                      roomStatus={room.status}
                      cardSet={room.cardSet}
                      participantCount={voterCount}
                      votedCount={votedIds.length}
                      isHost={isHost}
                      hasAnyHost={hasAnyHost}
                      projectKey={room.jiraProjectKey}
                      currentSprintName={currentEnriched?.sprintName}
                    />
                  ) : (
                    <CardDeck
                      cardSet={room.cardSet}
                      currentVote={currentVote}
                      roomStatus={room.status}
                      taskId={currentTask._id}
                      participantId={participantId}
                      onVoteChange={setOptimisticVote}
                    />
                  )}
                </div>
              ) : null}
              <div
                data-testid="voting-area"
                className={cn(
                  "flex-1 flex flex-col items-center gap-6 px-6 pt-2",
                  room.status === "voting" ? "pb-48" : "pb-6",
                )}
              >
                {room.status === "revealed" && currentTask ? (
                  <ResultsPanel
                    roomId={room._id}
                    taskId={currentTask._id}
                    roomStatus={room.status}
                    cardSet={room.cardSet}
                    participantCount={voterCount}
                    votedCount={votedIds.length}
                    isHost={isHost}
                    hasAnyHost={hasAnyHost}
                    projectKey={room.jiraProjectKey}
                    currentSprintName={currentEnriched?.sprintName}
                  />
                ) : null}
                {currentTask ? (
                  <TaskDetails
                    task={currentTask}
                    enriched={currentEnriched}
                    jiraLoading={jiraLoading}
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </div>
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
            currentUserIsHost={isHost}
            currentParticipantId={participantId ?? undefined}
            onRemoveParticipant={(id) => {
              removeParticipant({
                roomId: room._id,
                targetParticipantId: id as Id<"participants">,
              }).catch(() => {});
            }}
            onUpdateDisplayName={(name) => {
              updateDisplayName({ roomId: room._id, displayName: name })
                .then(() => {
                  if (participantId) {
                    setIdentity(participantId, name);
                  }
                })
                .catch(() => {});
            }}
          />
        ) : (
          <CollapsedParticipantList
            participants={participants || []}
            showVoteStatus={showVoteStatus}
            votedIds={votedIds}
          />
        )}
      </aside>
    </div>
  );
}
