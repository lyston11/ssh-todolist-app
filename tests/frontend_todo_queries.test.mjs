import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBatchSelectionSummary,
  filterTodos,
  getCurrentViewTodos,
  getSelectedTodoIds,
  getSelectedTodos,
  getVisibleTodos,
  resolveBatchMoveListId,
} from "../frontend/todo_queries.js";

const state = {
  activeListId: "list-a",
  batchMoveListId: "",
  currentFilter: "all",
  lists: [
    { id: "list-a", title: "Alpha" },
    { id: "list-b", title: "Beta" },
  ],
  selectedTodoIds: ["todo-1", "todo-2", "todo-3"],
  todos: [
    { id: "todo-1", listId: "list-a", title: "A1", completed: false },
    { id: "todo-2", listId: "list-a", title: "A2", completed: true },
    { id: "todo-3", listId: "list-b", title: "B1", completed: false },
  ],
};

test("getVisibleTodos scopes todos by active list", () => {
  assert.deepEqual(
    getVisibleTodos(state).map((todo) => todo.id),
    ["todo-1", "todo-2"],
  );
});

test("filterTodos and getCurrentViewTodos respect current filter", () => {
  assert.deepEqual(
    filterTodos(state.todos, "active").map((todo) => todo.id),
    ["todo-1", "todo-3"],
  );

  assert.deepEqual(
    getCurrentViewTodos({ ...state, currentFilter: "completed" }).map((todo) => todo.id),
    ["todo-2"],
  );
});

test("selected todo helpers keep selection scoped to current view by default", () => {
  assert.deepEqual(getSelectedTodoIds(state), ["todo-1", "todo-2"]);
  assert.deepEqual(
    getSelectedTodos(state).map((todo) => todo.id),
    ["todo-1", "todo-2"],
  );
});

test("resolveBatchMoveListId picks another list when current selection comes from one list", () => {
  assert.equal(resolveBatchMoveListId(state), "list-b");
  assert.equal(resolveBatchMoveListId({ ...state, batchMoveListId: "list-b" }), "list-b");
});

test("buildBatchSelectionSummary reflects visible and selected counts", () => {
  assert.equal(
    buildBatchSelectionSummary({ hasVisibleTodos: true, visibleCount: 4, selectedCount: 0 }),
    "已进入批量模式，当前视图共有 4 项任务",
  );

  assert.equal(
    buildBatchSelectionSummary({ hasVisibleTodos: true, visibleCount: 4, selectedCount: 2 }),
    "已选择 2 项任务，当前视图共有 4 项",
  );
});
