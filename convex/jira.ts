import { v } from "convex/values";
import { action, mutation } from "./_generated/server";

const jiraGlobals = globalThis as typeof globalThis & {
  fetch: (input: string, init?: Record<string, unknown>) => Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<any>;
    text: () => Promise<string>;
  }>;
  btoa: (value: string) => string;
  process?: { env: Record<string, string | undefined> };
};

type AdfNode = { type: string; text?: string; content?: AdfNode[] };

function adfToPlainText(adf: unknown): string {
  if (!adf || typeof adf !== "object") return "";
  const parts: string[] = [];
  function extract(node: AdfNode): void {
    if (node.type === "text" && node.text) parts.push(node.text);
    else if (node.type === "hardBreak") parts.push("\n");
    else if (node.content) node.content.forEach(extract);
  }
  extract(adf as AdfNode);
  return parts.join("").trim();
}

function getJiraEnv() {
  const apiToken = jiraGlobals.process?.env.JIRA_API_TOKEN;
  const jiraEmail = jiraGlobals.process?.env.JIRA_EMAIL;
  const jiraBaseUrl = jiraGlobals.process?.env.JIRA_BASE_URL;
  if (!apiToken || !jiraEmail || !jiraBaseUrl) {
    throw new Error("JIRA_API_TOKEN, JIRA_EMAIL and JIRA_BASE_URL env vars are required");
  }
  return {
    authHeader: `Basic ${jiraGlobals.btoa(`${jiraEmail}:${apiToken}`)}`,
    baseUrl: jiraBaseUrl.replace(/\/$/, ""),
  };
}

export type JiraIssue = {
  key: string;
  title: string;
  status: string;
  type: string;
  url: string;
  description: string;
};

export const fetchJiraBacklog = action({
  args: {
    jiraProjectKey: v.string(),
    jql: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<JiraIssue[]> => {
    const { authHeader, baseUrl } = getJiraEnv();

    const effectiveJql =
      args.jql ||
      `project = "${args.jiraProjectKey}" AND sprint is EMPTY AND statusCategory != Done ORDER BY created DESC`;

    const allIssues: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    do {
      const body: Record<string, unknown> = {
        jql: effectiveJql,
        maxResults: 50,
        fields: ["summary", "status", "issuetype", "description"],
      };
      if (nextPageToken) body.nextPageToken = nextPageToken;

      const res = await jiraGlobals.fetch(`${baseUrl}/rest/api/3/search/jql`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Jira API error: ${res.status} ${await res.text()}`);
      }

      const data: {
        issues: Array<{ key: string; fields: Record<string, any> }>;
        nextPageToken?: string;
      } = await res.json();

      for (const issue of data.issues) {
        allIssues.push({
          key: issue.key,
          title: String(issue.fields.summary || issue.key),
          status: String(issue.fields.status?.name ?? ""),
          type: String(issue.fields.issuetype?.name ?? ""),
          url: `${baseUrl}/browse/${issue.key}`,
          description: adfToPlainText(issue.fields.description),
        });
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken && allIssues.length < 200);

    return allIssues;
  },
});

export const importSelectedTasks = mutation({
  args: {
    roomId: v.id("rooms"),
    tasks: v.array(
      v.object({
        key: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        url: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const existingByKey = new Map(
      existing.filter((t) => t.jiraKey).map((t) => [t.jiraKey!, t])
    );

    const maxOrder = existing.reduce((m, t) => Math.max(m, t.order), -1);
    let nextOrder = maxOrder + 1;

    for (const task of args.tasks) {
      const existingTask = existingByKey.get(task.key);
      if (existingTask) {
        await ctx.db.patch(existingTask._id, {
          title: task.title,
          description: task.description ?? undefined,
          jiraUrl: task.url,
        });
      } else {
        await ctx.db.insert("tasks", {
          roomId: args.roomId,
          jiraKey: task.key,
          title: task.title,
          description: task.description ?? undefined,
          jiraUrl: task.url,
          order: nextOrder++,
          isManual: false,
          isQuickVote: false,
        });
      }
    }
  },
});
