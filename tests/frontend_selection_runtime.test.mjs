import test from "node:test";
import assert from "node:assert/strict";

import {
  clearBatchSelection,
  resetBatchSelection,
  selectVisibleTodos,
  syncBatchMoveTarget,
  syncBatchSelection,
  toggleSelectionMode,
  toggleTodoSelection,
} from "../frontend/selection_runtime.js";

test("resetBatchSelection clears selection, optionally leaves mode enabled, and syncs move target", () => {
  const calls = [];
  resetBatchSelection({
    clearSelectedTodoIds: () => calls.push("clear"),
    setSelectionMode: (value) => calls.push(["mode", value]),
    syncBatchMoveTarget: () => calls.push("sync"),
  });

  assert.deepEqual(calls, ["clear", "sync"]);
});

test("resetBatchSelection disables selection mode when requested", () => {
  const calls = [];
  resetBatchSelection({
    disableMode: true,
    clearSelectedTodoIds: () => calls.push("clear"),
    setSelectionMode: (value) => calls.push(["mode", value]),
    syncBatchMoveTarget: () => calls.push("sync"),
  });

  assert.deepEqual(calls, ["clear", ["mode", false], "sync"]);
});

test("syncBatchSelection drops stale selection when batch mode is off", () => {
  let cleared = 0;
  let nextSelected = null;
  syncBatchSelection({
    state: {
      selectionMode: false,
      selectedTodoIds: ["todo-1"],
      todos: [{ id: "todo-1" }],
    },
    clearSelectedTodoIds: () => {
      cleared += 1;
    },
    setSelectedTodoIds: (value) => {
      nextSelected = value;
    },
    getCurrentViewTodos: () => [{ id: "todo-1" }],
  });

  assert.equal(cleared, 1);
  assert.equal(nextSelected, null);
});

test("syncBatchSelection keeps only visible ids when visibleOnly is enabled", () => {
  let nextSelected = null;
  syncBatchSelection({
    state: {
      selectionMode: true,
      selectedTodoIds: ["todo-1", "todo-2", "todo-3"],
      todos: [{ id: "todo-1" }, { id: "todo-2" }, { id: "todo-3" }],
    },
    visibleOnly: true,
    clearSelectedTodoIds: () => {
      throw new Error("should not clear");
    },
    setSelectedTodoIds: (value) => {
      nextSelected = value;
    },
    getCurrentViewTodos: () => [{ id: "todo-2" }, { id: "todo-3" }],
  });

  assert.deepEqual(nextSelected, ["todo-2", "todo-3"]);
});

test("syncBatchMoveTarget resolves and stores the next move list id", () => {
  let batchMoveListId = "";
  syncBatchMoveTarget({
    state: { lists: [{ id: "list-a" }] },
    resolveBatchMoveListId: () => "list-a",
    setBatchMoveListId: (value) => {
      batchMoveListId = value;
    },
  });

  assert.equal(batchMoveListId, "list-a");
});

test("selectVisibleTodos enters batch mode, selects current todos, and syncs move target", () => {
  const calls = [];
  selectVisibleTodos({
    state: { currentFilter: "all" },
    getCurrentViewTodos: () => [{ id: "todo-1" }, { id: "todo-2" }],
    setSelectionMode: (value) => calls.push(["mode", value]),
    setSelectedTodoIds: (value) => calls.push(["selected", value]),
    syncBatchMoveTarget: () => calls.push("sync"),
  });

  assert.deepEqual(calls, [
    ["mode", true],
    ["selected", ["todo-1", "todo-2"]],
    "sync",
  ]);
});

test("clearBatchSelection clears selected ids and syncs move target", () => {
  const calls = [];
  clearBatchSelection({
    clearSelectedTodoIds: () => calls.push("clear"),
    syncBatchMoveTarget: () => calls.push("sync"),
  });

  assert.deepEqual(calls, ["clear", "sync"]);
});

test("toggleTodoSelection enables selection mode when selecting and always syncs", () => {
  const calls = [];
  toggleTodoSelection({
    todoId: "todo-1",
    selected: true,
    setSelectionMode: (value) => calls.push(["mode", value]),
    toggleSelectedTodoId: (todoId, selected) => calls.push(["toggle", todoId, selected]),
    syncBatchMoveTarget: () => calls.push("sync"),
  });

  assert.deepEqual(calls, [
    ["mode", true],
    ["toggle", "todo-1", true],
    "sync",
  ]);
});

test("toggleSelectionMode enables batch mode and syncs when currently disabled", () => {
  const calls = [];
  toggleSelectionMode({
    state: { selectionMode: false },
    setSelectionMode: (value) => calls.push(["mode", value]),
    resetBatchSelection: () => calls.push("reset"),
    syncBatchMoveTarget: () => calls.push("sync"),
  });

  assert.deepEqual(calls, [["mode", true], "sync"]);
});

test("toggleSelectionMode resets batch state when currently enabled", () => {
  const calls = [];
  toggleSelectionMode({
    state: { selectionMode: true },
    setSelectionMode: () => calls.push("mode"),
    resetBatchSelection: (options) => calls.push(["reset", options]),
    syncBatchMoveTarget: () => calls.push("sync"),
  });

  assert.deepEqual(calls, [["reset", { disableMode: true }]]);
});
