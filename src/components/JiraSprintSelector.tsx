import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { JiraSprint } from "../../convex/jira";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [sprints, setSprints] = useState<JiraSprint[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchSprints = useAction(api.jira.fetchJiraSprints);
  const moveToSprint = useAction(api.jira.moveIssueToSprint);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSprints({ projectKey })
      .then((result) => {
        if (!cancelled) setSprints(result);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectKey, fetchSprints]);

  const handleChange = (sprintId: string) => {
    moveToSprint({ taskId, sprintId: Number(sprintId) }).catch(() => {});
  };

  const currentSprint = sprints.find((s) => s.name === currentSprintName);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Sprint (Jira)</label>
      <div className="flex items-center gap-2">
        <Select
          value={currentSprint ? String(currentSprint.id) : undefined}
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
                    <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
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
        {syncStatus === "synced" && (
          <Check className={cn("size-4 text-emerald-500 shrink-0")} />
        )}
        {syncStatus === "error" && (
          <AlertTriangle className="size-4 text-destructive shrink-0" />
        )}
      </div>
      {syncStatus === "error" && syncError && (
        <p className="text-xs text-destructive truncate">{syncError}</p>
      )}
    </div>
  );
}
