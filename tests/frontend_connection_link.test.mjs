import test from "node:test";
import assert from "node:assert/strict";

import {
  clearIncomingConnectionLink,
  readIncomingConnectionLink,
} from "../frontend/connection_link.js";

test("reads raw json config from query param", () => {
  const payload = readIncomingConnectionLink(
    "https://focus-list.local/?config=%7B%22serverUrl%22%3A%22http%3A%2F%2F100.88.77.66%3A8000%22%7D",
  );

  assert.deepEqual(payload, {
    source: "config",
    rawValue: '{"serverUrl":"http://100.88.77.66:8000"}',
  });
});

test("reads base64url encoded config from query param", () => {
  const payload = readIncomingConnectionLink(
    "https://focus-list.local/?config64=eyJzZXJ2ZXJVcmwiOiJodHRwOi8vMTAwLjg4Ljc3LjY2OjgwMDAifQ",
  );

  assert.deepEqual(payload, {
    source: "config64",
    rawValue: '{"serverUrl":"http://100.88.77.66:8000"}',
  });
});

test("clears config query params from the current url", () => {
  let replacedHref = "";
  globalThis.history = {
    replaceState(_state, _title, href) {
      replacedHref = href;
    },
  };

  clearIncomingConnectionLink(
    "https://focus-list.local/?config=%7B%22serverUrl%22%3A%22http%3A%2F%2F100.88.77.66%3A8000%22%7D&server=http%3A%2F%2F100.88.77.66%3A8000#sync",
  );

  assert.equal(replacedHref, "/?server=http%3A%2F%2F100.88.77.66%3A8000#sync");
});

test("clears legacy token query param when stripping the current url", () => {
  let replacedHref = "";
  globalThis.history = {
    replaceState(_state, _title, href) {
      replacedHref = href;
    },
  };

  clearIncomingConnectionLink(
    "https://focus-list.local/?server=http%3A%2F%2F100.88.77.66%3A8000&token=secret#sync",
  );

  assert.equal(replacedHref, "/?server=http%3A%2F%2F100.88.77.66%3A8000#sync");
});
