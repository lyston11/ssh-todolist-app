import { useCallback, useEffect, useRef, useState } from 'react';
import type { SnapshotResponse, TodoItem, TodoList } from '../types/api.ts';
import { storage, type RecentNode } from '../lib/storage.ts';
import { buildInitialTodoState, buildSnapshotState, resolveActiveListId } from './todoModels.ts';

interface UseTodoStateStoreOptions {
  activeNode: RecentNode | null;
  localMode: boolean;
}

export function useTodoStateStore({ activeNode, localMode }: UseTodoStateStoreOptions) {
  const [lists, setLists] = useState<TodoList[]>([]);
  const [items, setItems] = useState<TodoItem[]>([]);
  const [activeListId, setActiveListId] = useState('');
  const activeListIdRef = useRef(activeListId);

  useEffect(() => {
    activeListIdRef.current = activeListId;
  }, [activeListId]);

  useEffect(() => {
    if (!activeNode) {
      setLists([]);
      setItems([]);
      setActiveListId('');
      return;
    }

    const nextState = buildInitialTodoState(storage.getCache(activeNode.ip), { localMode });
    setLists(nextState.lists);
    setItems(nextState.items);
    setActiveListId(nextState.activeListId);
  }, [activeNode, localMode]);

  useEffect(() => {
    if (!activeNode) {
      return;
    }

    storage.saveCache(activeNode.ip, {
      lists,
      items,
      defaultListId: activeListId || null,
      lastSnapshotTime: Date.now(),
    });
  }, [activeNode, lists, items, activeListId]);

  useEffect(() => {
    setActiveListId((currentActiveListId) => resolveActiveListId(lists, currentActiveListId));
  }, [lists]);

  const applySnapshot = useCallback((snapshot: SnapshotResponse) => {
    const nextState = buildSnapshotState(snapshot, activeListIdRef.current);
    setLists(nextState.lists);
    setItems(nextState.items);
    setActiveListId(nextState.activeListId);
  }, []);

  return {
    lists,
    items,
    activeListId,
    setLists,
    setItems,
    setActiveListId,
    applySnapshot,
  };
}
