import { parseConnectionConfig } from "./connection_config.js";
import { clearIncomingConnectionLink, readIncomingConnectionLink } from "./connection_link.js";
import {
  buildDiscoveryCandidates,
  describeNetworkSnapshot,
  probeDiscoveryCandidates as probeDiscoveryCandidatesImpl,
} from "./discovery.js";
import { QrScanCancelledError, scanConnectionQrCode } from "./qr_scanner.js";

export function validateServerBaseUrl(rawValue, { sanitizeServerBaseUrl }) {
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

export async function consumeIncomingConnectionUrl({
  incomingUrl,
  clearBrowserUrl = false,
  setConnectionConfigDraft,
  applyImportedConnectionConfig,
  failConnection,
  readIncomingConnectionLinkFn = readIncomingConnectionLink,
  clearIncomingConnectionLinkFn = clearIncomingConnectionLink,
  parseConnectionConfigFn = parseConnectionConfig,
}) {
  const incomingConnectionLink = readIncomingConnectionLinkFn(incomingUrl ?? "");
  if (!incomingConnectionLink) {
    return false;
  }

  if (clearBrowserUrl) {
    clearIncomingConnectionLinkFn(incomingUrl);
  }

  setConnectionConfigDraft(incomingConnectionLink.rawValue);
  const candidate = parseConnectionConfigFn(incomingConnectionLink.rawValue);
  if (candidate.ok) {
    await applyImportedConnectionConfig(candidate.value, incomingConnectionLink.rawValue);
    return true;
  }

  failConnection("导入链接中的连接配置无效，请检查后重试。");
  return true;
}

export async function importConnectionConfigText({
  rawValue,
  applyImportedConnectionConfig,
  failConnection,
  parseConnectionConfigFn = parseConnectionConfig,
}) {
  const candidate = parseConnectionConfigFn(rawValue);
  if (!candidate.ok) {
    failConnection(candidate.message);
    return;
  }

  await applyImportedConnectionConfig(candidate.value, rawValue);
}

export async function fetchAndImportConnectionConfig({
  rawValue,
  sanitizeServerBaseUrl,
  setServerConnectionState,
  setServerConnectionMessage,
  render,
  fetchConnectConfig,
  applyImportedConnectionConfig,
  failConnection,
  parseConnectionConfigFn = parseConnectionConfig,
}) {
  const candidate = validateServerBaseUrl(rawValue, { sanitizeServerBaseUrl });
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
    const parsedConfig = parseConnectionConfigFn(serializedPayload);
    if (!parsedConfig.ok) {
      failConnection(parsedConfig.message);
      return;
    }

    await applyImportedConnectionConfig(parsedConfig.value, serializedPayload);
  } catch (error) {
    failConnection(error.message || "拉取服务端配置失败");
  }
}

export async function pasteAndImportConnectionConfig({
  setConnectionConfigDraft,
  render,
  importConnectionConfig,
  failConnection,
  navigatorObject = globalThis.navigator,
}) {
  if (!navigatorObject?.clipboard?.readText) {
    failConnection("当前环境不支持从剪贴板读取，请手动粘贴连接配置。");
    return;
  }

  try {
    const text = await navigatorObject.clipboard.readText();
    setConnectionConfigDraft(text);
    render();
    await importConnectionConfig(text);
  } catch (error) {
    console.error(error);
    failConnection("读取剪贴板失败，请检查浏览器权限后重试。");
  }
}

export async function scanAndImportConnectionConfig({
  setServerConnectionState,
  setServerConnectionMessage,
  render,
  setConnectionConfigDraft,
  importConnectionConfig,
  failConnection,
  scanConnectionQrCodeFn = scanConnectionQrCode,
  isCancelledError = defaultIsCancelledQrError,
}) {
  setServerConnectionState("testing");
  setServerConnectionMessage("正在等待二维码扫描结果...");
  render();

  try {
    const scannedValue = await scanConnectionQrCodeFn();
    setConnectionConfigDraft(scannedValue);
    render();
    await importConnectionConfig(scannedValue);
  } catch (error) {
    if (isCancelledError(error)) {
      setServerConnectionState("idle");
      setServerConnectionMessage("已取消二维码扫描。");
      render();
      return;
    }
    failConnection(error.message || "二维码识别失败");
  }
}

export async function refreshNetworkSnapshot({
  silent = false,
  getState,
  getNativeNetworkSnapshot,
  setDiscoveryState,
  setServerConnectionState,
  setServerConnectionMessage,
  setNetworkSnapshot,
  setDiscoveryCandidates,
  render,
  buildDiscoveryCandidatesFn = buildDiscoveryCandidates,
  describeNetworkSnapshotFn = describeNetworkSnapshot,
}) {
  if (!silent) {
    setDiscoveryState("testing");
    setServerConnectionMessage("正在读取本机网络和 Tailscale 地址...");
    render();
  }

  const snapshot = await getNativeNetworkSnapshot();
  setNetworkSnapshot(snapshot);
  const state = getState();
  const discoveryCandidates = buildDiscoveryCandidatesFn({
    draftUrl: state.serverDraftUrl,
    serverBaseUrl: state.serverBaseUrl,
    recentConnections: state.recentConnections,
    networkSnapshot: snapshot,
  });
  setDiscoveryCandidates(discoveryCandidates);
  setDiscoveryState("ready");

  if (!silent) {
    setServerConnectionState("idle");
    setServerConnectionMessage(describeNetworkSnapshotFn(snapshot));
    render();
  }
}

export async function probeDiscoveryCandidates({
  getState,
  setDiscoveryState,
  setDiscoveryCandidates,
  setServerConnectionState,
  setServerConnectionMessage,
  render,
  fetchMeta,
  fetchConnectConfig,
  failConnection,
  buildDiscoveryCandidatesFn = buildDiscoveryCandidates,
  probeDiscoveryCandidatesFn = probeDiscoveryCandidatesImpl,
}) {
  const state = getState();
  const baseCandidates = buildDiscoveryCandidatesFn({
    draftUrl: state.serverDraftUrl,
    serverBaseUrl: state.serverBaseUrl,
    recentConnections: state.recentConnections,
    networkSnapshot: state.networkSnapshot,
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

  const results = await probeDiscoveryCandidatesFn(baseCandidates, getState().serverDraftToken, {
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

export async function useDiscoveryCandidate({
  serverBaseUrl,
  getState,
  setServerDraftUrl,
  setServerDraftToken,
  setServerConnectionState,
  setServerConnectionMessage,
  render,
  connectToServer,
  failConnection,
}) {
  const state = getState();
  const candidate = state.discoveryCandidates.find((item) => item.serverBaseUrl === serverBaseUrl);
  if (!candidate) {
    failConnection("候选节点不存在。");
    return;
  }

  const candidateToken = resolveCandidateToken(candidate, state);
  const requiresToken = candidate.authRequired === true || candidate.status === "auth";
  setServerDraftUrl(candidate.serverBaseUrl);
  setServerDraftToken(candidateToken);
  setServerConnectionState("imported");
  setServerConnectionMessage(
    requiresToken && !candidateToken
      ? `已填入候选节点：${candidate.serverBaseUrl}，请补充 token 后连接。`
      : `已填入候选节点：${candidate.serverBaseUrl}`,
  );
  render();

  if ((!requiresToken || candidateToken) && (candidate.status === "ready" || candidate.status === "reachable")) {
    await connectToServer(candidate.serverBaseUrl, candidateToken, {
      persist: true,
      openTasksView: true,
    });
  }
}

export async function applyImportedConnectionConfig({
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
}) {
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

function defaultIsCancelledQrError(error) {
  return error instanceof QrScanCancelledError || /已取消二维码扫描/.test(error?.message ?? "");
}

function resolveCandidateToken(candidate, state) {
  const explicitCandidateToken = typeof candidate.serverToken === "string" ? candidate.serverToken.trim() : "";
  if (explicitCandidateToken) {
    return explicitCandidateToken;
  }

  if (candidate.serverBaseUrl === state.serverDraftUrl) {
    return typeof state.serverDraftToken === "string" ? state.serverDraftToken.trim() : "";
  }

  if (candidate.serverBaseUrl === state.serverBaseUrl) {
    return typeof state.serverToken === "string" ? state.serverToken.trim() : "";
  }

  return "";
}
