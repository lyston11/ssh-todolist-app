import type { TodoList } from '../types/api.ts';
import type { RecentNode } from './storage.ts';

export const LOCAL_WORKSPACE_KEY = 'local://device';
export const LOCAL_WORKSPACE_NAME = '本地离线空间';
export const LOCAL_DEFAULT_LIST_ID = 'local-default-list';

export function createLocalNode(): RecentNode {
  return {
    id: 'local-device',
    kind: 'local',
    name: LOCAL_WORKSPACE_NAME,
    ip: LOCAL_WORKSPACE_KEY,
    lastUsed: new Date().toISOString(),
    status: 'offline',
    latency: '-',
    hasToken: false,
    authRequired: false,
  };
}

export function isLocalNode(node: Pick<RecentNode, 'kind' | 'ip'> | null | undefined): boolean {
  if (!node) {
    return false;
  }
  return node.kind === 'local' || node.ip === LOCAL_WORKSPACE_KEY;
}

export function createDefaultLocalList(now: number = Date.now()): TodoList {
  return {
    id: LOCAL_DEFAULT_LIST_ID,
    title: '默认清单',
    createdAt: now,
    updatedAt: now,
  };
}

export function getNodeAddressLabel(node: RecentNode | null | undefined): string {
  if (!node) {
    return '等待配置同步节点';
  }
  if (isLocalNode(node)) {
    return '仅保存在当前设备';
  }
  return node.ip;
}

export function getNodeStatusLabel(node: RecentNode | null | undefined, status: string): string {
  if (isLocalNode(node)) {
    return 'Local Workspace';
  }
  if (status === 'online') {
    return `${node?.name || 'active-node'} · Connected`;
  }
  return 'Disconnected';
}
