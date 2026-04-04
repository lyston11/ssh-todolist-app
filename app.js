import { shouldShowOnboarding } from "./frontend/onboarding.js";
import {
  ApiError,
  clearCompletedTodos,
  createList,
  createTodo,
  deleteTodo,
  fetchConnectConfig,
  fetchMeta,
  fetchSnapshot,
  updateList,
  updateTodo,
} from "./frontend/api.js";
import { parseConnectionConfig, resolveSocketConfig } from "./frontend/connection_config.js";
import { clearIncomingConnectionLink, readIncomingConnectionLink } from "./frontend/connection_link.js";
import {
  addIncomingLinkListener,
  getNativeLaunchUrl,
  getNativeNetworkSnapshot,
  isNativeApp,
} from "./frontend/native_bridge.js";
import {
  buildDiscoveryCandidates,
  describeNetworkSnapshot,
  probeDiscoveryCandidates,
} from "./frontend/discovery.js";
import { attachLifecycleHandlers } from "./frontend/lifecycle.js";
import {
  enqueueOperation,
  flushPendingOperations,
  loadCachedSnapshot,
  loadPendingOperations,
  saveCachedSnapshot,
} from "./frontend/offline.js";
import { QrScanCancelledError, scanConnectionQrCode } from "./frontend/qr_scanner.js";
import { removeRecentConnection, saveRecentConnection } from "./frontend/recent_connections.js";
import { connectRealtime } from "./frontend/realtime.js";
import {
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
  setSocketConfig,
  setSyncState,
  setServerToken,
  setTodos,
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
  onFilterChange: handleFilterChange,
  onDelete: handleDelete,
  onOpenEdit: handleOpenEdit,
  onOpenCreateDialog: handleOpenCreateDialog,
  onOpenListDialog: handleOpenListDialog,
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
  if (persistDismissal) {
    setOnboardingDismissed(true);
  }
  setOnboardingVisible(false);
  render();
}

async function consumeIncomingConnectionUrl(incomingUrl, { clearBrowserUrl = false } = {}) {
  const incomingConnectionLink = readIncomingConnectionLink(incomingUrl ?? "");
  if (!incomingConnectionLink) {
    return false;
  }

  if (clearBrowserUrl) {
    clearIncomingConnectionLink(incomingUrl);
  }

  setConnectionConfigDraft(incomingConnectionLink.rawValue);
  const candidate = parseConnectionConfig(incomingConnectionLink.rawValue);
  if (candidate.ok) {
    await applyImportedConnectionConfig(candidate.value, incomingConnectionLink.rawValue);
    return true;
  }

  setServerConnectionState("error");
  setServerConnectionMessage("导入链接中的连接配置无效，请检查后重试。");
  render();
  return true;
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
  const candidate = validateServerBaseUrl(rawValue);
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
  const candidate = parseConnectionConfig(rawValue);
  if (!candidate.ok) {
    failConnection(candidate.message);
    return;
  }

  await applyImportedConnectionConfig(candidate.value, rawValue);
}

async function handleFetchConnectionConfig(rawValue) {
  const candidate = validateServerBaseUrl(rawValue);
  if (!candidate.ok) {
    failConnection(candidate.message);
    return;
  }

  setServerConnectionState("testing");
  setServerConnectionMessage(`正在从 ${candidate.value} 拉取服务端配置...`);
  render();

  try {
    const payload = await fetchConnectConfig(candidate.value);
    const serializedPayload = JSON.stringify(payload, null, 2);
    const parsedConfig = parseConnectionConfig(serializedPayload);
    if (!parsedConfig.ok) {
      failConnection(parsedConfig.message);
      return;
    }

    await applyImportedConnectionConfig(parsedConfig.value, serializedPayload);
  } catch (error) {
    failConnection(error.message || "拉取服务端配置失败");
  }
}

async function handlePasteConnectionConfig() {
  if (!navigator.clipboard?.readText) {
    failConnection("当前环境不支持从剪贴板读取，请手动粘贴连接配置。");
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    setConnectionConfigDraft(text);
    render();
    await handleImportConnectionConfig(text);
  } catch (error) {
    console.error(error);
    failConnection("读取剪贴板失败，请检查浏览器权限后重试。");
  }
}

async function handleScanConnectionConfig() {
  setServerConnectionState("testing");
  setServerConnectionMessage("正在等待二维码扫描结果...");
  render();

  try {
    const scannedValue = await scanConnectionQrCode();
    setConnectionConfigDraft(scannedValue);
    render();
    await handleImportConnectionConfig(scannedValue);
  } catch (error) {
    if (error instanceof QrScanCancelledError || /已取消二维码扫描/.test(error?.message ?? "")) {
      setServerConnectionState("idle");
      setServerConnectionMessage("已取消二维码扫描。");
      render();
      return;
    }
    failConnection(error.message || "二维码识别失败");
  }
}

async function handleRefreshNetworkSnapshot() {
  await refreshNetworkSnapshot();
}

async function refreshNetworkSnapshot({ silent = false } = {}) {
  if (!silent) {
    setDiscoveryState("testing");
    setServerConnectionMessage("正在读取本机网络和 Tailscale 地址...");
    render();
  }

  const snapshot = await getNativeNetworkSnapshot();
  setNetworkSnapshot(snapshot);
  const discoveryCandidates = buildDiscoveryCandidates({
    draftUrl: getState().serverDraftUrl,
    serverBaseUrl: getState().serverBaseUrl,
    recentConnections: getState().recentConnections,
    networkSnapshot: snapshot,
  });
  setDiscoveryCandidates(discoveryCandidates);
  setDiscoveryState("ready");

  if (!silent) {
    setServerConnectionState("idle");
    setServerConnectionMessage(describeNetworkSnapshot(snapshot));
    render();
  }
}

async function handleProbeDiscoveryCandidates() {
  const baseCandidates = buildDiscoveryCandidates({
    draftUrl: getState().serverDraftUrl,
    serverBaseUrl: getState().serverBaseUrl,
    recentConnections: getState().recentConnections,
    networkSnapshot: getState().networkSnapshot,
  });

  if (baseCandidates.length === 0) {
    failConnection("还没有可测试的候选节点，请先填写节点地址或先读取本机网络。");
    return;
  }

  setDiscoveryState("testing");
  setDiscoveryCandidates(
    baseCandidates.map((item) => ({
      ...item,
      status: "testing",
      message: "正在测试连通性",
    })),
  );
  setServerConnectionState("testing");
  setServerConnectionMessage("正在测试候选节点连通性...");
  render();

  const results = await probeDiscoveryCandidates(baseCandidates, getState().serverDraftToken, {
    fetchMeta,
    fetchConnectConfig,
  });

  setDiscoveryCandidates(results);
  setDiscoveryState("ready");

  const firstReadyCandidate = results.find((item) => item.status === "ready" || item.status === "reachable");
  if (firstReadyCandidate) {
    setServerConnectionState("connected");
    setServerConnectionMessage(`已找到可用节点：${firstReadyCandidate.serverBaseUrl}`);
  } else {
    setServerConnectionState("error");
    setServerConnectionMessage("没有找到可直接连通的候选节点，请检查 Tailscale、端口和 token。");
  }
  render();
}

async function handleUseDiscoveryCandidate(serverBaseUrl) {
  const candidate = getState().discoveryCandidates.find((item) => item.serverBaseUrl === serverBaseUrl);
  if (!candidate) {
    failConnection("候选节点不存在。");
    return;
  }

  setServerDraftUrl(candidate.serverBaseUrl);
  if (candidate.serverToken) {
    setServerDraftToken(candidate.serverToken);
  }
  setServerConnectionState("imported");
  setServerConnectionMessage(`已填入候选节点：${candidate.serverBaseUrl}`);
  render();

  if (candidate.serverToken && (candidate.status === "ready" || candidate.status === "reachable")) {
    await connectToServer(candidate.serverBaseUrl, candidate.serverToken, {
      persist: true,
      openTasksView: true,
    });
  }
}

async function applyImportedConnectionConfig(connectionConfig, rawValue) {
  const { serverBaseUrl, serverToken, authRequired } = connectionConfig;
  const nextMessage =
    authRequired && !serverToken
      ? `已导入节点：${serverBaseUrl}，该节点要求 token，请补充后再连接。`
      : `已导入节点配置：${serverBaseUrl}`;

  setServerDraftUrl(serverBaseUrl);
  setServerDraftToken(serverToken);
  setConnectionConfigDraft(rawValue);
  setServerConnectionState("imported");
  setServerConnectionMessage(nextMessage);
  render();

  if (authRequired && !serverToken) {
    syncOnboardingVisibility();
    render();
    return;
  }

  await connectToServer(serverBaseUrl, serverToken, {
    persist: true,
    openTasksView: true,
    initialSocketConfig: connectionConfig.socketConfig,
  });
}

async function handleTestServerUrl(rawValue, rawToken) {
  const candidate = validateServerBaseUrl(rawValue);
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
  setActiveView(view);
  render();
}

function handleFilterChange(filter) {
  setCurrentFilter(filter);
  render();
}

function handleSelectList(listId) {
  setActiveListId(listId);
  render();
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
        setLists(
          getState().lists.map((list) =>
            list.id === editingListId ? { ...list, title, updatedAt: Date.now() } : list,
          ),
        );
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

async function handleDelete(todoId) {
  await executeOrQueue({
    kind: "deleteTodo",
    payload: { todoId },
    optimisticApply: () => {
      setTodos(getState().todos.filter((todo) => todo.id !== todoId));
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
      setTodos(
        getState().todos.filter((todo) => !(todo.listId === listId && todo.completed)),
      );
    },
  });
}

async function createOrQueueTodo(todo) {
  await executeOrQueue({
    kind: "createTodo",
    payload: todo,
    optimisticApply: () => {
      const optimisticTodo = createOptimisticTodo(todo);
      setTodos([optimisticTodo, ...getState().todos.filter((item) => item.id !== todo.id)]);
    },
  });
}

async function updateOrQueueTodo(todoId, patch) {
  await executeOrQueue({
    kind: "updateTodo",
    payload: { todoId, ...patch },
    optimisticApply: () => {
      setTodos(
        getState().todos.map((todo) =>
          todo.id === todoId
            ? {
                ...todo,
                ...patch,
                updatedAt: Date.now(),
                completedAt:
                  patch.completed === true
                    ? Date.now()
                    : patch.completed === false
                      ? null
                      : todo.completedAt,
              }
            : todo,
        ),
      );
    },
  });
}

async function executeOrQueue({ kind, payload, optimisticApply }) {
  const previousSnapshot = captureLocalSnapshot();
  optimisticApply();
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

async function connectToServer(
  serverBaseUrl,
  serverToken,
  { persist, openTasksView, initialSocketConfig = null },
) {
  setServerConnectionState("testing");
  setServerConnectionMessage(`正在连接 ${serverBaseUrl || "同步节点"}...`);
  setSyncState("connecting");
  setPendingOperations(loadPendingOperations(serverBaseUrl, serverToken).length);
  render();

  try {
    await flushPendingQueue(serverBaseUrl, serverToken);
    const meta = await fetchMeta(serverBaseUrl, serverToken);
    setSocketConfig(resolveSocketConfig(meta, initialSocketConfig ?? getState().socketConfig));

    if (persist) {
      setServerBaseUrl(serverBaseUrl);
      setServerDraftUrl(serverBaseUrl);
      setServerToken(serverToken);
      setServerDraftToken(serverToken);
    }

    await refreshSnapshot(serverBaseUrl, serverToken);
    setServerConnectionState("connected");
    setServerConnectionMessage(`已连接节点：${serverBaseUrl}`);
    setOnboardingDismissed(true);
    setOnboardingVisible(false);
    setRecentConnections(
      saveRecentConnection({
        serverBaseUrl,
        serverToken,
        authRequired: meta.authRequired === true,
      }),
    );

    realtimeConnection?.disconnect();
    realtimeConnection = connectRealtime({
      serverBaseUrl: () => getState().serverBaseUrl,
      authToken: () => getState().serverToken,
      socketConfig: () => getState().socketConfig,
      onConnecting: () => {
        setSyncState("connecting");
        render();
      },
      onOnline: async () => {
        setSyncState("online");
        await flushPendingQueue(getState().serverBaseUrl, getState().serverToken);
        await refreshSnapshot(getState().serverBaseUrl, getState().serverToken);
        render();
      },
      onOffline: () => {
        setSyncState("offline");
        render();
      },
      onSnapshot: (snapshot) => {
        applySnapshot(snapshot, {
          preserveActiveList: true,
          serverBaseUrl: getState().serverBaseUrl,
          serverToken: getState().serverToken,
        });
        persistCurrentSnapshot();
        render();
      },
    });

    if (openTasksView) {
      setActiveView("tasks");
    }
    await refreshNetworkSnapshot({ silent: true });
    render();
  } catch (error) {
    handleSyncError(error);
  }
}

async function refreshSnapshot(
  serverBaseUrl = getState().serverBaseUrl,
  serverToken = getState().serverToken,
) {
  const snapshot = await fetchSnapshot(serverBaseUrl, serverToken);
  applySnapshot(snapshot, { preserveActiveList: true, serverBaseUrl, serverToken });
  persistCurrentSnapshot(serverBaseUrl, serverToken);
}

async function flushPendingQueue(serverBaseUrl, serverToken) {
  const remaining = await flushPendingOperations(serverBaseUrl, serverToken, (operation) =>
    runServerMutation(operation.kind, operation.payload, serverBaseUrl, serverToken),
  );
  setPendingOperations(remaining.length);
}

async function runServerMutation(
  kind,
  payload,
  serverBaseUrl = getState().serverBaseUrl,
  serverToken = getState().serverToken,
) {
  if (kind === "createTodo") {
    await createTodo(
      serverBaseUrl,
      serverToken,
      payload.title,
      payload.listId ?? getActiveListId(),
      payload.id,
    );
    return;
  }

  if (kind === "updateTodo") {
    await updateTodo(serverBaseUrl, serverToken, payload.todoId, {
      title: payload.title,
      completed: payload.completed,
      listId: payload.listId,
    });
    return;
  }

  if (kind === "deleteTodo") {
    await deleteTodo(serverBaseUrl, serverToken, payload.todoId);
    return;
  }

  if (kind === "clearCompleted") {
    await clearCompletedTodos(serverBaseUrl, serverToken, payload.listId);
    return;
  }

  if (kind === "createList") {
    await createList(serverBaseUrl, serverToken, payload.title, payload.id);
    return;
  }

  if (kind === "updateList") {
    await updateList(serverBaseUrl, serverToken, payload.listId, { title: payload.title });
  }
}

function applySnapshot(
  snapshot,
  {
    preserveActiveList,
    serverBaseUrl = getState().serverBaseUrl,
    serverToken = getState().serverToken,
  },
) {
  const lists = Array.isArray(snapshot.lists) ? snapshot.lists.filter(isListRecord) : [];
  const todos = Array.isArray(snapshot.items) ? snapshot.items.filter(isTodoRecord) : [];
  const currentActiveListId = preserveActiveList ? getState().activeListId : null;
  const nextActiveListId = resolveActiveListId(
    lists,
    currentActiveListId,
    snapshot.defaultListId,
  );

  setLists(lists);
  setTodos(todos);
  setActiveListId(nextActiveListId);
  setPendingOperations(loadPendingOperations(serverBaseUrl, serverToken).length);
  setSyncState("online");
}

function persistCurrentSnapshot(
  serverBaseUrl = getState().serverBaseUrl,
  serverToken = getState().serverToken,
) {
  saveCachedSnapshot(serverBaseUrl, serverToken, {
    lists: getState().lists,
    items: getState().todos,
    defaultListId: getState().activeListId,
    time: Date.now(),
  });
}

function resolveActiveListId(lists, currentActiveListId, defaultListId) {
  if (currentActiveListId && lists.some((list) => list.id === currentActiveListId)) {
    return currentActiveListId;
  }

  if (defaultListId && lists.some((list) => list.id === defaultListId)) {
    return defaultListId;
  }

  return lists[0]?.id ?? null;
}

function getActiveListId() {
  return getState().activeListId || getState().lists[0]?.id || null;
}

function createOptimisticTodo({ id, listId, title, completed }) {
  const now = Date.now();
  return {
    id,
    listId,
    title,
    completed,
    createdAt: now,
    updatedAt: now,
    completedAt: completed ? now : null,
  };
}

function createOptimisticList({ id, title }) {
  const now = Date.now();
  return {
    id,
    title,
    createdAt: now,
    updatedAt: now,
  };
}

function captureLocalSnapshot() {
  return {
    lists: getState().lists.map((list) => ({ ...list })),
    todos: getState().todos.map((todo) => ({ ...todo })),
    activeListId: getState().activeListId,
  };
}

function restoreLocalSnapshot(snapshot) {
  setLists(snapshot.lists);
  setTodos(snapshot.todos);
  setActiveListId(snapshot.activeListId);
}

function isAuthError(error) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function handleSyncError(error, message = null) {
  console.error(error);
  setSyncState("offline");
  setServerConnectionState("error");
  setServerConnectionMessage(message || error.message || "同步服务不可用");
  render();
}

function handleLifecycleOffline() {
  if (!getState().serverBaseUrl) {
    return;
  }
  setSyncState("offline");
  setServerConnectionState("error");
  setServerConnectionMessage("当前设备已离线，待恢复网络后会自动重连。");
  render();
}

function handleLifecycleOnline() {
  if (!getState().serverBaseUrl) {
    return;
  }
  setServerConnectionState("testing");
  setServerConnectionMessage("网络已恢复，正在尝试重新建立同步连接...");
  render();
}

async function handleLifecycleResume(reason) {
  await refreshNetworkSnapshot({ silent: true });
  await resumeServerSync(reason);
}

async function resumeServerSync(reason) {
  if (!getState().serverBaseUrl || resumeSyncPromise) {
    return resumeSyncPromise;
  }

  const shouldAnnounce =
    getState().syncState !== "online" || reason === "online" || getState().serverConnectionState === "error";

  if (shouldAnnounce) {
    setServerConnectionState("testing");
    setServerConnectionMessage("正在恢复同步连接...");
    render();
  }

  resumeSyncPromise = (async () => {
    try {
      realtimeConnection?.reconnectNow?.();
      await flushPendingQueue(getState().serverBaseUrl, getState().serverToken);
      await refreshSnapshot(getState().serverBaseUrl, getState().serverToken);
      setServerConnectionState("connected");
      if (shouldAnnounce) {
        setServerConnectionMessage(`已恢复同步：${getState().serverBaseUrl}`);
      }
      render();
    } catch (error) {
      handleSyncError(error, "恢复同步失败，稍后会继续自动重试。");
    } finally {
      resumeSyncPromise = null;
    }
  })();

  return resumeSyncPromise;
}

function failConnection(message) {
  setServerConnectionState("error");
  setServerConnectionMessage(message);
  render();
}

function validateServerBaseUrl(rawValue) {
  const value = sanitizeServerBaseUrl(rawValue);
  if (!value) {
    return { ok: false, message: "请先填写同步节点地址。" };
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, message: "同步节点地址必须以 http:// 或 https:// 开头。" };
    }
    return { ok: true, value: parsed.origin };
  } catch {
    return { ok: false, message: "同步节点地址格式不正确。" };
  }
}

function isTodoRecord(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.listId === "string" &&
    typeof value.title === "string" &&
    typeof value.completed === "boolean" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    (typeof value.completedAt === "number" || value.completedAt === null || value.completedAt === undefined)
  );
}

function isListRecord(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number"
  );
}

function render() {
  renderApp(getState());
}

function syncOnboardingVisibility() {
  const shouldShow = shouldShowOnboarding({
    dismissed: getState().onboardingDismissed,
    serverBaseUrl: getState().serverBaseUrl,
    recentConnections: getState().recentConnections,
  });

  const useInlineFallback =
    shouldShow &&
    (isNativeApp() || (globalThis.matchMedia?.("(max-width: 720px)")?.matches ?? false));

  if (useInlineFallback) {
    setOnboardingVisible(false);
    if (!getState().serverBaseUrl) {
      setActiveView("settings");
      setServerConnectionState("idle");
      setServerConnectionMessage("请先在设置页完成第一次节点接入。");
    }
    return;
  }

  setOnboardingVisible(shouldShow);
}
