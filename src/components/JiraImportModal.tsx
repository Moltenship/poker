import { useAction, useMutation } from "convex/react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { BACKLOG_FILTER_ID, type JiraIssue, type JiraSprint } from "../../convex/jiraTypes";

interface JiraImportModalProps {
  roomId: Id<"rooms">;
  projectKey: string;
  isOpen: boolean;
  onClose: () => void;
  sprintFilter: number[];
}

type Step = "loading" | "select" | "saving" | "success" | "error";

export function JiraImportModal({
  roomId,
  projectKey,
  isOpen,
  onClose,
  sprintFilter,
}: JiraImportModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [sprints, setSprints] = useState<JiraSprint[]>([]);
  const [selectedSprintIds, setSelectedSprintIds] = useState<number[]>([]);
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const fetchSprints = useAction(api.jira.fetchJiraSprints);
  const fetchBacklog = useAction(api.jira.fetchJiraBacklog);
  const importTasks = useMutation(api.jira.importSelectedTasks);
  const saveSprintFilter = useMutation(api.rooms.setSprintFilter);

  const loadIssues = (ids: number[]) =>
    fetchBacklog({ jiraProjectKey: projectKey, sprintIds: ids.length > 0 ? ids : undefined });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const ids = sprintFilter.length === 0 ? [BACKLOG_FILTER_ID] : sprintFilter;
    setStep("loading");
    setSelectedSprintIds(ids);
    setIssues([]);
    setSelected(new Set());
    setError("");

    Promise.all([fetchSprints({ projectKey }), loadIssues(ids)])
      .then(([sprintsResult, issuesResult]) => {
        setSprints(sprintsResult);
        setIssues(issuesResult);
        setSelected(new Set(issuesResult.map((i) => i.key)));
        setStep("select");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load");
        setStep("error");
      });
  }, [isOpen]);

  const updateSprintFilter = (ids: number[]) => {
    setSelectedSprintIds(ids);
    saveSprintFilter({ roomId, sprintIds: ids });
    setIssuesLoading(true);
    loadIssues(ids)
      .then((result) => {
        setIssues(result);
        setSelected(new Set(result.map((i) => i.key)));
      })
      .catch(() => {
        /* Keep current issues on error */
      })
      .finally(() => setIssuesLoading(false));
  };

  const toggleSprint = (id: number) => {
    const newIds = selectedSprintIds.includes(id)
      ? selectedSprintIds.filter((x) => x !== id)
      : [...selectedSprintIds, id];
    updateSprintFilter(newIds);
  };

  const doRefresh = () => {
    setIssuesLoading(true);
    loadIssues(selectedSprintIds)
      .then((result) => {
        setIssues(result);
        setSelected(new Set(result.map((i) => i.key)));
      })
      .finally(() => setIssuesLoading(false));
  };

  const handleImport = async () => {
    setStep("saving");
    try {
      await importTasks({
        fetchedKeys: issues.map((i) => i.key),
        keys: issues.filter((i) => selected.has(i.key)).map((i) => i.key),
        roomId,
      });
      setStep("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to import tasks");
      setStep("error");
    }
  };

  const toggleAll = () => {
    if (selected.size === issues.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(issues.map((i) => i.key)));
    }
  };

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Jira · {projectKey}</DialogTitle>
        </DialogHeader>

        {/* Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="text-muted-foreground size-7 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading sprints and backlog…</p>
          </div>
        )}

        {/* Select */}
        {step === "select" && (
          <div className="flex min-w-0 flex-col gap-3">
            {/* Sprint filter */}
            {sprints.length > 0 && (
              <>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Sprints
                    </span>
                    {selectedSprintIds.length > 0 && (
                      <button
                        className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                        onClick={() => updateSprintFilter([])}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => toggleSprint(BACKLOG_FILTER_ID)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                        selectedSprintIds.includes(BACKLOG_FILTER_ID)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      )}
                    >
                      Backlog
                    </button>
                    {sprints.map((sprint) => (
                      <button
                        key={sprint.id}
                        onClick={() => toggleSprint(sprint.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                          selectedSprintIds.includes(sprint.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        )}
                      >
                        {sprint.state === "active" && (
                          <span className="size-1.5 shrink-0 rounded-full bg-green-500" />
                        )}
                        {sprint.name}
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Issues */}
            {issues.length === 0 && !issuesLoading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">No items found.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleAll}
                    disabled={issuesLoading}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors disabled:pointer-events-none"
                  >
                    <Checkbox
                      checked={selected.size === issues.length && issues.length > 0}
                      onCheckedChange={toggleAll}
                    />
                    {selected.size === issues.length ? "Deselect all" : "Select all"}
                  </button>
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    {issuesLoading && <Loader2 className="size-3 animate-spin" />}
                    {selected.size} / {issues.length} selected
                  </span>
                </div>
                <Separator />
                <div
                  className={cn(
                    "h-64 overflow-y-auto overflow-x-hidden transition-opacity duration-150",
                    issuesLoading && "opacity-40 pointer-events-none",
                  )}
                >
                  <div className="flex flex-col gap-px">
                    {issues.map((issue) => (
                      <div
                        key={issue.key}
                        onClick={() => toggle(issue.key)}
                        className="hover:bg-muted/50 flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-md px-2 py-2 transition-colors"
                      >
                        <Checkbox
                          checked={selected.has(issue.key)}
                          onCheckedChange={() => toggle(issue.key)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={issue.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-0.5 font-mono text-xs"
                            >
                              {issue.key}
                              <ExternalLink className="size-2.5" />
                            </a>
                            <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px]">
                              {issue.status}
                            </Badge>
                          </div>
                          <p className="truncate text-sm">{issue.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={doRefresh} disabled={issuesLoading}>
                <RotateCcw data-icon="inline-start" />
                Refresh
              </Button>
              <Button
                size="sm"
                disabled={selected.size === 0 || issuesLoading}
                onClick={handleImport}
              >
                Add {selected.size > 0 ? `${selected.size} ` : ""}task
                {selected.size !== 1 ? "s" : ""} to room
              </Button>
            </div>
          </div>
        )}

        {/* Saving */}
        {step === "saving" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="text-muted-foreground size-7 animate-spin" />
            <p className="text-muted-foreground text-sm">Adding tasks to room…</p>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 className="size-12 text-green-500" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">
                {selected.size} task{selected.size !== 1 ? "s" : ""} added
              </p>
              <p className="text-muted-foreground text-sm">Ready to estimate.</p>
            </div>
            <Button className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertTriangle className="text-destructive size-12" />
            <div className="flex flex-col gap-1">
              <p className="text-destructive font-semibold">Something went wrong</p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setStep("loading");
                Promise.all([fetchSprints({ projectKey }), loadIssues(selectedSprintIds)])
                  .then(([s, i]) => {
                    setSprints(s);
                    setIssues(i);
                    setSelected(new Set(i.map((x) => x.key)));
                    setStep("select");
                  })
                  .catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Failed to load");
                    setStep("error");
                  });
              }}
            >
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
