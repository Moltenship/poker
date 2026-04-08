import { convexAction } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { JiraTaskDetails } from "@convex/jiraTypes";
import { useQuery } from "@tanstack/react-query";

import { JIRA_QUERY_OPTIONS } from "@/lib/persister";

export function useJiraDetails(jiraKeys: string[]) {
  const sortedKeys = [...jiraKeys].sort();
  const { data: details = {} as Record<string, JiraTaskDetails>, isPending: loading } = useQuery({
    ...convexAction(
      api.jira.fetchTaskDetails,
      sortedKeys.length > 0 ? { jiraKeys: sortedKeys } : "skip",
    ),
    ...JIRA_QUERY_OPTIONS,
  });

  return { details, loading };
}
