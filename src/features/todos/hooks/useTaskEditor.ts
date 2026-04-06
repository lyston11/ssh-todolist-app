import { useCallback, useMemo, useState } from 'react';
import { TodoItem, TodoList } from '../../../types/api';

const DEFAULT_TASK_TAG = '工作';

export interface TaskEditorDraft {
  title: string;
  tag: string;
  listId: string;
  dueAt: number | null;
}

interface UseTaskEditorOptions {
  activeListId: string;
  lists: TodoList[];
  createTodo: (title: string, options?: { listId?: string; tag?: string; dueAt?: number | null }) => Promise<void>;
  updateTodo: (id: string, updates: Partial<TodoItem>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export function useTaskEditor({
  activeListId,
  lists,
  createTodo,
  updateTodo,
  deleteTodo,
}: UseTaskEditorOptions) {
  const [isTaskEditorOpen, setIsTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TodoItem | null>(null);

  const defaultListId = useMemo(
    () => activeListId || lists[0]?.id || '',
    [activeListId, lists],
  );

  const closeTaskEditor = useCallback(() => {
    setIsTaskEditorOpen(false);
    setEditingTask(null);
  }, []);

  const openNewTask = useCallback(() => {
    setEditingTask(null);
    setIsTaskEditorOpen(true);
  }, []);

  const openEditTask = useCallback((task: TodoItem) => {
    setEditingTask(task);
    setIsTaskEditorOpen(true);
  }, []);

  const saveTask = useCallback(async (draft: TaskEditorDraft) => {
    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) {
      return;
    }

    if (editingTask) {
      await updateTodo(editingTask.id, {
        title: trimmedTitle,
        listId: draft.listId || editingTask.listId,
        tag: draft.tag,
        dueAt: draft.dueAt,
      });
    } else {
      await createTodo(trimmedTitle, {
        listId: draft.listId || defaultListId,
        tag: draft.tag,
        dueAt: draft.dueAt,
      });
    }

    closeTaskEditor();
  }, [closeTaskEditor, createTodo, defaultListId, editingTask, updateTodo]);

  const deleteCurrentTask = useCallback(async () => {
    if (!editingTask) {
      return;
    }

    await deleteTodo(editingTask.id);
    closeTaskEditor();
  }, [closeTaskEditor, deleteTodo, editingTask]);

  return {
    defaultListId,
    defaultTaskTag: DEFAULT_TASK_TAG,
    editingTask,
    isTaskEditorOpen,
    openNewTask,
    openEditTask,
    closeTaskEditor,
    saveTask,
    deleteCurrentTask,
  };
}
