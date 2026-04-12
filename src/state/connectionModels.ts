import type { Candidate, ConnectCandidate, ConnectionStatus } from '../types/api.ts';
import type { RecentNode } from '../lib/storage.ts';
import type { SocketStatus } from '../realtime/socket.ts';

interface ResolveConnectionTokenOptions {
  explicitToken?: string;
  normalizedUrl: string;
  resolvedServerUrl: string;
  readStoredToken: (serverUrl: string) => string | null;
}

interface BuildRecentRemoteNodeOptions {
  id: string;
  serverUrl: string;
  hasToken: boolean;
  authRequired: boolean;
  lastUsed?: string;
}

export function mapConnectionCandidate(
  candidate: ConnectCandidate,
  authRequired: boolean,
  hasToken: boolean,
): Candidate {
  const url = new URL(candidate.serverUrl);
  const labelSource =
    candidate.kind === 'tailscale'
      ? 'Tailscale'
      : candidate.kind === 'lan'
        ? 'LAN'
        : candidate.kind === 'public'
          ? 'Public'
          : candidate.kind;

  return {
    id: `${candidate.kind}:${candidate.serverUrl}`,
    name: `${labelSource} · ${candidate.host}`,
    ip: candidate.host,
    serverUrl: candidate.serverUrl,
    wsUrl: candidate.wsUrl,
    kind: candidate.kind,
    source: candidate.source,
    status: authRequired && !hasToken ? 'needs-token' : 'connectable',
    latency: url.port ? `${url.port}` : undefined,
  };
}

export function mapSocketStatusToConnectionStatus(socketStatus: SocketStatus): ConnectionStatus {
  if (socketStatus === 'connected') {
    return 'online';
  }
  if (socketStatus === 'reconnecting') {
    return 'reconnecting';
  }
  if (socketStatus === 'error') {
    return 'node-unreachable';
  }
  return 'offline';
}

export function resolveConnectionToken({
  explicitToken,
  normalizedUrl,
  resolvedServerUrl,
  readStoredToken,
}: ResolveConnectionTokenOptions): string {
  const normalizedExplicitToken = explicitToken?.trim() || '';
  if (normalizedExplicitToken) {
    return normalizedExplicitToken;
  }

  return readStoredToken(resolvedServerUrl)?.trim()
    || readStoredToken(normalizedUrl)?.trim()
    || '';
}

export function buildRecentRemoteNode({
  id,
  serverUrl,
  hasToken,
  authRequired,
  lastUsed = new Date().toISOString(),
}: BuildRecentRemoteNodeOptions): RecentNode {
  return {
    id,
    kind: 'remote',
    name: new URL(serverUrl).hostname,
    ip: serverUrl,
    lastUsed,
    status: 'online',
    latency: '...',
    hasToken,
    authRequired,
  };
}
