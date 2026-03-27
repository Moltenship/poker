import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  order: number;
};

interface TaskListManagerProps {
  roomId: Id<"rooms">;
  tasks: Task[];
  currentTaskIndex: number;
  importStatus?: "idle" | "loading" | "success" | "error";
  importError?: string;
}

export function TaskListManager({
  roomId,
  tasks,
  currentTaskIndex,
  importStatus,
  importError,
}: TaskListManagerProps) {
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const setCurrentTask = useSessionMutation(api.tasks.setCurrentTask);
  const deleteTask = useSessionMutation(api.tasks.deleteTask);

  const handleTaskClick = async (index: number) => {
    try {
      await setCurrentTask({ roomId, taskIndex: index });
    } catch (err) {
      console.error("Failed to set current task:", err);
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: Id<"tasks">) => {
    e.stopPropagation();
    try {
      await deleteTask({ taskId });
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  return (
    <Card className="flex flex-col h-full border-r rounded-none shadow-none" data-testid="task-list-manager">
      <CardHeader className="py-4 px-4 bg-muted/30 border-b flex-shrink-0 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Tasks</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setIsJiraModalOpen(true)}>
          Import Jira
        </Button>
      </CardHeader>
      
      <div className="p-4 border-b flex-shrink-0 bg-background">
        {isAddingTask ? (
          <div className="space-y-3">
            <AddTaskForm roomId={roomId} onSuccess={() => setIsAddingTask(false)} />
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setIsAddingTask(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => setIsAddingTask(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>

      <CardContent className="flex-1 p-0 overflow-hidden min-h-0 relative">
        <ScrollArea className="h-full absolute inset-0">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <p>No tasks yet. Add manually or import from Jira.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {tasks.map((task, index) => {
                const isCurrent = index === currentTaskIndex;
                const isCompleted = !!task.finalEstimate;
                const estimateText = task.hoursEstimate ? `${task.hoursEstimate}h` : task.finalEstimate;
                
                return (
                  <div
                    key={task._id}
                    onClick={() => handleTaskClick(index)}
                    className={`
                      group relative p-4 border-b last:border-b-0 cursor-pointer transition-colors
                      ${isCurrent ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50 border-l-2 border-l-transparent"}
                    `}
                  >
                    <div className="flex items-start justify-between gap-2 pr-8">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className={`text-sm font-medium truncate ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                          <span className="opacity-50 mr-2">#{index + 1}</span>
                          {task.title}
                        </span>
                        {task.jiraKey && (
                          <span className="text-xs text-muted-foreground">{task.jiraKey}</span>
                        )}
                      </div>
                      
                      {(estimateText || isCompleted) && (
                        <Badge variant="secondary" className="shrink-0 font-mono">
                          {estimateText}
                        </Badge>
                      )}
                    </div>
                    
                    {task.isManual && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive transition-opacity"
                        onClick={(e) => handleDeleteTask(e, task._id)}
                        aria-label={`Delete task ${task.title}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <JiraImportModal
        roomId={roomId}
        isOpen={isJiraModalOpen}
        onClose={() => setIsJiraModalOpen(false)}
        hasExistingTasks={tasks.length > 0}
        importStatus={importStatus}
        importError={importError}
      />
    </Card>
  );
}
