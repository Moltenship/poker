import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RotateCw, SlidersHorizontal, Trash2 } from "lucide-react";
import React, { useState } from "react";

import { SprintFilterChips } from "@/components/SprintFilterChips";
import { TaskRow } from "@/components/TaskRow";
import { TypeFilterChips } from "@/components/TypeFilterChips";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useJiraDetails } from "@/hooks/useJiraDetails";
import { useJiraSync } from "@/hooks/useJiraSync";
import { useSessionMutation } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

export interface Task {
  _id: Id<"tasks">;
  title?: string;
  jiraKey?: string;
  hoursEstimate?: number;
  isManual: boolean;
  isEstimated?: boolean;

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
  const [confirmClear, setConfirmClear] = useState(false);

  const setCurrentTask = useSessionMutation(api.tasks.setCurrentTask);
  const deleteTask = useSessionMutation(api.tasks.deleteTask);
  const clearTasks = useSessionMutation(api.tasks.clearTasks);

  // Fetch Jira details for all tasks with jiraKey
  const jiraKeys = tasks.filter((t) => t.jiraKey).map((t) => t.jiraKey!);
  const { details: jiraDetails, loading: jiraLoading } = useJiraDetails(jiraKeys);

  // Jira sync: sprints, filters, sync state
  const {
    clearTypeFilter,
    doSync,
    jiraSprints,
    localSprintFilter,
    localTypeFilter,
    resetSyncFlag,
    syncError,
    syncing,
    toggleSprint,
    toggleType,
    updateSprintFilter,
  } = useJiraSync({
    jiraEnabled,
    projectKey,
    roomId,
    sprintFilter,
    tasks,
    typeFilter,
  });

  // Derive unique types from enriched Jira details
  const availableTypes = [
    ...new Set(
      Object.values(jiraDetails)
        .map((d) => d.type)
        .filter(Boolean),
    ),
  ].sort();

  const handleClearTasks = async () => {
    try {
      await clearTasks({ roomId });
    } catch (err) {
      console.error(err);
    }
    setConfirmClear(false);
    resetSyncFlag();
  };

  const handleTaskClick = async (index: number) => {
    try {
      await setCurrentTask({ roomId, taskIndex: index });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = (e: React.MouseEvent, taskId: Id<"tasks">) => {
    e.stopPropagation();
    deleteTask({ taskId }).catch(console.error);
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
            {visibleTasks.length > 0 ? (
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
            ) : null}
            {jiraEnabled ? (
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
                      <SprintFilterChips
                        sprints={jiraSprints}
                        selectedIds={localSprintFilter}
                        syncing={syncing}
                        syncError={syncError}
                        onToggle={toggleSprint}
                        onClear={() => updateSprintFilter([])}
                      />
                      <TypeFilterChips
                        availableTypes={availableTypes}
                        selectedTypes={localTypeFilter}
                        onToggle={toggleType}
                        onClear={clearTypeFilter}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            ) : null}
          </div>
        )}
      </div>

      <Separator />

      {/* Task list */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {visibleTasks.length === 0 ? (
          <div className="text-muted-foreground p-4 text-center text-[12px]">
            {syncing ? "Syncing from Jira\u2026" : "No tasks yet."}
          </div>
        ) : (
          <div
            className={cn("w-full py-0.5 transition-opacity duration-150", syncing && "opacity-50")}
          >
            {visibleTasks.map((task) => {
              const realIndex = tasks.indexOf(task);
              const enriched = task.jiraKey ? jiraDetails[task.jiraKey] : undefined;

              return (
                <TaskRow
                  key={task._id}
                  taskId={task._id}
                  taskPath={`/room/${roomCode}/task/${task.jiraKey ?? task._id}`}
                  displayTitle={enriched?.title ?? task.title ?? task.jiraKey ?? "Untitled"}
                  jiraKey={task.jiraKey}
                  enriched={enriched}
                  isLoadingRow={jiraLoading && Boolean(task.jiraKey) && !enriched}
                  isManual={task.isManual}
                  isEstimated={task.isEstimated}
                  estimateText={task.hoursEstimate ? `${task.hoursEstimate}h` : undefined}
                  title={task.title}
                  onTaskClick={() => handleTaskClick(realIndex)}
                  onDelete={(e) => handleDeleteTask(e, task._id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
