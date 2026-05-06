/// <reference types="vite/client" />
import { type TestConvex, convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";

import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

interface MockResponse {
  ok: boolean;
  status: number;
  url: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

type FetchFn = (input: string, init?: Record<string, unknown>) => Promise<MockResponse>;

function mockOk(body: unknown = {}, url = "https://jira.example/mock"): MockResponse {
  return {
    ok: true,
    status: 200,
    url,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function mockFail(status = 500, message = "Internal Server Error"): MockResponse {
  return {
    ok: false,
    status,
    url: "https://jira.example/mock",
    json: async () => ({ error: message }),
    text: async () => message,
  };
}

const ESTIMATE_PATH = "/rest/api/3/issue/";
const SPRINT_PATH = "/rest/agile/1.0/sprint/";

function classifyJiraCall(input: string): "estimate" | "sprint" | "other" {
  if (input.includes(ESTIMATE_PATH)) {
    return "estimate";
  }
  if (input.includes(SPRINT_PATH)) {
    return "sprint";
  }
  return "other";
}

/** Routed fetch implementation: estimate ok, sprint fails. */
const fetchEstimateOkSprintFail: FetchFn = async (input) =>
  classifyJiraCall(input) === "estimate" ? mockOk({}) : mockFail(400, "sprint move failed");

/** Routed fetch implementation: estimate fails, sprint ok. */
const fetchEstimateFailSprintOk: FetchFn = async (input) =>
  classifyJiraCall(input) === "estimate" ? mockFail(400, "estimate update failed") : mockOk({});

function setupJiraEnv() {
  vi.stubEnv("JIRA_API_TOKEN", "test-token");
  vi.stubEnv("JIRA_EMAIL", "tester@example.com");
  vi.stubEnv("JIRA_BASE_URL", "https://jira.example");
}

function installFetch(impl: FetchFn) {
  const fetchMock = vi.fn<FetchFn>(impl);
  // @ts-expect-error - test stub
  globalThis.fetch = fetchMock;
  return fetchMock;
}

async function createTestRoom(t: TestConvex<typeof schema>) {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("rooms", {
        name: "Test Room",
        roomCode: "TESTCODE",
        cardSet: ["1", "2", "3", "5", "8"],
        status: "voting",
        currentTaskIndex: 0,
        createdBy: "session-host",
        createdAt: Date.now(),
      }),
  );
}

async function addParticipant(
  t: TestConvex<typeof schema>,
  roomId: Id<"rooms">,
  sessionId: string,
  isHost: boolean,
  displayName = sessionId,
) {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("participants", {
        displayName,
        isConnected: true,
        joinedAt: Date.now(),
        roomId,
        sessionId,
        isHost,
      }),
  );
}

async function addJiraTask(
  t: TestConvex<typeof schema>,
  roomId: Id<"rooms">,
  jiraKey: string,
  extra: Partial<{
    savedJiraEstimate: string;
    savedJiraSprintId: number;
    savedJiraSprintName: string;
  }> = {},
) {
  return await t.run(
    async (ctx) =>
      await ctx.db.insert("tasks", {
        roomId,
        jiraKey,
        order: 0,
        isManual: false,
        ...extra,
      }),
  );
}

describe("fetchTaskDetails", () => {
  it("returns the Jira reporter display name", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const fetchMock = installFetch(async () =>
      mockOk({
        issues: [
          {
            fields: {
              assignee: { displayName: "Assignee One" },
              customfield_10020: [],
              description: null,
              issuelinks: [],
              labels: [],
              reporter: { displayName: "Reporter One" },
              status: { name: "To Do" },
              summary: "Task with reporter",
              issuetype: { name: "Story" },
            },
            key: "PROJ-1",
          },
        ],
      }),
    );

    const details = await t.action(api.jira.fetchTaskDetails, {
      jiraKeys: ["PROJ-1"],
    });

    expect(details["PROJ-1"]?.reporter).toBe("Reporter One");
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      fields: string[];
    };
    expect(requestBody.fields).toContain("reporter");
  });

  it("keeps Jira mark whitespace outside markdown delimiters", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    installFetch(async () =>
      mockOk({
        issues: [
          {
            fields: {
              assignee: null,
              customfield_10020: [],
              description: {
                type: "doc",
                content: [
                  {
                    type: "orderedList",
                    content: [
                      {
                        type: "listItem",
                        content: [
                          {
                            type: "paragraph",
                            content: [
                              {
                                type: "text",
                                text: "Решить вопрос с ",
                                marks: [{ type: "strong" }],
                              },
                              { type: "text", text: "<video>", marks: [{ type: "code" }] },
                              { type: "text", text: " — старый renderer" },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: "bulletList",
                    content: [
                      {
                        type: "listItem",
                        content: [
                          {
                            type: "paragraph",
                            content: [
                              {
                                type: "text",
                                text: "What’s included ",
                                marks: [{ type: "em" }],
                              },
                              { type: "text", text: "(список скриптов) и " },
                              {
                                type: "text",
                                text: "Author’s feed ",
                                marks: [{ type: "em" }],
                              },
                              { type: "text", text: ", табы видимы" },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              issuelinks: [],
              labels: [],
              reporter: null,
              status: { name: "To Do" },
              summary: "Task with marked text",
              issuetype: { name: "Story" },
            },
            key: "PROJ-1",
          },
        ],
      }),
    );

    const details = await t.action(api.jira.fetchTaskDetails, {
      jiraKeys: ["PROJ-1"],
    });

    expect(details["PROJ-1"]?.description).toContain(
      "1. **Решить вопрос с** `<video>` — старый renderer",
    );
    expect(details["PROJ-1"]?.description).toContain(
      "- _What’s included_ (список скриптов) и _Author’s feed_ , табы видимы",
    );
  });
});

describe("saveJiraTaskUpdates", () => {
  it("host can save changed estimate and changed sprint with one patch", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    await addParticipant(t, roomId, "session-host", true);
    const taskId = await addJiraTask(t, roomId, "PROJ-1");

    const fetchMock = installFetch(async () => mockOk({}));

    const result = await t.action(api.jira.saveJiraTaskUpdates, {
      sessionId: "session-host",
      taskId,
      estimate: "3h",
      sprintId: 5,
      sprintName: "Sprint 5",
    });

    expect(result).toStrictEqual({
      estimate: { attempted: true, success: true },
      sprint: { attempted: true, success: true },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const stored = await t.run(async (ctx) => ctx.db.get(taskId));
    expect(stored).toMatchObject({
      savedJiraEstimate: "3h",
      savedJiraSprintId: 5,
      savedJiraSprintName: "Sprint 5",
    });
  });

  it("non-host participant cannot save (throws)", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    await addParticipant(t, roomId, "session-host", true);
    await addParticipant(t, roomId, "session-guest", false);
    const taskId = await addJiraTask(t, roomId, "PROJ-1");

    const fetchMock = installFetch(async () => mockOk({}));

    await expect(
      t.action(api.jira.saveJiraTaskUpdates, {
        sessionId: "session-guest",
        taskId,
        estimate: "2h",
      }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("non-participant cannot save (throws)", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    await addParticipant(t, roomId, "session-host", true);
    const taskId = await addJiraTask(t, roomId, "PROJ-1");

    const fetchMock = installFetch(async () => mockOk({}));

    await expect(
      t.action(api.jira.saveJiraTaskUpdates, {
        sessionId: "session-stranger",
        taskId,
        estimate: "2h",
      }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("save fails when the room has no host (throws)", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    await addParticipant(t, roomId, "session-anyone", false);
    const taskId = await addJiraTask(t, roomId, "PROJ-1");

    const fetchMock = installFetch(async () => mockOk({}));

    await expect(
      t.action(api.jira.saveJiraTaskUpdates, {
        sessionId: "session-anyone",
        taskId,
        estimate: "2h",
      }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("performs zero Jira calls when both fields are unchanged or empty", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    await addParticipant(t, roomId, "session-host", true);
    const taskId = await addJiraTask(t, roomId, "PROJ-1", {
      savedJiraEstimate: "2h",
      savedJiraSprintId: 7,
      savedJiraSprintName: "Sprint 7",
    });

    const fetchMock = installFetch(async () => mockOk({}));

    const result = await t.action(api.jira.saveJiraTaskUpdates, {
      sessionId: "session-host",
      taskId,
      estimate: "2h",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toStrictEqual({
      estimate: { attempted: false, success: false },
      sprint: { attempted: false, success: false },
    });
    const stored = await t.run(async (ctx) => ctx.db.get(taskId));
    expect(stored).toMatchObject({
      savedJiraEstimate: "2h",
      savedJiraSprintId: 7,
      savedJiraSprintName: "Sprint 7",
    });
  });

  it("treats empty trimmed estimate as no change", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    await addParticipant(t, roomId, "session-host", true);
    const taskId = await addJiraTask(t, roomId, "PROJ-1", {
      savedJiraEstimate: "2h",
    });

    const fetchMock = installFetch(async () => mockOk({}));

    const result = await t.action(api.jira.saveJiraTaskUpdates, {
      sessionId: "session-host",
      taskId,
      estimate: "   ",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.estimate).toStrictEqual({ attempted: false, success: false });
    const stored = await t.run(async (ctx) => ctx.db.get(taskId));
    expect(stored?.savedJiraEstimate).toBe("2h");
  });

  it("sprint-only save is allowed and patches sprint fields only", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    await addParticipant(t, roomId, "session-host", true);
    const taskId = await addJiraTask(t, roomId, "PROJ-1", {
      savedJiraEstimate: "2h",
      savedJiraSprintId: 7,
      savedJiraSprintName: "Sprint 7",
    });

    const fetchMock = installFetch(async () => mockOk({}));

    const result = await t.action(api.jira.saveJiraTaskUpdates, {
      sessionId: "session-host",
      taskId,
      sprintId: 9,
      sprintName: "Sprint 9",
    });

    // oxlint-disable-next-line prefer-called-once -- conflicts with prefer-called-times for n=1
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual({
      estimate: { attempted: false, success: false },
      sprint: { attempted: true, success: true },
    });
    const stored = await t.run(async (ctx) => ctx.db.get(taskId));
    expect(stored).toMatchObject({
      savedJiraEstimate: "2h",
      savedJiraSprintId: 9,
      savedJiraSprintName: "Sprint 9",
    });
  });

  it("estimate success and sprint failure: only estimate is patched", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    await addParticipant(t, roomId, "session-host", true);
    const taskId = await addJiraTask(t, roomId, "PROJ-1", {
      savedJiraEstimate: "1h",
      savedJiraSprintId: 7,
      savedJiraSprintName: "Sprint 7",
    });

    const fetchMock = installFetch(fetchEstimateOkSprintFail);

    const result = await t.action(api.jira.saveJiraTaskUpdates, {
      sessionId: "session-host",
      taskId,
      estimate: "5h",
      sprintId: 9,
      sprintName: "Sprint 9",
    });

    expect(result.estimate).toStrictEqual({ attempted: true, success: true });
    expect(result.sprint).toMatchObject({ attempted: true, success: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const stored = await t.run(async (ctx) => ctx.db.get(taskId));
    expect(stored).toMatchObject({
      savedJiraEstimate: "5h",
      savedJiraSprintId: 7,
      savedJiraSprintName: "Sprint 7",
    });
  });

  it("estimate failure and sprint success: only sprint is patched", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    await addParticipant(t, roomId, "session-host", true);
    const taskId = await addJiraTask(t, roomId, "PROJ-1", {
      savedJiraEstimate: "1h",
      savedJiraSprintId: 7,
      savedJiraSprintName: "Sprint 7",
    });

    const fetchMock = installFetch(fetchEstimateFailSprintOk);

    const result = await t.action(api.jira.saveJiraTaskUpdates, {
      sessionId: "session-host",
      taskId,
      estimate: "5h",
      sprintId: 9,
      sprintName: "Sprint 9",
    });

    expect(result.estimate).toMatchObject({ attempted: true, success: false });
    expect(result.sprint).toStrictEqual({ attempted: true, success: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const stored = await t.run(async (ctx) => ctx.db.get(taskId));
    expect(stored).toMatchObject({
      savedJiraEstimate: "1h",
      savedJiraSprintId: 9,
      savedJiraSprintName: "Sprint 9",
    });
  });

  it("throws if sprintId is given but sprintName is missing", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    await addParticipant(t, roomId, "session-host", true);
    const taskId = await addJiraTask(t, roomId, "PROJ-1");

    const fetchMock = installFetch(async () => mockOk({}));

    await expect(
      t.action(api.jira.saveJiraTaskUpdates, {
        sessionId: "session-host",
        taskId,
        sprintId: 9,
      }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("estimate runs before sprint (ordering)", async () => {
    setupJiraEnv();
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    await addParticipant(t, roomId, "session-host", true);
    const taskId = await addJiraTask(t, roomId, "PROJ-1");

    const callOrder: string[] = [];
    installFetch(async (input) => {
      callOrder.push(classifyJiraCall(input));
      return mockOk({});
    });

    await t.action(api.jira.saveJiraTaskUpdates, {
      sessionId: "session-host",
      taskId,
      estimate: "3h",
      sprintId: 5,
      sprintName: "Sprint 5",
    });

    expect(callOrder).toStrictEqual(["estimate", "sprint"]);
  });
});
