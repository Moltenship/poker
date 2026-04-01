import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { JiraTaskDetails } from "../../convex/jiraTypes";

export function useJiraDetails(jiraKeys: string[]) {
  const fetchDetails = useAction(api.jira.fetchTaskDetails);
  const [details, setDetails] = useState<Record<string, JiraTaskDetails>>({});
  const [loading, setLoading] = useState(false);
  const prevKeysRef = useRef("");

  useEffect(() => {
    const keysStr = [...jiraKeys].sort().join(",");
    if (keysStr === prevKeysRef.current || jiraKeys.length === 0) return;
    prevKeysRef.current = keysStr;

    setLoading(true);
    fetchDetails({ jiraKeys })
      .then(setDetails)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [jiraKeys.join(",")]);

  return { details, loading };
}
