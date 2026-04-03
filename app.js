import {
  ApiError,
  clearCompletedTodos,
  createList,
  createTodo,
  deleteTodo,
  fetchMeta,
  fetchSnapshot,
  updateList,
  updateTodo,
} from "./frontend/api.js";
import {
  enqueueOperation,
  flushPendingOperations,
  loadCachedSnapshot,
  loadPendingOperations,
  saveCachedSnapshot,
} from "./frontend/offline.js";
import { connectRealtime } from "./frontend/realtime.js";
import {
  getState,
  resetServerBaseUrl,
  resetServerToken,
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

initUI({
  onServerUrlInput: handleServerUrlInput,
  onServerTokenInput: handleServerTokenInput,
  onSaveServerUrl: handleSaveServerUrl,
  onTestServerUrl: handleTestServerUrl,
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
bootstrap();

async function bootstrap() {
  setPendingOperations(loadPendingOperations(getState().serverBaseUrl, getState().serverToken).length);
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
  realtimeConnection?.disconnect();
  realtimeConnection = null;

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

async function connectToServer(serverBaseUrl, serverToken, { persist, openTasksView }) {
  setServerConnectionState("testing");
  setServerConnectionMessage(`正在连接 ${serverBaseUrl || "同步节点"}...`);
  setSyncState("connecting");
  setPendingOperations(loadPendingOperations(serverBaseUrl, serverToken).length);
  render();

  try {
    await flushPendingQueue(serverBaseUrl, serverToken);
    const meta = await fetchMeta(serverBaseUrl, serverToken);
    setSocketConfig({
      wsPort: typeof meta.wsPort === "number" ? meta.wsPort : getState().socketConfig.wsPort,
      wsPath: typeof meta.wsPath === "string" ? meta.wsPath : "/ws",
    });

    if (persist) {
      setServerBaseUrl(serverBaseUrl);
      setServerDraftUrl(serverBaseUrl);
      setServerToken(serverToken);
      setServerDraftToken(serverToken);
    }

    await refreshSnapshot(serverBaseUrl, serverToken);
    setServerConnectionState("connected");
    setServerConnectionMessage(`已连接节点：${serverBaseUrl}`);

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
