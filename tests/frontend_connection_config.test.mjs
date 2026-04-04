import test from "node:test";
import assert from "node:assert/strict";

import { parseConnectionConfig, resolveSocketConfig } from "../frontend/connection_config.js";

test("parses service connect-config payload", () => {
  const result = parseConnectionConfig(`{
    "serverUrl": "http://100.88.77.66:8000",
    "token": "secret-token",
    "authRequired": true,
    "wsUrl": "ws://100.88.77.66:8001/ws",
    "wsPort": 8001,
    "wsPath": "/ws"
  }`);

  assert.equal(result.ok, true);
  assert.equal(result.value.serverBaseUrl, "http://100.88.77.66:8000");
  assert.equal(result.value.serverToken, "secret-token");
  assert.equal(result.value.socketConfig.wsUrl, "ws://100.88.77.66:8001/ws");
  assert.equal(result.value.socketConfig.wsPort, 8001);
});

test("falls back to first candidate when top-level serverUrl is missing", () => {
  const result = parseConnectionConfig(`{
    "authRequired": true,
    "candidates": [
      {
        "serverUrl": "http://100.88.77.66:8000",
        "wsUrl": "ws://100.88.77.66:8001/ws"
      }
    ]
  }`);

  assert.equal(result.ok, true);
  assert.equal(result.value.serverBaseUrl, "http://100.88.77.66:8000");
  assert.equal(result.value.socketConfig.wsUrl, "ws://100.88.77.66:8001/ws");
});

test("supports reference-style api/apiToken aliases", () => {
  const result = parseConnectionConfig(`{
    "api": "https://todo.example.com",
    "apiToken": "token-from-service"
  }`);

  assert.equal(result.ok, true);
  assert.equal(result.value.serverBaseUrl, "https://todo.example.com");
  assert.equal(result.value.serverToken, "token-from-service");
});

test("rejects invalid json", () => {
  const result = parseConnectionConfig("{invalid");
  assert.equal(result.ok, false);
});

test("keeps wsUrl and allows nullable wsPort from meta payload", () => {
  const resolved = resolveSocketConfig(
    {
      wsUrl: "wss://todo.example.com/ws",
      wsPort: null,
      wsPath: "/ws",
    },
    {
      wsUrl: "",
      wsPort: 8001,
      wsPath: "/ws",
    },
  );

  assert.deepEqual(resolved, {
    wsUrl: "wss://todo.example.com/ws",
    wsPort: null,
    wsPath: "/ws",
  });
});
