import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SnapshotResponse, TodoItem, TodoList } from '../types/api';
import { apiClient } from '../api/client';
import { realtimeSocket } from '../realtime/socket';
import { useConnection } from './ConnectionContext';
import { storage } from '../lib/storage';
import { useSyncQueue } from './useSyncQueue';
import { createDefaultLocalList, isLocalNode } from '../lib/nodes';

interface TodoContextType {
  lists: TodoList[];
  items: TodoItem[];
  activeListId: string;
  setActiveListId: (id: string) => void;
  createList: (title: string) => Promise<void>;
  updateList: (id: string, title: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  createTodo: (title: string, options?: { listId?: string; tag?: string; dueAt?: number | null }) => Promise<void>;
  updateTodo: (id: string, updates: Partial<TodoItem>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  batchComplete: (ids: string[]) => Promise<void>;
  moveTodos: (ids: string[], listId: string) => Promise<void>;
  batchDelete: (ids: string[]) => Promise<void>;
  isSyncing: boolean;
  pendingCount: number;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

function createEntityId() {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `item_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTodo(todo: TodoItem): TodoItem {
  return {
    ...todo,
    completed: Boolean(todo.completed),
    dueAt: typeof todo.dueAt === 'number' ? todo.dueAt : todo.dueAt ?? null,
    isSynced: todo.isSynced ?? true,
    isPending: todo.isPending ?? false
  };
}

function normalizeList(todoList: TodoList): TodoList {
  return {
    ...todoList,
    title: todoList.title?.trim() || '未命名清单'
  };
}

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, activeNode } = useConnection();
  const localMode = Boolean(activeNode && isLocalNode(activeNode));
  const [lists, setLists] = useState<TodoList[]>([]);
  const [items, setItems] = useState<TodoItem[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!activeNode) {
      setLists([]);
      setItems([]);
      setActiveListId('');
      return;
    }

    const cache = storage.getCache(activeNode.ip);
    if (cache) {
      const cachedLists = cache.lists.map(normalizeList);
      const nextLists = isLocalNode(activeNode) && cachedLists.length === 0
        ? [createDefaultLocalList()]
        : cachedLists;
      setLists(nextLists);
      setItems(cache.items.map(normalizeTodo));
      setActiveListId(cache.defaultListId || nextLists[0]?.id || '');
    } else {
      const defaultLists = isLocalNode(activeNode) ? [createDefaultLocalList()] : [];
      setLists(defaultLists);
      setItems([]);
      setActiveListId(defaultLists[0]?.id || '');
    }
  }, [activeNode]);

  useEffect(() => {
    if (!activeNode) {
      return;
    }

    storage.saveCache(activeNode.ip, {
      lists,
      items,
      defaultListId: activeListId || null,
      lastSnapshotTime: Date.now()
    });
  }, [activeNode, lists, items, activeListId]);

  useEffect(() => {
    if (lists.length === 0) {
      if (activeListId) {
        setActiveListId('');
      }
      return;
    }

    if (!lists.some((todoList) => todoList.id === activeListId)) {
      setActiveListId(lists[0].id);
    }
  }, [lists, activeListId]);

  const handleSnapshot = useCallback((snapshot: SnapshotResponse) => {
    const nextLists = snapshot.lists.map(normalizeList);
    setLists(nextLists);
    setItems(snapshot.items.map((item) => normalizeTodo({ ...item, isSynced: true, isPending: false })));
    setActiveListId((currentActiveListId) => {
      if (currentActiveListId && nextLists.some((todoList) => todoList.id === currentActiveListId)) {
        return currentActiveListId;
      }
      if (snapshot.defaultListId && nextLists.some((todoList) => todoList.id === snapshot.defaultListId)) {
        return snapshot.defaultListId;
      }
      return nextLists[0]?.id || '';
    });
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (status !== 'online') {
      return;
    }

    setIsSyncing(true);
    try {
      const snapshot = await apiClient.getSnapshot();
      handleSnapshot(snapshot);
    } catch (err) {
      console.error('Failed to fetch snapshot:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [status, handleSnapshot]);

  const { pendingActions, addPendingAction } = useSyncQueue({
    activeNode,
    status,
    fetchSnapshot,
    queueEnabled: Boolean(activeNode && !isLocalNode(activeNode)),
  });

  useEffect(() => {
    if (status !== 'online') {
      realtimeSocket.onMessage(() => {});
      return;
    }

    void fetchSnapshot();
    realtimeSocket.onMessage(handleSnapshot);

    return () => {
      realtimeSocket.onMessage(() => {});
    };
  }, [status, fetchSnapshot, handleSnapshot]);

  const createList = useCallback(async (title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const listId = createEntityId();
    const optimisticList = normalizeList({
      id: listId,
      title: trimmedTitle,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    setLists((prev) => [...prev, optimisticList]);
    setActiveListId((currentActiveListId) => currentActiveListId || optimisticList.id);

    if (status !== 'online') {
      addPendingAction('create-list', optimisticList.id, optimisticList);
      return;
    }

    try {
      const createdList = normalizeList(await apiClient.createList(trimmedTitle, optimisticList.id));
      setLists((prev) => prev.map((todoList) => (todoList.id === optimisticList.id ? createdList : todoList)));
    } catch {
      addPendingAction('create-list', optimisticList.id, optimisticList);
    }
  }, [status, addPendingAction]);

  const updateList = useCallback(async (id: string, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    setLists((prev) =>
      prev.map((todoList) =>
        todoList.id === id
          ? normalizeList({ ...todoList, title: trimmedTitle, updatedAt: Date.now() })
          : todoList,
      ),
    );

    if (status !== 'online') {
      addPendingAction('update-list', id, { title: trimmedTitle });
      return;
    }

    try {
      const updatedList = normalizeList(await apiClient.updateList(id, trimmedTitle));
      setLists((prev) => prev.map((todoList) => (todoList.id === id ? updatedList : todoList)));
    } catch {
      addPendingAction('update-list', id, { title: trimmedTitle });
    }
  }, [status, addPendingAction]);

  const deleteList = useCallback(async (id: string) => {
    if (lists.length <= 1) {
      throw new Error('至少保留一个清单');
    }

    setLists((prev) => {
      return prev.filter((todoList) => todoList.id !== id);
    });
    setItems((prev) => prev.filter((todo) => todo.listId !== id));
    setActiveListId((currentActiveListId) => {
      if (currentActiveListId !== id) {
        return currentActiveListId;
      }
      const remainingList = lists.find((todoList) => todoList.id !== id);
      return remainingList?.id || '';
    });

    if (status !== 'online') {
      addPendingAction('delete-list', id);
      return;
    }

    try {
      await apiClient.deleteList(id);
    } catch {
      addPendingAction('delete-list', id);
    }
  }, [lists, status, addPendingAction]);

  const createTodo = useCallback(async (title: string, options?: { listId?: string; tag?: string; dueAt?: number | null }) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const targetListId = options?.listId || activeListId || lists[0]?.id || '';
    const targetTag = options?.tag?.trim() || '';
    const targetDueAt = Object.prototype.hasOwnProperty.call(options || {}, 'dueAt')
      ? options?.dueAt ?? null
      : undefined;
    const optimisticId = createEntityId();
    const optimisticTodo: TodoItem = {
      id: optimisticId,
      title: trimmedTitle,
      listId: targetListId,
      tag: targetTag,
      dueAt: targetDueAt,
      completed: false,
      isPending: !localMode,
      isSynced: localMode
    };

    setItems((prev) => [optimisticTodo, ...prev]);

    if (status !== 'online') {
      addPendingAction('create', optimisticTodo.id, optimisticTodo);
      return;
    }

    try {
      const createdTodo = normalizeTodo({ ...(await apiClient.createTodo(optimisticTodo)), isSynced: true, isPending: false });
      setItems((prev) => prev.map((todo) => (todo.id === optimisticTodo.id ? createdTodo : todo)));
    } catch {
      addPendingAction('create', optimisticTodo.id, optimisticTodo);
    }
  }, [activeListId, lists, localMode, status, addPendingAction]);

  const updateTodo = useCallback(async (id: string, updates: Partial<TodoItem>) => {
    const normalizedUpdates: Partial<TodoItem> = {};
    if (typeof updates.title === 'string') {
      normalizedUpdates.title = updates.title.trim();
    }
    if (typeof updates.completed === 'boolean') {
      normalizedUpdates.completed = updates.completed;
    }
    if (typeof updates.listId === 'string') {
      normalizedUpdates.listId = updates.listId;
    }
    if (typeof updates.tag === 'string') {
      normalizedUpdates.tag = updates.tag.trim();
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'dueAt')) {
      normalizedUpdates.dueAt = updates.dueAt ?? null;
    }

    setItems((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? normalizeTodo({ ...todo, ...normalizedUpdates, isPending: !localMode, isSynced: localMode })
          : todo,
      ),
    );

    if (status !== 'online') {
      addPendingAction('update', id, normalizedUpdates);
      return;
    }

    try {
      const updatedTodo = normalizeTodo({ ...(await apiClient.updateTodo(id, normalizedUpdates)), isSynced: true, isPending: false });
      setItems((prev) => prev.map((todo) => (todo.id === id ? updatedTodo : todo)));
    } catch {
      addPendingAction('update', id, normalizedUpdates);
    }
  }, [localMode, status, addPendingAction]);

  const deleteTodo = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((todo) => todo.id !== id));

    if (status !== 'online') {
      addPendingAction('delete', id);
      return;
    }

    try {
      await apiClient.deleteTodo(id);
    } catch {
      addPendingAction('delete', id);
    }
  }, [status, addPendingAction]);

  const clearCompleted = useCallback(async () => {
    setItems((prev) => prev.filter((todo) => !todo.completed));

    if (status !== 'online') {
      addPendingAction('clear-completed');
      return;
    }

    try {
      await apiClient.clearCompleted();
    } catch {
      addPendingAction('clear-completed');
    }
  }, [status, addPendingAction]);

  const batchComplete = useCallback(async (ids: string[]) => {
    await Promise.all(
      ids.map((id) => {
        const target = items.find((todo) => todo.id === id);
        if (!target || target.completed) {
          return Promise.resolve();
        }
        return updateTodo(id, { completed: true });
      }),
    );
  }, [items, updateTodo]);

  const moveTodos = useCallback(async (ids: string[], listId: string) => {
    await Promise.all(
      ids.map((id) => {
        const target = items.find((todo) => todo.id === id);
        if (!target || target.listId === listId) {
          return Promise.resolve();
        }
        return updateTodo(id, { listId });
      }),
    );
  }, [items, updateTodo]);

  const batchDelete = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map((id) => deleteTodo(id)));
  }, [deleteTodo]);

  const value = useMemo(
    () => ({
      lists,
      items,
      activeListId,
      setActiveListId,
      createList,
      updateList,
      deleteList,
      createTodo,
      updateTodo,
      deleteTodo,
      clearCompleted,
      batchComplete,
      moveTodos,
      batchDelete,
      isSyncing,
      pendingCount: pendingActions.length
    }),
    [
      lists,
      items,
      activeListId,
      createList,
      updateList,
      deleteList,
      createTodo,
      updateTodo,
      deleteTodo,
      clearCompleted,
      batchComplete,
      moveTodos,
      batchDelete,
      isSyncing,
      pendingActions.length
    ],
  );

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};

export const useTodo = () => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodo must be used within TodoProvider');
  }
  return context;
};
