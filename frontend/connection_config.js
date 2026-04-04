function sanitizeServerBaseUrl(value) {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

function sanitizeServerToken(value) {
  return String(value ?? "").trim();
}

export function parseConnectionConfig(rawValue) {
  const normalized = String(rawValue ?? "").trim();
  if (!normalized) {
    return {
      ok: false,
      message: "请先粘贴服务端导出的连接配置 JSON。",
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    return {
      ok: false,
      message: "连接配置不是合法 JSON。",
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      message: "连接配置必须是 JSON 对象。",
    };
  }

  const primaryServerUrl = firstNonEmptyString(parsed.serverUrl, parsed.api, parsed.baseUrl);
  const primaryToken = firstNonEmptyString(parsed.token, parsed.apiToken, parsed.accessToken);
  const primaryWsUrl = firstNonEmptyString(parsed.wsUrl);
  const fallbackCandidate = Array.isArray(parsed.candidates)
    ? parsed.candidates.find(
        (candidate) =>
          candidate &&
          typeof candidate === "object" &&
          typeof candidate.serverUrl === "string" &&
          candidate.serverUrl.trim(),
      )
    : null;
  const wsPath = firstNonEmptyString(parsed.wsPath, fallbackCandidate?.wsPath, "/ws");
  const wsPort = normalizeWsPort(parsed.wsPort ?? fallbackCandidate?.wsPort);

  const serverBaseUrl = sanitizeServerBaseUrl(primaryServerUrl || fallbackCandidate?.serverUrl || "");
  if (!serverBaseUrl) {
    return {
      ok: false,
      message: "连接配置缺少 serverUrl。",
    };
  }

  let validatedServerBaseUrl;
  try {
    const parsedServerUrl = new URL(serverBaseUrl);
    if (!["http:", "https:"].includes(parsedServerUrl.protocol)) {
      return {
        ok: false,
        message: "serverUrl 必须以 http:// 或 https:// 开头。",
      };
    }
    validatedServerBaseUrl = parsedServerUrl.origin;
  } catch {
    return {
      ok: false,
      message: "serverUrl 格式不正确。",
    };
  }

  const validatedWsUrl = normalizeWsUrl(primaryWsUrl || fallbackCandidate?.wsUrl || "");
  if (validatedWsUrl.error) {
    return {
      ok: false,
      message: validatedWsUrl.error,
    };
  }

  return {
    ok: true,
    value: {
      serverBaseUrl: validatedServerBaseUrl,
      serverToken: sanitizeServerToken(primaryToken),
      socketConfig: {
        wsUrl: validatedWsUrl.value,
        wsPort,
        wsPath,
      },
      authRequired: parsed.authRequired === true,
    },
  };
}

export function resolveSocketConfig(meta, currentSocketConfig) {
  const nextWsUrl = normalizeWsUrl(meta?.wsUrl).value;
  const nextWsPort = normalizeWsPort(meta?.wsPort);
  const nextWsPath = firstNonEmptyString(meta?.wsPath, currentSocketConfig?.wsPath, "/ws");

  return {
    wsUrl: nextWsUrl || currentSocketConfig?.wsUrl || "",
    wsPort: nextWsPort,
    wsPath: nextWsPath,
  };
}

function normalizeWsUrl(value) {
  const normalized = firstNonEmptyString(value);
  if (!normalized) {
    return { value: "" };
  }

  try {
    const parsed = new URL(normalized);
    if (!["ws:", "wss:"].includes(parsed.protocol)) {
      return { error: "wsUrl 必须以 ws:// 或 wss:// 开头。" };
    }
    return { value: parsed.toString() };
  } catch {
    return { error: "wsUrl 格式不正确。" };
  }
}

function normalizeWsPort(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  return null;
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}
