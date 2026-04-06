import type { LocalCache, PendingAction } from '../types/api.ts';
import { buildScopedStorageKey } from './base64.ts';

export interface RecentNode {
  id: string;
  kind: 'local' | 'remote';
  name: string;
  ip: string;
  lastUsed: string;
  status: 'online' | 'offline' | 'syncing';
  latency: string;
  hasToken: boolean;
  authRequired?: boolean;
}

const RECENT_NODES_STORAGE_KEY = 'recent_nodes';
const RECENT_NODE_TOKEN_SCOPE = 'recent-node-token';

function normalizeRecentNode(node: Partial<RecentNode>): RecentNode | null {
  if (typeof node.ip !== 'string' || !node.ip.trim()) {
    return null;
  }

  return {
    id: typeof node.id === 'string' && node.id.trim() ? node.id : node.ip,
    kind: node.kind === 'local' ? 'local' : 'remote',
    name: typeof node.name === 'string' && node.name.trim() ? node.name : '未命名节点',
    ip: node.ip,
    lastUsed: typeof node.lastUsed === 'string' && node.lastUsed.trim() ? node.lastUsed : new Date().toISOString(),
    status: node.status === 'online' || node.status === 'syncing' ? node.status : 'offline',
    latency: typeof node.latency === 'string' ? node.latency : '-',
    hasToken: Boolean(node.hasToken),
    authRequired: Boolean(node.authRequired),
  };
}

function buildRecentNodeTokenStorageKey(serverUrl: string) {
  return buildScopedStorageKey(RECENT_NODE_TOKEN_SCOPE, serverUrl);
}

export const storage = {
  getRecentNodes: (): RecentNode[] => {
    const data = localStorage.getItem(RECENT_NODES_STORAGE_KEY);
    if (!data) {
      return [];
    }

    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => normalizeRecentNode(item))
        .filter((item): item is RecentNode => item !== null && item.kind === 'remote');
    } catch {
      return [];
    }
  },

  saveRecentNode: (node: RecentNode) => {
    if (node.kind !== 'remote') {
      return;
    }

    const nodes = storage.getRecentNodes();
    const existingIdx = nodes.findIndex(n => n.ip === node.ip);
    const newNode = normalizeRecentNode(node);
    if (!newNode) {
      return;
    }

    if (existingIdx >= 0) {
      nodes[existingIdx] = newNode;
    } else {
      nodes.unshift(newNode);
    }

    localStorage.setItem(RECENT_NODES_STORAGE_KEY, JSON.stringify(nodes.slice(0, 10)));
  },

  removeRecentNode: (id: string) => {
    const nodes = storage.getRecentNodes();
    const removedNode = nodes.find(n => n.id === id);
    const filtered = nodes.filter(n => n.id !== id);
    localStorage.setItem(RECENT_NODES_STORAGE_KEY, JSON.stringify(filtered));
    if (removedNode) {
      storage.removeRecentNodeToken(removedNode.ip);
    }
  },

  getRecentNodeToken: (serverUrl: string): string | null => {
    const key = buildRecentNodeTokenStorageKey(serverUrl);
    const token = localStorage.getItem(key);
    if (!token) {
      return null;
    }

    const trimmed = token.trim();
    return trimmed || null;
  },

  saveRecentNodeToken: (serverUrl: string, token: string | null | undefined) => {
    const key = buildRecentNodeTokenStorageKey(serverUrl);
    const normalized = token?.trim() || '';
    if (!normalized) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, normalized);
  },

  removeRecentNodeToken: (serverUrl: string) => {
    const key = buildRecentNodeTokenStorageKey(serverUrl);
    localStorage.removeItem(key);
  },

  // Isolated Cache
  getCache: (baseUrl: string): LocalCache | null => {
    const key = buildScopedStorageKey('cache', baseUrl);
    const data = localStorage.getItem(key);
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  saveCache: (baseUrl: string, cache: LocalCache) => {
    const key = buildScopedStorageKey('cache', baseUrl);
    localStorage.setItem(key, JSON.stringify(cache));
  },

  // Isolated Sync Queue
  getSyncQueue: (baseUrl: string): PendingAction[] => {
    const key = buildScopedStorageKey('queue', baseUrl);
    const data = localStorage.getItem(key);
    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveSyncQueue: (baseUrl: string, queue: PendingAction[]) => {
    const key = buildScopedStorageKey('queue', baseUrl);
    localStorage.setItem(key, JSON.stringify(queue));
  },

  addToSyncQueue: (baseUrl: string, action: PendingAction) => {
    const queue = storage.getSyncQueue(baseUrl);
    queue.push(action);
    storage.saveSyncQueue(baseUrl, queue);
  },

  clearSyncQueue: (baseUrl: string) => {
    const key = buildScopedStorageKey('queue', baseUrl);
    localStorage.removeItem(key);
  }
};
