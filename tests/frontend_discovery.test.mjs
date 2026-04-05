import test from "node:test";
import assert from "node:assert/strict";

import { ApiError } from "../frontend/api.js";
import {
  buildDiscoveryCandidates,
  describeNetworkSnapshot,
  probeDiscoveryCandidate,
} from "../frontend/discovery.js";

test("buildDiscoveryCandidates deduplicates draft, recent and local tailscale candidates", () => {
  const result = buildDiscoveryCandidates({
    draftUrl: "http://100.88.77.66:8000",
    serverBaseUrl: "http://100.88.77.66:8000",
    recentConnections: [
      { serverBaseUrl: "http://100.88.77.66:8000", serverToken: "saved-token" },
      { serverBaseUrl: "http://100.88.77.99:8000", serverToken: "" },
    ],
    networkSnapshot: {
      supported: true,
      tailscale: [{ address: "100.88.77.66" }, { address: "100.88.77.44" }],
    },
  });

  assert.deepEqual(
    result.map((item) => item.serverBaseUrl),
    [
      "http://100.88.77.66:8000",
      "http://100.88.77.99:8000",
      "http://100.88.77.44:8000",
    ],
  );
});

test("describeNetworkSnapshot reports tailscale addresses", () => {
  assert.equal(
    describeNetworkSnapshot({
      supported: true,
      tailscale: [{ address: "100.88.77.66" }, { address: "fd7a:115c:a1e0::1" }],
    }),
    "已检测到 2 个本机 Tailscale 地址：100.88.77.66 / fd7a:115c:a1e0::1",
  );
});

test("buildDiscoveryCandidates wraps ipv6 tailscale addresses", () => {
  const result = buildDiscoveryCandidates({
    networkSnapshot: {
      supported: true,
      tailscale: [{ address: "fd7a:115c:a1e0::1" }],
    },
  });

  assert.deepEqual(
    result.map((item) => item.serverBaseUrl),
    ["http://[fd7a:115c:a1e0::1]:8000"],
  );
});

test("probeDiscoveryCandidate marks auth-required nodes as reachable", async () => {
  const result = await probeDiscoveryCandidate(
    {
      id: "draft:http://100.88.77.66:8000",
      serverBaseUrl: "http://100.88.77.66:8000",
      source: "draft",
      label: "当前输入的节点",
      serverToken: "",
      status: "idle",
      message: "等待测试",
    },
    "",
    {
      async fetchMeta() {
        throw new ApiError("token missing", 401);
      },
      async fetchConnectConfig() {
        return { serverUrl: "http://100.88.77.66:8000" };
      },
    },
  );

  assert.equal(result.status, "auth");
  assert.equal(result.authRequired, true);
});
