const DEFAULT_AUTH_ERROR_MESSAGE = "Token 无效或缺失，请重新填写后再连接。";
const DEFAULT_OFFLINE_MESSAGE = "已离线保存，本地修改会在恢复连接后自动同步。";
const DEFAULT_REJECTED_ERROR_MESSAGE = "服务器拒绝了这次修改，请刷新后重试。";
const DEFAULT_POST_COMMIT_SYNC_ERROR_MESSAGE = "修改已提交到服务端，但刷新最新状态失败，请稍后重试。";
const RETRYABLE_HTTP_STATUS_CODES = new Set([408, 425, 429]);

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

export function shouldQueueMutationError(error) {
  const status = normalizeStatusCode(error?.status);
  if (status === null) {
    return true;
  }

  return status >= 500 || RETRYABLE_HTTP_STATUS_CODES.has(status);
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
  handlePermanentError = handleSyncError,
  enqueueOperation,
  loadPendingOperations,
  setPendingOperations,
  shouldQueueError = shouldQueueMutationError,
  authErrorMessage = DEFAULT_AUTH_ERROR_MESSAGE,
  offlineMessage = DEFAULT_OFFLINE_MESSAGE,
  rejectedErrorMessage = DEFAULT_REJECTED_ERROR_MESSAGE,
  postCommitSyncErrorMessage = DEFAULT_POST_COMMIT_SYNC_ERROR_MESSAGE,
}) {
  const previousSnapshot = captureLocalSnapshot();
  let mutationCommitted = false;
  optimisticApply();
  syncBatchSelection({ visibleOnly: true });
  syncBatchMoveTarget();
  persistCurrentSnapshot();
  render();

  try {
    await runServerMutation(kind, payload);
    mutationCommitted = true;
    await refreshSnapshot();
  } catch (error) {
    if (mutationCommitted) {
      handleSyncError(error, postCommitSyncErrorMessage);
      return;
    }

    if (isAuthError(error)) {
      restoreLocalSnapshot(previousSnapshot);
      persistCurrentSnapshot();
      handleSyncError(error, authErrorMessage);
      return;
    }

    if (!shouldQueueError(error)) {
      restoreLocalSnapshot(previousSnapshot);
      persistCurrentSnapshot();
      handlePermanentError(error, error?.message || rejectedErrorMessage);
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
  handlePermanentError = handleSyncError,
  enqueueOperation,
  loadPendingOperations,
  setPendingOperations,
  shouldQueueError = shouldQueueMutationError,
  authErrorMessage = DEFAULT_AUTH_ERROR_MESSAGE,
  offlineMessage = DEFAULT_OFFLINE_MESSAGE,
  rejectedErrorMessage = DEFAULT_REJECTED_ERROR_MESSAGE,
  postCommitSyncErrorMessage = DEFAULT_POST_COMMIT_SYNC_ERROR_MESSAGE,
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
    if (completedCount === operations.length) {
      handleSyncError(error, postCommitSyncErrorMessage);
      return;
    }

    if (isAuthError(error)) {
      restoreLocalSnapshot(previousSnapshot);
      persistCurrentSnapshot();
      handleSyncError(error, authErrorMessage);
      return;
    }

    if (!shouldQueueError(error)) {
      restoreLocalSnapshot(previousSnapshot);
      persistCurrentSnapshot();
      handlePermanentError(error, error?.message || rejectedErrorMessage);
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

function normalizeStatusCode(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  return null;
}
