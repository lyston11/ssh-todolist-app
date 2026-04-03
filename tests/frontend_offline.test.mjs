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
  enqueueOperation,
  flushPendingOperations,
  loadPendingOperations,
  saveCachedSnapshot,
  loadCachedSnapshot,
} = await import("../frontend/offline.js");

test("offline state is scoped per sync node", async () => {
  storage.clear();

  saveCachedSnapshot("http://node-a:8000", "token-a", { items: ["a"] });
  saveCachedSnapshot("http://node-b:8000", "token-b", { items: ["b"] });
  enqueueOperation("http://node-a:8000", "token-a", { kind: "createTodo", payload: { id: "a" } });
  enqueueOperation("http://node-b:8000", "token-b", { kind: "createTodo", payload: { id: "b" } });

  assert.deepEqual(loadCachedSnapshot("http://node-a:8000", "token-a"), { items: ["a"] });
  assert.deepEqual(loadCachedSnapshot("http://node-b:8000", "token-b"), { items: ["b"] });
  assert.equal(loadPendingOperations("http://node-a:8000", "token-a").length, 1);
  assert.equal(loadPendingOperations("http://node-b:8000", "token-b").length, 1);

  await flushPendingOperations("http://node-a:8000", "token-a", async () => {});

  assert.equal(loadPendingOperations("http://node-a:8000", "token-a").length, 0);
  assert.equal(loadPendingOperations("http://node-b:8000", "token-b").length, 1);
});
