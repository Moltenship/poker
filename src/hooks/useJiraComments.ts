import { convexAction } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useQuery } from "@tanstack/react-query";

export function useJiraComments(jiraKey: string | undefined) {
  const { data: comments = [], isPending: loading } = useQuery({
    ...convexAction(api.jira.fetchTaskComments, jiraKey ? { jiraKey } : "skip"),
    staleTime: 5 * 60 * 1000,
  });

  return { comments, loading };
}
