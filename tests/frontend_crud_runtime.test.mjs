import test from "node:test";
import assert from "node:assert/strict";

import { createCrudHandlers } from "../frontend/crud_runtime.js";

function createDeps(overrides = {}) {
  const calls = [];
  const state = {
    lists: [
      { id: "list-a", title: "Inbox" },
      { id: "list-b", title: "Later" },
    ],
    todos: [
      { id: "todo-1", listId: "list-a", title: "One", completed: false, completedAt: null, updatedAt: 1 },
    ],
    editorMode: "create",
    editingTodoId: null,
    listEditorMode: "create",
    editingListId: null,
    ...overrides.state,
  };

  const deps = {
    getState: () => state,
    getActiveListId: () => overrides.activeListId ?? "list-a",
    createId: () => "generated-id",
    executeOrQueue: async (operation) => {
      calls.push(["executeOrQueue", operation.kind, operation.payload]);
    },
    setLists: (value) => {
      state.lists = value;
      calls.push(["setLists", value]);
    },
    setTodos: (value) => {
      state.todos = value;
      calls.push(["setTodos", value]);
    },
    setActiveListId: (value) => calls.push(["setActiveListId", value]),
    setEditorMode: (value) => {
      state.editorMode = value;
      calls.push(["setEditorMode", value]);
    },
    setEditingTodoId: (value) => {
      state.editingTodoId = value;
      calls.push(["setEditingTodoId", value]);
    },
    setListEditorMode: (value) => {
      state.listEditorMode = value;
      calls.push(["setListEditorMode", value]);
    },
    setEditingListId: (value) => {
      state.editingListId = value;
      calls.push(["setEditingListId", value]);
    },
    openEditDialog: (payload) => calls.push(["openEditDialog", payload]),
    closeEditDialog: () => calls.push(["closeEditDialog"]),
    openListDialog: (payload) => calls.push(["openListDialog", payload]),
    closeListDialog: () => calls.push(["closeListDialog"]),
    resetComposer: () => calls.push(["resetComposer"]),
    failConnection: (message) => calls.push(["failConnection", message]),
    createOptimisticList: ({ id, title }) => ({ id, title, createdAt: 1, updatedAt: 1 }),
    prependOptimisticTodo: (todos, todo) => [todo, ...todos],
    applyTodoPatchesToCollection: (todos, patches) =>
      todos.map((todo) =>
        todo.id === patches[0].todoId
          ? {
              ...todo,
              title: patches[0].title ?? todo.title,
              listId: patches[0].listId ?? todo.listId,
              completed: patches[0].completed ?? todo.completed,
            }
          : todo,
      ),
    updateListTitle: (lists, listId, title) => lists.map((list) => (list.id === listId ? { ...list, title } : list)),
    removeListAndTodos: (lists, todos, listId) => ({
      lists: lists.filter((list) => list.id !== listId),
      todos: todos.filter((todo) => todo.listId !== listId),
    }),
    removeTodoById: (todos, todoId) => todos.filter((todo) => todo.id !== todoId),
    clearCompletedTodosFromList: (todos, listId) =>
      todos.filter((todo) => !(todo.listId === listId && todo.completed)),
    ...overrides.deps,
  };

  return { calls, state, handlers: createCrudHandlers(deps) };
}

test("handleQuickCreate creates a trimmed todo and resets the composer", async () => {
  const { calls, handlers } = createDeps();

  await handlers.handleQuickCreate("  Buy milk  ");

  assert.deepEqual(calls, [
    [
      "executeOrQueue",
      "createTodo",
      { id: "generated-id", listId: "list-a", title: "Buy milk", completed: false },
    ],
    ["resetComposer"],
  ]);
});

test("handleOpenEdit enters edit mode for an existing todo", () => {
  const { calls, handlers } = createDeps();

  handlers.handleOpenEdit("todo-1");

  assert.deepEqual(calls, [
    ["setEditorMode", "edit"],
    ["setEditingTodoId", "todo-1"],
    [
      "openEditDialog",
      {
        mode: "edit",
        lists: [
          { id: "list-a", title: "Inbox" },
          { id: "list-b", title: "Later" },
        ],
        todo: { id: "todo-1", listId: "list-a", title: "One", completed: false, completedAt: null, updatedAt: 1 },
      },
    ],
  ]);
});

test("handleSaveEdit creates a todo in create mode and closes the dialog", async () => {
  const { calls, handlers } = createDeps({
    state: { editorMode: "create" },
  });

  await handlers.handleSaveEdit({ title: "  Write docs  ", listId: "list-b" });

  assert.deepEqual(calls, [
    [
      "executeOrQueue",
      "createTodo",
      { id: "generated-id", listId: "list-b", title: "Write docs", completed: false },
    ],
    ["setEditingTodoId", null],
    ["closeEditDialog"],
  ]);
});

test("handleOpenListDialog loads edit state for an existing list", () => {
  const { calls, handlers } = createDeps();

  handlers.handleOpenListDialog("list-b");

  assert.deepEqual(calls, [
    ["setListEditorMode", "edit"],
    ["setEditingListId", "list-b"],
    ["openListDialog", { mode: "edit", title: "Later" }],
  ]);
});

test("handleSaveList creates a new list and always closes the dialog", async () => {
  const { calls, handlers } = createDeps({
    state: { listEditorMode: "create" },
    deps: {
      executeOrQueue: async (operation) => {
        calls.push(["executeOrQueue", operation.kind, operation.payload]);
        operation.optimisticApply();
      },
    },
  });

  await handlers.handleSaveList("  Projects  ");

  assert.deepEqual(calls, [
    ["executeOrQueue", "createList", { id: "generated-id", title: "Projects" }],
    [
      "setLists",
      [
        { id: "list-a", title: "Inbox" },
        { id: "list-b", title: "Later" },
        { id: "generated-id", title: "Projects", createdAt: 1, updatedAt: 1 },
      ],
    ],
    ["setActiveListId", "generated-id"],
    ["closeListDialog"],
  ]);
});

test("handleDeleteActiveList blocks removing the final list", async () => {
  const { calls, handlers } = createDeps({
    state: { lists: [{ id: "list-a", title: "Inbox" }] },
  });

  await handlers.handleDeleteActiveList();

  assert.deepEqual(calls, [["failConnection", "至少保留一个清单后才能继续使用。"]]);
});

test("handleDeleteActiveList removes the active list after confirmation", async () => {
  const originalConfirm = globalThis.confirm;
  globalThis.confirm = () => true;

  try {
    const { calls, handlers } = createDeps({
      deps: {
        executeOrQueue: async (operation) => {
          calls.push(["executeOrQueue", operation.kind, operation.payload]);
          operation.optimisticApply();
        },
      },
    });

    await handlers.handleDeleteActiveList();

    assert.deepEqual(calls, [
      ["executeOrQueue", "deleteList", { listId: "list-a" }],
      ["setLists", [{ id: "list-b", title: "Later" }]],
      ["setTodos", []],
      ["setActiveListId", "list-b"],
    ]);
  } finally {
    globalThis.confirm = originalConfirm;
  }
});
