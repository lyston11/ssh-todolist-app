import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { apiClient } from '../api/client.ts';
import type { ConnectionStatus, PendingAction, PendingActionData, TodoItem, TodoList } from '../types/api.ts';
import { createEntityId, normalizeList, normalizeTodo } from './todoModels.ts';

interface UseTodoMutationsOptions {
  lists: TodoList[];
  items: TodoItem[];
  activeListId: string;
  localMode: boolean;
  status: ConnectionStatus;
  setLists: Dispatch<SetStateAction<TodoList[]>>;
  setItems: Dispatch<SetStateAction<TodoItem[]>>;
  setActiveListId: Dispatch<SetStateAction<string>>;
  addPendingAction: (type: PendingAction['type'], entityId?: string, data?: PendingActionData) => void;
}

export function useTodoMutations({
  lists,
  items,
  activeListId,
  localMode,
  status,
  setLists,
  setItems,
  setActiveListId,
  addPendingAction,
}: UseTodoMutationsOptions) {
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
      updatedAt: Date.now(),
    });

    setLists((previousLists) => [...previousLists, optimisticList]);
    setActiveListId((currentActiveListId) => currentActiveListId || optimisticList.id);

    if (status !== 'online') {
      addPendingAction('create-list', optimisticList.id, optimisticList);
      return;
    }

    try {
      const createdList = normalizeList(await apiClient.createList(trimmedTitle, optimisticList.id));
      setLists((previousLists) => previousLists.map((todoList) => (todoList.id === optimisticList.id ? createdList : todoList)));
    } catch {
      addPendingAction('create-list', optimisticList.id, optimisticList);
    }
  }, [addPendingAction, setActiveListId, setLists, status]);

  const updateList = useCallback(async (id: string, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    setLists((previousLists) =>
      previousLists.map((todoList) =>
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
      setLists((previousLists) => previousLists.map((todoList) => (todoList.id === id ? updatedList : todoList)));
    } catch {
      addPendingAction('update-list', id, { title: trimmedTitle });
    }
  }, [addPendingAction, setLists, status]);

  const deleteList = useCallback(async (id: string) => {
    if (lists.length <= 1) {
      throw new Error('至少保留一个清单');
    }

    setLists((previousLists) => previousLists.filter((todoList) => todoList.id !== id));
    setItems((previousItems) => previousItems.filter((todo) => todo.listId !== id));
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
  }, [addPendingAction, lists, setActiveListId, setItems, setLists, status]);

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
      isSynced: localMode,
    };

    setItems((previousItems) => [optimisticTodo, ...previousItems]);

    if (status !== 'online') {
      addPendingAction('create', optimisticTodo.id, optimisticTodo);
      return;
    }

    try {
      const createdTodo = normalizeTodo({
        ...(await apiClient.createTodo(optimisticTodo)),
        isSynced: true,
        isPending: false,
      });
      setItems((previousItems) => previousItems.map((todo) => (todo.id === optimisticTodo.id ? createdTodo : todo)));
    } catch {
      addPendingAction('create', optimisticTodo.id, optimisticTodo);
    }
  }, [activeListId, addPendingAction, lists, localMode, setItems, status]);

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

    setItems((previousItems) =>
      previousItems.map((todo) =>
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
      const updatedTodo = normalizeTodo({
        ...(await apiClient.updateTodo(id, normalizedUpdates)),
        isSynced: true,
        isPending: false,
      });
      setItems((previousItems) => previousItems.map((todo) => (todo.id === id ? updatedTodo : todo)));
    } catch {
      addPendingAction('update', id, normalizedUpdates);
    }
  }, [addPendingAction, localMode, setItems, status]);

  const deleteTodo = useCallback(async (id: string) => {
    setItems((previousItems) => previousItems.filter((todo) => todo.id !== id));

    if (status !== 'online') {
      addPendingAction('delete', id);
      return;
    }

    try {
      await apiClient.deleteTodo(id);
    } catch {
      addPendingAction('delete', id);
    }
  }, [addPendingAction, setItems, status]);

  const clearCompleted = useCallback(async (listId?: string) => {
    setItems((previousItems) => previousItems.filter((todo) => {
      if (!todo.completed) {
        return true;
      }
      if (!listId) {
        return false;
      }
      return todo.listId !== listId;
    }));

    if (status !== 'online') {
      addPendingAction('clear-completed', undefined, listId ? { listId } : undefined);
      return;
    }

    try {
      await apiClient.clearCompleted(listId);
    } catch {
      addPendingAction('clear-completed', undefined, listId ? { listId } : undefined);
    }
  }, [addPendingAction, setItems, status]);

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

  return {
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
  };
}
