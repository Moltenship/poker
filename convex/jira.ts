import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, mutation } from "./_generated/server";

type JiraFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
  text: () => Promise<string>;
};

const jiraGlobals = globalThis as typeof globalThis & {
  fetch: (input: string, init?: Record<string, unknown>) => Promise<JiraFetchResponse>;
  btoa: (value: string) => string;
  process?: {
    env: Record<string, string | undefined>;
  };
};

const internalJira = internal as typeof internal & {
  jira: {
    _importFromJiraInternal: any;
    _setImportStatus: any;
    _setImportError: any;
  };
  tasks: {
    importTasksInternal: any;
  };
};

type AdfNode = {
  type: string;
  text?: string;
  content?: AdfNode[];
};

function adfToPlainText(adf: unknown): string {
  if (!adf || typeof adf !== "object") return "";

  const parts: string[] = [];

  function extract(node: AdfNode): void {
    if (node.type === "text" && node.text) {
      parts.push(node.text);
    } else if (node.type === "hardBreak") {
      parts.push("\n");
    } else if (node.content) {
      node.content.forEach(extract);
    }
  }

  extract(adf as AdfNode);

  return parts.join("").trim() || "";
}

export const importFromJira = mutation({
  args: {
    roomId: v.id("rooms"),
    jiraProjectKey: v.optional(v.string()),
    jql: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);

    if (!room) {
      throw new Error("Room not found");
    }

    const jiraProjectKey = args.jiraProjectKey ?? room.jiraProjectKey;

    if (!jiraProjectKey && !args.jql) {
      throw new Error("Provide a project key or a JQL filter");
    }

    await ctx.db.patch(args.roomId, {
      importStatus: "loading",
      importError: undefined,
    });

    await ctx.scheduler.runAfter(0, internalJira.jira._importFromJiraInternal, {
      roomId: args.roomId,
      jiraProjectKey: jiraProjectKey ?? "",
      jql: args.jql,
    });
  },
});

export const _importFromJiraInternal = internalAction({
  args: {
    roomId: v.id("rooms"),
    jiraProjectKey: v.string(),
    jql: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiToken = jiraGlobals.process?.env.JIRA_API_TOKEN;
    const jiraEmail = jiraGlobals.process?.env.JIRA_EMAIL;
    const jiraBaseUrl = jiraGlobals.process?.env.JIRA_BASE_URL;

    if (!apiToken || !jiraEmail || !jiraBaseUrl) {
      await ctx.runMutation(internalJira.jira._setImportError, {
        roomId: args.roomId,
        error: "JIRA_API_TOKEN, JIRA_EMAIL and JIRA_BASE_URL environment variables are required",
      });
      return;
    }

    const authHeader = `Basic ${jiraGlobals.btoa(`${jiraEmail}:${apiToken}`)}`;
    const baseUrl = jiraBaseUrl.replace(/\/$/, "");

    try {
      const fieldsResponse = await jiraGlobals.fetch(`${baseUrl}/rest/api/3/field`, {
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
      });

      if (!fieldsResponse.ok) {
        throw new Error(`Failed to fetch fields: ${fieldsResponse.status}`);
      }

      const fields: Array<{
        id: string;
        name: string;
        schema?: { custom?: string };
      }> = await fieldsResponse.json();

      const storyPointsFieldId = fields.find(
        (field) =>
          field.name.toLowerCase().includes("story point") ||
          field.schema?.custom?.includes("story-points")
      )?.id;

      const effectiveJql =
        args.jql || `project = "${args.jiraProjectKey}" ORDER BY created DESC`;

      const allIssues: Array<{ key: string; fields: Record<string, unknown> }> = [];
      let nextPageToken: string | undefined;

      do {
        const body: Record<string, unknown> = {
          jql: effectiveJql,
          maxResults: 50,
          fields: ["summary", "description", storyPointsFieldId].filter(Boolean),
        };

        if (nextPageToken) {
          body.nextPageToken = nextPageToken;
        }

        const response = await jiraGlobals.fetch(`${baseUrl}/rest/api/3/search/jql`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`Jira API error: ${response.status} ${await response.text()}`);
        }

        const data: {
          issues: Array<{ key: string; fields: Record<string, unknown> }>;
          nextPageToken?: string;
        } = await response.json();

        allIssues.push(...data.issues);
        nextPageToken = data.nextPageToken;
      } while (nextPageToken);

      const tasks = allIssues.map((issue) => ({
        jiraKey: issue.key,
        title: String(issue.fields.summary || issue.key),
        description: adfToPlainText(issue.fields.description) || null,
        jiraUrl: `${baseUrl}/browse/${issue.key}`,
      }));

      await ctx.runMutation(internalJira.tasks.importTasksInternal, {
        roomId: args.roomId,
        tasks,
      });

      await ctx.runMutation(internalJira.jira._setImportStatus, {
        roomId: args.roomId,
        status: "success",
      });
    } catch (error) {
      await ctx.runMutation(internalJira.jira._setImportError, {
        roomId: args.roomId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

export const _setImportStatus = internalMutation({
  args: {
    roomId: v.id("rooms"),
    status: v.union(
      v.literal("idle"),
      v.literal("loading"),
      v.literal("success"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, {
      importStatus: args.status,
      importError: undefined,
    });
  },
});

export const _setImportError = internalMutation({
  args: {
    roomId: v.id("rooms"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, {
      importStatus: "error",
      importError: args.error,
    });
  },
});
