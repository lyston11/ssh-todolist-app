import type { ConnectConfig } from '../types/api.ts';
import { decodeUtf8Base64 } from './base64.ts';

export function parseImportedConfig(rawValue: string): ConnectConfig {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error('配置内容为空');
  }

  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed) as ConnectConfig;
  }

  try {
    const parsedUrl = new URL(trimmed);
    const config64 = parsedUrl.searchParams.get('config64');
    if (config64) {
      return JSON.parse(decodeUtf8Base64(config64)) as ConnectConfig;
    }
  } catch {
    // Keep trying plain config64 below.
  }

  return JSON.parse(decodeUtf8Base64(trimmed)) as ConnectConfig;
}
