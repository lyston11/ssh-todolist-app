import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client.ts';
import { storage } from '../lib/storage.ts';
import type { RecentNode } from '../lib/storage.ts';
import type { ConnectionStatus, PendingAction, PendingActionData, TodoItem, TodoList } from '../types/api.ts';

function createActionId() {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function executePendingAction(action: PendingAction) {
  switch (action.type) {
    case 'create':
      await apiClient.createTodo((action.data || {}) as Partial<TodoItem>);
      return;
    case 'update':
      if (!action.entityId) {
        return;
      }
      await apiClient.updateTodo(action.entityId, (action.data || {}) as Partial<TodoItem>);
      return;
    case 'delete':
      if (!action.entityId) {
        return;
      }
      await apiClient.deleteTodo(action.entityId);
      return;
    case 'clear-completed':
      await apiClient.clearCompleted();
      return;
    case 'create-list': {
      const listData = action.data as TodoList | undefined;
      if (!listData) {
        return;
      }
      await apiClient.createList(listData.title, listData.id);
      return;
    }
    case 'update-list': {
      if (!action.entityId) {
        return;
      }
      const listData = action.data as { title?: string } | undefined;
      await apiClient.updateList(action.entityId, listData?.title || '');
      return;
    }
    case 'delete-list':
      if (!action.entityId) {
        return;
      }
      await apiClient.deleteList(action.entityId);
      return;
    default:
      return;
  }
}

export async function flushPendingActions(
  queue: PendingAction[],
  executeAction: (action: PendingAction) => Promise<void>,
) {
  const remaining: PendingAction[] = [];

  for (const [index, action] of queue.entries()) {
    try {
      await executeAction(action);
    } catch (error) {
      remaining.push(action);
      if (error instanceof Error && error.message === 'AUTH_ERROR') {
        remaining.push(...queue.slice(index + 1));
        break;
      }
    }
  }

  return remaining;
}

interface UseSyncQueueOptions {
  activeNode: RecentNode | null;
  status: ConnectionStatus;
  fetchSnapshot: () => Promise<void>;
  queueEnabled: boolean;
}

export function useSyncQueue({ activeNode, status, fetchSnapshot, queueEnabled }: UseSyncQueueOptions) {
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const syncInProgress = useRef(false);

  const persistQueue = useCallback((nextQueue: PendingAction[]) => {
    if (activeNode && queueEnabled) {
      storage.saveSyncQueue(activeNode.ip, nextQueue);
    }
    setPendingActions(nextQueue);
  }, [activeNode, queueEnabled]);

  useEffect(() => {
    if (!activeNode || !queueEnabled) {
      setPendingActions([]);
      return;
    }

    setPendingActions(storage.getSyncQueue(activeNode.ip));
  }, [activeNode, queueEnabled]);

  const addPendingAction = useCallback((type: PendingAction['type'], entityId?: string, data?: PendingActionData) => {
    if (!activeNode || !queueEnabled) {
      return;
    }

    const action: PendingAction = {
      id: createActionId(),
      type,
      entityId,
      data,
      timestamp: Date.now(),
    };

    const nextQueue = [...storage.getSyncQueue(activeNode.ip), action];
    persistQueue(nextQueue);
  }, [activeNode, persistQueue, queueEnabled]);

  useEffect(() => {
    if (
      !queueEnabled
      || status !== 'online'
      || pendingActions.length === 0
      || syncInProgress.current
      || !activeNode
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      syncInProgress.current = true;
      const queue = [...pendingActions];
      const remaining = await flushPendingActions(queue, executePendingAction);

      persistQueue(remaining);
      syncInProgress.current = false;

      if (remaining.length === 0) {
        void fetchSnapshot();
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [activeNode, fetchSnapshot, pendingActions, persistQueue, queueEnabled, status]);

  return {
    pendingActions,
    addPendingAction,
  };
}
