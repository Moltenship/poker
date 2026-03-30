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

export type JiraSprint = {
  id: number;
  name: string;
  state: "active" | "future" | "closed";
};

export type JiraIssue = {
  key: string;
  title: string;
  status: string;
  type: string;
  url: string;
  description: string;
};

export const fetchJiraSprints = action({
  args: {},
  handler: async (_ctx): Promise<JiraSprint[]> => {
    const { authHeader, baseUrl } = getJiraEnv();

    const boardRes = await jiraGlobals.fetch(
      `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=BRV&type=scrum&maxResults=1`,
      { headers: { Authorization: authHeader, Accept: "application/json" } }
    );
    if (!boardRes.ok) throw new Error(`Failed to fetch board: ${boardRes.status}`);

    const boardData: { values: Array<{ id: number }> } = await boardRes.json();
    if (!boardData.values.length) return [];

    const boardId = boardData.values[0].id;

    const sprintRes = await jiraGlobals.fetch(
      `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active,future&maxResults=20`,
      { headers: { Authorization: authHeader, Accept: "application/json" } }
    );
    if (!sprintRes.ok) throw new Error(`Failed to fetch sprints: ${sprintRes.status}`);

    const sprintData: { values: Array<{ id: number; name: string; state: string }> } =
      await sprintRes.json();

    return sprintData.values.map(s => ({
      id: s.id,
      name: s.name,
      state: s.state as JiraSprint["state"],
    }));
  },
});

export const fetchJiraBacklog = action({
  args: {
    jiraProjectKey: v.string(),
    jql: v.optional(v.string()),
    sprintIds: v.optional(v.array(v.number())),
  },
  handler: async (_ctx, args): Promise<JiraIssue[]> => {
    const { authHeader, baseUrl } = getJiraEnv();

    const sprintClause =
      args.sprintIds && args.sprintIds.length > 0
        ? `sprint in (${args.sprintIds.join(", ")})`
        : "sprint is EMPTY";

    const effectiveJql =
      args.jql ||
      `project = "${args.jiraProjectKey}" AND issuetype != Design AND originalEstimate is EMPTY AND status in ("To Do", "Backlog", "Open", "Pending") AND ${sprintClause} ORDER BY "cf[10139]" ASC, priority DESC, Rank DESC`;

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
        status: v.optional(v.string()),
      })
    ),
    fetchedKeys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const existingByKey = new Map(
      existing.filter((t) => t.jiraKey).map((t) => [t.jiraKey!, t])
    );

    // Remove Jira tasks that were fetched (in scope) but not selected
    const selectedKeys = new Set(args.tasks.map((t) => t.key));
    for (const key of args.fetchedKeys) {
      if (!selectedKeys.has(key)) {
        const toDelete = existingByKey.get(key);
        if (toDelete) await ctx.db.delete(toDelete._id);
      }
    }

    const maxOrder = existing.reduce((m, t) => Math.max(m, t.order), -1);
    let nextOrder = maxOrder + 1;

    for (const task of args.tasks) {
      const existingTask = existingByKey.get(task.key);
      if (existingTask) {
        await ctx.db.patch(existingTask._id, {
          title: task.title,
          description: task.description ?? undefined,
          jiraUrl: task.url,
          jiraStatus: task.status ?? undefined,
        });
      } else {
        await ctx.db.insert("tasks", {
          roomId: args.roomId,
          jiraKey: task.key,
          title: task.title,
          description: task.description ?? undefined,
          jiraUrl: task.url,
          jiraStatus: task.status ?? undefined,
          order: nextOrder++,
          isManual: false,
          isQuickVote: false,
        });
      }
    }
  },
});
