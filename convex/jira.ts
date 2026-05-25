import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalQuery, mutation } from "./_generated/server";
import {
  BACKLOG_FILTER_ID,
  type JiraBlocker,
  type JiraComment,
  type JiraIssue,
  type JiraSprint,
  type JiraTaskDetails,
} from "./jiraTypes";
export {
  BACKLOG_FILTER_ID,
  type JiraComment,
  type JiraSprint,
  type JiraIssue,
  type JiraTaskDetails,
};

/**
 * Per-field outcome for a single Jira save attempt. Returned for each of the
 * estimate and sprint slots so the host UI can show partial-success feedback.
 */
export type SaveFieldResult =
  | { attempted: false; success: false }
  | { attempted: true; success: true }
  | { attempted: true; success: false; error: string };

export interface SaveJiraTaskUpdatesResult {
  estimate: SaveFieldResult;
  sprint: SaveFieldResult;
}

const jiraGlobals = globalThis as typeof globalThis & {
  fetch: (
    input: string,
    init?: Record<string, unknown>,
  ) => Promise<{
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
  status?: { name?: string; statusCategory?: { colorName?: string } };
  issuetype?: { name?: string };
  description?: unknown;
  customfield_10020?: { name?: string; state?: string }[];
  assignee?: {
    displayName?: string;
    accountId?: string;
    avatarUrls?: Record<string, string>;
  } | null;
  reporter?: {
    displayName?: string;
    accountId?: string;
    avatarUrls?: Record<string, string>;
  } | null;
  issuelinks?: {
    type?: { name?: string; inward?: string; outward?: string };
    inwardIssue?: {
      key?: string;
      fields?: {
        summary?: string;
        status?: { name?: string; statusCategory?: { key?: string; colorName?: string } };
        issuetype?: { name?: string; iconUrl?: string };
      };
    };
    outwardIssue?: {
      key?: string;
      fields?: {
        summary?: string;
        status?: { name?: string; statusCategory?: { key?: string; colorName?: string } };
        issuetype?: { name?: string; iconUrl?: string };
      };
    };
  }[];
  attachment?: {
    id: string;
    filename: string;
    mimeType: string;
    content: string;
  }[];
  labels?: string[];
  created?: string;
  updated?: string;
}

interface JiraSearchResponse {
  issues: { key: string; fields: JiraIssueFields }[];
  nextPageToken?: string;
}

interface AdfMark {
  type: string;
  attrs?: Record<string, string>;
}
interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
}

function wrapMarkdownMark(text: string, before: string, after: string): string {
  const match = text.match(/^(\s*)([\s\S]*?\S)(\s*)$/);
  if (!match) {
    return text;
  }

  const [, leadingWhitespace, content, trailingWhitespace] = match;
  return `${leadingWhitespace}${before}${content}${after}${trailingWhitespace}`;
}

function applyMarks(text: string, marks: AdfMark[]): string {
  let out = text;
  for (const mark of marks) {
    if (mark.type === "strong") {
      out = wrapMarkdownMark(out, "**", "**");
    } else if (mark.type === "em") {
      out = wrapMarkdownMark(out, "_", "_");
    } else if (mark.type === "code") {
      out = wrapMarkdownMark(out, "`", "`");
    } else if (mark.type === "strike") {
      out = wrapMarkdownMark(out, "~~", "~~");
    } else if (mark.type === "link") {
      out = wrapMarkdownMark(out, "[", `](${mark.attrs?.href ?? ""})`);
    }
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
  if (!adf || typeof adf !== "object" || !attachments?.length) {
    return mediaUrlMap;
  }

  const mediaIds = collectMediaIds(adf as AdfNode);
  if (!mediaIds.length) {
    return mediaUrlMap;
  }

  const imageAttachments = attachments
    .filter((a) => a.mimeType.startsWith("image/"))
    .sort((a, b) => Number(a.id) - Number(b.id));

  for (let i = 0; i < Math.min(mediaIds.length, imageAttachments.length); i++) {
    try {
      // Follow the redirect to obtain the temporary public CDN URL
      const res = await jiraGlobals.fetch(imageAttachments[i].content, {
        headers: { Authorization: authHeader },
        method: "HEAD",
      });
      // Response.url is the final URL after redirects (standard Fetch API)
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
  return nodes
    .map((n) => {
      if (n.type === "text") {
        return applyMarks(n.text ?? "", n.marks ?? []);
      }
      if (n.type === "hardBreak") {
        return "  \n";
      }
      return convertAdfNode(n, 0, mediaUrlMap);
    })
    .join("");
}

function convertListItem(item: AdfNode, depth: number, mediaUrlMap: Map<string, string>): string {
  const parts: string[] = [];
  for (const child of item.content ?? []) {
    if (child.type === "paragraph") {
      parts.push(convertInline(child.content ?? [], mediaUrlMap));
    } else if (child.type === "bulletList" || child.type === "orderedList") {
      parts.push("\n" + convertAdfNode(child, depth + 1, mediaUrlMap));
    } else {
      parts.push(convertAdfNode(child, depth, mediaUrlMap));
    }
  }
  return parts.join("");
}

function convertAdfNode(node: AdfNode, depth: number, mediaUrlMap: Map<string, string>): string {
  const indent = "  ".repeat(depth);
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map((n) => convertAdfNode(n, 0, mediaUrlMap)).join("\n\n");
    case "paragraph":
      return convertInline(node.content ?? [], mediaUrlMap);
    case "heading": {
      const level = Math.min(Number(node.attrs?.level ?? 1), 6);
      return `${"#".repeat(level)} ${convertInline(node.content ?? [], mediaUrlMap)}`;
    }
    case "bulletList":
      return (node.content ?? [])
        .map((item) => `${indent}- ${convertListItem(item, depth, mediaUrlMap)}`)
        .join("\n");
    case "orderedList":
      return (node.content ?? [])
        .map((item, i) => `${indent}${i + 1}. ${convertListItem(item, depth, mediaUrlMap)}`)
        .join("\n");
    case "blockquote":
      return (node.content ?? [])
        .map((n) =>
          convertAdfNode(n, 0, mediaUrlMap)
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n"),
        )
        .join("\n>\n");
    case "codeBlock": {
      const lang = String(node.attrs?.language ?? "");
      const code = (node.content ?? []).map((n) => n.text ?? "").join("");
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
    case "table": {
      const rows = (node.content ?? []).filter((r) => r.type === "tableRow");
      if (rows.length === 0) {
        return "";
      }

      const processedRows: string[][] = rows.map((row) => {
        const cells = (row.content ?? []).filter(
          (c) => c.type === "tableHeader" || c.type === "tableCell",
        );
        return cells.map((cell) => {
          const text = (cell.content ?? [])
            .map((child) => convertAdfNode(child, 0, mediaUrlMap))
            .join(" ");
          // Escape pipes and collapse newlines to keep table syntax intact
          return text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
        });
      });

      // Determine column count from widest row
      const colCount = Math.max(...processedRows.map((r) => r.length));

      // Pad rows to uniform width
      for (const row of processedRows) {
        while (row.length < colCount) {
          row.push("");
        }
      }

      const lines: string[] = [];
      lines.push(`| ${processedRows[0].join(" | ")} |`);
      lines.push(`| ${Array.from({ length: colCount }, () => "---").join(" | ")} |`);
      for (let i = 1; i < processedRows.length; i++) {
        lines.push(`| ${processedRows[i].join(" | ")} |`);
      }

      return lines.join("\n");
    }
    case "mediaSingle":
      return (node.content ?? []).map((n) => convertAdfNode(n, 0, mediaUrlMap)).join("");
    case "media": {
      const mediaId = String(node.attrs?.id ?? "");
      const resolvedUrl = mediaUrlMap.get(mediaId);
      if (resolvedUrl) {
        const alt = String(node.attrs?.alt || "image");
        const w = node.attrs?.width;
        const h = node.attrs?.height;
        const dimFragment = w && h ? `#dim=${w}x${h}` : "";
        return `![${alt}](${resolvedUrl}${dimFragment})`;
      }
      // Fallback: placeholder when URL couldn't be resolved
      const altText = String(node.attrs?.alt || "image attachment");
      return `*[${altText}]*`;
    }
    default:
      if (node.content) {
        return convertInline(node.content, mediaUrlMap);
      }
      return "";
  }
}

function adfToMarkdown(adf: unknown, mediaUrlMap?: Map<string, string>): string {
  if (!adf || typeof adf !== "object") {
    return "";
  }
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
      { headers: { Accept: "application/json", Authorization: authHeader } },
    );
    if (!boardRes.ok) {
      throw new Error(`Failed to fetch board: ${boardRes.status}`);
    }

    const boardData = (await boardRes.json()) as { values: { id: number }[] };
    if (!boardData.values.length) {
      return [];
    }

    const boardId = boardData.values[0].id;

    const sprintRes = await jiraGlobals.fetch(
      `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active,future&maxResults=20`,
      { headers: { Accept: "application/json", Authorization: authHeader } },
    );
    if (!sprintRes.ok) {
      throw new Error(`Failed to fetch sprints: ${sprintRes.status}`);
    }

    const sprintData = (await sprintRes.json()) as {
      values: { id: number; name: string; state: string }[];
    };

    return sprintData.values.map((s) => ({
      id: s.id,
      name: s.name,
      state: s.state as JiraSprint["state"],
    }));
  },
});

/**
 * A blocker is "active" when its statusCategory is not "done". Jira's
 * statusCategory key is a stable, language-independent identifier — "done"
 * covers Done, Closed, Resolved, Cancelled, Won't Do, Released, etc.
 */
function isActiveBlocker(link: NonNullable<JiraIssueFields["issuelinks"]>[number]): boolean {
  if (!link.type?.inward?.toLowerCase().includes("is blocked by") || !link.inwardIssue?.key) {
    return false;
  }
  return link.inwardIssue.fields?.status?.statusCategory?.key !== "done";
}

/** Check if a Jira issue is blocked based on its issue links. */
function checkIsBlocked(links: JiraIssueFields["issuelinks"]): boolean {
  if (!Array.isArray(links)) {
    return false;
  }
  return links.some(isActiveBlocker);
}

/** Extract blocker details (key, summary, url) from issue links. */
function getBlockers(links: JiraIssueFields["issuelinks"], baseUrl: string): JiraBlocker[] {
  if (!Array.isArray(links)) {
    return [];
  }
  return links.filter(isActiveBlocker).map((link) => ({
    key: link.inwardIssue!.key!,
    status: String(link.inwardIssue!.fields?.status?.name ?? ""),
    statusColor: link.inwardIssue!.fields?.status?.statusCategory?.colorName ?? undefined,
    summary: String(link.inwardIssue!.fields?.summary ?? link.inwardIssue!.key!),
    typeIconUrl: link.inwardIssue!.fields?.issuetype?.iconUrl ?? undefined,
    url: `${baseUrl}/browse/${link.inwardIssue!.key!}`,
  }));
}

export const fetchTaskDetails = action({
  args: { detailsVersion: v.optional(v.number()), jiraKeys: v.array(v.string()) },
  handler: async (_ctx, args): Promise<Record<string, JiraTaskDetails>> => {
    if (args.jiraKeys.length === 0) {
      return {};
    }
    const { authHeader, baseUrl } = getJiraEnv();
    const result: Record<string, JiraTaskDetails> = {};

    // Batch in chunks of 50 (Jira maxResults)
    for (let i = 0; i < args.jiraKeys.length; i += 50) {
      const chunk = args.jiraKeys.slice(i, i + 50);
      const jql = `key in (${chunk.join(", ")})`;
      const res = await jiraGlobals.fetch(`${baseUrl}/rest/api/3/search/jql`, {
        body: JSON.stringify({
          jql,
          maxResults: 50,
          fields: [
            "summary",
            "status",
            "issuetype",
            "description",
            "customfield_10020",
            "assignee",
            "reporter",
            "issuelinks",
            "attachment",
            "labels",
            "created",
            "updated",
          ],
        }),
        headers: {
          Accept: "application/json",
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      if (!res.ok) {
        continue;
      }
      const data = (await res.json()) as JiraSearchResponse;
      for (const issue of data.issues) {
        const sprints = issue.fields.customfield_10020;
        let sprintName: string | undefined;
        if (Array.isArray(sprints) && sprints.length > 0) {
          const active = sprints.find((s) => s.state === "active") ?? sprints[sprints.length - 1];
          sprintName = String(active.name ?? "");
        }
        const assignee = issue.fields.assignee?.displayName ?? undefined;
        const assigneeAvatarUrl = issue.fields.assignee?.avatarUrls?.["24x24"] ?? undefined;
        const reporter = issue.fields.reporter?.displayName ?? undefined;
        const reporterAvatarUrl = issue.fields.reporter?.avatarUrls?.["24x24"] ?? undefined;
        const blockedBy = getBlockers(issue.fields.issuelinks, baseUrl);
        const isBlocked = blockedBy.length > 0;
        const statusColor = issue.fields.status?.statusCategory?.colorName ?? undefined;

        // Resolve embedded image URLs from attachments
        const mediaUrlMap = await resolveMediaUrls(
          issue.fields.description,
          issue.fields.attachment,
          authHeader,
        );

        result[issue.key] = {
          assignee,
          assigneeAvatarUrl,
          blockedBy,
          created: issue.fields.created,
          description: adfToMarkdown(issue.fields.description, mediaUrlMap),
          isBlocked,
          labels: issue.fields.labels ?? [],
          reporter,
          reporterAvatarUrl,
          sprintName,
          status: String(issue.fields.status?.name ?? ""),
          statusColor,
          title: String(issue.fields.summary || issue.key),
          type: String(issue.fields.issuetype?.name ?? ""),
          updated: issue.fields.updated,
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

    const realSprintIds = (args.sprintIds ?? []).filter((id) => id !== BACKLOG_FILTER_ID);
    const includeBacklog =
      !args.sprintIds || args.sprintIds.length === 0 || args.sprintIds.includes(BACKLOG_FILTER_ID);

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
        fields: [
          "summary",
          "status",
          "issuetype",
          "description",
          "customfield_10020",
          "assignee",
          "reporter",
          "issuelinks",
          "labels",
        ],
        jql: effectiveJql,
        maxResults: 50,
      };
      if (nextPageToken) {
        body.nextPageToken = nextPageToken;
      }

      const res = await jiraGlobals.fetch(`${baseUrl}/rest/api/3/search/jql`, {
        body: JSON.stringify(body),
        headers: {
          Accept: "application/json",
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(`Jira API error: ${res.status} ${await res.text()}`);
      }

      const data = (await res.json()) as JiraSearchResponse;

      for (const issue of data.issues) {
        const sprints = issue.fields.customfield_10020;
        let sprintName: string | undefined;
        if (Array.isArray(sprints) && sprints.length > 0) {
          const active = sprints.find((s) => s.state === "active") ?? sprints[sprints.length - 1];
          sprintName = String(active.name ?? "");
        }

        allIssues.push({
          assignee: issue.fields.assignee?.displayName ?? undefined,
          description: adfToMarkdown(issue.fields.description),
          isBlocked: checkIsBlocked(issue.fields.issuelinks),
          key: issue.key,
          labels: issue.fields.labels ?? [],
          reporter: issue.fields.reporter?.displayName ?? undefined,
          sprintName,
          status: String(issue.fields.status?.name ?? ""),
          title: String(issue.fields.summary || issue.key),
          type: String(issue.fields.issuetype?.name ?? ""),
          url: `${baseUrl}/browse/${issue.key}`,
        });
      }

      ({ nextPageToken } = data);
    } while (nextPageToken && allIssues.length < 200);

    return allIssues;
  },
});

export const importSelectedTasks = mutation({
  args: {
    fetchedKeys: v.array(v.string()),
    keys: v.array(v.string()),
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const existingByKey = new Map(existing.filter((t) => t.jiraKey).map((t) => [t.jiraKey!, t]));

    // Remove Jira tasks that were fetched (in scope) but not selected
    const selectedKeys = new Set(args.keys);
    for (const key of args.fetchedKeys) {
      if (!selectedKeys.has(key)) {
        const toDelete = existingByKey.get(key);
        if (toDelete) {
          await ctx.db.delete(toDelete._id);
        }
      }
    }

    const maxOrder = existing.reduce((m, t) => Math.max(m, t.order), -1);
    let nextOrder = maxOrder + 1;

    for (const key of args.keys) {
      if (!existingByKey.has(key)) {
        await ctx.db.insert("tasks", {
          isManual: false,
          jiraKey: key,
          order: nextOrder++,
          roomId: args.roomId,
        });
      }
    }
  },
});

export const fetchTaskComments = action({
  args: { jiraKey: v.string() },
  handler: async (_ctx, args): Promise<JiraComment[]> => {
    try {
      const { authHeader, baseUrl } = getJiraEnv();

      const res = await jiraGlobals.fetch(
        `${baseUrl}/rest/api/3/issue/${encodeURIComponent(args.jiraKey)}/comment?maxResults=50&orderBy=created`,
        {
          headers: {
            Accept: "application/json",
            Authorization: authHeader,
          },
        },
      );

      if (!res.ok) {
        return [];
      }

      const data = (await res.json()) as {
        comments?: {
          id: string;
          author?: { displayName?: string; avatarUrls?: Record<string, string> };
          body?: unknown;
          created?: string;
        }[];
      };

      if (!data.comments || !Array.isArray(data.comments)) {
        return [];
      }

      return data.comments
        .map((comment) => ({
          id: comment.id,
          authorName: comment.author?.displayName ?? "Anonymous",
          avatarUrl: comment.author?.avatarUrls?.["48x48"] ?? "",
          body: adfToMarkdown(comment.body),
          created: comment.created ?? new Date().toISOString(),
        }))
        .filter((c) => c.body.length > 0);
    } catch {
      // Graceful degradation: return empty array on error
      return [];
    }
  },
});

/**
 * Internal query used by `saveJiraTaskUpdates` to atomically read the task and
 * its room participants. Co-located here because it is exclusively consumed by
 * the save flow.
 */
export const getRoomParticipantsAndTaskInternal = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", task.roomId))
      .collect();
    return { task, participants };
  },
});

async function attemptUpdateEstimate(
  authHeader: string,
  baseUrl: string,
  jiraKey: string,
  estimate: string,
): Promise<SaveFieldResult> {
  try {
    const res = await jiraGlobals.fetch(
      `${baseUrl}/rest/api/3/issue/${encodeURIComponent(jiraKey)}`,
      {
        body: JSON.stringify({
          fields: { timetracking: { originalEstimate: estimate } },
        }),
        headers: {
          Accept: "application/json",
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        method: "PUT",
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { attempted: true, success: false, error: `${res.status}: ${text}` };
    }
    return { attempted: true, success: true };
  } catch (e) {
    return {
      attempted: true,
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function attemptMoveSprint(
  authHeader: string,
  baseUrl: string,
  jiraKey: string,
  sprintId: number,
): Promise<SaveFieldResult> {
  try {
    const res = await jiraGlobals.fetch(`${baseUrl}/rest/agile/1.0/sprint/${sprintId}/issue`, {
      body: JSON.stringify({ issues: [jiraKey] }),
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    if (!res.ok) {
      const text = await res.text();
      return { attempted: true, success: false, error: `${res.status}: ${text}` };
    }
    return { attempted: true, success: true };
  } catch (e) {
    return {
      attempted: true,
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Host-only batched save of Jira-side fields for a single task.
 *
 * Dirty-field rules (see plan):
 * - estimate: attempted only if non-empty (after trim) AND different from saved value
 * - sprint:   attempted only if sprintId provided AND different from saved sprintId
 * - estimate runs first, sprint runs second; failure of one does NOT skip the other
 * - patches `tasks` once at the end with only the successful fields
 *   (the underlying mutation skips undefined keys so failed/skipped fields keep
 *   their prior saved values).
 */
export const saveJiraTaskUpdates = action({
  args: {
    sessionId: v.string(),
    taskId: v.id("tasks"),
    estimate: v.optional(v.string()),
    sprintId: v.optional(v.number()),
    sprintName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SaveJiraTaskUpdatesResult> => {
    if (args.sessionId.trim() === "") {
      throw new Error("sessionId is required");
    }

    const data: { task: Doc<"tasks">; participants: Doc<"participants">[] } | null =
      await ctx.runQuery(internal.jira.getRoomParticipantsAndTaskInternal, {
        taskId: args.taskId,
      });
    if (!data) {
      throw new Error("Task not found");
    }
    const { task, participants } = data;

    if (!task.jiraKey) {
      throw new Error("Task has no Jira key");
    }

    /*
     * Authorization: caller must be a participant in the task's room AND a host;
     * the room must currently have at least one host.
     */
    const caller = participants.find((p) => p.sessionId === args.sessionId);
    if (!caller) {
      throw new Error("You are not a participant in this room");
    }
    const hasAnyHost = participants.some((p) => p.isHost);
    if (!hasAnyHost) {
      throw new Error("Room has no host");
    }
    if (!caller.isHost) {
      throw new Error("Only hosts can save Jira updates");
    }

    // Dirty-field analysis -------------------------------------------------
    const trimmedEstimate = (args.estimate ?? "").trim();
    const estimateChanged =
      trimmedEstimate !== "" && trimmedEstimate !== (task.savedJiraEstimate ?? "");

    const nextSprintId =
      args.sprintId !== undefined && args.sprintId !== task.savedJiraSprintId
        ? args.sprintId
        : undefined;
    const nextSprintName = args.sprintName?.trim() ?? "";
    if (nextSprintId !== undefined && nextSprintName === "") {
      /*
       * The form must always submit name alongside id — fail loudly so we
       * don't store a sprintId without its display name.
       */
      throw new Error("sprintName is required when sprintId is provided");
    }

    const sprintChanged = nextSprintId !== undefined;

    // Short-circuit if nothing dirty: zero Jira calls, zero patches.
    if (!estimateChanged && !sprintChanged) {
      return {
        estimate: { attempted: false, success: false },
        sprint: { attempted: false, success: false },
      };
    }

    const { authHeader, baseUrl } = getJiraEnv();
    const jiraKey = task.jiraKey;

    const estimateResult: SaveFieldResult = estimateChanged
      ? await attemptUpdateEstimate(authHeader, baseUrl, jiraKey, trimmedEstimate)
      : { attempted: false, success: false };

    const sprintResult: SaveFieldResult =
      nextSprintId !== undefined
        ? await attemptMoveSprint(authHeader, baseUrl, jiraKey, nextSprintId)
        : { attempted: false, success: false };

    /*
     * Build a single patch containing only successful fields. Skipped/failed
     * fields are left undefined so `setSavedJiraFields` preserves their prior
     * saved values.
     */
    const patch: {
      taskId: Id<"tasks">;
      savedJiraEstimate?: string;
      savedJiraSprintId?: number;
      savedJiraSprintName?: string;
    } = { taskId: args.taskId };

    if (estimateResult.attempted && estimateResult.success) {
      patch.savedJiraEstimate = trimmedEstimate;
    }
    if (sprintResult.attempted && sprintResult.success && nextSprintId !== undefined) {
      patch.savedJiraSprintId = nextSprintId;
      patch.savedJiraSprintName = nextSprintName;
    }

    if (
      patch.savedJiraEstimate !== undefined ||
      patch.savedJiraSprintId !== undefined ||
      patch.savedJiraSprintName !== undefined
    ) {
      await ctx.runMutation(internal.tasks.setSavedJiraFields, patch);
    }

    return { estimate: estimateResult, sprint: sprintResult };
  },
});
