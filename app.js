import {
  clearCompletedTodos,
  createList,
  createTodo,
  deleteList,
  deleteTodo,
  fetchConnectConfig,
  fetchMeta,
  fetchSnapshot,
  updateList,
  updateTodo,
} from "./frontend/api.js";
import {
  applyImportedConnectionConfig as applyImportedConnectionConfigRuntime,
  consumeIncomingConnectionUrl as consumeIncomingConnectionUrlRuntime,
  fetchAndImportConnectionConfig,
  importConnectionConfigText,
  pasteAndImportConnectionConfig,
  probeDiscoveryCandidates as probeDiscoveryCandidatesRuntime,
  refreshNetworkSnapshot as refreshNetworkSnapshotRuntime,
  scanAndImportConnectionConfig,
  useDiscoveryCandidate as useDiscoveryCandidateRuntime,
  validateServerBaseUrl,
} from "./frontend/connection_runtime.js";
import { attachLifecycleHandlers } from "./frontend/lifecycle.js";
import { addIncomingLinkListener, getNativeLaunchUrl, getNativeNetworkSnapshot, isNativeApp } from "./frontend/native_bridge.js";
import {
  enqueueOperation,
  flushPendingOperations,
  loadCachedSnapshot,
  loadPendingOperations,
  saveCachedSnapshot,
} from "./frontend/offline.js";
import {
  dismissOnboarding as dismissOnboardingRuntime,
  syncOnboardingVisibility as syncOnboardingVisibilityRuntime,
} from "./frontend/onboarding_runtime.js";
import { removeRecentConnection } from "./frontend/recent_connections.js";
import {
  clearSelectedTodoIds,
  setDiscoveryCandidates,
  setDiscoveryState,
  getState,
  setNetworkSnapshot,
  resetServerBaseUrl,
  resetServerToken,
  setConnectionConfigDraft,
  setOnboardingDismissed,
  setOnboardingVisible,
  sanitizeServerBaseUrl,
  sanitizeServerToken,
  setActiveListId,
  setActiveView,
  setBatchMoveListId,
  setCurrentFilter,
  setEditingListId,
  setEditingTodoId,
  setEditorMode,
  setListEditorMode,
  setLists,
  setPendingOperations,
  setRecentConnections,
  setServerConnectionMessage,
  setServerConnectionState,
  setServerBaseUrl,
  setServerDraftUrl,
  setServerDraftToken,
  setSelectionMode,
  setSocketConfig,
  setSelectedTodoIds,
  setSyncState,
  setServerToken,
  setTodos,
  toggleSelectedTodoId,
} from "./frontend/state.js";
import {
  closeEditDialog,
  closeListDialog,
  initUI,
  openEditDialog,
  openListDialog,
  renderApp,
  resetComposer,
} from "./frontend/ui.js";
import {
  getCurrentViewTodos,
  getSelectedTodoIds,
  getSelectedTodos,
  resolveBatchMoveListId,
} from "./frontend/todo_queries.js";
import {
  clearBatchSelection,
  resetBatchSelection as resetBatchSelectionRuntime,
  selectVisibleTodos as selectVisibleTodosRuntime,
  syncBatchMoveTarget as syncBatchMoveTargetRuntime,
  syncBatchSelection as syncBatchSelectionRuntime,
  toggleSelectionMode as toggleSelectionModeRuntime,
  toggleTodoSelection as toggleTodoSelectionRuntime,
} from "./frontend/selection_runtime.js";
import {
  applyTodoPatches as applyTodoPatchesToCollection,
  captureSnapshot,
  clearCompletedTodosFromList,
  createOptimisticList,
  prependOptimisticTodo,
  removeListAndTodos,
  removeTodoById,
  removeTodosByIds,
  updateListTitle,
} from "./frontend/todo_data.js";
import {
  applyRemoteSnapshot,
  flushPendingQueue as flushPendingQueueRuntime,
  persistSnapshot,
  runServerMutation as runServerMutationRuntime,
} from "./frontend/sync_runtime.js";
import {
  connectToServer as connectToServerRuntime,
  handleLifecycleOffline as handleLifecycleOfflineRuntime,
  handleLifecycleOnline as handleLifecycleOnlineRuntime,
  handleSyncError as handleSyncErrorRuntime,
  isAuthError as isAuthErrorRuntime,
  refreshSnapshot as refreshSnapshotRuntime,
  resumeServerSync as resumeServerSyncRuntime,
} from "./frontend/session_runtime.js";

let realtimeConnection = null;
let removeIncomingLinkListener = () => {};
let removeLifecycleHandlers = () => {};
let resumeSyncPromise = null;

initUI({
  getPreferredRecentConnection,
  onServerUrlInput: handleServerUrlInput,
  onServerTokenInput: handleServerTokenInput,
  onConnectionConfigInput: handleConnectionConfigInput,
  onSaveServerUrl: handleSaveServerUrl,
  onTestServerUrl: handleTestServerUrl,
  onFetchConnectionConfig: handleFetchConnectionConfig,
  onImportConnectionConfig: handleImportConnectionConfig,
  onPasteConnectionConfig: handlePasteConnectionConfig,
  onScanConnectionConfig: handleScanConnectionConfig,
  onRefreshNetworkSnapshot: handleRefreshNetworkSnapshot,
  onProbeDiscoveryCandidates: handleProbeDiscoveryCandidates,
  onUseDiscoveryCandidate: handleUseDiscoveryCandidate,
  onConnectRecentConnection: handleConnectRecentConnection,
  onDismissOnboarding: handleDismissOnboarding,
  onRemoveRecentConnection: handleRemoveRecentConnection,
  onResetServerUrl: handleResetServerUrl,
  onViewChange: handleViewChange,
  onSelectList: handleSelectList,
  onCreate: handleQuickCreate,
  onClearCompleted: handleClearCompleted,
  onToggleSelectionMode: handleToggleSelectionMode,
  onSelectVisibleTodos: handleSelectVisibleTodos,
  onClearSelectedTodos: handleClearSelectedTodos,
  onFilterChange: handleFilterChange,
  onToggleTodoSelection: handleToggleTodoSelection,
  onBatchCompleteTodos: handleBatchCompleteTodos,
  onBatchUncompleteTodos: handleBatchUncompleteTodos,
  onBatchDeleteTodos: handleBatchDeleteTodos,
  onBatchMoveListChange: handleBatchMoveListChange,
  onBatchMoveTodos: handleBatchMoveTodos,
  onDelete: handleDelete,
  onOpenEdit: handleOpenEdit,
  onOpenCreateDialog: handleOpenCreateDialog,
  onOpenListDialog: handleOpenListDialog,
  onEditActiveList: handleEditActiveList,
  onDeleteActiveList: handleDeleteActiveList,
  onToggle: handleToggle,
  onSaveEdit: handleSaveEdit,
  onCancelEdit: handleCancelEdit,
  onDialogClose: handleDialogClose,
  onSaveList: handleSaveList,
  onCancelListEdit: handleCancelListEdit,
  onListDialogClose: handleListDialogClose,
});

render();
removeIncomingLinkListener = addIncomingLinkListener((incomingUrl) => {
  void consumeIncomingConnectionUrl(incomingUrl);
});
removeLifecycleHandlers = attachLifecycleHandlers({
  onResume: (reason) => {
    void handleLifecycleResume(reason);
  },
  onOnline: handleLifecycleOnline,
  onOffline: handleLifecycleOffline,
});
bootstrap();

async function bootstrap() {
  setPendingOperations(loadPendingOperations(getState().serverBaseUrl, getState().serverToken).length);
  syncOnboardingVisibility();
  await refreshNetworkSnapshot({ silent: true });
  if (await consumeIncomingConnectionUrl(globalThis.location?.href ?? "", { clearBrowserUrl: true })) {
    return;
  }

  const nativeLaunchUrl = await getNativeLaunchUrl();
  if (await consumeIncomingConnectionUrl(nativeLaunchUrl)) {
    return;
  }
  hydrateFromCache();
  if (!getState().serverBaseUrl) {
    setSyncState("offline");
    render();
    return;
  }
  await connectToServer(getState().serverBaseUrl, getState().serverToken, {
    persist: false,
    openTasksView: false,
  });
}

function hydrateFromCache() {
  const cachedSnapshot = loadCachedSnapshot(getState().serverBaseUrl, getState().serverToken);
  if (!cachedSnapshot) {
    return;
  }

  applySnapshot(cachedSnapshot, { preserveActiveList: true });
  setServerConnectionMessage(`已加载本地缓存：${getState().serverBaseUrl}`);
  setServerConnectionState("cached");
  setSyncState("offline");
  render();
}

function handleServerUrlInput(rawValue) {
  setServerDraftUrl(rawValue);
}

function handleServerTokenInput(rawValue) {
  setServerDraftToken(rawValue);
}

function handleConnectionConfigInput(rawValue) {
  setConnectionConfigDraft(rawValue);
}

function getPreferredRecentConnection() {
  return getState().recentConnections[0] ?? null;
}

function handleDismissOnboarding(persistDismissal) {
  dismissOnboardingRuntime({
    persistDismissal,
    setOnboardingDismissed,
    setOnboardingVisible,
    render,
  });
}

async function consumeIncomingConnectionUrl(incomingUrl, { clearBrowserUrl = false } = {}) {
  return consumeIncomingConnectionUrlRuntime({
    incomingUrl,
    clearBrowserUrl,
    setConnectionConfigDraft,
    applyImportedConnectionConfig,
    failConnection,
  });
}

async function handleConnectRecentConnection(serverBaseUrl) {
  const recentConnection = getState().recentConnections.find((item) => item.serverBaseUrl === serverBaseUrl);
  if (!recentConnection) {
    failConnection("最近连接记录不存在。");
    return;
  }

  setServerDraftUrl(recentConnection.serverBaseUrl);
  setServerDraftToken(recentConnection.serverToken);
  render();

  await connectToServer(recentConnection.serverBaseUrl, recentConnection.serverToken, {
    persist: true,
    openTasksView: true,
  });
}

function handleRemoveRecentConnection(serverBaseUrl) {
  setRecentConnections(removeRecentConnection(serverBaseUrl));
  if (getState().serverDraftUrl === serverBaseUrl && getState().serverBaseUrl !== serverBaseUrl) {
    setServerDraftUrl("");
    setServerDraftToken("");
  }
  syncOnboardingVisibility();
  render();
}

async function handleSaveServerUrl(rawValue, rawToken) {
  const candidate = validateServerBaseUrl(rawValue, { sanitizeServerBaseUrl });
  if (!candidate.ok) {
    failConnection(candidate.message);
    return;
  }

  await connectToServer(candidate.value, sanitizeServerToken(rawToken), {
    persist: true,
    openTasksView: true,
  });
}

async function handleImportConnectionConfig(rawValue) {
  await importConnectionConfigText({
    rawValue,
    applyImportedConnectionConfig,
    failConnection,
  });
}

async function handleFetchConnectionConfig(rawValue) {
  await fetchAndImportConnectionConfig({
    rawValue,
    sanitizeServerBaseUrl,
    setServerConnectionState,
    setServerConnectionMessage,
    render,
    fetchConnectConfig,
    applyImportedConnectionConfig,
    failConnection,
  });
}

async function handlePasteConnectionConfig() {
  await pasteAndImportConnectionConfig({
    setConnectionConfigDraft,
    render,
    importConnectionConfig: handleImportConnectionConfig,
    failConnection,
  });
}

async function handleScanConnectionConfig() {
  await scanAndImportConnectionConfig({
    setServerConnectionState,
    setServerConnectionMessage,
    render,
    setConnectionConfigDraft,
    importConnectionConfig: handleImportConnectionConfig,
    failConnection,
  });
}

async function handleRefreshNetworkSnapshot() {
  await refreshNetworkSnapshot();
}

async function refreshNetworkSnapshot({ silent = false } = {}) {
  await refreshNetworkSnapshotRuntime({
    silent,
    getState,
    getNativeNetworkSnapshot,
    setDiscoveryState,
    setServerConnectionState,
    setServerConnectionMessage,
    setNetworkSnapshot,
    setDiscoveryCandidates,
    render,
  });
}

async function handleProbeDiscoveryCandidates() {
  await probeDiscoveryCandidatesRuntime({
    getState,
    setDiscoveryState,
    setDiscoveryCandidates,
    setServerConnectionState,
    setServerConnectionMessage,
    render,
    fetchMeta,
    fetchConnectConfig,
    failConnection,
  });
}

async function handleUseDiscoveryCandidate(serverBaseUrl) {
  await useDiscoveryCandidateRuntime({
    serverBaseUrl,
    getState,
    setServerDraftUrl,
    setServerDraftToken,
    setServerConnectionState,
    setServerConnectionMessage,
    render,
    connectToServer,
    failConnection,
  });
}

async function applyImportedConnectionConfig(connectionConfig, rawValue) {
  await applyImportedConnectionConfigRuntime({
    connectionConfig,
    rawValue,
    setServerDraftUrl,
    setServerDraftToken,
    setConnectionConfigDraft,
    setServerConnectionState,
    setServerConnectionMessage,
    render,
    syncOnboardingVisibility,
    connectToServer,
  });
}

async function handleTestServerUrl(rawValue, rawToken) {
  const candidate = validateServerBaseUrl(rawValue, { sanitizeServerBaseUrl });
  if (!candidate.ok) {
    failConnection(candidate.message);
    return;
  }

  setServerConnectionState("testing");
  setServerConnectionMessage(`正在测试 ${candidate.value}...`);
  render();

  try {
    await fetchMeta(candidate.value, sanitizeServerToken(rawToken));
    setServerConnectionState("connected");
    setServerConnectionMessage(`节点可用：${candidate.value}`);
  } catch (error) {
    failConnection(error.message || "连接测试失败");
  }

  render();
}

async function handleResetServerUrl() {
  const previousServerBaseUrl = getState().serverBaseUrl;
  const previousServerToken = getState().serverToken;
  resetServerBaseUrl();
  resetServerToken();
  resetBatchSelection({ disableMode: true });
  setConnectionConfigDraft("");
  realtimeConnection?.disconnect();
  realtimeConnection = null;
  syncOnboardingVisibility();

  if (!getState().serverBaseUrl) {
    setLists([]);
    setTodos([]);
    setActiveListId(null);
    setPendingOperations(0);
    setSyncState("offline");
    setServerConnectionState("idle");
    setServerConnectionMessage("请填写同步节点地址后再连接。");
    render();
    return;
  }

  setPendingOperations(loadPendingOperations(previousServerBaseUrl, previousServerToken).length);
  await connectToServer(getState().serverBaseUrl, getState().serverToken, {
    persist: false,
    openTasksView: true,
  });
}

function handleViewChange(view) {
  if (view !== "tasks") {
    resetBatchSelection({ disableMode: true });
  }
  setActiveView(view);
  render();
}

function handleFilterChange(filter) {
  resetBatchSelection({ disableMode: true });
  setCurrentFilter(filter);
  render();
}

function handleSelectList(listId) {
  resetBatchSelection({ disableMode: true });
  setActiveListId(listId);
  syncBatchMoveTarget();
  render();
}

function handleToggleSelectionMode() {
  toggleSelectionModeRuntime({
    state: getState(),
    setSelectionMode,
    resetBatchSelection,
    syncBatchMoveTarget,
  });
  render();
}

function handleSelectVisibleTodos() {
  selectVisibleTodosRuntime({
    state: getState(),
    getCurrentViewTodos,
    setSelectionMode,
    setSelectedTodoIds,
    syncBatchMoveTarget,
  });
  render();
}

function handleClearSelectedTodos() {
  clearBatchSelection({
    clearSelectedTodoIds,
    syncBatchMoveTarget,
  });
  render();
}

function handleToggleTodoSelection(todoId, selected) {
  toggleTodoSelectionRuntime({
    todoId,
    selected,
    setSelectionMode,
    toggleSelectedTodoId,
    syncBatchMoveTarget,
  });
  render();
}

async function handleBatchCompleteTodos() {
  const selectedTodos = getSelectedTodos(getState()).filter((todo) => !todo.completed);
  if (selectedTodos.length === 0) {
    return;
  }

  await executeBatchTodoOperations({
    operations: selectedTodos.map((todo) => ({
      kind: "updateTodo",
      payload: { todoId: todo.id, completed: true },
    })),
    optimisticApply: () => {
      applyTodoPatches(
        selectedTodos.map((todo) => ({
          todoId: todo.id,
          completed: true,
          completedAt: Date.now(),
        })),
      );
    },
    offlineMessage: "批量完成已离线保存，恢复连接后会继续同步。",
  });
}

async function handleBatchUncompleteTodos() {
  const selectedTodos = getSelectedTodos(getState()).filter((todo) => todo.completed);
  if (selectedTodos.length === 0) {
    return;
  }

  await executeBatchTodoOperations({
    operations: selectedTodos.map((todo) => ({
      kind: "updateTodo",
      payload: { todoId: todo.id, completed: false },
    })),
    optimisticApply: () => {
      applyTodoPatches(
        selectedTodos.map((todo) => ({
          todoId: todo.id,
          completed: false,
          completedAt: null,
        })),
      );
    },
    offlineMessage: "批量恢复已离线保存，恢复连接后会继续同步。",
  });
}

async function handleBatchDeleteTodos() {
  const selectedTodoIds = getSelectedTodoIds(getState());
  if (selectedTodoIds.length === 0) {
    return;
  }

  const confirmed =
    typeof globalThis.confirm !== "function"
      ? true
      : globalThis.confirm(`确定删除已选择的 ${selectedTodoIds.length} 项任务吗？`);
  if (!confirmed) {
    return;
  }

  await executeBatchTodoOperations({
    operations: selectedTodoIds.map((todoId) => ({
      kind: "deleteTodo",
      payload: { todoId },
    })),
    optimisticApply: () => {
      setTodos(removeTodosByIds(getState().todos, selectedTodoIds));
    },
    offlineMessage: "批量删除已离线保存，恢复连接后会继续同步。",
  });
}

function handleBatchMoveListChange(listId) {
  setBatchMoveListId(listId);
  render();
}

async function handleBatchMoveTodos() {
  const targetListId = getState().batchMoveListId;
  const selectedTodos = getSelectedTodos(getState()).filter((todo) => todo.listId !== targetListId);
  if (!targetListId || selectedTodos.length === 0) {
    return;
  }

  await executeBatchTodoOperations({
    operations: selectedTodos.map((todo) => ({
      kind: "updateTodo",
      payload: { todoId: todo.id, listId: targetListId },
    })),
    optimisticApply: () => {
      applyTodoPatches(
        selectedTodos.map((todo) => ({
          todoId: todo.id,
          listId: targetListId,
        })),
      );
    },
    offlineMessage: "批量移动已离线保存，恢复连接后会继续同步。",
  });
}

async function handleQuickCreate(rawValue) {
  const title = rawValue.trim();
  if (!title) {
    return;
  }

  await createOrQueueTodo({
    id: crypto.randomUUID(),
    listId: getActiveListId(),
    title,
    completed: false,
  });
  resetComposer();
}

function handleOpenCreateDialog() {
  setEditorMode("create");
  setEditingTodoId(null);
  openEditDialog({
    mode: "create",
    lists: getState().lists,
    todo: {
      title: "",
      listId: getActiveListId(),
    },
  });
}

function handleOpenEdit(todoId) {
  const todo = getState().todos.find((item) => item.id === todoId);
  if (!todo) {
    return;
  }

  setEditorMode("edit");
  setEditingTodoId(todoId);
  openEditDialog({
    mode: "edit",
    lists: getState().lists,
    todo,
  });
}

async function handleSaveEdit({ title, listId }) {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    return;
  }

  if (getState().editorMode === "create") {
    await createOrQueueTodo({
      id: crypto.randomUUID(),
      listId,
      title: normalizedTitle,
      completed: false,
    });
  } else {
    const { editingTodoId } = getState();
    if (!editingTodoId) {
      closeEditDialog();
      return;
    }

    await updateOrQueueTodo(editingTodoId, { title: normalizedTitle, listId });
  }

  setEditingTodoId(null);
  closeEditDialog();
}

function handleCancelEdit() {
  setEditingTodoId(null);
  closeEditDialog();
}

function handleDialogClose() {
  setEditingTodoId(null);
}

function handleOpenListDialog(listId = null) {
  if (listId) {
    const list = getState().lists.find((item) => item.id === listId);
    if (!list) {
      return;
    }

    setListEditorMode("edit");
    setEditingListId(listId);
    openListDialog({ mode: "edit", title: list.title });
    return;
  }

  setListEditorMode("create");
  setEditingListId(null);
  openListDialog({ mode: "create", title: "" });
}

function handleEditActiveList() {
  const activeListId = getActiveListId();
  if (!activeListId) {
    return;
  }

  handleOpenListDialog(activeListId);
}

async function handleSaveList(rawValue) {
  const title = rawValue.trim();
  if (!title) {
    return;
  }

  if (getState().listEditorMode === "create") {
    const listId = crypto.randomUUID();
    const optimisticList = createOptimisticList({ id: listId, title });
    try {
      await executeOrQueue({
        kind: "createList",
        payload: { id: listId, title },
        optimisticApply: () => {
          const lists = [...getState().lists, optimisticList];
          setLists(lists);
          setActiveListId(listId);
        },
      });
    } finally {
      closeListDialog();
    }
    return;
  }

  const { editingListId } = getState();
  if (!editingListId) {
    return;
  }

  try {
    await executeOrQueue({
      kind: "updateList",
      payload: { listId: editingListId, title },
      optimisticApply: () => {
        setLists(updateListTitle(getState().lists, editingListId, title));
      },
    });
  } finally {
    setEditingListId(null);
    closeListDialog();
  }
}

function handleCancelListEdit() {
  setEditingListId(null);
  closeListDialog();
}

function handleListDialogClose() {
  setEditingListId(null);
}

async function handleDeleteActiveList() {
  const activeListId = getActiveListId();
  if (!activeListId) {
    return;
  }

  if (getState().lists.length <= 1) {
    failConnection("至少保留一个清单后才能继续使用。");
    return;
  }

  const activeList = getState().lists.find((list) => list.id === activeListId);
  const confirmed =
    typeof globalThis.confirm !== "function"
      ? true
      : globalThis.confirm(`删除清单“${activeList?.title ?? "当前清单"}”后，其中任务也会一起删除。确定继续吗？`);

  if (!confirmed) {
    return;
  }

  await executeOrQueue({
    kind: "deleteList",
    payload: { listId: activeListId },
    optimisticApply: () => {
      const nextState = removeListAndTodos(getState().lists, getState().todos, activeListId);
      setLists(nextState.lists);
      setTodos(nextState.todos);
      setActiveListId(nextState.lists[0]?.id ?? null);
    },
  });
}

async function handleDelete(todoId) {
  await executeOrQueue({
    kind: "deleteTodo",
    payload: { todoId },
    optimisticApply: () => {
      setTodos(removeTodoById(getState().todos, todoId));
    },
  });
}

async function handleToggle(todoId, completed) {
  await updateOrQueueTodo(todoId, { completed });
}

async function handleClearCompleted() {
  const listId = getActiveListId();
  await executeOrQueue({
    kind: "clearCompleted",
    payload: { listId },
    optimisticApply: () => {
      setTodos(clearCompletedTodosFromList(getState().todos, listId));
    },
  });
}

async function createOrQueueTodo(todo) {
  await executeOrQueue({
    kind: "createTodo",
    payload: todo,
    optimisticApply: () => {
      setTodos(prependOptimisticTodo(getState().todos, todo));
    },
  });
}

async function updateOrQueueTodo(todoId, patch) {
  await executeOrQueue({
    kind: "updateTodo",
    payload: { todoId, ...patch },
    optimisticApply: () => {
      setTodos(
        applyTodoPatchesToCollection(getState().todos, [
          {
            todoId,
            title: patch.title,
            listId: patch.listId,
            completed: patch.completed,
          },
        ]),
      );
    },
  });
}

async function executeOrQueue({ kind, payload, optimisticApply }) {
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
      handleSyncError(error, "Token 无效或缺失，请重新填写后再连接。");
      return;
    }

    enqueueOperation(getState().serverBaseUrl, getState().serverToken, { kind, payload });
    setPendingOperations(loadPendingOperations(getState().serverBaseUrl, getState().serverToken).length);
    handleSyncError(error, "已离线保存，本地修改会在恢复连接后自动同步。");
  }
}

async function executeBatchTodoOperations({ operations, optimisticApply, offlineMessage }) {
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
      handleSyncError(error, "Token 无效或缺失，请重新填写后再连接。");
      return;
    }

    operations.slice(completedCount).forEach((operation) => {
      enqueueOperation(getState().serverBaseUrl, getState().serverToken, operation);
    });
    setPendingOperations(loadPendingOperations(getState().serverBaseUrl, getState().serverToken).length);
    handleSyncError(error, offlineMessage);
  }
}

async function connectToServer(
  serverBaseUrl,
  serverToken,
  { persist, openTasksView, initialSocketConfig = null },
) {
  await connectToServerRuntime({
    serverBaseUrl,
    serverToken,
    persist,
    openTasksView,
    initialSocketConfig,
    getState,
    loadPendingOperations,
    setServerConnectionState,
    setServerConnectionMessage,
    setSyncState,
    setPendingOperations,
    render,
    flushPendingQueue,
    fetchMeta,
    refreshSnapshot,
    setSocketConfig,
    setServerBaseUrl,
    setServerDraftUrl,
    setServerToken,
    setServerDraftToken,
    resetBatchSelection,
    setOnboardingDismissed,
    setOnboardingVisible,
    setRecentConnections,
    disconnectRealtime: () => realtimeConnection?.disconnect(),
    setRealtimeConnection: (connection) => {
      realtimeConnection = connection;
    },
    applySnapshot,
    persistCurrentSnapshot,
    setActiveView,
    refreshNetworkSnapshot,
    handleSyncError,
  });
}

async function refreshSnapshot(
  serverBaseUrl = getState().serverBaseUrl,
  serverToken = getState().serverToken,
) {
  await refreshSnapshotRuntime({
    serverBaseUrl,
    serverToken,
    fetchSnapshot,
    applySnapshot,
    persistCurrentSnapshot,
  });
}

async function flushPendingQueue(serverBaseUrl, serverToken) {
  await flushPendingQueueRuntime({
    serverBaseUrl,
    serverToken,
    flushPendingOperations,
    runMutation: runServerMutation,
    setPendingOperations,
  });
}

async function runServerMutation(
  kind,
  payload,
  serverBaseUrl = getState().serverBaseUrl,
  serverToken = getState().serverToken,
) {
  await runServerMutationRuntime({
    kind,
    payload,
    serverBaseUrl,
    serverToken,
    getActiveListId,
    api: {
      clearCompletedTodos,
      createList,
      createTodo,
      deleteList,
      deleteTodo,
      updateList,
      updateTodo,
    },
  });
}

function applySnapshot(
  snapshot,
  {
    preserveActiveList,
    serverBaseUrl = getState().serverBaseUrl,
    serverToken = getState().serverToken,
  },
) {
  applyRemoteSnapshot({
    snapshot,
    preserveActiveList,
    currentActiveListId: getState().activeListId,
    serverBaseUrl,
    serverToken,
    loadPendingOperations,
    setLists,
    setTodos,
    setActiveListId,
    setPendingOperations,
    setSyncState,
    syncBatchSelection,
    syncBatchMoveTarget,
  });
}

function persistCurrentSnapshot(
  serverBaseUrl = getState().serverBaseUrl,
  serverToken = getState().serverToken,
) {
  persistSnapshot({
    serverBaseUrl,
    serverToken,
    state: getState(),
    saveCachedSnapshot,
  });
}

function getActiveListId() {
  return getState().activeListId || getState().lists[0]?.id || null;
}

function captureLocalSnapshot() {
  return captureSnapshot(getState());
}

function restoreLocalSnapshot(snapshot) {
  setLists(snapshot.lists);
  setTodos(snapshot.todos);
  setActiveListId(snapshot.activeListId);
  setSelectionMode(snapshot.selectionMode ?? false);
  setSelectedTodoIds(snapshot.selectedTodoIds ?? []);
  setBatchMoveListId(snapshot.batchMoveListId ?? "");
  syncBatchSelection({ visibleOnly: true });
  syncBatchMoveTarget();
}

function isAuthError(error) {
  return isAuthErrorRuntime(error);
}

function handleSyncError(error, message = null) {
  handleSyncErrorRuntime({
    error,
    message,
    setSyncState,
    setServerConnectionState,
    setServerConnectionMessage,
    render,
  });
}

function handleLifecycleOffline() {
  handleLifecycleOfflineRuntime({
    serverBaseUrl: getState().serverBaseUrl,
    setSyncState,
    setServerConnectionState,
    setServerConnectionMessage,
    render,
  });
}

function handleLifecycleOnline() {
  handleLifecycleOnlineRuntime({
    serverBaseUrl: getState().serverBaseUrl,
    setServerConnectionState,
    setServerConnectionMessage,
    render,
  });
}

async function handleLifecycleResume(reason) {
  await refreshNetworkSnapshot({ silent: true });
  await resumeServerSync(reason);
}

function resumeServerSync(reason) {
  return resumeServerSyncRuntime({
    reason,
    getState,
    getResumeSyncPromise: () => resumeSyncPromise,
    setResumeSyncPromise: (promise) => {
      resumeSyncPromise = promise;
    },
    getRealtimeConnection: () => realtimeConnection,
    flushPendingQueue,
    refreshSnapshot,
    setServerConnectionState,
    setServerConnectionMessage,
    render,
    handleSyncError,
  });
}

function failConnection(message) {
  setServerConnectionState("error");
  setServerConnectionMessage(message);
  render();
}

function resetBatchSelection({ disableMode = false } = {}) {
  resetBatchSelectionRuntime({
    disableMode,
    clearSelectedTodoIds,
    setSelectionMode,
    syncBatchMoveTarget,
  });
}

function syncBatchSelection({ visibleOnly = false } = {}) {
  syncBatchSelectionRuntime({
    state: getState(),
    visibleOnly,
    getCurrentViewTodos,
    clearSelectedTodoIds,
    setSelectedTodoIds,
  });
}

function syncBatchMoveTarget() {
  syncBatchMoveTargetRuntime({
    state: getState(),
    resolveBatchMoveListId,
    setBatchMoveListId,
  });
}

function applyTodoPatches(patches) {
  setTodos(applyTodoPatchesToCollection(getState().todos, patches));
}

function render() {
  renderApp(getState());
}

function syncOnboardingVisibility() {
  syncOnboardingVisibilityRuntime({
    getState,
    isNativeApp,
    matchMedia: globalThis.matchMedia?.bind(globalThis),
    setActiveView,
    setServerConnectionState,
    setServerConnectionMessage,
    setOnboardingVisible,
  });
}
