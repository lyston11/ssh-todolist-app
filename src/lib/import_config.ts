import type { ConnectConfig } from '../types/api.ts';
import { decodeUtf8Base64 } from './base64.ts';

interface ImportedConfigAliases {
  serverUrl?: unknown;
  token?: unknown;
  authRequired?: unknown;
  wsUrl?: unknown;
  wsPort?: unknown;
  wsPath?: unknown;
  api?: unknown;
  apiToken?: unknown;
  url?: unknown;
  authToken?: unknown;
  config?: unknown;
  config64?: unknown;
  deepLinkUrl?: unknown;
  webImportUrl?: unknown;
  qrValue?: unknown;
}

const URL_IMPORT_PARAM_NAMES = ['config', 'config64'] as const;
const SENSITIVE_IMPORT_PARAM_NAMES = ['config', 'config64', 'token'] as const;
const IMPORT_URL_PATTERN = /(?:https?:\/\/|[a-z][a-z\d+\-.]*:\/\/)\S+/gi;

export function parseImportedConfig(rawValue: string): ConnectConfig {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error('配置内容为空');
  }

  if (trimmed.startsWith('{')) {
    return normalizeImportedObject(parseJson(trimmed));
  }

  const directImportFromUrl = tryParseImportUrl(trimmed);
  if (directImportFromUrl) {
    return directImportFromUrl;
  }

  const embeddedImportUrl = extractImportUrlFromText(trimmed);
  if (embeddedImportUrl) {
    return parseImportedConfig(embeddedImportUrl);
  }

  return normalizeImportedObject(parseJson(decodeUtf8Base64(trimmed)));
}

export function hasImportConfigInUrl(rawUrl: string): boolean {
  return tryReadImportParams(rawUrl) !== null;
}

export function stripSensitiveImportParams(rawUrl: string): string {
  try {
    const parsedUrl = new URL(rawUrl);
    let changed = false;

    SENSITIVE_IMPORT_PARAM_NAMES.forEach((name) => {
      if (parsedUrl.searchParams.has(name)) {
        parsedUrl.searchParams.delete(name);
        changed = true;
      }
    });

    if (!changed) {
      return rawUrl;
    }

    const search = parsedUrl.searchParams.toString();
    return `${parsedUrl.origin}${parsedUrl.pathname}${search ? `?${search}` : ''}${parsedUrl.hash}`;
  } catch {
    return rawUrl;
  }
}

function tryParseImportUrl(rawUrl: string): ConnectConfig | null {
  const importParams = tryReadImportParams(rawUrl);
  if (importParams === null) {
    return null;
  }

  if (typeof importParams.config64 === 'string' && importParams.config64.trim()) {
    return normalizeImportedObject(parseJson(decodeUtf8Base64(importParams.config64)));
  }

  if (typeof importParams.config === 'string' && importParams.config.trim()) {
    const configValue = importParams.config.trim();
    if (configValue.startsWith('{')) {
      return normalizeImportedObject(parseJson(configValue));
    }
    return normalizeImportedObject(parseJson(decodeUtf8Base64(configValue)));
  }

  return null;
}

function tryReadImportParams(rawUrl: string): { config?: string; config64?: string } | null {
  try {
    const parsedUrl = new URL(rawUrl);
    const found = URL_IMPORT_PARAM_NAMES.reduce<{ config?: string; config64?: string }>((result, name) => {
      const value = parsedUrl.searchParams.get(name);
      if (value) {
        result[name] = value;
      }
      return result;
    }, {});

    return Object.keys(found).length > 0 ? found : null;
  } catch {
    return null;
  }
}

function extractImportUrlFromText(rawValue: string): string | null {
  const matches = rawValue.match(IMPORT_URL_PATTERN) || [];
  for (const match of matches) {
    const normalizedCandidate = trimTrailingPunctuation(match);
    if (hasImportConfigInUrl(normalizedCandidate)) {
      return normalizedCandidate;
    }
  }
  return null;
}

function trimTrailingPunctuation(value: string): string {
  return value.replace(/[),.;]+$/g, '');
}

function normalizeImportedObject(payload: unknown): ConnectConfig {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('导入配置必须是 JSON 对象');
  }

  const candidate = payload as ImportedConfigAliases;

  if (typeof candidate.config64 === 'string' && candidate.config64.trim()) {
    return normalizeImportedObject(parseJson(decodeUtf8Base64(candidate.config64)));
  }

  if (typeof candidate.config === 'string' && candidate.config.trim()) {
    return parseImportedConfig(candidate.config);
  }

  const nestedImportValue = [candidate.deepLinkUrl, candidate.webImportUrl, candidate.qrValue]
    .find((value) => typeof value === 'string' && String(value).trim());
  if (typeof nestedImportValue === 'string' && hasImportConfigInUrl(nestedImportValue)) {
    return parseImportedConfig(nestedImportValue);
  }

  const serverUrl = pickString(candidate.serverUrl, candidate.api, candidate.url);
  if (!serverUrl) {
    throw new Error('配置缺少 serverUrl');
  }

  const wsPortValue = pickNumber(candidate.wsPort);

  return {
    serverUrl,
    token: pickString(candidate.token, candidate.apiToken, candidate.authToken),
    authRequired: Boolean(candidate.authRequired),
    wsUrl: pickString(candidate.wsUrl),
    wsPort: wsPortValue ?? 0,
    wsPath: pickString(candidate.wsPath) || '/ws',
  };
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
  }
  return null;
}

function parseJson(rawValue: string) {
  return JSON.parse(rawValue) as unknown;
}
