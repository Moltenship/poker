import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

async function createTestRoom(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("rooms", {
      name: "Test Room",
      roomCode: "TESTCODE",
      cardSet: ["1", "2", "3", "5", "8"],
      status: "lobby",
      currentTaskIndex: 0,
      createdBy: "session-1",
      createdAt: Date.now(),
    });
  });
}

describe("tasks", () => {
  test("addTask creates a manual task with auto-incremented order", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    const taskId1 = await t.mutation(api.tasks.addTask, {
      sessionId: "session-1",
      roomId,
      title: "User Story 1",
    });
    const taskId2 = await t.mutation(api.tasks.addTask, {
      sessionId: "session-1",
      roomId,
      title: "User Story 2",
    });

    const tasks = await t.query(api.tasks.getTasksForRoom, { roomId });
    expect(tasks).toHaveLength(2);
    expect(tasks[0].order).toBeLessThan(tasks[1].order);
    expect(tasks[0].isManual).toBe(true);
    expect(taskId1).toBeDefined();
    expect(taskId2).toBeDefined();
  });

  test("importTasks upserts by jiraKey — no duplicates on reimport", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.tasks.importTasks, {
      roomId,
      tasks: [
        { jiraKey: "PROJ-1", title: "Story 1", description: "Desc 1", jiraUrl: "https://jira.example.com/PROJ-1" },
        { jiraKey: "PROJ-2", title: "Story 2", description: "Desc 2", jiraUrl: "https://jira.example.com/PROJ-2" },
        { jiraKey: "PROJ-3", title: "Story 3", description: null, jiraUrl: null },
      ],
    });

    let tasks = await t.query(api.tasks.getTasksForRoom, { roomId });
    expect(tasks).toHaveLength(3);

    await t.mutation(api.tasks.importTasks, {
      roomId,
      tasks: [
        { jiraKey: "PROJ-2", title: "Story 2 UPDATED", description: "Updated", jiraUrl: "https://jira.example.com/PROJ-2" },
        { jiraKey: "PROJ-4", title: "Story 4", description: null, jiraUrl: null },
      ],
    });

    tasks = await t.query(api.tasks.getTasksForRoom, { roomId });
    expect(tasks).toHaveLength(4);
    const proj2 = tasks.find((t) => t.jiraKey === "PROJ-2");
    expect(proj2?.title).toBe("Story 2 UPDATED");
  });

  test("getTasksForRoom returns tasks ordered by order field", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.tasks.addTask, { sessionId: "s1", roomId, title: "Task A" });
    await t.mutation(api.tasks.addTask, { sessionId: "s1", roomId, title: "Task B" });
    await t.mutation(api.tasks.addTask, { sessionId: "s1", roomId, title: "Task C" });

    const tasks = await t.query(api.tasks.getTasksForRoom, { roomId });
    const orders = tasks.map((t) => t.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  test("setHoursEstimate persists hours", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const taskId = await t.mutation(api.tasks.addTask, {
      sessionId: "s1",
      roomId,
      title: "Task",
    });

    await t.mutation(api.tasks.setHoursEstimate, {
      sessionId: "s1",
      taskId,
      hours: 4,
    });

    const tasks = await t.query(api.tasks.getTasksForRoom, { roomId });
    expect(tasks[0].hoursEstimate).toBe(4);
  });

  test("setFinalEstimate persists estimate", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);
    const taskId = await t.mutation(api.tasks.addTask, {
      sessionId: "s1",
      roomId,
      title: "Task",
    });

    await t.mutation(api.tasks.setFinalEstimate, {
      sessionId: "s1",
      taskId,
      estimate: "8",
    });

    const tasks = await t.query(api.tasks.getTasksForRoom, { roomId });
    expect(tasks[0].finalEstimate).toBe("8");
  });

  test("setCurrentTask updates room currentTaskIndex", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.tasks.addTask, { sessionId: "s1", roomId, title: "T1" });
    await t.mutation(api.tasks.addTask, { sessionId: "s1", roomId, title: "T2" });
    await t.mutation(api.tasks.addTask, { sessionId: "s1", roomId, title: "T3" });

    await t.mutation(api.tasks.setCurrentTask, {
      sessionId: "s1",
      roomId,
      taskIndex: 2,
    });

    const room = await t.run(async (ctx) => ctx.db.get(roomId));
    expect(room?.currentTaskIndex).toBe(2);
  });

  test("deleteTask removes manual tasks", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    const taskId = await t.mutation(api.tasks.addTask, {
      sessionId: "s1",
      roomId,
      title: "Manual Task",
    });
    await t.mutation(api.tasks.deleteTask, { sessionId: "s1", taskId });

    const tasks = await t.query(api.tasks.getTasksForRoom, { roomId });
    expect(tasks).toHaveLength(0);
  });

  test("deleteTask throws for imported (non-manual) tasks", async () => {
    const t = convexTest(schema, modules);
    const roomId = await createTestRoom(t);

    await t.mutation(api.tasks.importTasks, {
      roomId,
      tasks: [{ jiraKey: "PROJ-1", title: "Jira Story", description: null, jiraUrl: null }],
    });

    const tasks = await t.query(api.tasks.getTasksForRoom, { roomId });
    const importedTask = tasks[0];

    await expect(
      t.mutation(api.tasks.deleteTask, { sessionId: "s1", taskId: importedTask._id })
    ).rejects.toThrow();
  });
});
