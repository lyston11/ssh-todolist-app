export function attachLifecycleHandlers({ onResume, onOnline, onOffline }) {
  let lastResumeAt = 0;

  const triggerResume = (reason) => {
    const now = Date.now();
    if (now - lastResumeAt < 1200) {
      return;
    }
    lastResumeAt = now;
    onResume(reason);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      triggerResume("foreground");
    }
  };

  const handleFocus = () => {
    triggerResume("focus");
  };

  const handlePageShow = () => {
    triggerResume("pageshow");
  };

  const handleOnline = () => {
    onOnline();
    triggerResume("online");
  };

  const handleOffline = () => {
    onOffline();
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleFocus);
  window.addEventListener("pageshow", handlePageShow);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("pageshow", handlePageShow);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
