const DEFAULT_AUTH_ERROR_MESSAGE = "Token 无效或缺失，请重新填写后再连接。";
const DEFAULT_OFFLINE_MESSAGE = "已离线保存，本地修改会在恢复连接后自动同步。";

export function restoreLocalSnapshot({
  snapshot,
  setLists,
  setTodos,
  setActiveListId,
  setSelectionMode,
  setSelectedTodoIds,
  setBatchMoveListId,
  syncBatchSelection,
  syncBatchMoveTarget,
}) {
  setLists(snapshot.lists);
  setTodos(snapshot.todos);
  setActiveListId(snapshot.activeListId);
  setSelectionMode(snapshot.selectionMode ?? false);
  setSelectedTodoIds(snapshot.selectedTodoIds ?? []);
  setBatchMoveListId(snapshot.batchMoveListId ?? "");
  syncBatchSelection({ visibleOnly: true });
  syncBatchMoveTarget();
}

export async function executeOrQueue({
  kind,
  payload,
  optimisticApply,
  getState,
  captureLocalSnapshot,
  syncBatchSelection,
  syncBatchMoveTarget,
  persistCurrentSnapshot,
  render,
  runServerMutation,
  refreshSnapshot,
  isAuthError,
  restoreLocalSnapshot,
  handleSyncError,
  enqueueOperation,
  loadPendingOperations,
  setPendingOperations,
  authErrorMessage = DEFAULT_AUTH_ERROR_MESSAGE,
  offlineMessage = DEFAULT_OFFLINE_MESSAGE,
}) {
  const previousSnapshot = captureLocalSnapshot();
  optimisticApply();
  syncBatchSelection({ visibleOnly: true });
  syncBatchMoveTarget();
  persistCurrentSnapshot();
  render();

  try {
    await runServerMutation(kind, payload);
    await refreshSnapshot();
  } catch (error) {
    if (isAuthError(error)) {
      restoreLocalSnapshot(previousSnapshot);
      persistCurrentSnapshot();
      handleSyncError(error, authErrorMessage);
      return;
    }

    const state = getState();
    enqueueOperation(state.serverBaseUrl, state.serverToken, { kind, payload });
    setPendingOperations(loadPendingOperations(state.serverBaseUrl, state.serverToken).length);
    handleSyncError(error, offlineMessage);
  }
}

export async function executeBatchOperations({
  operations,
  optimisticApply,
  getState,
  clearSelectedTodoIds,
  captureLocalSnapshot,
  syncBatchSelection,
  syncBatchMoveTarget,
  persistCurrentSnapshot,
  render,
  runServerMutation,
  refreshSnapshot,
  isAuthError,
  restoreLocalSnapshot,
  handleSyncError,
  enqueueOperation,
  loadPendingOperations,
  setPendingOperations,
  authErrorMessage = DEFAULT_AUTH_ERROR_MESSAGE,
  offlineMessage = DEFAULT_OFFLINE_MESSAGE,
}) {
  if (operations.length === 0) {
    return;
  }

  const previousSnapshot = captureLocalSnapshot();
  optimisticApply();
  clearSelectedTodoIds();
  syncBatchSelection({ visibleOnly: true });
  syncBatchMoveTarget();
  persistCurrentSnapshot();
  render();

  let completedCount = 0;

  try {
    for (const operation of operations) {
      await runServerMutation(operation.kind, operation.payload);
      completedCount += 1;
    }
    await refreshSnapshot();
  } catch (error) {
    if (isAuthError(error)) {
      restoreLocalSnapshot(previousSnapshot);
      persistCurrentSnapshot();
      handleSyncError(error, authErrorMessage);
      return;
    }

    const state = getState();
    operations.slice(completedCount).forEach((operation) => {
      enqueueOperation(state.serverBaseUrl, state.serverToken, operation);
    });
    setPendingOperations(loadPendingOperations(state.serverBaseUrl, state.serverToken).length);
    handleSyncError(error, offlineMessage);
  }
}
