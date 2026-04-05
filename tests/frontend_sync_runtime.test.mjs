import test from "node:test";
import assert from "node:assert/strict";

import {
  applyRemoteSnapshot,
  flushPendingQueue,
  normalizeSnapshotPayload,
  persistSnapshot,
  runServerMutation,
} from "../frontend/sync_runtime.js";

test("normalizeSnapshotPayload filters malformed records", () => {
  const normalized = normalizeSnapshotPayload({
    lists: [
      { id: "list-1", title: "Inbox", createdAt: 1, updatedAt: 1 },
      { id: 1, title: "Broken" },
    ],
    items: [
      { id: "todo-1", listId: "list-1", title: "Task", completed: false, createdAt: 1, updatedAt: 1 },
      { id: "todo-2", title: "Broken" },
    ],
    defaultListId: "list-1",
  });

  assert.deepEqual(normalized, {
    lists: [{ id: "list-1", title: "Inbox", createdAt: 1, updatedAt: 1 }],
    todos: [{ id: "todo-1", listId: "list-1", title: "Task", completed: false, createdAt: 1, updatedAt: 1 }],
    defaultListId: "list-1",
  });
});

test("runServerMutation dispatches createTodo using active list fallback", async () => {
  const calls = [];
  await runServerMutation({
    kind: "createTodo",
    payload: { id: "todo-1", title: "Task" },
    serverBaseUrl: "http://100.1.1.1:8000",
    serverToken: "secret",
    getActiveListId: () => "list-active",
    api: {
      createTodo: async (...args) => {
        calls.push(args);
      },
    },
  });

  assert.deepEqual(calls, [[
    "http://100.1.1.1:8000",
    "secret",
    "Task",
    "list-active",
    "todo-1",
  ]]);
});

test("flushPendingQueue forwards remaining count", async () => {
  let pendingCount = -1;
  const remaining = await flushPendingQueue({
    serverBaseUrl: "http://100.1.1.1:8000",
    serverToken: "secret",
    flushPendingOperations: async (_url, _token, handler) => {
      await handler({ kind: "deleteTodo", payload: { todoId: "todo-1" } });
      return [{ kind: "noop" }];
    },
    runMutation: async () => {},
    setPendingOperations: (value) => {
      pendingCount = value;
    },
  });

  assert.equal(pendingCount, 1);
  assert.deepEqual(remaining, [{ kind: "noop" }]);
});

test("applyRemoteSnapshot updates derived app state", () => {
  const calls = [];
  const result = applyRemoteSnapshot({
    snapshot: {
      lists: [{ id: "list-1", title: "Inbox", createdAt: 1, updatedAt: 1 }],
      items: [{ id: "todo-1", listId: "list-1", title: "Task", completed: false, createdAt: 1, updatedAt: 1 }],
      defaultListId: "list-1",
    },
    preserveActiveList: true,
    currentActiveListId: "missing",
    serverBaseUrl: "http://100.1.1.1:8000",
    serverToken: "secret",
    loadPendingOperations: () => [{}, {}],
    setLists: (value) => calls.push(["lists", value]),
    setTodos: (value) => calls.push(["todos", value]),
    setActiveListId: (value) => calls.push(["activeListId", value]),
    setPendingOperations: (value) => calls.push(["pending", value]),
    setSyncState: (value) => calls.push(["sync", value]),
    syncBatchSelection: () => calls.push(["batchSelection"]),
    syncBatchMoveTarget: () => calls.push(["batchMove"]),
  });

  assert.equal(result.activeListId, "list-1");
  assert.deepEqual(calls[2], ["activeListId", "list-1"]);
  assert.deepEqual(calls[3], ["pending", 2]);
  assert.deepEqual(calls[4], ["sync", "online"]);
});

test("persistSnapshot writes cached snapshot shape", () => {
  const writes = [];
  persistSnapshot({
    serverBaseUrl: "http://100.1.1.1:8000",
    serverToken: "secret",
    state: {
      lists: [{ id: "list-1" }],
      todos: [{ id: "todo-1" }],
      activeListId: "list-1",
    },
    saveCachedSnapshot: (...args) => writes.push(args),
  });

  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], "http://100.1.1.1:8000");
  assert.equal(writes[0][1], "secret");
  assert.equal(writes[0][2].defaultListId, "list-1");
});
