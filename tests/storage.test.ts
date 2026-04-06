import assert from 'node:assert/strict';
import test from 'node:test';
import { storage, type RecentNode } from '../src/lib/storage.ts';

class LocalStorageMock {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const localStorageMock = new LocalStorageMock();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

function createRemoteNode(overrides: Partial<RecentNode> = {}): RecentNode {
  return {
    id: 'node-1',
    kind: 'remote',
    name: 'todo.example.com',
    ip: 'https://todo.example.com',
    lastUsed: '2026-04-06T10:00:00.000Z',
    status: 'online',
    latency: '8000',
    hasToken: true,
    authRequired: true,
    ...overrides,
  };
}

test('recent node token storage supports save/read/remove', () => {
  localStorageMock.clear();

  storage.saveRecentNodeToken('https://todo.example.com', 'secret-token');
  assert.equal(storage.getRecentNodeToken('https://todo.example.com'), 'secret-token');

  storage.removeRecentNodeToken('https://todo.example.com');
  assert.equal(storage.getRecentNodeToken('https://todo.example.com'), null);
});

test('getRecentNodes normalizes legacy entries and ignores local nodes', () => {
  localStorageMock.clear();
  localStorage.setItem('recent_nodes', JSON.stringify([
    {
      id: 'legacy-node',
      name: 'legacy.example.com',
      ip: 'https://legacy.example.com',
      lastUsed: '2026-04-06T10:00:00.000Z',
      status: 'online',
      latency: '8000',
      hasToken: false,
    },
    {
      id: 'local-node',
      kind: 'local',
      name: '本地离线空间',
      ip: 'local://device',
      lastUsed: '2026-04-06T10:00:00.000Z',
      status: 'offline',
      latency: '-',
      hasToken: false,
    },
  ]));

  const nodes = storage.getRecentNodes();

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].kind, 'remote');
  assert.equal(nodes[0].ip, 'https://legacy.example.com');
});

test('removeRecentNode also removes stored token', () => {
  localStorageMock.clear();
  const node = createRemoteNode();

  storage.saveRecentNode(node);
  storage.saveRecentNodeToken(node.ip, 'secret-token');
  storage.removeRecentNode(node.id);

  assert.equal(storage.getRecentNodes().length, 0);
  assert.equal(storage.getRecentNodeToken(node.ip), null);
});
