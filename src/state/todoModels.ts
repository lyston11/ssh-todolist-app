import type { LocalCache, SnapshotResponse, TodoItem, TodoList } from '../types/api.ts';
import { createDefaultLocalList } from '../lib/nodes.ts';

export function createEntityId() {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `item_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeTodo(todo: TodoItem): TodoItem {
  return {
    ...todo,
    completed: Boolean(todo.completed),
    dueAt: typeof todo.dueAt === 'number' ? todo.dueAt : todo.dueAt ?? null,
    isSynced: todo.isSynced ?? true,
    isPending: todo.isPending ?? false,
  };
}

export function normalizeList(todoList: TodoList): TodoList {
  return {
    ...todoList,
    title: todoList.title?.trim() || '未命名清单',
  };
}

export function resolveActiveListId(
  lists: TodoList[],
  currentActiveListId: string,
  preferredListId?: string | null,
) {
  if (lists.length === 0) {
    return '';
  }

  if (currentActiveListId && lists.some((todoList) => todoList.id === currentActiveListId)) {
    return currentActiveListId;
  }

  if (preferredListId && lists.some((todoList) => todoList.id === preferredListId)) {
    return preferredListId;
  }

  return lists[0]?.id || '';
}

export function buildInitialTodoState(cache: LocalCache | null, { localMode }: { localMode: boolean }) {
  const cachedLists = cache?.lists.map(normalizeList) || [];
  const nextLists = localMode && cachedLists.length === 0
    ? [createDefaultLocalList()]
    : cachedLists;

  return {
    lists: nextLists,
    items: (cache?.items || []).map(normalizeTodo),
    activeListId: resolveActiveListId(nextLists, cache?.defaultListId || ''),
  };
}

export function buildSnapshotState(snapshot: SnapshotResponse, currentActiveListId: string) {
  const nextLists = snapshot.lists.map(normalizeList);
  return {
    lists: nextLists,
    items: snapshot.items.map((item) => normalizeTodo({ ...item, isSynced: true, isPending: false })),
    activeListId: resolveActiveListId(nextLists, currentActiveListId, snapshot.defaultListId),
  };
}
