import { ApiError } from "./api.js";

const DEFAULT_SERVICE_PORT = 8000;

export function buildDiscoveryCandidates({
  draftUrl = "",
  serverBaseUrl = "",
  recentConnections = [],
  networkSnapshot = null,
}) {
  const candidates = [];
  const seen = new Set();
  const preferredPort = inferPreferredPort(draftUrl || serverBaseUrl);

  const addCandidate = ({ serverBaseUrl: candidateUrl, source, label, serverToken = "" }) => {
    const normalizedUrl = normalizeUrl(candidateUrl);
    if (!normalizedUrl || seen.has(normalizedUrl)) {
      return;
    }

    seen.add(normalizedUrl);
    candidates.push({
      id: `${source}:${normalizedUrl}`,
      serverBaseUrl: normalizedUrl,
      source,
      label,
      serverToken,
      status: "idle",
      message: "等待测试",
      latencyMs: null,
      authRequired: null,
    });
  };

  addCandidate({
    serverBaseUrl,
    source: "active",
    label: "当前已连接节点",
  });
  addCandidate({
    serverBaseUrl: draftUrl,
    source: "draft",
    label: "当前输入的节点",
  });

  recentConnections.forEach((connection) => {
    addCandidate({
      serverBaseUrl: connection.serverBaseUrl,
      source: "recent",
      label: "最近成功连接的节点",
      serverToken: connection.serverToken ?? "",
    });
  });

  const tailscaleIps = Array.isArray(networkSnapshot?.tailscale)
    ? networkSnapshot.tailscale
        .map((item) => item?.address)
        .filter((value) => typeof value === "string" && value.trim())
    : [];

  tailscaleIps.forEach((ipAddress) => {
    addCandidate({
      serverBaseUrl: buildHttpCandidateUrl(ipAddress, preferredPort),
      source: "tailscale-local",
      label: `本机 Tailscale 地址 ${ipAddress}`,
    });
  });

  return candidates;
}

export async function probeDiscoveryCandidates(candidates, authToken, dependencies) {
  const results = [];
  for (const candidate of candidates) {
    results.push(await probeDiscoveryCandidate(candidate, authToken, dependencies));
  }
  return results;
}

export async function probeDiscoveryCandidate(candidate, authToken, { fetchMeta, fetchConnectConfig }) {
  const startedAt = Date.now();

  try {
    const meta = await fetchMeta(candidate.serverBaseUrl, authToken);
    return {
      ...candidate,
      status: "ready",
      latencyMs: Date.now() - startedAt,
      authRequired: meta?.authRequired === true,
      message: "节点在线，可直接连接",
    };
  } catch (error) {
    if (isAuthError(error)) {
      return {
        ...candidate,
        status: "auth",
        latencyMs: Date.now() - startedAt,
        authRequired: true,
        message: authToken ? "节点在线，但当前 token 不可用" : "节点在线，需要 token",
      };
    }

    try {
      await fetchConnectConfig(candidate.serverBaseUrl);
      return {
        ...candidate,
        status: "reachable",
        latencyMs: Date.now() - startedAt,
        authRequired: true,
        message: authToken ? "节点可访问，建议重新检查 token" : "节点在线，等待输入 token",
      };
    } catch (fallbackError) {
      return {
        ...candidate,
        status: "offline",
        latencyMs: null,
        authRequired: null,
        message: formatProbeError(error, fallbackError),
      };
    }
  }
}

export function describeNetworkSnapshot(networkSnapshot) {
  if (!networkSnapshot?.supported) {
    return "当前环境不支持读取本机网络接口。";
  }

  const tailscaleIps = Array.isArray(networkSnapshot.tailscale)
    ? networkSnapshot.tailscale
        .map((item) => item?.address)
        .filter((value) => typeof value === "string" && value.trim())
    : [];

  if (tailscaleIps.length === 0) {
    return "还没有检测到本机 Tailscale 地址。";
  }

  return `已检测到 ${tailscaleIps.length} 个本机 Tailscale 地址：${tailscaleIps.join(" / ")}`;
}

function inferPreferredPort(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.port ? Number(parsed.port) || DEFAULT_SERVICE_PORT : DEFAULT_SERVICE_PORT;
  } catch {
    return DEFAULT_SERVICE_PORT;
  }
}

function normalizeUrl(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return "";
  }

  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.origin;
  } catch {
    return "";
  }
}

function buildHttpCandidateUrl(host, port) {
  return `http://${formatHostForUrl(host)}:${port}`;
}

function formatHostForUrl(host) {
  if (typeof host !== "string") {
    return "";
  }

  const normalizedHost = host.trim();
  if (!normalizedHost) {
    return "";
  }

  if (normalizedHost.includes(":") && !normalizedHost.startsWith("[") && !normalizedHost.endsWith("]")) {
    return `[${normalizedHost}]`;
  }

  return normalizedHost;
}

function isAuthError(error) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function formatProbeError(primaryError, fallbackError) {
  const primaryMessage = primaryError?.message?.trim();
  const fallbackMessage = fallbackError?.message?.trim();

  if (primaryMessage && fallbackMessage && primaryMessage !== fallbackMessage) {
    return `${primaryMessage}；${fallbackMessage}`;
  }

  return primaryMessage || fallbackMessage || "节点不可达";
}
