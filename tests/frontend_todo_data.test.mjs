import test from "node:test";
import assert from "node:assert/strict";

import {
  applyTodoPatches,
  captureSnapshot,
  clearCompletedTodosFromList,
  createOptimisticList,
  createOptimisticTodo,
  prependOptimisticTodo,
  removeListAndTodos,
  removeTodoById,
  removeTodosByIds,
  resolveActiveListId,
  updateListTitle,
} from "../frontend/todo_data.js";

test("resolveActiveListId keeps current list when still present", () => {
  const lists = [{ id: "a" }, { id: "b" }];
  assert.equal(resolveActiveListId(lists, "b", "a"), "b");
  assert.equal(resolveActiveListId(lists, "x", "a"), "a");
  assert.equal(resolveActiveListId(lists, "x", "y"), "a");
});

test("optimistic factories stamp todo and list records", () => {
  const todo = createOptimisticTodo({ id: "todo-1", listId: "list-1", title: "Draft", completed: false });
  const list = createOptimisticList({ id: "list-1", title: "Inbox" });

  assert.equal(todo.id, "todo-1");
  assert.equal(todo.completedAt, null);
  assert.equal(list.id, "list-1");
  assert.equal(typeof list.createdAt, "number");
});

test("collection helpers update and remove todo records", () => {
  const todos = [
    { id: "1", listId: "a", title: "One", completed: false, completedAt: null, updatedAt: 1 },
    { id: "2", listId: "a", title: "Two", completed: true, completedAt: 2, updatedAt: 2 },
    { id: "3", listId: "b", title: "Three", completed: false, completedAt: null, updatedAt: 3 },
  ];

  assert.deepEqual(prependOptimisticTodo(todos, { id: "4", listId: "a", title: "New", completed: false })[0].id, "4");
  assert.deepEqual(removeTodoById(todos, "1").map((todo) => todo.id), ["2", "3"]);
  assert.deepEqual(removeTodosByIds(todos, ["1", "3"]).map((todo) => todo.id), ["2"]);
  assert.deepEqual(clearCompletedTodosFromList(todos, "a").map((todo) => todo.id), ["1", "3"]);
});

test("applyTodoPatches updates title completion and target list", () => {
  const todos = [
    { id: "1", listId: "a", title: "One", completed: false, completedAt: null, updatedAt: 1 },
  ];

  const updated = applyTodoPatches(
    todos,
    [{ todoId: "1", title: "Renamed", completed: true, listId: "b" }],
    42,
  );

  assert.deepEqual(updated[0], {
    id: "1",
    listId: "b",
    title: "Renamed",
    completed: true,
    completedAt: 42,
    updatedAt: 42,
  });
});

test("list helpers update title and remove owned todos", () => {
  const lists = [
    { id: "a", title: "A", updatedAt: 1 },
    { id: "b", title: "B", updatedAt: 2 },
  ];
  const todos = [
    { id: "1", listId: "a" },
    { id: "2", listId: "b" },
  ];

  assert.equal(updateListTitle(lists, "a", "Renamed", 9)[0].title, "Renamed");
  assert.deepEqual(removeListAndTodos(lists, todos, "a"), {
    lists: [{ id: "b", title: "B", updatedAt: 2 }],
    todos: [{ id: "2", listId: "b" }],
  });
});

test("captureSnapshot clones mutable app state slices", () => {
  const snapshot = captureSnapshot({
    lists: [{ id: "a", title: "A" }],
    todos: [{ id: "1", listId: "a", title: "One" }],
    activeListId: "a",
    selectionMode: true,
    selectedTodoIds: ["1"],
    batchMoveListId: "b",
  });

  assert.deepEqual(snapshot, {
    lists: [{ id: "a", title: "A" }],
    todos: [{ id: "1", listId: "a", title: "One" }],
    activeListId: "a",
    selectionMode: true,
    selectedTodoIds: ["1"],
    batchMoveListId: "b",
  });
});
