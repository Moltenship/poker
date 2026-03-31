import React, { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Trash2, RotateCw, SlidersHorizontal } from "lucide-react";
import { JiraImportModal } from "./JiraImportModal";
import { useSessionMutation } from "@/hooks/useSession";
import { useJiraDetails } from "@/hooks/useJiraDetails";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { JiraSprint } from "../../convex/jira";
import { cn } from "@/lib/utils";

export type Task = {
  _id: Id<"tasks">;
  title?: string;
  jiraKey?: string;
  hoursEstimate?: number;
  isManual: boolean;
  isQuickVote?: boolean;
  order: number;
};

interface TaskListManagerProps {
  roomId: Id<"rooms">;
  tasks: Task[];
  currentTaskIndex: number;
  jiraEnabled: boolean;
  sprintFilter: number[];
  typeFilter: string[];
}

export function TaskListManager({ roomId, tasks, currentTaskIndex, jiraEnabled, sprintFilter, typeFilter }: TaskListManagerProps) {
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Jira mode state
  const [jiraSprints, setJiraSprints] = useState<JiraSprint[]>([]);
  const [localSprintFilter, setLocalSprintFilter] = useState<number[]>(sprintFilter);
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
  const jiraKeys = tasks.filter(t => t.jiraKey).map(t => t.jiraKey!);
  const { details: jiraDetails } = useJiraDetails(jiraKeys);

  // Keep local filters in sync when DB value changes (e.g. from another session)
  useEffect(() => {
    setLocalSprintFilter(sprintFilter);
  }, [JSON.stringify(sprintFilter)]);

  useEffect(() => {
    setLocalTypeFilter(typeFilter);
  }, [JSON.stringify(typeFilter)]);

  // Derive unique types from enriched Jira details
  const availableTypes = [...new Set(Object.values(jiraDetails).map(d => d.type).filter(Boolean))].sort();

  const doSync = async (ids: number[]) => {
    setSyncing(true);
    setSyncError(null);
    try {
      const issues = await fetchJiraBacklog({
        jiraProjectKey: "BRV",
        sprintIds: ids.length > 0 ? ids : undefined,
      });
      await importSelectedTasks({
        roomId,
        keys: issues.map(i => i.key),
        fetchedKeys: issues.map(i => i.key),
      });
    } catch (err: any) {
      setSyncError(err?.message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // On mount: fetch sprints + auto-sync (once)
  useEffect(() => {
    if (!jiraEnabled) return;
    fetchJiraSprints({}).then(setJiraSprints).catch(console.error);
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
      ? localSprintFilter.filter(x => x !== id)
      : [...localSprintFilter, id];
    updateSprintFilter(newIds);
  };

  const toggleType = (type: string) => {
    const newTypes = localTypeFilter.includes(type)
      ? localTypeFilter.filter(t => t !== type)
      : [...localTypeFilter, type];
    setLocalTypeFilter(newTypes);
    saveTypeFilter({ roomId, types: newTypes });
  };

  const clearTypeFilter = () => {
    setLocalTypeFilter([]);
    saveTypeFilter({ roomId, types: [] });
  };

  const handleClearTasks = async () => {
    try { await clearTasks({ roomId }); } catch (err) { console.error(err); }
    setConfirmClear(false);
    hasSyncedRef.current = false;
  };

  const handleTaskClick = async (index: number) => {
    try { await setCurrentTask({ roomId, taskIndex: index }); } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: Id<"tasks">) => {
    e.stopPropagation();
    try { await deleteTask({ taskId }); } catch (err) { console.error(err); }
  };

  const visibleTasks = tasks.filter(t => {
    if (t.isQuickVote) return false;
    if (localTypeFilter.length > 0 && t.jiraKey) {
      const type = jiraDetails[t.jiraKey]?.type;
      if (type && !localTypeFilter.includes(type)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full" data-testid="task-list-manager">

      {/* Header */}
      <div className="h-11 px-4 flex items-center justify-between shrink-0">
        <span className="text-[13px] font-medium">Tasks</span>
        {confirmClear ? (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">Clear all?</span>
            <Button size="xs" variant="destructive" className="h-5 px-1.5 text-[11px]" onClick={handleClearTasks}>Yes</Button>
            <Button size="xs" variant="ghost" className="h-5 px-1.5 text-[11px]" onClick={() => setConfirmClear(false)}>No</Button>
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
                            (localSprintFilter.length > 0 || localTypeFilter.length > 0) && "text-primary"
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
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sprints</span>
                        {localSprintFilter.length > 0 && (
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => updateSprintFilter([])}
                          >
                            Clear (backlog)
                          </button>
                        )}
                      </div>
                      {jiraSprints.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {jiraSprints.map(sprint => (
                            <button
                              key={sprint.id}
                              onClick={() => toggleSprint(sprint.id)}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                                localSprintFilter.includes(sprint.id)
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                              )}
                            >
                              {sprint.state === "active" && (
                                <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
                              )}
                              {sprint.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {syncing ? "Loading sprints…" : "No sprints found"}
                        </p>
                      )}
                      {localSprintFilter.length === 0 && jiraSprints.length > 0 && (
                        <p className="text-xs text-muted-foreground">Showing backlog items</p>
                      )}
                      {syncError && (
                        <p className="text-xs text-destructive truncate">{syncError}</p>
                      )}
                      {availableTypes.length > 0 && (
                        <>
                          <Separator className="my-1" />
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</span>
                            {localTypeFilter.length > 0 && (
                              <button
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                onClick={clearTypeFilter}
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {availableTypes.map(type => (
                              <button
                                key={type}
                                onClick={() => toggleType(type)}
                                className={cn(
                                  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                                  localTypeFilter.includes(type)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                                )}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                          {localTypeFilter.length === 0 && (
                            <p className="text-xs text-muted-foreground">Showing all types</p>
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

      <Separator />

      {/* Task list */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {visibleTasks.length === 0 ? (
          <div className="p-4 text-center text-[12px] text-muted-foreground">
            {syncing ? "Syncing from Jira…" : "No tasks yet."}
          </div>
        ) : (
          <div className={cn("w-full py-0.5 transition-opacity duration-150", syncing && "opacity-50")}>
            {visibleTasks.map((task) => {
              const realIndex = tasks.indexOf(task);
              const isCurrent = realIndex === currentTaskIndex;
              const estimateText = task.hoursEstimate ? `${task.hoursEstimate}h` : undefined;

              return (
                <div
                  key={task._id}
                  onClick={() => handleTaskClick(realIndex)}
                  className={cn(
                    "group relative px-4 py-2 cursor-pointer transition-colors",
                    isCurrent ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 pr-5 overflow-hidden">
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      {(() => {
                        const enriched = task.jiraKey ? jiraDetails[task.jiraKey] : undefined;
                        const displayTitle = enriched?.title ?? task.title ?? task.jiraKey ?? "Untitled";
                        return (
                          <>
                            <p className={cn(
                              "text-[13px] leading-snug truncate",
                              isCurrent ? "text-foreground font-medium" : "text-foreground/70"
                            )}>
                              {displayTitle}
                            </p>
                            {task.jiraKey && (
                              <span className="text-[11px] text-muted-foreground/50 truncate">
                                {task.jiraKey}
                                {enriched?.type && <> · {enriched.type}</>}
                                {enriched?.status && <> · {enriched.status}</>}
                                {enriched?.sprintName && <> · {enriched.sprintName}</>}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    {estimateText && (
                      <Badge variant="secondary" className="shrink-0 font-mono text-[10px] h-4 px-1 rounded">
                        {estimateText}
                      </Badge>
                    )}
                  </div>

                  {task.isManual && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteTask(e, task._id)}
                        >
                          <X />
                          <span className="sr-only">Delete {task.title}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete task</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <JiraImportModal
        roomId={roomId}
        isOpen={isJiraModalOpen}
        onClose={() => setIsJiraModalOpen(false)}
        sprintFilter={localSprintFilter}
      />
    </div>
  );
}
