import { convexAction, useConvexAction, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { BACKLOG_FILTER_ID } from "@convex/jiraTypes";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { JIRA_QUERY_OPTIONS } from "@/lib/persister";

interface Task {
  jiraKey?: string;
}

interface UseJiraSyncOptions {
  roomId: Id<"rooms">;
  projectKey: string;
  jiraEnabled: boolean;
  sprintFilter: number[];
  typeFilter: string[];
  tasks: Task[];
}

export function useJiraSync({
  roomId,
  projectKey,
  jiraEnabled,
  sprintFilter,
  typeFilter,
  tasks,
}: UseJiraSyncOptions) {
  const [localSprintFilter, setLocalSprintFilter] = useState<number[]>(
    sprintFilter.length === 0 ? [BACKLOG_FILTER_ID] : sprintFilter,
  );
  const [localTypeFilter, setLocalTypeFilter] = useState<string[]>(typeFilter);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hasSyncedRef = useRef(false);

  const { data: jiraSprints = [] } = useQuery({
    ...convexAction(api.jira.fetchJiraSprints, jiraEnabled ? { projectKey } : "skip"),
    ...JIRA_QUERY_OPTIONS,
  });

  const fetchJiraBacklog = useConvexAction(api.jira.fetchJiraBacklog);
  const importSelectedTasks = useConvexMutation(api.jira.importSelectedTasks);
  const saveSprintFilter = useConvexMutation(api.rooms.setSprintFilter);
  const saveTypeFilter = useConvexMutation(api.rooms.setTypeFilter);

  // Stable string keys for shallow array comparison (avoids JSON.stringify in deps)
  const sprintFilterKey = useMemo(() => sprintFilter.join(","), [sprintFilter]);
  const typeFilterKey = useMemo(() => typeFilter.join(","), [typeFilter]);

  // Keep local filters in sync when DB value changes (e.g. from another session)
  useEffect(() => {
    setLocalSprintFilter(sprintFilter.length === 0 ? [BACKLOG_FILTER_ID] : sprintFilter);
  }, [sprintFilterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLocalTypeFilter(typeFilter);
  }, [typeFilterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const doSync = async (ids: number[]) => {
    setSyncing(true);
    setSyncError(null);
    try {
      const issues = await fetchJiraBacklog({
        jiraProjectKey: projectKey,
        sprintIds: ids.length > 0 ? ids : undefined,
      });
      // Include all existing Jira task keys in fetchedKeys so that tasks
      // From a previously selected sprint are removed when the filter changes.
      const existingJiraKeys = tasks.filter((t) => t.jiraKey).map((t) => t.jiraKey!);
      const fetchedKeys = [...new Set([...issues.map((i) => i.key), ...existingJiraKeys])];
      await importSelectedTasks({
        fetchedKeys,
        keys: issues.map((i) => i.key),
        roomId,
      });
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // On mount: auto-sync (once)
  useEffect(() => {
    if (!jiraEnabled) {
      return;
    }
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      doSync(sprintFilter);
    }
  }, [jiraEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSprintFilter = (ids: number[]) => {
    setLocalSprintFilter(ids);
    saveSprintFilter({ roomId, sprintIds: ids });
    doSync(ids);
  };

  const toggleSprint = (id: number) => {
    const newIds = localSprintFilter.includes(id)
      ? localSprintFilter.filter((x) => x !== id)
      : [...localSprintFilter, id];
    updateSprintFilter(newIds);
  };

  const toggleType = (type: string) => {
    const newTypes = localTypeFilter.includes(type)
      ? localTypeFilter.filter((t) => t !== type)
      : [...localTypeFilter, type];
    setLocalTypeFilter(newTypes);
    saveTypeFilter({ roomId, types: newTypes });
  };

  const clearTypeFilter = () => {
    setLocalTypeFilter([]);
    saveTypeFilter({ roomId, types: [] });
  };

  const resetSyncFlag = () => {
    hasSyncedRef.current = false;
  };

  return {
    clearTypeFilter,
    doSync,
    jiraSprints,
    localSprintFilter,
    localTypeFilter,
    resetSyncFlag,
    syncError,
    syncing,
    toggleSprint,
    toggleType,
    updateSprintFilter,
  };
}
