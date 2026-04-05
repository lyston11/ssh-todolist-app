import { resolveActiveListId } from "./todo_data.js";

export async function runServerMutation({
  kind,
  payload,
  serverBaseUrl,
  serverToken,
  getActiveListId,
  api,
}) {
  if (kind === "createTodo") {
    await api.createTodo(
      serverBaseUrl,
      serverToken,
      payload.title,
      payload.listId ?? getActiveListId(),
      payload.id,
    );
    return;
  }

  if (kind === "updateTodo") {
    await api.updateTodo(serverBaseUrl, serverToken, payload.todoId, {
      title: payload.title,
      completed: payload.completed,
      listId: payload.listId,
    });
    return;
  }

  if (kind === "deleteTodo") {
    await api.deleteTodo(serverBaseUrl, serverToken, payload.todoId);
    return;
  }

  if (kind === "clearCompleted") {
    await api.clearCompletedTodos(serverBaseUrl, serverToken, payload.listId);
    return;
  }

  if (kind === "createList") {
    await api.createList(serverBaseUrl, serverToken, payload.title, payload.id);
    return;
  }

  if (kind === "updateList") {
    await api.updateList(serverBaseUrl, serverToken, payload.listId, { title: payload.title });
    return;
  }

  if (kind === "deleteList") {
    await api.deleteList(serverBaseUrl, serverToken, payload.listId);
    return;
  }

  throw new Error(`Unsupported mutation kind: ${kind}`);
}

export async function flushPendingQueue({
  serverBaseUrl,
  serverToken,
  flushPendingOperations,
  runMutation,
  setPendingOperations,
}) {
  const remaining = await flushPendingOperations(serverBaseUrl, serverToken, (operation) =>
    runMutation(operation.kind, operation.payload, serverBaseUrl, serverToken),
  );
  setPendingOperations(remaining.length);
  return remaining;
}

export function applyRemoteSnapshot({
  snapshot,
  preserveActiveList,
  currentActiveListId,
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
}) {
  const normalizedSnapshot = normalizeSnapshotPayload(snapshot);
  const nextActiveListId = resolveActiveListId(
    normalizedSnapshot.lists,
    preserveActiveList ? currentActiveListId : null,
    normalizedSnapshot.defaultListId,
  );

  setLists(normalizedSnapshot.lists);
  setTodos(normalizedSnapshot.todos);
  setActiveListId(nextActiveListId);
  setPendingOperations(loadPendingOperations(serverBaseUrl, serverToken).length);
  setSyncState("online");
  syncBatchSelection({ visibleOnly: true });
  syncBatchMoveTarget();

  return {
    ...normalizedSnapshot,
    activeListId: nextActiveListId,
  };
}

export function persistSnapshot({ serverBaseUrl, serverToken, state, saveCachedSnapshot }) {
  saveCachedSnapshot(serverBaseUrl, serverToken, {
    lists: state.lists,
    items: state.todos,
    defaultListId: state.activeListId,
    time: Date.now(),
  });
}

export function normalizeSnapshotPayload(snapshot) {
  return {
    lists: Array.isArray(snapshot?.lists) ? snapshot.lists.filter(isListRecord) : [],
    todos: Array.isArray(snapshot?.items) ? snapshot.items.filter(isTodoRecord) : [],
    defaultListId: typeof snapshot?.defaultListId === "string" ? snapshot.defaultListId : null,
  };
}

export function isTodoRecord(value) {
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

export function isListRecord(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number"
  );
}
