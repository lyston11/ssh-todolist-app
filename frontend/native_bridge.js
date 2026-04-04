import { Capacitor, registerPlugin } from "@capacitor/core";

const IncomingLink = registerPlugin("IncomingLink");
const DeviceBridge = registerPlugin("DeviceBridge");

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function getNativeLaunchUrl() {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const result = await IncomingLink.getLaunchUrl();
    return typeof result?.url === "string" && result.url.trim() ? result.url.trim() : null;
  } catch {
    return null;
  }
}

export function addIncomingLinkListener(callback) {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  let listenerHandle = null;
  let removed = false;

  IncomingLink.addListener("incomingLink", (payload) => {
    if (removed || typeof payload?.url !== "string" || !payload.url.trim()) {
      return;
    }
    callback(payload.url.trim());
  })
    .then((handle) => {
      if (removed) {
        handle.remove();
        return;
      }
      listenerHandle = handle;
    })
    .catch(() => {});

  return () => {
    removed = true;
    listenerHandle?.remove();
  };
}

export async function getNativeNetworkSnapshot() {
  if (!Capacitor.isNativePlatform()) {
    return {
      supported: false,
      interfaces: [],
      tailscale: [],
      lastUpdatedAt: Date.now(),
    };
  }

  try {
    const result = await DeviceBridge.getNetworkSnapshot();
    return {
      supported: true,
      interfaces: Array.isArray(result?.interfaces) ? result.interfaces : [],
      tailscale: Array.isArray(result?.tailscale) ? result.tailscale : [],
      lastUpdatedAt: Date.now(),
    };
  } catch {
    return {
      supported: false,
      interfaces: [],
      tailscale: [],
      lastUpdatedAt: Date.now(),
    };
  }
}

export async function scanNativeQrCode() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Native scanner is not supported on this platform");
  }

  try {
    const result = await DeviceBridge.scanQrCode();
    if (typeof result?.text === "string" && result.text.trim()) {
      return result.text.trim();
    }
    throw new Error("没有识别到二维码内容");
  } catch (error) {
    const message = typeof error?.message === "string" ? error.message : "";
    if (/cancel/i.test(message) || /取消/.test(message)) {
      throw new Error("已取消二维码扫描");
    }
    throw error;
  }
}
