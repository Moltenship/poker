import { v } from "convex/values";
import { action, internalMutation, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

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

type AdfMark = { type: string; attrs?: Record<string, string> };
type AdfNode = {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
};

function applyMarks(text: string, marks: AdfMark[]): string {
  let out = text;
  for (const mark of marks) {
    if (mark.type === "strong") out = `**${out}**`;
    else if (mark.type === "em") out = `_${out}_`;
    else if (mark.type === "code") out = `\`${out}\``;
    else if (mark.type === "strike") out = `~~${out}~~`;
    else if (mark.type === "link") out = `[${out}](${mark.attrs?.href ?? ""})`;
  }
  return out;
}

function convertInline(nodes: AdfNode[]): string {
  return nodes.map(n => {
    if (n.type === "text") return applyMarks(n.text ?? "", n.marks ?? []);
    if (n.type === "hardBreak") return "  \n";
    return convertAdfNode(n, 0);
  }).join("");
}

function convertListItem(item: AdfNode, depth: number): string {
  const parts: string[] = [];
  for (const child of item.content ?? []) {
    if (child.type === "paragraph") parts.push(convertInline(child.content ?? []));
    else if (child.type === "bulletList" || child.type === "orderedList") {
      parts.push("\n" + convertAdfNode(child, depth + 1));
    } else parts.push(convertAdfNode(child, depth));
  }
  return parts.join("");
}

function convertAdfNode(node: AdfNode, depth: number): string {
  const indent = "  ".repeat(depth);
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(n => convertAdfNode(n, 0)).join("\n\n");
    case "paragraph":
      return convertInline(node.content ?? []);
    case "heading": {
      const level = Math.min(Number(node.attrs?.level ?? 1), 6);
      return `${"#".repeat(level)} ${convertInline(node.content ?? [])}`;
    }
    case "bulletList":
      return (node.content ?? []).map(item =>
        `${indent}- ${convertListItem(item, depth)}`
      ).join("\n");
    case "orderedList":
      return (node.content ?? []).map((item, i) =>
        `${indent}${i + 1}. ${convertListItem(item, depth)}`
      ).join("\n");
    case "blockquote":
      return (node.content ?? []).map(n =>
        convertAdfNode(n, 0).split("\n").map(l => `> ${l}`).join("\n")
      ).join("\n>\n");
    case "codeBlock": {
      const lang = String(node.attrs?.language ?? "");
      const code = (node.content ?? []).map(n => n.text ?? "").join("");
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }
    case "rule":
      return "---";
    case "hardBreak":
      return "  \n";
    case "text":
      return applyMarks(node.text ?? "", node.marks ?? []);
    case "mention":
      return String(node.attrs?.text ?? "");
    default:
      if (node.content) return convertInline(node.content);
      return "";
  }
}

function adfToMarkdown(adf: unknown): string {
  if (!adf || typeof adf !== "object") return "";
  return convertAdfNode(adf as AdfNode, 0).trim();
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
  sprintName?: string;
};

export const fetchJiraSprints = action({
  args: { projectKey: v.string() },
  handler: async (_ctx, args): Promise<JiraSprint[]> => {
    const { authHeader, baseUrl } = getJiraEnv();

    const boardRes = await jiraGlobals.fetch(
      `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(args.projectKey)}&type=scrum&maxResults=1`,
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

export type JiraTaskDetails = {
  title: string;
  description: string;
  status: string;
  type: string;
  sprintName?: string;
  url: string;
};

export const fetchTaskDetails = action({
  args: { jiraKeys: v.array(v.string()) },
  handler: async (_ctx, args): Promise<Record<string, JiraTaskDetails>> => {
    if (args.jiraKeys.length === 0) return {};
    const { authHeader, baseUrl } = getJiraEnv();
    const result: Record<string, JiraTaskDetails> = {};

    // Batch in chunks of 50 (Jira maxResults)
    for (let i = 0; i < args.jiraKeys.length; i += 50) {
      const chunk = args.jiraKeys.slice(i, i + 50);
      const jql = `key in (${chunk.join(", ")})`;
      const res = await jiraGlobals.fetch(`${baseUrl}/rest/api/3/search/jql`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          jql,
          maxResults: 50,
          fields: ["summary", "status", "issuetype", "description", "customfield_10020"],
        }),
      });
      if (!res.ok) continue;
      const data: { issues: Array<{ key: string; fields: Record<string, any> }> } = await res.json();
      for (const issue of data.issues) {
        const sprints = issue.fields.customfield_10020;
        let sprintName: string | undefined;
        if (Array.isArray(sprints) && sprints.length > 0) {
          const active = sprints.find((s: any) => s.state === "active") ?? sprints[sprints.length - 1];
          sprintName = String(active.name ?? "");
        }
        result[issue.key] = {
          title: String(issue.fields.summary || issue.key),
          description: adfToMarkdown(issue.fields.description),
          status: String(issue.fields.status?.name ?? ""),
          type: String(issue.fields.issuetype?.name ?? ""),
          sprintName,
          url: `${baseUrl}/browse/${issue.key}`,
        };
      }
    }
    return result;
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
        fields: ["summary", "status", "issuetype", "description", "customfield_10020"],
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
          description: adfToMarkdown(issue.fields.description),
          sprintName: (() => {
            const sprints = issue.fields.customfield_10020;
            if (!Array.isArray(sprints) || sprints.length === 0) return undefined;
            const active = sprints.find((s: any) => s.state === "active") ?? sprints[sprints.length - 1];
            return String(active.name ?? "");
          })(),
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
    keys: v.array(v.string()),
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
    const selectedKeys = new Set(args.keys);
    for (const key of args.fetchedKeys) {
      if (!selectedKeys.has(key)) {
        const toDelete = existingByKey.get(key);
        if (toDelete) await ctx.db.delete(toDelete._id);
      }
    }

    const maxOrder = existing.reduce((m, t) => Math.max(m, t.order), -1);
    let nextOrder = maxOrder + 1;

    for (const key of args.keys) {
      if (!existingByKey.has(key)) {
        await ctx.db.insert("tasks", {
          roomId: args.roomId,
          jiraKey: key,
          order: nextOrder++,
          isManual: false,
          isQuickVote: false,
        });
      }
    }
  },
});

export const setJiraEstimateSyncStatus = internalMutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("syncing"), v.literal("synced"), v.literal("error")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      jiraEstimateSyncStatus: args.status,
      jiraEstimateSyncError: args.error,
    });
  },
});

export const updateJiraEstimate = action({
  args: {
    taskId: v.id("tasks"),
    estimate: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(api.tasks.getTask, { taskId: args.taskId });
    if (!task || !task.jiraKey) return;

    await ctx.runMutation(internal.jira.setJiraEstimateSyncStatus, {
      taskId: args.taskId,
      status: "syncing",
    });

    try {
      const { authHeader, baseUrl } = getJiraEnv();
      const res = await jiraGlobals.fetch(
        `${baseUrl}/rest/api/3/issue/${task.jiraKey}`,
        {
          method: "PUT",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            fields: {
              timetracking: { originalEstimate: args.estimate },
            },
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Jira API error: ${res.status} ${text}`);
      }

      await ctx.runMutation(internal.jira.setJiraEstimateSyncStatus, {
        taskId: args.taskId,
        status: "synced",
      });
    } catch (err: any) {
      await ctx.runMutation(internal.jira.setJiraEstimateSyncStatus, {
        taskId: args.taskId,
        status: "error",
        error: err?.message ?? "Failed to sync estimate",
      });
      throw err;
    }
  },
});
