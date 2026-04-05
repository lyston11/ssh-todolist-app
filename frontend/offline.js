const SNAPSHOT_STORAGE_KEY = "focus-list.snapshot-cache";
const QUEUE_STORAGE_KEY = "focus-list.pending-operations";
const DEFAULT_SERVER_KEY = "__default__";

export function loadCachedSnapshot(serverBaseUrl, authToken = "") {
  const cache = readSnapshotCache();
  return cache[normalizeConnectionKey(serverBaseUrl, authToken)] ?? null;
}

export function saveCachedSnapshot(serverBaseUrl, authToken, snapshot) {
  const cache = readSnapshotCache();
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
  return normalizedServer;
}

function readQueueMap() {
  const raw = readJson(QUEUE_STORAGE_KEY, {});
  if (Array.isArray(raw)) {
    return {
      [DEFAULT_SERVER_KEY]: raw,
    };
  }
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const migrated = {};
  Object.entries(raw).forEach(([rawKey, operations]) => {
    if (!Array.isArray(operations)) {
      return;
    }

    const normalizedKey = normalizeStoredConnectionKey(rawKey);
    migrated[normalizedKey] = [...(migrated[normalizedKey] ?? []), ...operations];
  });
  return migrated;
}

function readSnapshotCache() {
  const raw = readJson(SNAPSHOT_STORAGE_KEY, {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const migrated = {};
  Object.entries(raw).forEach(([rawKey, snapshot]) => {
    if (!snapshot || typeof snapshot !== "object") {
      return;
    }

    const normalizedKey = normalizeStoredConnectionKey(rawKey);
    const previousSnapshot = migrated[normalizedKey];
    migrated[normalizedKey] = chooseNewerSnapshot(previousSnapshot, snapshot);
  });
  return migrated;
}

function normalizeStoredConnectionKey(rawKey) {
  const normalizedRawKey = String(rawKey ?? "").trim();
  if (!normalizedRawKey || normalizedRawKey === "__legacy__") {
    return DEFAULT_SERVER_KEY;
  }

  const separatorIndex = normalizedRawKey.indexOf("::");
  if (separatorIndex < 0) {
    return normalizedRawKey || DEFAULT_SERVER_KEY;
  }

  const normalizedServer = normalizedRawKey.slice(0, separatorIndex).trim();
  return normalizedServer || DEFAULT_SERVER_KEY;
}

function chooseNewerSnapshot(previousSnapshot, nextSnapshot) {
  if (!previousSnapshot) {
    return nextSnapshot;
  }

  const previousTime = typeof previousSnapshot.time === "number" ? previousSnapshot.time : 0;
  const nextTime = typeof nextSnapshot.time === "number" ? nextSnapshot.time : 0;
  return nextTime >= previousTime ? nextSnapshot : previousSnapshot;
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
