import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { _importFromJiraInternal, importFromJira } from "../jira";
import * as api from "../_generated/api";
import * as jira from "../jira";
import * as rooms from "../rooms";
import schema from "../schema";
import * as sessions from "../lib/sessions";
import { getTasksForRoom } from "../tasks";
import * as tasks from "../tasks";

const modules = {
  "./_generated/api.js": () => Promise.resolve({ default: api }),
  "./jira.js": () => Promise.resolve(jira),
  "./rooms.js": () => Promise.resolve(rooms),
  "./tasks.js": () => Promise.resolve(tasks),
  "./lib/sessions.js": () => Promise.resolve(sessions),
};
const testGlobals = globalThis as typeof globalThis & {
  process?: {
    env: Record<string, string | undefined>;
  };
};

async function createJiraRoom(t: TestConvex<typeof schema>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("rooms", {
      name: "Sprint 42",
      roomCode: "JIRATEST",
      cardSet: ["1", "2", "3", "5", "8"],
      status: "lobby",
      currentTaskIndex: 0,
      createdBy: "session-1",
      createdAt: Date.now(),
      jiraProjectKey: "PROJ",
      jiraBaseUrl: "https://mycompany.atlassian.net",
    });
  });
}

describe("jira import", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    testGlobals.process ??= { env: {} };
    testGlobals.process.env.JIRA_API_TOKEN = "test-token";
    testGlobals.process.env.JIRA_EMAIL = "test@example.com";
  });

  test("importFromJira sets status to loading and scheduler import succeeds", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createJiraRoom(t);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: "summary", name: "Summary" },
          {
            id: "customfield_10016",
            name: "Story Points",
            schema: { custom: "com.atlassian.jira.plugin.system.customfieldtypes:float-story-points" },
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [
            {
              key: "PROJ-1",
              fields: {
                summary: "First story",
                description: {
                  type: "doc",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "Line 1" },
                        { type: "hardBreak" },
                        { type: "text", text: "Line 2" },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          nextPageToken: "page-2",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          issues: [
            {
              key: "PROJ-2",
              fields: {
                summary: "Second story",
                description: null,
              },
            },
          ],
        }),
      });

    vi.stubGlobal("fetch", mockFetch);

    await t.mutation(importFromJira as any, { roomId });

    let room = await t.run(async (ctx) => ctx.db.get(roomId));
    expect(room?.importStatus).toBe("loading");

    await t.finishAllScheduledFunctions(() => {
      vi.runAllTimers();
    });

    room = await t.run(async (ctx) => ctx.db.get(roomId));
    const tasks = await t.query(getTasksForRoom as any, { roomId });

    expect(room?.importStatus).toBe("success");
    expect(room?.importError).toBeUndefined();
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({
      jiraKey: "PROJ-1",
      title: "First story",
      description: "Line 1\nLine 2",
      jiraUrl: "https://mycompany.atlassian.net/browse/PROJ-1",
      isManual: false,
    });
    expect(tasks[1]).toMatchObject({
      jiraKey: "PROJ-2",
      title: "Second story",
      jiraUrl: "https://mycompany.atlassian.net/browse/PROJ-2",
      isManual: false,
    });
    expect(tasks[1]).not.toHaveProperty("description");

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "https://mycompany.atlassian.net/rest/api/3/field",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: expect.stringMatching(/^Basic /),
        }),
      })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "https://mycompany.atlassian.net/rest/api/3/search/jql",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          jql: 'project = "PROJ" ORDER BY created DESC',
          maxResults: 50,
          fields: ["summary", "description", "customfield_10016"],
        }),
      })
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      "https://mycompany.atlassian.net/rest/api/3/search/jql",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          jql: 'project = "PROJ" ORDER BY created DESC',
          maxResults: 50,
          fields: ["summary", "description", "customfield_10016"],
          nextPageToken: "page-2",
        }),
      })
    );
  });

  test("importFromJira throws if room has no Jira config", async () => {
    const t = convexTest(schema, modules);
    const roomId = await t.run(async (ctx) => {
      return await ctx.db.insert("rooms", {
        name: "No Jira Room",
        roomCode: "NOJIRA00",
        cardSet: ["1", "2"],
        status: "lobby",
        currentTaskIndex: 0,
        createdBy: "session-1",
        createdAt: Date.now(),
      });
    });

    await expect(t.mutation(importFromJira as any, { roomId })).rejects.toThrow(
      "no Jira configuration"
    );
  });

  test("internal action stores import error when Jira credentials are missing", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createJiraRoom(t);

    delete testGlobals.process?.env.JIRA_API_TOKEN;
    delete testGlobals.process?.env.JIRA_EMAIL;

    await t.action(_importFromJiraInternal as any, {
      roomId,
      jiraBaseUrl: "https://mycompany.atlassian.net",
      jiraProjectKey: "PROJ",
    });

    const room = await t.run(async (ctx) => ctx.db.get(roomId));
    expect(room?.importStatus).toBe("error");
    expect(room?.importError).toContain("JIRA_API_TOKEN and JIRA_EMAIL");
  });
});
