import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { JiraImportModal } from "./JiraImportModal";
import { AddTaskForm } from "./AddTaskForm";
import { useSessionMutation } from "@/hooks/useSession";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type Task = {
  _id: Id<"tasks">;
  title: string;
  jiraKey?: string;
  finalEstimate?: string;
  hoursEstimate?: number;
  isManual: boolean;
  isQuickVote?: boolean;
  order: number;
};

interface TaskListManagerProps {
  roomId: Id<"rooms">;
  tasks: Task[];
  currentTaskIndex: number;
  jiraProjectKey?: string;
  importStatus?: "idle" | "loading" | "success" | "error";
  importError?: string;
}

export function TaskListManager({ roomId, tasks, currentTaskIndex, jiraProjectKey, importStatus, importError }: TaskListManagerProps) {
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const setCurrentTask = useSessionMutation(api.tasks.setCurrentTask);
  const deleteTask = useSessionMutation(api.tasks.deleteTask);

  const handleTaskClick = async (index: number) => {
    try { await setCurrentTask({ roomId, taskIndex: index }); } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: Id<"tasks">) => {
    e.stopPropagation();
    try { await deleteTask({ taskId }); } catch (err) { console.error(err); }
  };

  return (
    <div className="flex flex-col h-full" data-testid="task-list-manager">
      <div className="h-11 px-4 flex items-center justify-between shrink-0">
        <span className="text-[13px] font-medium">Tasks</span>
        <button
          onClick={() => setIsJiraModalOpen(true)}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Import
        </button>
      </div>

      <div className="px-3 py-2 shrink-0">
        {isAddingTask ? (
          <div className="space-y-2">
            <AddTaskForm roomId={roomId} onSuccess={() => setIsAddingTask(false)} />
            <Button variant="ghost" size="sm" className="w-full h-6 text-[12px]" onClick={() => setIsAddingTask(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            className="flex w-full items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
            onClick={() => setIsAddingTask(true)}
          >
            <Plus className="h-3 w-3" />
            Add task
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {tasks.filter(t => !t.isQuickVote).length === 0 ? (
          <div className="p-4 text-center text-[12px] text-muted-foreground">
            No tasks yet.
          </div>
        ) : (
          <div className="py-0.5">
            {tasks.filter(t => !t.isQuickVote).map((task) => {
              const realIndex = tasks.indexOf(task);
              const isCurrent = realIndex === currentTaskIndex;
              const estimateText = task.hoursEstimate ? `${task.hoursEstimate}h` : task.finalEstimate;

              return (
                <div
                  key={task._id}
                  onClick={() => handleTaskClick(realIndex)}
                  className={`
                    group relative px-4 py-2 cursor-pointer transition-colors
                    ${isCurrent ? "bg-accent" : "hover:bg-accent/50"}
                  `}
                >
                  <div className="flex items-start justify-between gap-2 pr-5">
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[13px] leading-snug truncate ${isCurrent ? "text-foreground font-medium" : "text-foreground/70"}`}>
                        <span className="text-muted-foreground/50 mr-1 text-[11px]">{realIndex + 1}</span>
                        {task.title}
                      </span>
                      {task.jiraKey && (
                        <span className="text-[11px] text-muted-foreground/50">{task.jiraKey}</span>
                      )}
                    </div>
                    {estimateText && (
                      <Badge variant="secondary" className="shrink-0 font-mono text-[10px] h-4 px-1 rounded">
                        {estimateText}
                      </Badge>
                    )}
                  </div>

                  {task.isManual && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                      onClick={(e) => handleDeleteTask(e, task._id)}
                      aria-label={`Delete task ${task.title}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <JiraImportModal
        roomId={roomId}
        isOpen={isJiraModalOpen}
        onClose={() => setIsJiraModalOpen(false)}
        hasExistingTasks={tasks.length > 0}
        defaultProjectKey={jiraProjectKey}
        importStatus={importStatus}
        importError={importError}
      />
    </div>
  );
}
