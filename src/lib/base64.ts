function normalizeBase64(value: string) {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  return padded;
}

export function encodeUtf8Base64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function decodeUtf8Base64(value: string) {
  const normalized = normalizeBase64(value.trim());
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildScopedStorageKey(prefix: string, rawKey: string) {
  return `${prefix}_${encodeUtf8Base64(rawKey)}`;
}
