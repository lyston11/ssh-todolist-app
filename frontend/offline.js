const SNAPSHOT_STORAGE_KEY = "focus-list.snapshot-cache";
const QUEUE_STORAGE_KEY = "focus-list.pending-operations";
const DEFAULT_SERVER_KEY = "__default__";
const DEFAULT_TOKEN_KEY = "__anonymous__";

export function loadCachedSnapshot(serverBaseUrl, authToken = "") {
  const cache = readJson(SNAPSHOT_STORAGE_KEY, {});
  return cache[normalizeConnectionKey(serverBaseUrl, authToken)] ?? null;
}

export function saveCachedSnapshot(serverBaseUrl, authToken, snapshot) {
  const cache = readJson(SNAPSHOT_STORAGE_KEY, {});
  cache[normalizeConnectionKey(serverBaseUrl, authToken)] = snapshot;
  writeJson(SNAPSHOT_STORAGE_KEY, cache);
}

export function enqueueOperation(serverBaseUrl, authToken, operation) {
  const queue = loadPendingOperations(serverBaseUrl, authToken);
  queue.push({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...operation,
  });
  replacePendingOperations(serverBaseUrl, authToken, queue);
  return queue;
}

export function loadPendingOperations(serverBaseUrl, authToken = "") {
  const queueMap = readQueueMap();
  const connectionKey = normalizeConnectionKey(serverBaseUrl, authToken);
  return queueMap[connectionKey] ?? queueMap.__legacy__ ?? [];
}

export function replacePendingOperations(serverBaseUrl, authToken, operations) {
  const queueMap = readQueueMap();
  delete queueMap.__legacy__;
  queueMap[normalizeConnectionKey(serverBaseUrl, authToken)] = operations;
  writeJson(QUEUE_STORAGE_KEY, queueMap);
}

export async function flushPendingOperations(serverBaseUrl, authToken, processOperation) {
  const queue = loadPendingOperations(serverBaseUrl, authToken);
  const remaining = [];

  for (const operation of queue) {
    try {
      await processOperation(operation);
    } catch {
      remaining.push(operation);
    }
  }

  replacePendingOperations(serverBaseUrl, authToken, remaining);
  return remaining;
}

function normalizeConnectionKey(serverBaseUrl, authToken) {
  const normalizedServer = serverBaseUrl?.trim() || DEFAULT_SERVER_KEY;
  const normalizedToken = authToken?.trim() || DEFAULT_TOKEN_KEY;
  return `${normalizedServer}::${normalizedToken}`;
}

function readQueueMap() {
  const raw = readJson(QUEUE_STORAGE_KEY, {});
  if (Array.isArray(raw)) {
    return { __legacy__: raw };
  }
  return raw && typeof raw === "object" ? raw : {};
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
