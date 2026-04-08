import type { Id } from "@convex/_generated/dataModel";
import { useRouterState } from "@tanstack/react-router";
import { Check, User, X } from "lucide-react";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EnrichedTask {
  title?: string;
  type?: string;
  status?: string;
  sprintName?: string;
  assignee?: string;
  labels?: string[];
  isBlocked?: boolean;
}

interface TaskRowProps {
  taskId: Id<"tasks">;
  taskPath: string;
  displayTitle: string;
  jiraKey?: string;
  enriched: EnrichedTask | undefined;
  isLoadingRow: boolean;
  isManual: boolean;
  isEstimated?: boolean;
  estimateText: string | undefined;
  title?: string;
  onTaskClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function TaskRow({
  taskId,
  taskPath,
  displayTitle,
  jiraKey,
  enriched,
  isLoadingRow,
  isManual,
  isEstimated,
  estimateText,
  title,
  onTaskClick,
  onDelete,
}: TaskRowProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = pathname === taskPath;

  return (
    <div
      key={taskId}
      role="button"
      tabIndex={0}
      onClick={onTaskClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTaskClick();
        }
      }}
      className={cn(
        "group relative block cursor-pointer transition-colors",
        isActive ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      {/* Blocked strip on the left edge */}
      {enriched?.isBlocked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="bg-destructive absolute inset-y-0 left-0 w-[3px] rounded-r-sm" />
          </TooltipTrigger>
          <TooltipContent side="right">Blocked</TooltipContent>
        </Tooltip>
      ) : null}

      <div
        className={cn(
          "py-2 pr-5 overflow-hidden",
          enriched?.isBlocked ? "pl-2.5 ml-[3px]" : "px-4",
        )}
      >
        {isLoadingRow ? (
          /* Blurred placeholder row while Jira details load */
          <div className="flex min-w-0 flex-col overflow-hidden select-none" aria-hidden="true">
            <p className="text-foreground/70 truncate text-[13px] leading-snug blur-[4px]">
              Lorem ipsum dolor sit amet
            </p>
            <span className="text-muted-foreground/50 truncate text-[11px] blur-[4px]">
              {jiraKey} · Story · In Progress · Sprint 1
            </span>
            <span className="text-muted-foreground/50 inline-flex items-center gap-0.5 truncate text-[11px] blur-[4px]">
              <User className="size-3 shrink-0" />
              <span className="truncate">Lorem Ipsum</span>
            </span>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2 overflow-hidden">
            <div className="flex min-w-0 flex-col overflow-hidden">
              <p
                className={cn(
                  "text-[13px] leading-snug truncate",
                  isActive ? "text-foreground font-medium" : "text-foreground/70",
                )}
              >
                {displayTitle}
              </p>
              {jiraKey ? (
                <span className="text-muted-foreground/50 truncate text-[11px]">
                  {jiraKey}
                  {enriched?.type ? <> · {enriched.type}</> : null}
                  {enriched?.status ? <> · {enriched.status}</> : null}
                  {enriched?.sprintName ? <> · {enriched.sprintName}</> : null}
                </span>
              ) : null}
              {enriched?.assignee ? (
                <span className="text-muted-foreground/50 inline-flex items-center gap-0.5 truncate text-[11px]">
                  <User className="size-3 shrink-0" />
                  <span className="truncate">{enriched.assignee}</span>
                </span>
              ) : null}
              {enriched?.labels && enriched.labels.length > 0 ? (
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {enriched.labels.map((label) => (
                    <span
                      key={label}
                      className="bg-primary/10 text-primary rounded px-1 py-px text-[10px] leading-tight"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isEstimated ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Estimated</TooltipContent>
                </Tooltip>
              ) : null}
              {estimateText ? (
                <Badge
                  variant="secondary"
                  className="h-4 shrink-0 rounded px-1 font-mono text-[10px]"
                >
                  {estimateText}
                </Badge>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {isManual ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 absolute top-1/2 right-2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
              onClick={onDelete}
            >
              <X />
              <span className="sr-only">Delete {title}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete task</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
