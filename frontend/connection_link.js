const CONFIG_QUERY_KEYS = ["config", "config64"];
const SENSITIVE_QUERY_KEYS = ["config", "config64", "token"];

export function readIncomingConnectionLink(href = globalThis.location?.href ?? "") {
  if (!href) {
    return null;
  }

  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  const config = url.searchParams.get("config");
  if (config && config.trim()) {
    return {
      source: "config",
      rawValue: config.trim(),
    };
  }

  const config64 = url.searchParams.get("config64");
  if (!config64 || !config64.trim()) {
    return null;
  }

  try {
    return {
      source: "config64",
      rawValue: decodeBase64Url(config64.trim()),
    };
  } catch {
    return null;
  }
}

export function clearIncomingConnectionLink(currentHref = globalThis.location?.href ?? "") {
  clearConnectionQueryParams(currentHref, SENSITIVE_QUERY_KEYS);
}

export function clearSensitiveConnectionParams(currentHref = globalThis.location?.href ?? "") {
  clearConnectionQueryParams(currentHref, SENSITIVE_QUERY_KEYS);
}

function clearConnectionQueryParams(currentHref, keys) {
  if (!currentHref || typeof globalThis.history?.replaceState !== "function") {
    return;
  }

  let url;
  try {
    url = new URL(currentHref);
  } catch {
    return;
  }

  let changed = false;
  keys.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  });

  if (!changed) {
    return;
  }

  const nextSearch = url.searchParams.toString();
  const nextHref = `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${url.hash}`;
  globalThis.history.replaceState({}, "", nextHref);
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = `${normalized}${"=".repeat(paddingLength)}`;

  if (typeof globalThis.atob === "function") {
    return decodeURIComponent(
      Array.from(globalThis.atob(padded))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
  }

  return Buffer.from(padded, "base64").toString("utf8");
}
