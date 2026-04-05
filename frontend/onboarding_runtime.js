import { shouldDefaultToSettingsView, shouldShowOnboarding } from "./onboarding.js";

export function dismissOnboarding({
  persistDismissal,
  setOnboardingDismissed,
  setOnboardingVisible,
  render,
}) {
  if (persistDismissal) {
    setOnboardingDismissed(true);
  }
  setOnboardingVisible(false);
  render();
}

export function syncOnboardingVisibility({
  getState,
  isNativeApp,
  matchMedia = globalThis.matchMedia?.bind(globalThis),
  setActiveView,
  setServerConnectionState,
  setServerConnectionMessage,
  setOnboardingVisible,
  shouldDefaultToSettingsViewFn = shouldDefaultToSettingsView,
  shouldShowOnboardingFn = shouldShowOnboarding,
}) {
  const state = getState();
  const isMobileLike = isNativeApp() || (matchMedia?.("(max-width: 720px)")?.matches ?? false);
  const shouldShow = shouldShowOnboardingFn({
    dismissed: state.onboardingDismissed,
    serverBaseUrl: state.serverBaseUrl,
    recentConnections: state.recentConnections,
  });

  if (
    shouldDefaultToSettingsViewFn({
      isMobileLike,
      serverBaseUrl: state.serverBaseUrl,
    })
  ) {
    setActiveView("settings");
    setServerConnectionState("idle");
    setServerConnectionMessage("请先在设置页完成节点接入。");
  }

  const useInlineFallback = shouldShow && isMobileLike;
  if (useInlineFallback) {
    setOnboardingVisible(false);
    return;
  }

  setOnboardingVisible(shouldShow);
}
