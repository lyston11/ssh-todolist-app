import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRecentRemoteNode,
  mapConnectionCandidate,
  mapSocketStatusToConnectionStatus,
  resolveConnectionToken,
} from '../src/state/connectionModels.ts';

test('mapConnectionCandidate marks token-required candidates correctly', () => {
  const candidate = mapConnectionCandidate(
    {
      kind: 'tailscale',
      source: 'request-host',
      host: '100.64.0.8',
      serverUrl: 'http://100.64.0.8:8000',
      wsUrl: 'ws://100.64.0.8:8001/ws',
    },
    true,
    false,
  );

  assert.equal(candidate.name, 'Tailscale · 100.64.0.8');
  assert.equal(candidate.status, 'needs-token');
  assert.equal(candidate.latency, '8000');
});

test('mapSocketStatusToConnectionStatus keeps realtime and app statuses aligned', () => {
  assert.equal(mapSocketStatusToConnectionStatus('connected'), 'online');
  assert.equal(mapSocketStatusToConnectionStatus('reconnecting'), 'reconnecting');
  assert.equal(mapSocketStatusToConnectionStatus('error'), 'node-unreachable');
  assert.equal(mapSocketStatusToConnectionStatus('disconnected'), 'offline');
});

test('resolveConnectionToken prefers explicit token over stored values', () => {
  const stored = new Map<string, string>([
    ['http://100.64.0.8:8000', 'normalized-token'],
    ['http://todo.example.com:8000', 'resolved-token'],
  ]);

  const resolved = resolveConnectionToken({
    explicitToken: 'manual-token',
    normalizedUrl: 'http://100.64.0.8:8000',
    resolvedServerUrl: 'http://todo.example.com:8000',
    readStoredToken: (serverUrl) => stored.get(serverUrl) || null,
  });

  assert.equal(resolved, 'manual-token');
});

test('resolveConnectionToken falls back to resolved server token before normalized url token', () => {
  const stored = new Map<string, string>([
    ['http://100.64.0.8:8000', 'normalized-token'],
    ['http://todo.example.com:8000', 'resolved-token'],
  ]);

  const resolved = resolveConnectionToken({
    normalizedUrl: 'http://100.64.0.8:8000',
    resolvedServerUrl: 'http://todo.example.com:8000',
    readStoredToken: (serverUrl) => stored.get(serverUrl) || null,
  });

  assert.equal(resolved, 'resolved-token');
});

test('buildRecentRemoteNode creates a stable recent-node payload for remote services', () => {
  const node = buildRecentRemoteNode({
    id: 'node-1',
    serverUrl: 'http://todo.example.com:8000',
    hasToken: true,
    authRequired: true,
    lastUsed: '2026-04-11T10:00:00.000Z',
  });

  assert.deepEqual(node, {
    id: 'node-1',
    kind: 'remote',
    name: 'todo.example.com',
    ip: 'http://todo.example.com:8000',
    lastUsed: '2026-04-11T10:00:00.000Z',
    status: 'online',
    latency: '...',
    hasToken: true,
    authRequired: true,
  });
});

