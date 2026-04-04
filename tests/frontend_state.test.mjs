import test from "node:test";
import assert from "node:assert/strict";

const storage = new Map();

globalThis.localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, value);
  },
  removeItem(key) {
    storage.delete(key);
  },
};

globalThis.location = {
  search: "",
  protocol: "http:",
  port: "8000",
};

const {
  clearSelectedTodoIds,
  getState,
  setBatchMoveListId,
  setSelectedTodoIds,
  setSelectionMode,
  toggleSelectedTodoId,
} = await import("../frontend/state.js");

test("selected todo ids stay unique and ignore empty values", () => {
  clearSelectedTodoIds();
  setSelectedTodoIds(["todo-1", "todo-1", "", "  ", "todo-2"]);

  assert.deepEqual(getState().selectedTodoIds, ["todo-1", "todo-2"]);
});

test("toggleSelectedTodoId adds and removes ids predictably", () => {
  clearSelectedTodoIds();

  toggleSelectedTodoId("todo-1", true);
  toggleSelectedTodoId("todo-2", true);
  toggleSelectedTodoId("todo-1", false);

  assert.deepEqual(getState().selectedTodoIds, ["todo-2"]);
});

test("batch move list id is normalized and selection mode is writable", () => {
  setBatchMoveListId("  list-1  ");
  setSelectionMode(true);

  assert.equal(getState().batchMoveListId, "list-1");
  assert.equal(getState().selectionMode, true);

  setSelectionMode(false);
  clearSelectedTodoIds();
});
