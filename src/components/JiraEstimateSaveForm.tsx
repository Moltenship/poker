import { convexAction } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useSessionAction } from "@/hooks/useSession";
import { JIRA_QUERY_OPTIONS } from "@/lib/persister";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type SaveFieldResult =
  | { attempted: false; success: false }
  | { attempted: true; success: true }
  | { attempted: true; success: false; error: string };

interface JiraEstimateSaveFormProps {
  taskId: Id<"tasks">;
  projectKey: string;
  isHost: boolean;
  hasAnyHost: boolean;
  savedEstimate?: string;
  savedSprintId?: number;
  savedSprintName?: string;
  currentSprintName?: string;
}

export function JiraEstimateSaveForm({
  taskId,
  projectKey,
  isHost,
  hasAnyHost,
  savedEstimate,
  savedSprintId,
  savedSprintName,
  currentSprintName,
}: JiraEstimateSaveFormProps) {
  const { data: sprints = [], isPending: sprintsLoading } = useQuery({
    ...convexAction(api.jira.fetchJiraSprints, { projectKey }),
    ...JIRA_QUERY_OPTIONS,
  });

  const [estimateDraft, setEstimateDraft] = useState<string>(savedEstimate ?? "");
  const [sprintDraft, setSprintDraft] = useState<string>(
    savedSprintId !== undefined ? String(savedSprintId) : "",
  );
  const [saving, setSaving] = useState(false);
  const [estimateResult, setEstimateResult] = useState<SaveFieldResult>({
    attempted: false,
    success: false,
  });
  const [sprintResult, setSprintResult] = useState<SaveFieldResult>({
    attempted: false,
    success: false,
  });

  const saveJira = useSessionAction(api.jira.saveJiraTaskUpdates);

  // Resolve currentSprintName -> id when no saved id is present.
  useEffect(() => {
    if (!sprintDraft && savedSprintId === undefined && currentSprintName && sprints.length > 0) {
      const match = sprints.find((s) => s.name === currentSprintName);
      if (match) {
        setSprintDraft(String(match.id));
      }
    }
  }, [savedSprintId, currentSprintName, sprints, sprintDraft]);

  const trimmedEstimate = estimateDraft.trim();
  const estimateChanged = trimmedEstimate !== "" && trimmedEstimate !== (savedEstimate ?? "");
  const sprintIdNum = sprintDraft ? Number(sprintDraft) : undefined;
  const sprintChanged = sprintIdNum !== undefined && sprintIdNum !== savedSprintId;
  const canSave = isHost && hasAnyHost && (estimateChanged || sprintChanged) && !saving;

  if (!hasAnyHost || !isHost) {
    return null;
  }

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setEstimateResult({ attempted: false, success: false });
    setSprintResult({ attempted: false, success: false });

    let sprintName: string | undefined;
    if (sprintChanged && sprintIdNum !== undefined) {
      const match = sprints.find((s) => s.id === sprintIdNum);
      sprintName = match?.name ?? savedSprintName;
    }

    try {
      const result = await saveJira({
        taskId,
        estimate: estimateChanged ? trimmedEstimate : undefined,
        sprintId: sprintChanged ? sprintIdNum : undefined,
        sprintName: sprintChanged ? sprintName : undefined,
      });
      setEstimateResult(result.estimate);
      setSprintResult(result.sprint);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      if (estimateChanged) {
        setEstimateResult({ attempted: true, success: false, error: message });
      }
      if (sprintChanged) {
        setSprintResult({ attempted: true, success: false, error: message });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Original Estimate (Jira)</label>
        <div className="flex items-center gap-2">
          <Input
            value={estimateDraft}
            onChange={(e) => setEstimateDraft(e.target.value)}
            placeholder="e.g. 4h, 4h 30m"
            className="flex-1"
            disabled={saving}
          />
          {estimateResult.attempted && estimateResult.success && (
            <Check className="size-4 shrink-0 text-emerald-500" />
          )}
          {estimateResult.attempted && !estimateResult.success && (
            <AlertTriangle className="text-destructive size-4 shrink-0" />
          )}
        </div>
        {estimateResult.attempted && !estimateResult.success && (
          <p className="text-destructive truncate text-xs">{estimateResult.error}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Sprint (Jira)</label>
        <div className="flex items-center gap-2">
          <Select
            value={sprintDraft || undefined}
            onValueChange={setSprintDraft}
            disabled={sprintsLoading || saving}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={sprintsLoading ? "Loading..." : "Select sprint"} />
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
          {sprintResult.attempted && sprintResult.success && (
            <Check className="size-4 shrink-0 text-emerald-500" />
          )}
          {sprintResult.attempted && !sprintResult.success && (
            <AlertTriangle className="text-destructive size-4 shrink-0" />
          )}
        </div>
        {sprintResult.attempted && !sprintResult.success && (
          <p className="text-destructive truncate text-xs">{sprintResult.error}</p>
        )}
      </div>

      <div>
        <Button type="button" size="sm" disabled={!canSave} onClick={handleSave}>
          {saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}

interface JiraSavedSummaryProps {
  savedEstimate?: string;
  savedSprintName?: string;
}

export function JiraSavedSummary({ savedEstimate, savedSprintName }: JiraSavedSummaryProps) {
  if (!savedEstimate && !savedSprintName) {
    return <p className="text-muted-foreground text-sm">No Jira estimate saved yet.</p>;
  }
  return (
    <div className="flex flex-col gap-1 text-sm">
      {savedEstimate && (
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground">Original Estimate:</span>
          <span className="font-medium">{savedEstimate}</span>
        </div>
      )}
      {savedSprintName && (
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground">Sprint:</span>
          <span className="font-medium">{savedSprintName}</span>
        </div>
      )}
    </div>
  );
}
