import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RotateCw, SlidersHorizontal, Trash2 } from "lucide-react";
import React, { useState } from "react";

import { LabelFilterChips } from "@/components/LabelFilterChips";
import { SortControls } from "@/components/SortControls";
import { SprintFilterChips } from "@/components/SprintFilterChips";
import { TaskRow } from "@/components/TaskRow";
import { TypeFilterChips } from "@/components/TypeFilterChips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useJiraDetails } from "@/hooks/useJiraDetails";
import { useJiraSync } from "@/hooks/useJiraSync";
import { useSessionMutation } from "@/hooks/useSession";
import { useTaskSort } from "@/hooks/useTaskSort";
import { isTaskVisible } from "@/lib/taskFilters";
import { DEFAULT_TASK_SORT_STATE, sortTasks } from "@/lib/taskSort";
import { cn } from "@/lib/utils";

export interface Task {
  _creationTime: number;
  _id: Id<"tasks">;
  title?: string;
  jiraKey?: string;
  savedJiraEstimate?: string;
  savedJiraSprintId?: number;
  savedJiraSprintName?: string;
  isManual: boolean;
  order: number;
}

interface TaskListManagerProps {
  roomId: Id<"rooms">;
  roomCode: string;
  tasks: Task[];
  jiraEnabled: boolean;
  labelFilter: string[];
  projectKey: string;
  sprintFilter: number[];
  typeFilter: string[];
}

export function TaskListManager({
  roomId,
  roomCode,
  tasks,
  jiraEnabled,
  labelFilter,
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
    clearLabelFilter,
    clearTypeFilter,
    doSync,
    jiraSprints,
    localLabelFilter,
    localSprintFilter,
    localTypeFilter,
    resetSyncFlag,
    syncError,
    syncing,
    toggleLabel,
    toggleSprint,
    toggleType,
    updateSprintFilter,
  } = useJiraSync({
    jiraEnabled,
    labelFilter,
    projectKey,
    roomId,
    sprintFilter,
    tasks,
    typeFilter,
  });

  const { sortState, setMode: setSortMode, setDirection: setSortDirection } = useTaskSort();
  const effectiveSortState = jiraEnabled ? sortState : DEFAULT_TASK_SORT_STATE;

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

  const filteredTasks = tasks.filter((t) => {
    const details = t.jiraKey ? jiraDetails[t.jiraKey] : undefined;
    return isTaskVisible({ details, labelFilter: localLabelFilter, typeFilter: localTypeFilter });
  });
  const visibleTasks = sortTasks(filteredTasks, jiraDetails, effectiveSortState);

  return (
    <div className="flex h-full flex-col" data-testid="task-list-manager">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between px-4">
        <span className="flex items-center gap-1.5 text-[13px] font-medium">
          Tasks
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {import.meta.env.DEV ? "Dev" : "Alpha"}
          </Badge>
        </span>
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
                            (sortState.mode !== "manual" ||
                              localSprintFilter.length > 0 ||
                              localLabelFilter.length > 0 ||
                              localTypeFilter.length > 0) &&
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
                      <SortControls
                        sortState={sortState}
                        onModeChange={setSortMode}
                        onDirectionChange={setSortDirection}
                      />
                      <Separator className="my-1" />
                      <SprintFilterChips
                        sprints={jiraSprints}
                        selectedIds={localSprintFilter}
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
                      <LabelFilterChips
                        selectedLabels={localLabelFilter}
                        onToggle={toggleLabel}
                        onClear={clearLabelFilter}
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
          <div className="text-muted-foreground p-4 text-center text-[12px]">No tasks yet.</div>
        ) : (
          <div className="w-full py-0.5">
            {visibleTasks.map((task) => {
              const realIndex = tasks.indexOf(task);
              const enriched = task.jiraKey ? jiraDetails[task.jiraKey] : undefined;
              const sprintLabel = task.savedJiraSprintName ?? enriched?.sprintName;

              return (
                <TaskRow
                  key={task._id}
                  taskId={task._id}
                  roomCode={roomCode}
                  taskIdentifier={task.jiraKey ?? task._id}
                  displayTitle={enriched?.title ?? task.title ?? task.jiraKey ?? "Untitled"}
                  jiraKey={task.jiraKey}
                  enriched={enriched}
                  sprintLabel={sprintLabel}
                  isLoadingRow={jiraLoading && Boolean(task.jiraKey) && !enriched}
                  isManual={task.isManual}
                  isEstimated={Boolean(task.savedJiraEstimate)}
                  estimateText={task.savedJiraEstimate}
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
