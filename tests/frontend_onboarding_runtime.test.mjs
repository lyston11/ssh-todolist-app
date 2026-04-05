import test from "node:test";
import assert from "node:assert/strict";

import { dismissOnboarding, syncOnboardingVisibility } from "../frontend/onboarding_runtime.js";

test("dismissOnboarding persists dismissal when requested and hides the modal", () => {
  const calls = [];

  dismissOnboarding({
    persistDismissal: true,
    setOnboardingDismissed: (value) => calls.push(["dismissed", value]),
    setOnboardingVisible: (value) => calls.push(["visible", value]),
    render: () => calls.push(["render"]),
  });

  assert.deepEqual(calls, [
    ["dismissed", true],
    ["visible", false],
    ["render"],
  ]);
});

test("syncOnboardingVisibility redirects mobile fresh installs to settings with inline onboarding", () => {
  const calls = [];

  syncOnboardingVisibility({
    getState: () => ({
      onboardingDismissed: false,
      serverBaseUrl: "",
      recentConnections: [],
    }),
    isNativeApp: () => true,
    setActiveView: (value) => calls.push(["view", value]),
    setServerConnectionState: (value) => calls.push(["state", value]),
    setServerConnectionMessage: (value) => calls.push(["message", value]),
    setOnboardingVisible: (value) => calls.push(["visible", value]),
  });

  assert.deepEqual(calls, [
    ["view", "settings"],
    ["state", "idle"],
    ["message", "请先在设置页完成节点接入。"],
    ["visible", false],
  ]);
});

test("syncOnboardingVisibility shows the modal onboarding on desktop fresh installs", () => {
  const calls = [];

  syncOnboardingVisibility({
    getState: () => ({
      onboardingDismissed: false,
      serverBaseUrl: "",
      recentConnections: [],
    }),
    isNativeApp: () => false,
    matchMedia: () => ({ matches: false }),
    setActiveView: (value) => calls.push(["view", value]),
    setServerConnectionState: (value) => calls.push(["state", value]),
    setServerConnectionMessage: (value) => calls.push(["message", value]),
    setOnboardingVisible: (value) => calls.push(["visible", value]),
  });

  assert.deepEqual(calls, [["visible", true]]);
});
