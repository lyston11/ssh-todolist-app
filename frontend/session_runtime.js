import { ApiError } from "./api.js";
import { resolveSocketConfig } from "./connection_config.js";
import { saveRecentConnection } from "./recent_connections.js";
import { connectRealtime } from "./realtime.js";

export function isAuthError(error) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function handleSyncError({
  error,
  message = null,
  setSyncState,
  setServerConnectionState,
  setServerConnectionMessage,
  render,
  logError = console.error,
}) {
  logError(error);
  setSyncState("offline");
  setServerConnectionState("error");
  setServerConnectionMessage(message || error?.message || "同步服务不可用");
  render();
}

export function handleLifecycleOffline({
  serverBaseUrl,
  setSyncState,
  setServerConnectionState,
  setServerConnectionMessage,
  render,
}) {
  if (!serverBaseUrl) {
    return;
  }

  setSyncState("offline");
  setServerConnectionState("error");
  setServerConnectionMessage("当前设备已离线，待恢复网络后会自动重连。");
  render();
}

export function handleLifecycleOnline({
  serverBaseUrl,
  setServerConnectionState,
  setServerConnectionMessage,
  render,
}) {
  if (!serverBaseUrl) {
    return;
  }

  setServerConnectionState("testing");
  setServerConnectionMessage("网络已恢复，正在尝试重新建立同步连接...");
  render();
}

export async function refreshSnapshot({
  serverBaseUrl,
  serverToken,
  fetchSnapshot,
  applySnapshot,
  persistCurrentSnapshot,
}) {
  const snapshot = await fetchSnapshot(serverBaseUrl, serverToken);
  applySnapshot(snapshot, { preserveActiveList: true, serverBaseUrl, serverToken });
  persistCurrentSnapshot(serverBaseUrl, serverToken);
}

export async function connectToServer({
  serverBaseUrl,
  serverToken,
  persist,
  openTasksView,
  initialSocketConfig = null,
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
  disconnectRealtime,
  setRealtimeConnection,
  applySnapshot,
  persistCurrentSnapshot,
  setActiveView,
  refreshNetworkSnapshot,
  handleSyncError,
  resolveSocketConfigFn = resolveSocketConfig,
  saveRecentConnectionFn = saveRecentConnection,
  connectRealtimeFn = connectRealtime,
}) {
  setServerConnectionState("testing");
  setServerConnectionMessage(`正在连接 ${serverBaseUrl || "同步节点"}...`);
  setSyncState("connecting");
  setPendingOperations(loadPendingOperations(serverBaseUrl, serverToken).length);
  render();

  try {
    await flushPendingQueue(serverBaseUrl, serverToken);
    const meta = await fetchMeta(serverBaseUrl, serverToken);
    setSocketConfig(resolveSocketConfigFn(meta, initialSocketConfig ?? getState().socketConfig));

    if (persist) {
      setServerBaseUrl(serverBaseUrl);
      setServerDraftUrl(serverBaseUrl);
      setServerToken(serverToken);
      setServerDraftToken(serverToken);
    }

    await refreshSnapshot(serverBaseUrl, serverToken);
    resetBatchSelection({ disableMode: true });
    setServerConnectionState("connected");
    setServerConnectionMessage(`已连接节点：${serverBaseUrl}`);
    setOnboardingDismissed(true);
    setOnboardingVisible(false);
    setRecentConnections(
      saveRecentConnectionFn({
        serverBaseUrl,
        serverToken,
        authRequired: meta.authRequired === true,
      }),
    );

    disconnectRealtime?.();
    setRealtimeConnection(
      connectRealtimeFn({
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
      }),
    );

    if (openTasksView) {
      setActiveView("tasks");
    }
    await refreshNetworkSnapshot({ silent: true });
    render();
  } catch (error) {
    handleSyncError(error);
  }
}

export function resumeServerSync({
  reason,
  getState,
  getResumeSyncPromise,
  setResumeSyncPromise,
  getRealtimeConnection,
  flushPendingQueue,
  refreshSnapshot,
  setServerConnectionState,
  setServerConnectionMessage,
  render,
  handleSyncError,
}) {
  const activePromise = getResumeSyncPromise();
  if (!getState().serverBaseUrl || activePromise) {
    return activePromise;
  }

  const shouldAnnounce =
    getState().syncState !== "online" || reason === "online" || getState().serverConnectionState === "error";

  if (shouldAnnounce) {
    setServerConnectionState("testing");
    setServerConnectionMessage("正在恢复同步连接...");
    render();
  }

  const nextPromise = (async () => {
    try {
      getRealtimeConnection()?.reconnectNow?.();
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
      setResumeSyncPromise(null);
    }
  })();

  setResumeSyncPromise(nextPromise);
  return nextPromise;
}
