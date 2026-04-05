import test from "node:test";
import assert from "node:assert/strict";

import {
  executeBatchOperations,
  executeOrQueue,
  restoreLocalSnapshot,
} from "../frontend/mutation_runtime.js";

test("restoreLocalSnapshot writes captured state back into the store and syncs selection", () => {
  const calls = [];
  restoreLocalSnapshot({
    snapshot: {
      lists: [{ id: "list-a" }],
      todos: [{ id: "todo-1" }],
      activeListId: "list-a",
      selectionMode: true,
      selectedTodoIds: ["todo-1"],
      batchMoveListId: "list-b",
    },
    setLists: (value) => calls.push(["lists", value]),
    setTodos: (value) => calls.push(["todos", value]),
    setActiveListId: (value) => calls.push(["activeListId", value]),
    setSelectionMode: (value) => calls.push(["selectionMode", value]),
    setSelectedTodoIds: (value) => calls.push(["selectedTodoIds", value]),
    setBatchMoveListId: (value) => calls.push(["batchMoveListId", value]),
    syncBatchSelection: (value) => calls.push(["syncBatchSelection", value]),
    syncBatchMoveTarget: () => calls.push(["syncBatchMoveTarget"]),
  });

  assert.deepEqual(calls, [
    ["lists", [{ id: "list-a" }]],
    ["todos", [{ id: "todo-1" }]],
    ["activeListId", "list-a"],
    ["selectionMode", true],
    ["selectedTodoIds", ["todo-1"]],
    ["batchMoveListId", "list-b"],
    ["syncBatchSelection", { visibleOnly: true }],
    ["syncBatchMoveTarget"],
  ]);
});

test("executeOrQueue persists optimistic state and refreshes on success", async () => {
  const calls = [];

  await executeOrQueue({
    kind: "updateTodo",
    payload: { todoId: "todo-1", completed: true },
    optimisticApply: () => calls.push(["optimisticApply"]),
    getState: () => ({ serverBaseUrl: "http://node:8000", serverToken: "secret" }),
    captureLocalSnapshot: () => {
      calls.push(["captureLocalSnapshot"]);
      return { id: "snapshot" };
    },
    syncBatchSelection: (options) => calls.push(["syncBatchSelection", options]),
    syncBatchMoveTarget: () => calls.push(["syncBatchMoveTarget"]),
    persistCurrentSnapshot: () => calls.push(["persistCurrentSnapshot"]),
    render: () => calls.push(["render"]),
    runServerMutation: async (...args) => calls.push(["runServerMutation", ...args]),
    refreshSnapshot: async () => calls.push(["refreshSnapshot"]),
    isAuthError: () => false,
    restoreLocalSnapshot: () => calls.push(["restoreLocalSnapshot"]),
    handleSyncError: (...args) => calls.push(["handleSyncError", ...args]),
    enqueueOperation: (...args) => calls.push(["enqueueOperation", ...args]),
    loadPendingOperations: () => [{}, {}],
    setPendingOperations: (value) => calls.push(["setPendingOperations", value]),
  });

  assert.deepEqual(calls, [
    ["captureLocalSnapshot"],
    ["optimisticApply"],
    ["syncBatchSelection", { visibleOnly: true }],
    ["syncBatchMoveTarget"],
    ["persistCurrentSnapshot"],
    ["render"],
    ["runServerMutation", "updateTodo", { todoId: "todo-1", completed: true }],
    ["refreshSnapshot"],
  ]);
});

test("executeOrQueue restores previous snapshot on auth errors", async () => {
  const calls = [];
  const authError = new Error("unauthorized");

  await executeOrQueue({
    kind: "updateTodo",
    payload: { todoId: "todo-1" },
    optimisticApply: () => calls.push(["optimisticApply"]),
    getState: () => ({ serverBaseUrl: "http://node:8000", serverToken: "secret" }),
    captureLocalSnapshot: () => "snapshot",
    syncBatchSelection: () => calls.push(["syncBatchSelection"]),
    syncBatchMoveTarget: () => calls.push(["syncBatchMoveTarget"]),
    persistCurrentSnapshot: () => calls.push(["persistCurrentSnapshot"]),
    render: () => calls.push(["render"]),
    runServerMutation: async () => {
      throw authError;
    },
    refreshSnapshot: async () => calls.push(["refreshSnapshot"]),
    isAuthError: (error) => error === authError,
    restoreLocalSnapshot: (snapshot) => calls.push(["restoreLocalSnapshot", snapshot]),
    handleSyncError: (...args) => calls.push(["handleSyncError", ...args]),
    enqueueOperation: (...args) => calls.push(["enqueueOperation", ...args]),
    loadPendingOperations: () => [{}, {}],
    setPendingOperations: (value) => calls.push(["setPendingOperations", value]),
  });

  assert.deepEqual(calls, [
    ["optimisticApply"],
    ["syncBatchSelection"],
    ["syncBatchMoveTarget"],
    ["persistCurrentSnapshot"],
    ["render"],
    ["restoreLocalSnapshot", "snapshot"],
    ["persistCurrentSnapshot"],
    ["handleSyncError", authError, "Token 无效或缺失，请重新填写后再连接。"],
  ]);
});

test("executeBatchOperations queues remaining operations on offline failures", async () => {
  const calls = [];
  const offlineError = new Error("offline");
  let runCount = 0;

  await executeBatchOperations({
    operations: [
      { kind: "updateTodo", payload: { todoId: "todo-1" } },
      { kind: "deleteTodo", payload: { todoId: "todo-2" } },
      { kind: "moveTodo", payload: { todoId: "todo-3" } },
    ],
    optimisticApply: () => calls.push(["optimisticApply"]),
    getState: () => ({ serverBaseUrl: "http://node:8000", serverToken: "secret" }),
    clearSelectedTodoIds: () => calls.push(["clearSelectedTodoIds"]),
    captureLocalSnapshot: () => "snapshot",
    syncBatchSelection: (options) => calls.push(["syncBatchSelection", options]),
    syncBatchMoveTarget: () => calls.push(["syncBatchMoveTarget"]),
    persistCurrentSnapshot: () => calls.push(["persistCurrentSnapshot"]),
    render: () => calls.push(["render"]),
    runServerMutation: async (...args) => {
      runCount += 1;
      calls.push(["runServerMutation", ...args]);
      if (runCount === 2) {
        throw offlineError;
      }
    },
    refreshSnapshot: async () => calls.push(["refreshSnapshot"]),
    isAuthError: () => false,
    restoreLocalSnapshot: (snapshot) => calls.push(["restoreLocalSnapshot", snapshot]),
    handleSyncError: (...args) => calls.push(["handleSyncError", ...args]),
    enqueueOperation: (...args) => calls.push(["enqueueOperation", ...args]),
    loadPendingOperations: () => [{}, {}],
    setPendingOperations: (value) => calls.push(["setPendingOperations", value]),
    offlineMessage: "批量修改已离线保存。",
  });

  assert.deepEqual(calls, [
    ["optimisticApply"],
    ["clearSelectedTodoIds"],
    ["syncBatchSelection", { visibleOnly: true }],
    ["syncBatchMoveTarget"],
    ["persistCurrentSnapshot"],
    ["render"],
    ["runServerMutation", "updateTodo", { todoId: "todo-1" }],
    ["runServerMutation", "deleteTodo", { todoId: "todo-2" }],
    ["enqueueOperation", "http://node:8000", "secret", { kind: "deleteTodo", payload: { todoId: "todo-2" } }],
    ["enqueueOperation", "http://node:8000", "secret", { kind: "moveTodo", payload: { todoId: "todo-3" } }],
    ["setPendingOperations", 2],
    ["handleSyncError", offlineError, "批量修改已离线保存。"],
  ]);
});
