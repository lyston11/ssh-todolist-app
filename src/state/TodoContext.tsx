import React, { createContext, useContext, useMemo } from 'react';
import type { TodoItem, TodoList } from '../types/api';
import { isLocalNode } from '../lib/nodes';
import { useConnection } from './ConnectionContext';
import { useSyncQueue } from './useSyncQueue';
import { useTodoMutations } from './useTodoMutations';
import { useTodoSnapshotSync } from './useTodoSnapshotSync';
import { useTodoStateStore } from './useTodoStateStore';

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
  clearCompleted: (listId?: string) => Promise<void>;
  batchComplete: (ids: string[]) => Promise<void>;
  moveTodos: (ids: string[], listId: string) => Promise<void>;
  batchDelete: (ids: string[]) => Promise<void>;
  isSyncing: boolean;
  pendingCount: number;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, activeNode } = useConnection();
  const localMode = isLocalNode(activeNode);

  const {
    lists,
    items,
    activeListId,
    setLists,
    setItems,
    setActiveListId,
    applySnapshot,
  } = useTodoStateStore({
    activeNode,
    localMode,
  });

  const { isSyncing, fetchSnapshot } = useTodoSnapshotSync({
    status,
    applySnapshot,
  });

  const { pendingActions, addPendingAction } = useSyncQueue({
    activeNode,
    status,
    fetchSnapshot,
    queueEnabled: Boolean(activeNode && !localMode),
  });

  const {
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
  } = useTodoMutations({
    lists,
    items,
    activeListId,
    localMode,
    status,
    setLists,
    setItems,
    setActiveListId,
    addPendingAction,
  });

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
      pendingCount: pendingActions.length,
    }),
    [
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
      pendingActions.length,
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
