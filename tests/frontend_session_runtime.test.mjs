import test from "node:test";
import assert from "node:assert/strict";

import { ApiError } from "../frontend/api.js";
import {
  connectToServer,
  handleLifecycleOffline,
  handleLifecycleOnline,
  handleSyncError,
  isAuthError,
  refreshSnapshot,
  resumeServerSync,
} from "../frontend/session_runtime.js";

test("isAuthError matches 401 and 403 api errors only", () => {
  assert.equal(isAuthError(new ApiError("unauthorized", 401)), true);
  assert.equal(isAuthError(new ApiError("forbidden", 403)), true);
  assert.equal(isAuthError(new ApiError("server", 500)), false);
  assert.equal(isAuthError(new Error("network")), false);
});

test("handleSyncError sets offline error state and renders", () => {
  const calls = [];

  handleSyncError({
    error: new Error("broken"),
    setSyncState: (value) => calls.push(["sync", value]),
    setServerConnectionState: (value) => calls.push(["state", value]),
    setServerConnectionMessage: (value) => calls.push(["message", value]),
    render: () => calls.push(["render"]),
    logError: () => calls.push(["log"]),
  });

  assert.deepEqual(calls, [
    ["log"],
    ["sync", "offline"],
    ["state", "error"],
    ["message", "broken"],
    ["render"],
  ]);
});

test("lifecycle handlers only announce network changes when a node exists", () => {
  const offlineCalls = [];
  handleLifecycleOffline({
    serverBaseUrl: "",
    setSyncState: (value) => offlineCalls.push(["sync", value]),
    setServerConnectionState: (value) => offlineCalls.push(["state", value]),
    setServerConnectionMessage: (value) => offlineCalls.push(["message", value]),
    render: () => offlineCalls.push(["render"]),
  });
  assert.deepEqual(offlineCalls, []);

  const onlineCalls = [];
  handleLifecycleOnline({
    serverBaseUrl: "http://100.88.77.66:8000",
    setServerConnectionState: (value) => onlineCalls.push(["state", value]),
    setServerConnectionMessage: (value) => onlineCalls.push(["message", value]),
    render: () => onlineCalls.push(["render"]),
  });
  assert.deepEqual(onlineCalls, [
    ["state", "testing"],
    ["message", "网络已恢复，正在尝试重新建立同步连接..."],
    ["render"],
  ]);
});

test("refreshSnapshot fetches remote data and persists the normalized snapshot", async () => {
  const calls = [];
  const snapshot = { items: [], lists: [] };

  await refreshSnapshot({
    serverBaseUrl: "http://100.88.77.66:8000",
    serverToken: "secret",
    fetchSnapshot: async (...args) => {
      calls.push(["fetch", ...args]);
      return snapshot;
    },
    applySnapshot: (...args) => calls.push(["apply", ...args]),
    persistCurrentSnapshot: (...args) => calls.push(["persist", ...args]),
  });

  assert.deepEqual(calls, [
    ["fetch", "http://100.88.77.66:8000", "secret"],
    ["apply", snapshot, { preserveActiveList: true, serverBaseUrl: "http://100.88.77.66:8000", serverToken: "secret" }],
    ["persist", "http://100.88.77.66:8000", "secret"],
  ]);
});

test("connectToServer persists connection state and wires realtime callbacks", async () => {
  const calls = [];
  let realtimeHandlers = null;
  let realtimeConnection = null;
  const state = {
    serverBaseUrl: "http://100.88.77.66:8000",
    serverToken: "secret",
    socketConfig: { wsUrl: "", wsPort: null, wsPath: "/ws" },
  };

  await connectToServer({
    serverBaseUrl: "http://100.88.77.66:8000",
    serverToken: "secret",
    persist: true,
    openTasksView: true,
    initialSocketConfig: { wsUrl: "", wsPort: null, wsPath: "/events" },
    getState: () => state,
    loadPendingOperations: () => [{}, {}],
    setServerConnectionState: (value) => calls.push(["state", value]),
    setServerConnectionMessage: (value) => calls.push(["message", value]),
    setSyncState: (value) => calls.push(["sync", value]),
    setPendingOperations: (value) => calls.push(["pending", value]),
    render: () => calls.push(["render"]),
    flushPendingQueue: async (...args) => calls.push(["flush", ...args]),
    fetchMeta: async (...args) => {
      calls.push(["meta", ...args]);
      return { authRequired: true, wsPort: 9000, wsPath: "/ws" };
    },
    refreshSnapshot: async (...args) => calls.push(["refreshSnapshot", ...args]),
    setSocketConfig: (value) => {
      state.socketConfig = value;
      calls.push(["socketConfig", value]);
    },
    setServerBaseUrl: (value) => {
      state.serverBaseUrl = value;
      calls.push(["serverBaseUrl", value]);
    },
    setServerDraftUrl: (value) => calls.push(["serverDraftUrl", value]),
    setServerToken: (value) => {
      state.serverToken = value;
      calls.push(["serverToken", value]);
    },
    setServerDraftToken: (value) => calls.push(["serverDraftToken", value]),
    resetBatchSelection: (options) => calls.push(["resetBatchSelection", options]),
    setOnboardingDismissed: (value) => calls.push(["onboardingDismissed", value]),
    setOnboardingVisible: (value) => calls.push(["onboardingVisible", value]),
    setRecentConnections: (value) => calls.push(["recentConnections", value]),
    disconnectRealtime: () => calls.push(["disconnectRealtime"]),
    setRealtimeConnection: (value) => {
      realtimeConnection = value;
      calls.push(["setRealtimeConnection"]);
    },
    applySnapshot: (...args) => calls.push(["applySnapshot", ...args]),
    persistCurrentSnapshot: (...args) => calls.push(["persistCurrentSnapshot", ...args]),
    setActiveView: (value) => calls.push(["activeView", value]),
    refreshNetworkSnapshot: async (options) => calls.push(["refreshNetwork", options]),
    handleSyncError: (...args) => calls.push(["handleSyncError", ...args]),
    saveRecentConnectionFn: (value) => [{ ...value, lastUsedAt: 123 }],
    connectRealtimeFn: (config) => {
      realtimeHandlers = config;
      return {
        reconnectNow: () => calls.push(["reconnectNow"]),
      };
    },
  });

  assert.equal(realtimeConnection?.reconnectNow instanceof Function, true);
  assert.deepEqual(calls.slice(0, 15), [
    ["state", "testing"],
    ["message", "正在连接 http://100.88.77.66:8000..."],
    ["sync", "connecting"],
    ["pending", 2],
    ["render"],
    ["flush", "http://100.88.77.66:8000", "secret"],
    ["meta", "http://100.88.77.66:8000", "secret"],
    ["socketConfig", { wsUrl: "", wsPort: 9000, wsPath: "/ws" }],
    ["serverBaseUrl", "http://100.88.77.66:8000"],
    ["serverDraftUrl", "http://100.88.77.66:8000"],
    ["serverToken", "secret"],
    ["serverDraftToken", "secret"],
    ["refreshSnapshot", "http://100.88.77.66:8000", "secret"],
    ["resetBatchSelection", { disableMode: true }],
    ["state", "connected"],
  ]);
  assert.equal(calls.some((entry) => entry[0] === "activeView" && entry[1] === "tasks"), true);
  assert.equal(calls.some((entry) => entry[0] === "refreshNetwork"), true);
  assert.equal(calls.some((entry) => entry[0] === "setRealtimeConnection"), true);
  assert.equal(typeof realtimeHandlers?.onOnline, "function");
  assert.equal(typeof realtimeHandlers?.onOffline, "function");
  assert.equal(typeof realtimeHandlers?.onSnapshot, "function");

  calls.length = 0;
  await realtimeHandlers.onOnline();
  assert.deepEqual(calls, [
    ["sync", "online"],
    ["flush", "http://100.88.77.66:8000", "secret"],
    ["refreshSnapshot", "http://100.88.77.66:8000", "secret"],
    ["render"],
  ]);
});

test("resumeServerSync deduplicates reconnect work and clears the active promise", async () => {
  const calls = [];
  let activePromise = null;
  const state = {
    serverBaseUrl: "http://100.88.77.66:8000",
    serverToken: "secret",
    syncState: "offline",
    serverConnectionState: "error",
  };

  const firstPromise = resumeServerSync({
    reason: "online",
    getState: () => state,
    getResumeSyncPromise: () => activePromise,
    setResumeSyncPromise: (value) => {
      activePromise = value;
      calls.push(["setPromise", value === null ? null : "promise"]);
    },
    getRealtimeConnection: () => ({
      reconnectNow: () => calls.push(["reconnect"]),
    }),
    flushPendingQueue: async (...args) => calls.push(["flush", ...args]),
    refreshSnapshot: async (...args) => calls.push(["refresh", ...args]),
    setServerConnectionState: (value) => calls.push(["state", value]),
    setServerConnectionMessage: (value) => calls.push(["message", value]),
    render: () => calls.push(["render"]),
    handleSyncError: (...args) => calls.push(["error", ...args]),
  });

  const secondPromise = resumeServerSync({
    reason: "foreground",
    getState: () => state,
    getResumeSyncPromise: () => activePromise,
    setResumeSyncPromise: (value) => {
      activePromise = value;
    },
    getRealtimeConnection: () => ({
      reconnectNow: () => calls.push(["reconnect-again"]),
    }),
    flushPendingQueue: async () => calls.push(["flush-again"]),
    refreshSnapshot: async () => calls.push(["refresh-again"]),
    setServerConnectionState: (value) => calls.push(["state2", value]),
    setServerConnectionMessage: (value) => calls.push(["message2", value]),
    render: () => calls.push(["render2"]),
    handleSyncError: (...args) => calls.push(["error2", ...args]),
  });

  assert.equal(secondPromise, firstPromise);
  await firstPromise;
  assert.equal(activePromise, null);
  assert.deepEqual(calls, [
    ["state", "testing"],
    ["message", "正在恢复同步连接..."],
    ["render"],
    ["reconnect"],
    ["flush", "http://100.88.77.66:8000", "secret"],
    ["setPromise", "promise"],
    ["refresh", "http://100.88.77.66:8000", "secret"],
    ["state", "connected"],
    ["message", "已恢复同步：http://100.88.77.66:8000"],
    ["render"],
    ["setPromise", null],
  ]);
});
