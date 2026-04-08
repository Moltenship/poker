import { convexAction, useConvexAction } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { JIRA_QUERY_OPTIONS } from "@/lib/persister";
import { cn } from "@/lib/utils";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface JiraSprintSelectorProps {
  taskId: Id<"tasks">;
  projectKey: string;
  currentSprintName?: string;
  syncStatus?: "syncing" | "synced" | "error";
  syncError?: string;
}

export function JiraSprintSelector({
  taskId,
  projectKey,
  currentSprintName,
  syncStatus,
  syncError,
}: JiraSprintSelectorProps) {
  const { data: sprints = [], isPending: loading } = useQuery({
    ...convexAction(api.jira.fetchJiraSprints, { projectKey }),
    ...JIRA_QUERY_OPTIONS,
  });

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const moveToSprint = useConvexAction(api.jira.moveIssueToSprint);

  // Sync from prop when sprints are loaded and no local selection yet
  useEffect(() => {
    if (!selectedId && currentSprintName && sprints.length > 0) {
      const match = sprints.find((s) => s.name === currentSprintName);
      if (match) {
        setSelectedId(String(match.id));
      }
    }
  }, [currentSprintName, sprints, selectedId]);

  const handleChange = (sprintId: string) => {
    setSelectedId(sprintId);
    moveToSprint({ sprintId: Number(sprintId), taskId }).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Sprint (Jira)</label>
      <div className="flex items-center gap-2">
        <Select
          value={selectedId}
          onValueChange={handleChange}
          disabled={loading || syncStatus === "syncing"}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? "Loading..." : "Select sprint"} />
          </SelectTrigger>
          <SelectContent>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                <span className="flex items-center gap-2">
                  {s.state === "active" && (
                    <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  )}
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {syncStatus === "syncing" && (
          <Loader2 className={cn("size-4 animate-spin text-muted-foreground shrink-0")} />
        )}
        {syncStatus === "synced" && <Check className={cn("size-4 text-emerald-500 shrink-0")} />}
        {syncStatus === "error" && <AlertTriangle className="text-destructive size-4 shrink-0" />}
      </div>
      {syncStatus === "error" && syncError && (
        <p className="text-destructive truncate text-xs">{syncError}</p>
      )}
    </div>
  );
}
