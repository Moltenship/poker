import { v } from "convex/values";
import { action, internalMutation, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { BACKLOG_FILTER_ID, type JiraSprint, type JiraIssue, type JiraTaskDetails } from "./jiraTypes";
export { BACKLOG_FILTER_ID, type JiraSprint, type JiraIssue, type JiraTaskDetails };

const jiraGlobals = globalThis as typeof globalThis & {
  fetch: (input: string, init?: Record<string, unknown>) => Promise<{
    ok: boolean;
    status: number;
    url: string;
    json: () => Promise<unknown>;
    text: () => Promise<string>;
  }>;
  btoa: (value: string) => string;
  process?: { env: Record<string, string | undefined> };
};

interface JiraIssueFields {
  summary?: string;
  status?: { name?: string };
  issuetype?: { name?: string };
  description?: unknown;
  customfield_10020?: Array<{ name?: string; state?: string }>;
  assignee?: { displayName?: string; accountId?: string } | null;
  issuelinks?: Array<{
    type?: { name?: string; inward?: string; outward?: string };
    inwardIssue?: { key?: string; fields?: { status?: { name?: string } } };
    outwardIssue?: { key?: string; fields?: { status?: { name?: string } } };
  }>;
  attachment?: Array<{
    id: string;
    filename: string;
    mimeType: string;
    content: string;
  }>;
}

interface JiraSearchResponse {
  issues: Array<{ key: string; fields: JiraIssueFields }>;
  nextPageToken?: string;
}

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

/** Collect all media node IDs from ADF in document order. */
function collectMediaIds(node: AdfNode): string[] {
  if (node.type === "media" && node.attrs?.id) {
    return [String(node.attrs.id)];
  }
  return (node.content ?? []).flatMap(collectMediaIds);
}

/**
 * Resolve ADF media UUIDs → publicly accessible temporary URLs.
 *
 * Jira stores media with internal UUIDs, while attachments have numeric IDs.
 * There is no direct mapping via REST API, so we match by position:
 * media nodes in document order ↔ image attachments sorted by ID (creation order).
 *
 * For each attachment we GET the `content` URL with auth — Jira Cloud responds
 * with a redirect to a temporary Atlassian Media CDN URL that embeds a short-lived
 * token, making it publicly accessible without extra auth.
 */
async function resolveMediaUrls(
  adf: unknown,
  attachments: JiraIssueFields["attachment"],
  authHeader: string,
): Promise<Map<string, string>> {
  const mediaUrlMap = new Map<string, string>();
  if (!adf || typeof adf !== "object" || !attachments?.length) return mediaUrlMap;

  const mediaIds = collectMediaIds(adf as AdfNode);
  if (!mediaIds.length) return mediaUrlMap;

  const imageAttachments = attachments
    .filter((a) => a.mimeType.startsWith("image/"))
    .sort((a, b) => Number(a.id) - Number(b.id));

  for (let i = 0; i < Math.min(mediaIds.length, imageAttachments.length); i++) {
    try {
      // Follow the redirect to obtain the temporary public CDN URL
      const res = await jiraGlobals.fetch(imageAttachments[i].content, {
        method: "HEAD",
        headers: { Authorization: authHeader },
      });
      // response.url is the final URL after redirects (standard Fetch API)
      if (res.url && res.url !== imageAttachments[i].content) {
        mediaUrlMap.set(mediaIds[i], res.url);
      }
    } catch {
      // Skip unresolvable attachments — the converter will show a placeholder
    }
  }

  return mediaUrlMap;
}

function convertInline(nodes: AdfNode[], mediaUrlMap: Map<string, string>): string {
  return nodes.map(n => {
    if (n.type === "text") return applyMarks(n.text ?? "", n.marks ?? []);
    if (n.type === "hardBreak") return "  \n";
    return convertAdfNode(n, 0, mediaUrlMap);
  }).join("");
}

function convertListItem(item: AdfNode, depth: number, mediaUrlMap: Map<string, string>): string {
  const parts: string[] = [];
  for (const child of item.content ?? []) {
    if (child.type === "paragraph") parts.push(convertInline(child.content ?? [], mediaUrlMap));
    else if (child.type === "bulletList" || child.type === "orderedList") {
      parts.push("\n" + convertAdfNode(child, depth + 1, mediaUrlMap));
    } else parts.push(convertAdfNode(child, depth, mediaUrlMap));
  }
  return parts.join("");
}

function convertAdfNode(node: AdfNode, depth: number, mediaUrlMap: Map<string, string>): string {
  const indent = "  ".repeat(depth);
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(n => convertAdfNode(n, 0, mediaUrlMap)).join("\n\n");
    case "paragraph":
      return convertInline(node.content ?? [], mediaUrlMap);
    case "heading": {
      const level = Math.min(Number(node.attrs?.level ?? 1), 6);
      return `${"#".repeat(level)} ${convertInline(node.content ?? [], mediaUrlMap)}`;
    }
    case "bulletList":
      return (node.content ?? []).map(item =>
        `${indent}- ${convertListItem(item, depth, mediaUrlMap)}`
      ).join("\n");
    case "orderedList":
      return (node.content ?? []).map((item, i) =>
        `${indent}${i + 1}. ${convertListItem(item, depth, mediaUrlMap)}`
      ).join("\n");
    case "blockquote":
      return (node.content ?? []).map(n =>
        convertAdfNode(n, 0, mediaUrlMap).split("\n").map(l => `> ${l}`).join("\n")
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
    case "inlineLink":
      return `[${convertInline(node.content ?? [], mediaUrlMap)}](${String(node.attrs?.href ?? "")})`;
    case "inlineCard":
    case "blockCard": {
      const url = String(node.attrs?.url ?? "");
      // Try to extract a readable label from the URL (e.g. Jira issue key from /browse/BRV-1568)
      const browseMatch = url.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/);
      const label = browseMatch ? browseMatch[1] : url;
      return url ? `[${label}](${url.split("#")[0]})` : "";
    }
    case "mediaSingle":
      return (node.content ?? []).map(n => convertAdfNode(n, 0, mediaUrlMap)).join("");
    case "media": {
      const mediaId = String(node.attrs?.id ?? "");
      const resolvedUrl = mediaUrlMap.get(mediaId);
      if (resolvedUrl) {
        const alt = String(node.attrs?.alt || "image");
        return `![${alt}](${resolvedUrl})`;
      }
      // Fallback: placeholder when URL couldn't be resolved
      const altText = String(node.attrs?.alt || "image attachment");
      return `*[${altText}]*`;
    }
    default:
      if (node.content) return convertInline(node.content, mediaUrlMap);
      return "";
  }
}

function adfToMarkdown(adf: unknown, mediaUrlMap?: Map<string, string>): string {
  if (!adf || typeof adf !== "object") return "";
  return convertAdfNode(adf as AdfNode, 0, mediaUrlMap ?? new Map()).trim();
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

export const fetchJiraSprints = action({
  args: { projectKey: v.string() },
  handler: async (_ctx, args): Promise<JiraSprint[]> => {
    const { authHeader, baseUrl } = getJiraEnv();

    const boardRes = await jiraGlobals.fetch(
      `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(args.projectKey)}&type=scrum&maxResults=1`,
      { headers: { Authorization: authHeader, Accept: "application/json" } }
    );
    if (!boardRes.ok) throw new Error(`Failed to fetch board: ${boardRes.status}`);

    const boardData = await boardRes.json() as { values: Array<{ id: number }> };
    if (!boardData.values.length) return [];

    const boardId = boardData.values[0].id;

    const sprintRes = await jiraGlobals.fetch(
      `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active,future&maxResults=20`,
      { headers: { Authorization: authHeader, Accept: "application/json" } }
    );
    if (!sprintRes.ok) throw new Error(`Failed to fetch sprints: ${sprintRes.status}`);

    const sprintData = await sprintRes.json() as { values: Array<{ id: number; name: string; state: string }> };

    return sprintData.values.map(s => ({
      id: s.id,
      name: s.name,
      state: s.state as JiraSprint["state"],
    }));
  },
});

/** Check if a Jira issue is blocked based on its issue links. */
function checkIsBlocked(links: JiraIssueFields["issuelinks"]): boolean {
  if (!Array.isArray(links)) return false;
  return links.some((link) => {
    // "is blocked by" link — the blocking issue is the inward issue
    if (
      link.type?.inward?.toLowerCase().includes("is blocked by") &&
      link.inwardIssue
    ) {
      const status = link.inwardIssue.fields?.status?.name?.toLowerCase() ?? "";
      // Only blocked if the blocker isn't done
      return !status.includes("done") && !status.includes("closed") && !status.includes("resolved");
    }
    // "blocks" link — this issue blocks the outward issue (not blocked itself)
    return false;
  });
}

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
          fields: ["summary", "status", "issuetype", "description", "customfield_10020", "assignee", "issuelinks", "attachment"],
        }),
      });
      if (!res.ok) continue;
      const data = await res.json() as JiraSearchResponse;
      for (const issue of data.issues) {
        const sprints = issue.fields.customfield_10020;
        let sprintName: string | undefined;
        if (Array.isArray(sprints) && sprints.length > 0) {
          const active = sprints.find((s) => s.state === "active") ?? sprints[sprints.length - 1];
          sprintName = String(active.name ?? "");
        }
        const assignee = issue.fields.assignee?.displayName ?? undefined;
        const isBlocked = checkIsBlocked(issue.fields.issuelinks);

        // Resolve embedded image URLs from attachments
        const mediaUrlMap = await resolveMediaUrls(
          issue.fields.description,
          issue.fields.attachment,
          authHeader,
        );

        result[issue.key] = {
          title: String(issue.fields.summary || issue.key),
          description: adfToMarkdown(issue.fields.description, mediaUrlMap),
          status: String(issue.fields.status?.name ?? ""),
          type: String(issue.fields.issuetype?.name ?? ""),
          sprintName,
          url: `${baseUrl}/browse/${issue.key}`,
          assignee,
          isBlocked,
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

    const realSprintIds = (args.sprintIds ?? []).filter(
      (id) => id !== BACKLOG_FILTER_ID
    );
    const includeBacklog =
      !args.sprintIds ||
      args.sprintIds.length === 0 ||
      args.sprintIds.includes(BACKLOG_FILTER_ID);

    let sprintClause: string;
    if (realSprintIds.length > 0 && includeBacklog) {
      sprintClause = `(sprint in (${realSprintIds.join(", ")}) OR sprint is EMPTY)`;
    } else if (realSprintIds.length > 0) {
      sprintClause = `sprint in (${realSprintIds.join(", ")})`;
    } else {
      sprintClause = "sprint is EMPTY";
    }

    const effectiveJql =
      args.jql ||
      `project = "${args.jiraProjectKey}" AND issuetype != Design AND originalEstimate is EMPTY AND status in ("To Do", "Backlog", "Open", "Pending") AND ${sprintClause} ORDER BY "cf[10139]" ASC, priority DESC, Rank DESC`;

    const allIssues: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    do {
      const body: Record<string, unknown> = {
        jql: effectiveJql,
        maxResults: 50,
        fields: ["summary", "status", "issuetype", "description", "customfield_10020", "assignee", "issuelinks"],
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

      const data = await res.json() as JiraSearchResponse;

      for (const issue of data.issues) {
        const sprints = issue.fields.customfield_10020;
        let sprintName: string | undefined;
        if (Array.isArray(sprints) && sprints.length > 0) {
          const active = sprints.find((s) => s.state === "active") ?? sprints[sprints.length - 1];
          sprintName = String(active.name ?? "");
        }

        allIssues.push({
          key: issue.key,
          title: String(issue.fields.summary || issue.key),
          status: String(issue.fields.status?.name ?? ""),
          type: String(issue.fields.issuetype?.name ?? ""),
          url: `${baseUrl}/browse/${issue.key}`,
          description: adfToMarkdown(issue.fields.description),
          sprintName,
          assignee: issue.fields.assignee?.displayName ?? undefined,
          isBlocked: checkIsBlocked(issue.fields.issuelinks),
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

export const setJiraSprintSyncStatus = internalMutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("syncing"), v.literal("synced"), v.literal("error")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      jiraSprintSyncStatus: args.status,
      jiraSprintSyncError: args.error,
    });
  },
});

export const moveIssueToSprint = action({
  args: {
    taskId: v.id("tasks"),
    sprintId: v.number(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(api.tasks.getTask, { taskId: args.taskId });
    if (!task || !task.jiraKey) return;

    await ctx.runMutation(internal.jira.setJiraSprintSyncStatus, {
      taskId: args.taskId,
      status: "syncing",
    });

    try {
      const { authHeader, baseUrl } = getJiraEnv();
      const res = await jiraGlobals.fetch(
        `${baseUrl}/rest/agile/1.0/sprint/${args.sprintId}/issue`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ issues: [task.jiraKey] }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Jira API error: ${res.status} ${text}`);
      }

      await ctx.runMutation(internal.jira.setJiraSprintSyncStatus, {
        taskId: args.taskId,
        status: "synced",
      });
    } catch (err: unknown) {
      await ctx.runMutation(internal.jira.setJiraSprintSyncStatus, {
        taskId: args.taskId,
        status: "error",
        error: err instanceof Error ? err.message : "Failed to move issue to sprint",
      });
      throw err;
    }
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
    } catch (err: unknown) {
      await ctx.runMutation(internal.jira.setJiraEstimateSyncStatus, {
        taskId: args.taskId,
        status: "error",
        error: err instanceof Error ? err.message : "Failed to sync estimate",
      });
      throw err;
    }
  },
});
