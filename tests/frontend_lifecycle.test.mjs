import test from "node:test";
import assert from "node:assert/strict";

const documentListeners = new Map();
const windowListeners = new Map();

globalThis.document = {
  visibilityState: "hidden",
  addEventListener(name, handler) {
    documentListeners.set(name, handler);
  },
  removeEventListener(name) {
    documentListeners.delete(name);
  },
};

globalThis.window = {
  addEventListener(name, handler) {
    windowListeners.set(name, handler);
  },
  removeEventListener(name) {
    windowListeners.delete(name);
  },
};

const { attachLifecycleHandlers } = await import("../frontend/lifecycle.js");

test("attachLifecycleHandlers resumes on foreground and online", () => {
  const resumeReasons = [];
  const networkEvents = [];

  const cleanup = attachLifecycleHandlers({
    onResume(reason) {
      resumeReasons.push(reason);
    },
    onOnline() {
      networkEvents.push("online");
    },
    onOffline() {
      networkEvents.push("offline");
    },
  });

  globalThis.document.visibilityState = "visible";
  documentListeners.get("visibilitychange")();
  windowListeners.get("online")();
  windowListeners.get("offline")();

  cleanup();

  assert.deepEqual(resumeReasons, ["foreground"]);
  assert.deepEqual(networkEvents, ["online", "offline"]);
  assert.equal(documentListeners.size, 0);
  assert.equal(windowListeners.size, 0);
});
