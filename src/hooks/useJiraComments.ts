import { convexAction } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useQuery } from "@tanstack/react-query";

import { JIRA_QUERY_OPTIONS } from "@/lib/persister";

export function useJiraComments(jiraKey: string | undefined) {
  const { data: comments = [], isPending: loading } = useQuery({
    ...convexAction(api.jira.fetchTaskComments, jiraKey ? { jiraKey } : "skip"),
    ...JIRA_QUERY_OPTIONS,
  });

  return { comments, loading };
}
