import test from "node:test";
import assert from "node:assert/strict";

import { connectRealtime } from "../frontend/realtime.js";

test("connectRealtime closes the socket when async onOnline fails", async () => {
  const originalConsoleError = console.error;
  const originalWindow = globalThis.window;
  const originalWebSocket = globalThis.WebSocket;
  const loggedErrors = [];
  let activeSocket = null;

  class FakeWebSocket {
    static CLOSED = 3;

    constructor(url) {
      this.url = url;
      this.listeners = new Map();
      this.readyState = 1;
      this.closed = false;
      activeSocket = this;
    }

    addEventListener(type, handler) {
      const handlers = this.listeners.get(type) ?? [];
      handlers.push(handler);
      this.listeners.set(type, handlers);
    }

    close() {
      this.closed = true;
      this.readyState = FakeWebSocket.CLOSED;
    }

    dispatch(type, payload = {}) {
      for (const handler of this.listeners.get(type) ?? []) {
        handler(payload);
      }
    }
  }

  console.error = (error) => loggedErrors.push(error);
  globalThis.window = {
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {},
  };
  globalThis.WebSocket = FakeWebSocket;

  try {
    const realtime = connectRealtime({
      socketConfig: () => ({ wsUrl: "", wsPort: 8001, wsPath: "/ws" }),
      serverBaseUrl: () => "http://100.88.77.66:8000",
      authToken: () => "",
      onConnecting: () => {},
      onOnline: async () => {
        throw new Error("refresh failed");
      },
      onOffline: () => {},
      onSnapshot: () => {},
    });

    activeSocket.dispatch("open");
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(activeSocket.closed, true);
    assert.equal(loggedErrors[0]?.message, "refresh failed");

    realtime.disconnect();
  } finally {
    console.error = originalConsoleError;
    globalThis.window = originalWindow;
    globalThis.WebSocket = originalWebSocket;
  }
});
