import { useConvexAction } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface JiraEstimateInputProps {
  taskId: Id<"tasks">;
  syncStatus?: "syncing" | "synced" | "error";
  syncError?: string;
}

export function JiraEstimateInput({ taskId, syncStatus, syncError }: JiraEstimateInputProps) {
  const [value, setValue] = useState("");
  const updateEstimate = useConvexAction(api.jira.updateJiraEstimate);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    updateEstimate({ estimate: trimmed, taskId }).catch(() => {});
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
        <Button type="submit" size="sm" disabled={!value.trim() || syncStatus === "syncing"}>
          {syncStatus === "syncing" ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            "Set"
          )}
        </Button>
        {syncStatus === "synced" && <Check className={cn("size-4 text-emerald-500 shrink-0")} />}
        {syncStatus === "error" && <AlertTriangle className="text-destructive size-4 shrink-0" />}
      </form>
      {syncStatus === "error" && syncError && (
        <p className="text-destructive truncate text-xs">{syncError}</p>
      )}
    </div>
  );
}
