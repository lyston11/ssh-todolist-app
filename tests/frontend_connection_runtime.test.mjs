import test from "node:test";
import assert from "node:assert/strict";

import {
  applyImportedConnectionConfig,
  consumeIncomingConnectionUrl,
  fetchAndImportConnectionConfig,
  pasteAndImportConnectionConfig,
  probeDiscoveryCandidates,
  refreshNetworkSnapshot,
  useDiscoveryCandidate,
  validateServerBaseUrl,
} from "../frontend/connection_runtime.js";

test("validateServerBaseUrl normalizes valid urls and rejects unsupported protocols", () => {
  const sanitizeServerBaseUrl = (value) => String(value ?? "").trim().replace(/\/+$/, "");

  assert.deepEqual(
    validateServerBaseUrl("  http://100.88.77.66:8000/path/  ", { sanitizeServerBaseUrl }),
    { ok: true, value: "http://100.88.77.66:8000" },
  );

  assert.deepEqual(
    validateServerBaseUrl("ftp://100.88.77.66:8000", { sanitizeServerBaseUrl }),
    { ok: false, message: "同步节点地址必须以 http:// 或 https:// 开头。" },
  );
});

test("consumeIncomingConnectionUrl imports parsed config and clears the current link when requested", async () => {
  const calls = [];
  const parsedValue = {
    serverBaseUrl: "http://100.88.77.66:8000",
    serverToken: "secret",
    socketConfig: { wsUrl: "", wsPort: null, wsPath: "/ws" },
    authRequired: true,
  };

  const handled = await consumeIncomingConnectionUrl({
    incomingUrl: "https://example.com/?config=ignored",
    clearBrowserUrl: true,
    setConnectionConfigDraft: (value) => calls.push(["draft", value]),
    applyImportedConnectionConfig: async (...args) => calls.push(["apply", ...args]),
    failConnection: (message) => calls.push(["fail", message]),
    readIncomingConnectionLinkFn: () => ({
      rawValue: "{\"serverUrl\":\"http://100.88.77.66:8000\"}",
    }),
    clearIncomingConnectionLinkFn: (href) => calls.push(["clear", href]),
    parseConnectionConfigFn: () => ({ ok: true, value: parsedValue }),
  });

  assert.equal(handled, true);
  assert.deepEqual(calls, [
    ["clear", "https://example.com/?config=ignored"],
    ["draft", "{\"serverUrl\":\"http://100.88.77.66:8000\"}"],
    ["apply", parsedValue, "{\"serverUrl\":\"http://100.88.77.66:8000\"}"],
  ]);
});

test("applyImportedConnectionConfig keeps auth-required configs local until token is provided", async () => {
  const calls = [];

  await applyImportedConnectionConfig({
    connectionConfig: {
      serverBaseUrl: "http://100.88.77.66:8000",
      serverToken: "",
      socketConfig: { wsUrl: "", wsPort: null, wsPath: "/ws" },
      authRequired: true,
    },
    rawValue: "{\"serverUrl\":\"http://100.88.77.66:8000\"}",
    setServerDraftUrl: (value) => calls.push(["draftUrl", value]),
    setServerDraftToken: (value) => calls.push(["draftToken", value]),
    setConnectionConfigDraft: (value) => calls.push(["configDraft", value]),
    setServerConnectionState: (value) => calls.push(["state", value]),
    setServerConnectionMessage: (value) => calls.push(["message", value]),
    render: () => calls.push(["render"]),
    syncOnboardingVisibility: () => calls.push(["syncOnboarding"]),
    connectToServer: async () => calls.push(["connect"]),
  });

  assert.deepEqual(calls, [
    ["draftUrl", "http://100.88.77.66:8000"],
    ["draftToken", ""],
    ["configDraft", "{\"serverUrl\":\"http://100.88.77.66:8000\"}"],
    ["state", "imported"],
    ["message", "已导入节点：http://100.88.77.66:8000，该节点要求 token，请补充后再连接。"],
    ["render"],
    ["syncOnboarding"],
    ["render"],
  ]);
});

test("fetchAndImportConnectionConfig parses service payload before forwarding it", async () => {
  const forwarded = [];
  const calls = [];

  await fetchAndImportConnectionConfig({
    rawValue: " http://100.88.77.66:8000/ ",
    sanitizeServerBaseUrl: (value) => String(value ?? "").trim().replace(/\/+$/, ""),
    setServerConnectionState: (value) => calls.push(["state", value]),
    setServerConnectionMessage: (value) => calls.push(["message", value]),
    render: () => calls.push(["render"]),
    fetchConnectConfig: async (serverBaseUrl) => ({
      serverUrl: serverBaseUrl,
      token: "secret",
    }),
    applyImportedConnectionConfig: async (...args) => forwarded.push(args),
    failConnection: (message) => calls.push(["fail", message]),
  });

  assert.deepEqual(calls, [
    ["state", "testing"],
    ["message", "正在从 http://100.88.77.66:8000 拉取服务端配置..."],
    ["render"],
  ]);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0][0].serverBaseUrl, "http://100.88.77.66:8000");
  assert.equal(forwarded[0][0].serverToken, "secret");
});

test("pasteAndImportConnectionConfig reads clipboard text and forwards it to the importer", async () => {
  const calls = [];

  await pasteAndImportConnectionConfig({
    setConnectionConfigDraft: (value) => calls.push(["draft", value]),
    render: () => calls.push(["render"]),
    importConnectionConfig: async (value) => calls.push(["import", value]),
    failConnection: (message) => calls.push(["fail", message]),
    navigatorObject: {
      clipboard: {
        readText: async () => "{\"serverUrl\":\"http://100.88.77.66:8000\"}",
      },
    },
  });

  assert.deepEqual(calls, [
    ["draft", "{\"serverUrl\":\"http://100.88.77.66:8000\"}"],
    ["render"],
    ["import", "{\"serverUrl\":\"http://100.88.77.66:8000\"}"],
  ]);
});

test("refreshNetworkSnapshot stores network data and derived candidates", async () => {
  const calls = [];
  let networkSnapshot = null;
  let discoveryCandidates = null;

  await refreshNetworkSnapshot({
    getState: () => ({
      serverDraftUrl: "",
      serverBaseUrl: "",
      recentConnections: [],
    }),
    getNativeNetworkSnapshot: async () => ({
      supported: true,
      tailscale: [{ address: "100.88.77.66" }],
    }),
    setDiscoveryState: (value) => calls.push(["discoveryState", value]),
    setServerConnectionState: (value) => calls.push(["connectionState", value]),
    setServerConnectionMessage: (value) => calls.push(["message", value]),
    setNetworkSnapshot: (value) => {
      networkSnapshot = value;
    },
    setDiscoveryCandidates: (value) => {
      discoveryCandidates = value;
    },
    render: () => calls.push(["render"]),
  });

  assert.equal(networkSnapshot.tailscale[0].address, "100.88.77.66");
  assert.equal(discoveryCandidates[0].serverBaseUrl, "http://100.88.77.66:8000");
  assert.deepEqual(calls, [
    ["discoveryState", "testing"],
    ["message", "正在读取本机网络和 Tailscale 地址..."],
    ["render"],
    ["discoveryState", "ready"],
    ["connectionState", "idle"],
    ["message", "已检测到 1 个本机 Tailscale 地址：100.88.77.66"],
    ["render"],
  ]);
});

test("probeDiscoveryCandidates announces the first ready node", async () => {
  const calls = [];
  let latestCandidates = null;

  await probeDiscoveryCandidates({
    getState: () => ({
      serverDraftUrl: "http://100.88.77.66:8000",
      serverBaseUrl: "",
      recentConnections: [],
      networkSnapshot: { supported: false, tailscale: [] },
      serverDraftToken: "secret",
    }),
    setDiscoveryState: (value) => calls.push(["discoveryState", value]),
    setDiscoveryCandidates: (value) => {
      latestCandidates = value;
    },
    setServerConnectionState: (value) => calls.push(["connectionState", value]),
    setServerConnectionMessage: (value) => calls.push(["message", value]),
    render: () => calls.push(["render"]),
    fetchMeta: async () => ({ authRequired: false }),
    fetchConnectConfig: async () => ({ serverUrl: "http://100.88.77.66:8000" }),
    failConnection: (message) => calls.push(["fail", message]),
    buildDiscoveryCandidatesFn: () => [
      {
        id: "draft:http://100.88.77.66:8000",
        serverBaseUrl: "http://100.88.77.66:8000",
        source: "draft",
        label: "当前输入的节点",
        serverToken: "",
        status: "idle",
        message: "等待测试",
      },
    ],
    probeDiscoveryCandidatesFn: async () => [
      {
        id: "draft:http://100.88.77.66:8000",
        serverBaseUrl: "http://100.88.77.66:8000",
        source: "draft",
        label: "当前输入的节点",
        serverToken: "",
        status: "ready",
        message: "节点在线，可直接连接",
      },
    ],
  });

  assert.equal(latestCandidates[0].status, "ready");
  assert.deepEqual(calls, [
    ["discoveryState", "testing"],
    ["connectionState", "testing"],
    ["message", "正在测试候选节点连通性..."],
    ["render"],
    ["discoveryState", "ready"],
    ["connectionState", "connected"],
    ["message", "已找到可用节点：http://100.88.77.66:8000"],
    ["render"],
  ]);
});

test("useDiscoveryCandidate connects immediately when a reachable tokenized node is selected", async () => {
  const calls = [];

  await useDiscoveryCandidate({
    serverBaseUrl: "http://100.88.77.66:8000",
    getState: () => ({
      discoveryCandidates: [
        {
          serverBaseUrl: "http://100.88.77.66:8000",
          serverToken: "secret",
          status: "ready",
        },
      ],
    }),
    setServerDraftUrl: (value) => calls.push(["draftUrl", value]),
    setServerDraftToken: (value) => calls.push(["draftToken", value]),
    setServerConnectionState: (value) => calls.push(["state", value]),
    setServerConnectionMessage: (value) => calls.push(["message", value]),
    render: () => calls.push(["render"]),
    connectToServer: async (...args) => calls.push(["connect", ...args]),
    failConnection: (message) => calls.push(["fail", message]),
  });

  assert.deepEqual(calls, [
    ["draftUrl", "http://100.88.77.66:8000"],
    ["draftToken", "secret"],
    ["state", "imported"],
    ["message", "已填入候选节点：http://100.88.77.66:8000"],
    ["render"],
    ["connect", "http://100.88.77.66:8000", "secret", { persist: true, openTasksView: true }],
  ]);
});
