import { useAction } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { api } from "../../convex/_generated/api";
import type { JiraComment } from "../../convex/jiraTypes";

export function useJiraComments(jiraKey: string | undefined) {
  const fetchComments = useAction(api.jira.fetchTaskComments);
  const [comments, setComments] = useState<JiraComment[]>([]);
  const [loading, setLoading] = useState(false);
  const prevKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (jiraKey === prevKeyRef.current) {
      return;
    }
    prevKeyRef.current = jiraKey;

    if (!jiraKey) {
      setComments([]);
      return;
    }

    setComments([]);
    setLoading(true);
    fetchComments({ jiraKey })
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [jiraKey, fetchComments]);

  return { comments, loading };
}
