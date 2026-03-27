import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Task = {
  _id: string;
  title: string;
  order: number;
  finalEstimate?: string;
};

interface TaskSidebarProps {
  tasks: Task[];
  currentTaskIndex: number;
}

export function TaskSidebar({ tasks, currentTaskIndex }: TaskSidebarProps) {
  return (
    <Card className="h-full border-r rounded-none shadow-none" data-testid="task-sidebar">
      <CardHeader className="py-4 px-4 bg-muted/30">
        <CardTitle className="text-lg">Tasks</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-100px)]">
          {tasks.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No tasks added yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {tasks.map((task, index) => {
                const isCurrent = index === currentTaskIndex;
                const isCompleted = !!task.finalEstimate;
                
                return (
                  <div
                    key={task._id}
                    className={`
                      p-4 border-b last:border-b-0 cursor-default transition-colors
                      ${isCurrent ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-muted/50 border-l-4 border-l-transparent"}
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                        {task.title}
                      </span>
                      {isCompleted && (
                        <Badge variant="secondary" className="shrink-0 font-mono">
                          {task.finalEstimate}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
