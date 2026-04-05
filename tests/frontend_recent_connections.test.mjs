import test from "node:test";
import assert from "node:assert/strict";

const storage = new Map();

globalThis.localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, value);
  },
  removeItem(key) {
    storage.delete(key);
  },
};

const {
  loadRecentConnections,
  removeRecentConnection,
  saveRecentConnection,
} = await import("../frontend/recent_connections.js");

test("recent connections are deduplicated by server url", () => {
  storage.clear();

  saveRecentConnection({
    serverBaseUrl: "http://100.88.77.66:8000",
    authRequired: true,
    lastUsedAt: 1,
  });
  const result = saveRecentConnection({
    serverBaseUrl: "http://100.88.77.66:8000",
    authRequired: false,
    lastUsedAt: 2,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].authRequired, false);
  assert.equal(storage.get("focus-list.recent-connections").includes("second"), false);
});

test("recent connections can be removed", () => {
  storage.clear();

  saveRecentConnection({
    serverBaseUrl: "http://100.88.77.66:8000",
    authRequired: true,
    lastUsedAt: 1,
  });

  const result = removeRecentConnection("http://100.88.77.66:8000");
  assert.deepEqual(result, []);
  assert.deepEqual(loadRecentConnections(), []);
});
