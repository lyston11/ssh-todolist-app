const ONBOARDING_DISMISSED_STORAGE_KEY = "focus-list.onboarding-dismissed";

export function loadOnboardingDismissed() {
  return localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY) === "1";
}

export function saveOnboardingDismissed(dismissed) {
  if (dismissed) {
    localStorage.setItem(ONBOARDING_DISMISSED_STORAGE_KEY, "1");
    return;
  }
  localStorage.removeItem(ONBOARDING_DISMISSED_STORAGE_KEY);
}

export function shouldShowOnboarding({ dismissed, serverBaseUrl, recentConnections }) {
  if (dismissed) {
    return false;
  }
  if (String(serverBaseUrl ?? "").trim()) {
    return false;
  }
  if (Array.isArray(recentConnections) && recentConnections.length > 0) {
    return false;
  }
  return true;
}

export function shouldDefaultToSettingsView({ isMobileLike, serverBaseUrl }) {
  if (!isMobileLike) {
    return false;
  }
  return !String(serverBaseUrl ?? "").trim();
}
