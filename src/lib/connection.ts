import { DEFAULT_HTTP_PORT } from '../config/app.ts';

export function normalizeServerUrl(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error('请先填写节点地址');
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  const parsed = new URL(withScheme);

  if (!parsed.port) {
    parsed.port = parsed.protocol === 'https:' ? '443' : DEFAULT_HTTP_PORT;
  }

  return parsed.origin;
}
