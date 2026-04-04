const RECENT_CONNECTIONS_STORAGE_KEY = "focus-list.recent-connections";
const MAX_RECENT_CONNECTIONS = 6;

export function loadRecentConnections() {
  const value = readJson(RECENT_CONNECTIONS_STORAGE_KEY, []);
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecentConnectionRecord).sort((left, right) => right.lastUsedAt - left.lastUsedAt);
}

export function saveRecentConnection(connection) {
  const nextRecord = normalizeRecentConnection(connection);
  const previous = loadRecentConnections().filter((item) => item.serverBaseUrl !== nextRecord.serverBaseUrl);
  const nextConnections = [nextRecord, ...previous].slice(0, MAX_RECENT_CONNECTIONS);
  writeJson(RECENT_CONNECTIONS_STORAGE_KEY, nextConnections);
  return nextConnections;
}

export function removeRecentConnection(serverBaseUrl) {
  const normalizedServerBaseUrl = String(serverBaseUrl ?? "").trim();
  const nextConnections = loadRecentConnections().filter((item) => item.serverBaseUrl !== normalizedServerBaseUrl);
  writeJson(RECENT_CONNECTIONS_STORAGE_KEY, nextConnections);
  return nextConnections;
}

function normalizeRecentConnection(connection) {
  return {
    serverBaseUrl: String(connection.serverBaseUrl ?? "").trim(),
    serverToken: String(connection.serverToken ?? "").trim(),
    authRequired: connection.authRequired === true,
    lastUsedAt: normalizeTimestamp(connection.lastUsedAt),
  };
}

function normalizeTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return Date.now();
}

function isRecentConnectionRecord(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.serverBaseUrl === "string" &&
    value.serverBaseUrl.trim() &&
    typeof value.serverToken === "string" &&
    typeof value.authRequired === "boolean" &&
    typeof value.lastUsedAt === "number"
  );
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
