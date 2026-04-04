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
  loadOnboardingDismissed,
  saveOnboardingDismissed,
  shouldShowOnboarding,
} = await import("../frontend/onboarding.js");

test("onboarding shows only for fresh install state", () => {
  storage.clear();

  assert.equal(
    shouldShowOnboarding({
      dismissed: false,
      serverBaseUrl: "",
      recentConnections: [],
    }),
    true,
  );

  assert.equal(
    shouldShowOnboarding({
      dismissed: true,
      serverBaseUrl: "",
      recentConnections: [],
    }),
    false,
  );

  assert.equal(
    shouldShowOnboarding({
      dismissed: false,
      serverBaseUrl: "http://100.88.77.66:8000",
      recentConnections: [],
    }),
    false,
  );
});

test("onboarding dismissal persists", () => {
  storage.clear();

  saveOnboardingDismissed(true);
  assert.equal(loadOnboardingDismissed(), true);

  saveOnboardingDismissed(false);
  assert.equal(loadOnboardingDismissed(), false);
});
