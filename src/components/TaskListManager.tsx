import { useAction, useMutation } from "convex/react";
import { RotateCw, SlidersHorizontal, Trash2, User, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useJiraDetails } from "@/hooks/useJiraDetails";
import { useSessionMutation } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { BACKLOG_FILTER_ID, type JiraSprint } from "../../convex/jiraTypes";
import { JiraImportModal } from "./JiraImportModal";

export interface Task {
  _id: Id<"tasks">;
  title?: string;
  jiraKey?: string;
  hoursEstimate?: number;
  isManual: boolean;

  order: number;
}

interface TaskListManagerProps {
  roomId: Id<"rooms">;
  roomCode: string;
  tasks: Task[];
  jiraEnabled: boolean;
  projectKey: string;
  sprintFilter: number[];
  typeFilter: string[];
}

export function TaskListManager({
  roomId,
  roomCode,
  tasks,
  jiraEnabled,
  projectKey,
  sprintFilter,
  typeFilter,
}: TaskListManagerProps) {
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Jira mode state
  const [jiraSprints, setJiraSprints] = useState<JiraSprint[]>([]);
  const [localSprintFilter, setLocalSprintFilter] = useState<number[]>(
    sprintFilter.length === 0 ? [BACKLOG_FILTER_ID] : sprintFilter,
  );
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hasSyncedRef = useRef(false);

  const setCurrentTask = useSessionMutation(api.tasks.setCurrentTask);
  const deleteTask = useSessionMutation(api.tasks.deleteTask);
  const clearTasks = useSessionMutation(api.tasks.clearTasks);
  const fetchJiraSprints = useAction(api.jira.fetchJiraSprints);
  const fetchJiraBacklog = useAction(api.jira.fetchJiraBacklog);
  const importSelectedTasks = useMutation(api.jira.importSelectedTasks);
  const saveSprintFilter = useMutation(api.rooms.setSprintFilter);
  const saveTypeFilter = useMutation(api.rooms.setTypeFilter);

  const [localTypeFilter, setLocalTypeFilter] = useState<string[]>(typeFilter);

  // Fetch Jira details for all tasks with jiraKey
  const jiraKeys = tasks.filter((t) => t.jiraKey).map((t) => t.jiraKey!);
  const { details: jiraDetails, loading: jiraLoading } = useJiraDetails(jiraKeys);

  // Keep local filters in sync when DB value changes (e.g. from another session)
  useEffect(() => {
    setLocalSprintFilter(sprintFilter.length === 0 ? [BACKLOG_FILTER_ID] : sprintFilter);
  }, [JSON.stringify(sprintFilter)]);

  useEffect(() => {
    setLocalTypeFilter(typeFilter);
  }, [JSON.stringify(typeFilter)]);

  // Derive unique types from enriched Jira details
  const availableTypes = [
    ...new Set(
      Object.values(jiraDetails)
        .map((d) => d.type)
        .filter(Boolean),
    ),
  ].sort();

  const doSync = async (ids: number[]) => {
    setSyncing(true);
    setSyncError(null);
    try {
      const issues = await fetchJiraBacklog({
        jiraProjectKey: projectKey,
        sprintIds: ids.length > 0 ? ids : undefined,
      });
      // Include all existing Jira task keys in fetchedKeys so that tasks
      // From a previously selected sprint are removed when the filter changes.
      const existingJiraKeys = tasks.filter((t) => t.jiraKey).map((t) => t.jiraKey!);
      const fetchedKeys = [...new Set([...issues.map((i) => i.key), ...existingJiraKeys])];
      await importSelectedTasks({
        fetchedKeys,
        keys: issues.map((i) => i.key),
        roomId,
      });
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // On mount: fetch sprints + auto-sync (once)
  useEffect(() => {
    if (!jiraEnabled) {
      return;
    }
    fetchJiraSprints({ projectKey }).then(setJiraSprints).catch(console.error);
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      doSync(sprintFilter);
    }
  }, [jiraEnabled]);

  const updateSprintFilter = (ids: number[]) => {
    setLocalSprintFilter(ids);
    saveSprintFilter({ roomId, sprintIds: ids });
    doSync(ids);
  };

  const toggleSprint = (id: number) => {
    const newIds = localSprintFilter.includes(id)
      ? localSprintFilter.filter((x) => x !== id)
      : [...localSprintFilter, id];
    updateSprintFilter(newIds);
  };

  const toggleType = (type: string) => {
    const newTypes = localTypeFilter.includes(type)
      ? localTypeFilter.filter((t) => t !== type)
      : [...localTypeFilter, type];
    setLocalTypeFilter(newTypes);
    saveTypeFilter({ roomId, types: newTypes });
  };

  const clearTypeFilter = () => {
    setLocalTypeFilter([]);
    saveTypeFilter({ roomId, types: [] });
  };

  const handleClearTasks = async () => {
    try {
      await clearTasks({ roomId });
    } catch (err) {
      console.error(err);
    }
    setConfirmClear(false);
    hasSyncedRef.current = false;
  };

  const handleTaskClick = async (index: number) => {
    try {
      await setCurrentTask({ roomId, taskIndex: index });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: Id<"tasks">) => {
    e.stopPropagation();
    try {
      await deleteTask({ taskId });
    } catch (err) {
      console.error(err);
    }
  };

  const visibleTasks = tasks.filter((t) => {
    if (localTypeFilter.length > 0 && t.jiraKey) {
      const type = jiraDetails[t.jiraKey]?.type;
      if (type && !localTypeFilter.includes(type)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col" data-testid="task-list-manager">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <span className="text-[13px] font-medium">Tasks</span>
        {confirmClear ? (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-[11px]">Clear all?</span>
            <Button
              size="xs"
              variant="destructive"
              className="h-5 px-1.5 text-[11px]"
              onClick={handleClearTasks}
            >
              Yes
            </Button>
            <Button
              size="xs"
              variant="ghost"
              className="h-5 px-1.5 text-[11px]"
              onClick={() => setConfirmClear(false)}
            >
              No
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            {visibleTasks.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmClear(true)}
                  >
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear all tasks</TooltipContent>
              </Tooltip>
            )}
            {jiraEnabled && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground"
                      disabled={syncing}
                      onClick={() => doSync(localSprintFilter)}
                    >
                      <RotateCw className={cn(syncing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sync from Jira</TooltipContent>
                </Tooltip>
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className={cn(
                            "text-muted-foreground",
                            (localSprintFilter.length > 0 || localTypeFilter.length > 0) &&
                              "text-primary",
                          )}
                        >
                          <SlidersHorizontal />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Filters</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-72 p-3" align="end">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          Sprints
                        </span>
                        {localSprintFilter.length > 0 && (
                          <button
                            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                            onClick={() => updateSprintFilter([])}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => toggleSprint(BACKLOG_FILTER_ID)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                            localSprintFilter.includes(BACKLOG_FILTER_ID)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                          )}
                        >
                          Backlog
                        </button>
                        {jiraSprints.map((sprint) => (
                          <button
                            key={sprint.id}
                            onClick={() => toggleSprint(sprint.id)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                              localSprintFilter.includes(sprint.id)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                            )}
                          >
                            {sprint.state === "active" && (
                              <span className="size-1.5 shrink-0 rounded-full bg-green-500" />
                            )}
                            {sprint.name}
                          </button>
                        ))}
                      </div>
                      {jiraSprints.length === 0 && (
                        <p className="text-muted-foreground text-xs">
                          {syncing ? "Loading sprints…" : "No sprints found"}
                        </p>
                      )}
                      {syncError && (
                        <p className="text-destructive truncate text-xs">{syncError}</p>
                      )}
                      {availableTypes.length > 0 && (
                        <>
                          <Separator className="my-1" />
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                              Type
                            </span>
                            {localTypeFilter.length > 0 && (
                              <button
                                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                                onClick={clearTypeFilter}
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {availableTypes.map((type) => (
                              <button
                                key={type}
                                onClick={() => toggleType(type)}
                                className={cn(
                                  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                                  localTypeFilter.includes(type)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                                )}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                          {localTypeFilter.length === 0 && (
                            <p className="text-muted-foreground text-xs">Showing all types</p>
                          )}
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
            {/* Import button hidden — modal kept for future use */}
          </div>
        )}
      </div>

      <Separator />

      {/* Task list */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {visibleTasks.length === 0 ? (
          <div className="text-muted-foreground p-4 text-center text-[12px]">
            {syncing ? "Syncing from Jira…" : "No tasks yet."}
          </div>
        ) : (
          <div
            className={cn("w-full py-0.5 transition-opacity duration-150", syncing && "opacity-50")}
          >
            {visibleTasks.map((task) => {
              const realIndex = tasks.indexOf(task);
              const estimateText = task.hoursEstimate ? `${task.hoursEstimate}h` : undefined;
              const enriched = task.jiraKey ? jiraDetails[task.jiraKey] : undefined;
              const isLoadingRow = jiraLoading && Boolean(task.jiraKey) && !enriched;
              const displayTitle = enriched?.title ?? task.title ?? task.jiraKey ?? "Untitled";

              const taskPath = `/room/${roomCode}/task/${task.jiraKey ?? task._id}`;

              return (
                <NavLink
                  key={task._id}
                  to={taskPath}
                  onClick={() => handleTaskClick(realIndex)}
                  className={({ isActive }) =>
                    cn(
                      "group relative block cursor-pointer transition-colors no-underline",
                      isActive ? "bg-accent" : "hover:bg-accent/50",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Blocked strip on the left edge */}
                      {enriched?.isBlocked && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="bg-destructive absolute inset-y-0 left-0 w-[3px] rounded-r-sm" />
                          </TooltipTrigger>
                          <TooltipContent side="right">Blocked</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        className={cn(
                          "py-2 pr-5 overflow-hidden",
                          enriched?.isBlocked ? "pl-2.5 ml-[3px]" : "px-4",
                        )}
                      >
                        {isLoadingRow ? (
                          /* Blurred placeholder row while Jira details load */
                          <div
                            className="flex min-w-0 flex-col overflow-hidden select-none"
                            aria-hidden="true"
                          >
                            <p className="text-foreground/70 truncate text-[13px] leading-snug blur-[4px]">
                              Lorem ipsum dolor sit amet
                            </p>
                            <span className="text-muted-foreground/50 truncate text-[11px] blur-[4px]">
                              {task.jiraKey} · Story · In Progress · Sprint 1
                            </span>
                            <span className="text-muted-foreground/50 inline-flex items-center gap-0.5 truncate text-[11px] blur-[4px]">
                              <User className="size-3 shrink-0" />
                              <span className="truncate">Lorem Ipsum</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2 overflow-hidden">
                            <div className="flex min-w-0 flex-col overflow-hidden">
                              <p
                                className={cn(
                                  "text-[13px] leading-snug truncate",
                                  isActive ? "text-foreground font-medium" : "text-foreground/70",
                                )}
                              >
                                {displayTitle}
                              </p>
                              {task.jiraKey && (
                                <span className="text-muted-foreground/50 truncate text-[11px]">
                                  {task.jiraKey}
                                  {enriched?.type && <> · {enriched.type}</>}
                                  {enriched?.status && <> · {enriched.status}</>}
                                  {enriched?.sprintName && <> · {enriched.sprintName}</>}
                                </span>
                              )}
                              {enriched?.assignee && (
                                <span className="text-muted-foreground/50 inline-flex items-center gap-0.5 truncate text-[11px]">
                                  <User className="size-3 shrink-0" />
                                  <span className="truncate">{enriched.assignee}</span>
                                </span>
                              )}
                            </div>
                            {estimateText && (
                              <Badge
                                variant="secondary"
                                className="h-4 shrink-0 rounded px-1 font-mono text-[10px]"
                              >
                                {estimateText}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {task.isManual && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 absolute top-1/2 right-2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                              onClick={(e) => handleDeleteTask(e, task._id)}
                            >
                              <X />
                              <span className="sr-only">Delete {task.title}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete task</TooltipContent>
                        </Tooltip>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>

      <JiraImportModal
        roomId={roomId}
        projectKey={projectKey}
        isOpen={isJiraModalOpen}
        onClose={() => setIsJiraModalOpen(false)}
        sprintFilter={localSprintFilter}
      />
    </div>
  );
}
