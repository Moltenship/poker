import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface JiraEstimateInputProps {
  taskId: Id<"tasks">;
  syncStatus?: "syncing" | "synced" | "error";
  syncError?: string;
}

export function JiraEstimateInput({ taskId, syncStatus, syncError }: JiraEstimateInputProps) {
  const [value, setValue] = useState("");
  const updateEstimate = useAction(api.jira.updateJiraEstimate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    updateEstimate({ taskId, estimate: trimmed }).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Original Estimate (Jira)</label>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 4h, 4h 30m"
          className="flex-1"
          disabled={syncStatus === "syncing"}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!value.trim() || syncStatus === "syncing"}
        >
          {syncStatus === "syncing" ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            "Set"
          )}
        </Button>
        {syncStatus === "synced" && (
          <Check className={cn("size-4 text-emerald-500 shrink-0")} />
        )}
        {syncStatus === "error" && (
          <AlertTriangle className="size-4 text-destructive shrink-0" />
        )}
      </form>
      {syncStatus === "error" && syncError && (
        <p className="text-xs text-destructive truncate">{syncError}</p>
      )}
    </div>
  );
}
