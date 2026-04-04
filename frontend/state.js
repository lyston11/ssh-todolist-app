import { loadOnboardingDismissed, saveOnboardingDismissed } from "./onboarding.js";
import { loadRecentConnections } from "./recent_connections.js";

const SERVER_URL_STORAGE_KEY = "focus-list.server-url";
const SERVER_TOKEN_STORAGE_KEY = "focus-list.server-token";
const ACTIVE_LIST_ID_STORAGE_KEY = "focus-list.active-list-id";

const defaultServerBaseUrl = getDefaultServerBaseUrl();
const defaultServerToken = getDefaultServerToken();

const state = {
  lists: [],
  todos: [],
  activeListId: loadActiveListId(),
  currentFilter: "all",
  activeView: "tasks",
  selectionMode: false,
  selectedTodoIds: [],
  batchMoveListId: "",
  editingTodoId: null,
  editorMode: "edit",
  editingListId: null,
  listEditorMode: "create",
  syncState: "connecting",
  serverBaseUrl: loadServerBaseUrl(),
  serverDraftUrl: loadServerBaseUrl(),
  serverToken: loadServerToken(),
  serverDraftToken: loadServerToken(),
  connectionConfigDraft: "",
  onboardingDismissed: loadOnboardingDismissed(),
  onboardingVisible: false,
  serverConnectionState: "idle",
  serverConnectionMessage: getInitialConnectionMessage(loadServerBaseUrl()),
  pendingOperations: 0,
  recentConnections: loadRecentConnections(),
  socketConfig: {
    wsUrl: "",
    wsPort: getDefaultWebSocketPort(),
    wsPath: "/ws",
  },
  networkSnapshot: {
    supported: false,
    interfaces: [],
    tailscale: [],
    lastUpdatedAt: null,
  },
  discoveryState: "idle",
  discoveryCandidates: [],
};

export function getState() {
  return state;
}

export function setLists(lists) {
  state.lists = lists;
}

export function setTodos(todos) {
  state.todos = todos;
}

export function setActiveListId(activeListId) {
  state.activeListId = activeListId;
  if (activeListId) {
    localStorage.setItem(ACTIVE_LIST_ID_STORAGE_KEY, activeListId);
  } else {
    localStorage.removeItem(ACTIVE_LIST_ID_STORAGE_KEY);
  }
}

export function setCurrentFilter(filter) {
  state.currentFilter = filter;
}

export function setActiveView(view) {
  state.activeView = view;
}

export function setSelectionMode(selectionMode) {
  state.selectionMode = selectionMode;
}

export function setSelectedTodoIds(selectedTodoIds) {
  state.selectedTodoIds = Array.from(
    new Set(
      (Array.isArray(selectedTodoIds) ? selectedTodoIds : []).filter(
        (todoId) => typeof todoId === "string" && todoId.trim(),
      ),
    ),
  );
}

export function toggleSelectedTodoId(todoId, selected) {
  const normalizedTodoId = typeof todoId === "string" ? todoId.trim() : "";
  if (!normalizedTodoId) {
    return;
  }

  const nextSelectedTodoIds = new Set(state.selectedTodoIds);
  const shouldSelect = selected ?? !nextSelectedTodoIds.has(normalizedTodoId);
  if (shouldSelect) {
    nextSelectedTodoIds.add(normalizedTodoId);
  } else {
    nextSelectedTodoIds.delete(normalizedTodoId);
  }

  state.selectedTodoIds = Array.from(nextSelectedTodoIds);
}

export function clearSelectedTodoIds() {
  state.selectedTodoIds = [];
}

export function setEditingTodoId(todoId) {
  state.editingTodoId = todoId;
}

export function setEditorMode(editorMode) {
  state.editorMode = editorMode;
}

export function setEditingListId(listId) {
  state.editingListId = listId;
}

export function setListEditorMode(listEditorMode) {
  state.listEditorMode = listEditorMode;
}

export function setSyncState(syncState) {
  state.syncState = syncState;
}

export function setServerBaseUrl(serverBaseUrl) {
  state.serverBaseUrl = serverBaseUrl;
  localStorage.setItem(SERVER_URL_STORAGE_KEY, serverBaseUrl);
}

export function setServerToken(serverToken) {
  state.serverToken = serverToken;
  localStorage.setItem(SERVER_TOKEN_STORAGE_KEY, serverToken);
}

export function setServerDraftUrl(serverDraftUrl) {
  state.serverDraftUrl = serverDraftUrl;
}

export function setServerDraftToken(serverDraftToken) {
  state.serverDraftToken = serverDraftToken;
}

export function setConnectionConfigDraft(connectionConfigDraft) {
  state.connectionConfigDraft = connectionConfigDraft;
}

export function setBatchMoveListId(batchMoveListId) {
  state.batchMoveListId = typeof batchMoveListId === "string" ? batchMoveListId.trim() : "";
}

export function setOnboardingDismissed(onboardingDismissed) {
  state.onboardingDismissed = onboardingDismissed;
  saveOnboardingDismissed(onboardingDismissed);
}

export function setOnboardingVisible(onboardingVisible) {
  state.onboardingVisible = onboardingVisible;
}

export function resetServerBaseUrl() {
  state.serverBaseUrl = defaultServerBaseUrl;
  state.serverDraftUrl = defaultServerBaseUrl;
  localStorage.removeItem(SERVER_URL_STORAGE_KEY);
}

export function resetServerToken() {
  state.serverToken = defaultServerToken;
  state.serverDraftToken = defaultServerToken;
  localStorage.removeItem(SERVER_TOKEN_STORAGE_KEY);
}

export function setServerConnectionState(serverConnectionState) {
  state.serverConnectionState = serverConnectionState;
}

export function setServerConnectionMessage(serverConnectionMessage) {
  state.serverConnectionMessage = serverConnectionMessage;
}

export function setPendingOperations(pendingOperations) {
  state.pendingOperations = pendingOperations;
}

export function setRecentConnections(recentConnections) {
  state.recentConnections = recentConnections;
}

export function setSocketConfig(socketConfig) {
  state.socketConfig = socketConfig;
}

export function setNetworkSnapshot(networkSnapshot) {
  state.networkSnapshot = networkSnapshot;
}

export function setDiscoveryState(discoveryState) {
  state.discoveryState = discoveryState;
}

export function setDiscoveryCandidates(discoveryCandidates) {
  state.discoveryCandidates = discoveryCandidates;
}

export function sanitizeServerBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

export function sanitizeServerToken(value) {
  return value.trim();
}

function loadServerBaseUrl() {
  const stored = localStorage.getItem(SERVER_URL_STORAGE_KEY);
  if (stored) {
    return sanitizeServerBaseUrl(stored);
  }
  return defaultServerBaseUrl;
}

function loadServerToken() {
  const stored = localStorage.getItem(SERVER_TOKEN_STORAGE_KEY);
  if (stored !== null) {
    return sanitizeServerToken(stored);
  }
  return defaultServerToken;
}

function loadActiveListId() {
  return localStorage.getItem(ACTIVE_LIST_ID_STORAGE_KEY);
}

function getDefaultServerBaseUrl() {
  const queryValue = new URLSearchParams(location.search).get("server");
  if (queryValue) {
    return sanitizeServerBaseUrl(queryValue);
  }

  return "";
}

function getDefaultServerToken() {
  const queryValue = new URLSearchParams(location.search).get("token");
  if (queryValue) {
    return sanitizeServerToken(queryValue);
  }

  return "";
}

function getInitialConnectionMessage(serverBaseUrl) {
  if (!serverBaseUrl) {
    return "请填写同步节点地址后再连接。";
  }

  if (serverBaseUrl === defaultServerBaseUrl && defaultServerBaseUrl) {
    return `已预置节点：${serverBaseUrl}`;
  }

  return `当前节点：${serverBaseUrl}`;
}

function getDefaultWebSocketPort() {
  if (location.protocol === "http:" || location.protocol === "https:") {
    return location.port ? Number(location.port) + 1 : 8001;
  }
  return 8001;
}
