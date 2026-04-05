export function getVisibleTodos(state) {
  return state.activeListId ? state.todos.filter((todo) => todo.listId === state.activeListId) : state.todos;
}

export function filterTodos(todos, filter) {
  if (filter === "active") {
    return todos.filter((todo) => !todo.completed);
  }

  if (filter === "completed") {
    return todos.filter((todo) => todo.completed);
  }

  return todos;
}

export function getCurrentViewTodos(state) {
  return filterTodos(getVisibleTodos(state), state.currentFilter);
}

export function getSelectedTodoIds(state, { visibleOnly = true } = {}) {
  const allowedTodoIds = new Set(
    (visibleOnly ? getCurrentViewTodos(state) : state.todos).map((todo) => todo.id),
  );
  return state.selectedTodoIds.filter((todoId) => allowedTodoIds.has(todoId));
}

export function getSelectedTodos(state, options = {}) {
  const selectedTodoIdSet = new Set(getSelectedTodoIds(state, options));
  return state.todos.filter((todo) => selectedTodoIdSet.has(todo.id));
}

export function resolveBatchMoveListId(state) {
  if (state.lists.length === 0) {
    return "";
  }

  if (state.batchMoveListId && state.lists.some((list) => list.id === state.batchMoveListId)) {
    return state.batchMoveListId;
  }

  const selectedSourceListIds = new Set(getSelectedTodos(state).map((todo) => todo.listId));
  const firstOtherList = state.lists.find((list) => !selectedSourceListIds.has(list.id));
  if (firstOtherList) {
    return firstOtherList.id;
  }

  return state.lists.find((list) => list.id === state.activeListId)?.id ?? state.lists[0]?.id ?? "";
}

export function buildBatchSelectionSummary({ hasVisibleTodos, visibleCount, selectedCount }) {
  if (!hasVisibleTodos) {
    return "当前视图没有可批量操作的任务";
  }

  if (selectedCount === 0) {
    return `已进入批量模式，当前视图共有 ${visibleCount} 项任务`;
  }

  return `已选择 ${selectedCount} 项任务，当前视图共有 ${visibleCount} 项`;
}
