export function resetBatchSelection({
  disableMode = false,
  clearSelectedTodoIds,
  setSelectionMode,
  syncBatchMoveTarget,
}) {
  clearSelectedTodoIds();
  if (disableMode) {
    setSelectionMode(false);
  }
  syncBatchMoveTarget();
}

export function syncBatchSelection({
  state,
  visibleOnly = false,
  getCurrentViewTodos,
  clearSelectedTodoIds,
  setSelectedTodoIds,
}) {
  if (!state.selectionMode && state.selectedTodoIds.length > 0) {
    clearSelectedTodoIds();
    return;
  }

  const allowedTodoIds = new Set(
    (visibleOnly ? getCurrentViewTodos(state) : state.todos).map((todo) => todo.id),
  );
  setSelectedTodoIds(state.selectedTodoIds.filter((todoId) => allowedTodoIds.has(todoId)));
}

export function syncBatchMoveTarget({
  state,
  resolveBatchMoveListId,
  setBatchMoveListId,
}) {
  setBatchMoveListId(resolveBatchMoveListId(state));
}

export function selectVisibleTodos({
  state,
  getCurrentViewTodos,
  setSelectionMode,
  setSelectedTodoIds,
  syncBatchMoveTarget,
}) {
  const visibleTodoIds = getCurrentViewTodos(state).map((todo) => todo.id);
  setSelectionMode(true);
  setSelectedTodoIds(visibleTodoIds);
  syncBatchMoveTarget();
}

export function clearBatchSelection({
  clearSelectedTodoIds,
  syncBatchMoveTarget,
}) {
  clearSelectedTodoIds();
  syncBatchMoveTarget();
}

export function toggleTodoSelection({
  todoId,
  selected,
  setSelectionMode,
  toggleSelectedTodoId,
  syncBatchMoveTarget,
}) {
  if (selected) {
    setSelectionMode(true);
  }
  toggleSelectedTodoId(todoId, selected);
  syncBatchMoveTarget();
}

export function toggleSelectionMode({
  state,
  setSelectionMode,
  resetBatchSelection,
  syncBatchMoveTarget,
}) {
  if (state.selectionMode) {
    resetBatchSelection({ disableMode: true });
    return;
  }

  setSelectionMode(true);
  syncBatchMoveTarget();
}
