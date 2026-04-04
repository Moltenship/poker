import { convexAction } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { JiraTaskDetails } from "@convex/jiraTypes";
import { useQuery } from "@tanstack/react-query";

export function useJiraDetails(jiraKeys: string[]) {
  const sortedKeys = [...jiraKeys].sort();
  const { data: details = {} as Record<string, JiraTaskDetails>, isPending: loading } = useQuery({
    ...convexAction(
      api.jira.fetchTaskDetails,
      sortedKeys.length > 0 ? { jiraKeys: sortedKeys } : "skip",
    ),
    staleTime: 5 * 60 * 1000,
  });

  return { details, loading };
}
