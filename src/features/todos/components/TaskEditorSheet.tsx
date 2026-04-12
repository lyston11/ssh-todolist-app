import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { BottomSheet } from '../../../components/BottomSheet';
import { TodoItem, TodoList } from '../../../types/api';
import { parseDateInputToTimestamp, toDateInputValue } from '../lib/dates';
import { TaskEditorDraft } from '../hooks/useTaskEditor';

interface TaskEditorSheetProps {
  open: boolean;
  editingTask: TodoItem | null;
  defaultListId: string;
  defaultTaskTag: string;
  availableTaskTags: string[];
  lists: TodoList[];
  onClose: () => void;
  onSave: (draft: TaskEditorDraft) => void | Promise<void>;
  onDelete: () => void;
}

export const TaskEditorSheet: React.FC<TaskEditorSheetProps> = ({
  open,
  editingTask,
  defaultListId,
  defaultTaskTag,
  availableTaskTags,
  lists,
  onClose,
  onSave,
  onDelete
}) => {
  const [taskInput, setTaskInput] = useState('');
  const [taskTagInput, setTaskTagInput] = useState(defaultTaskTag);
  const [taskListId, setTaskListId] = useState(defaultListId);
  const [taskDueDateInput, setTaskDueDateInput] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setTaskInput(editingTask?.title || '');
    setTaskTagInput(editingTask?.tag?.trim() || defaultTaskTag);
    setTaskListId(editingTask?.listId || defaultListId);
    setTaskDueDateInput(toDateInputValue(editingTask?.dueAt));
  }, [defaultListId, defaultTaskTag, editingTask, open]);

  useEffect(() => {
    if (!open || !lists.length) {
      return;
    }

    if (taskListId && lists.some((todoList) => todoList.id === taskListId)) {
      return;
    }

    setTaskListId(editingTask?.listId || defaultListId || lists[0].id);
  }, [defaultListId, editingTask, lists, open, taskListId]);

  const handleSave = () => {
    onSave({
      title: taskInput,
      tag: taskTagInput,
      listId: taskListId,
      dueAt: parseDateInputToTimestamp(taskDueDateInput),
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editingTask ? '编辑任务' : '新建任务'}
      description="填写标题、清单、分类和日期。"
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">任务内容</label>
          <input
            autoFocus
            value={taskInput}
            onChange={(event) => setTaskInput(event.target.value)}
            placeholder="今天要做什么？"
            className="h-12 w-full rounded-lg border border-white/10 bg-[#1d2126] px-4 text-base text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-400/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">任务分类</label>
          <div className="flex flex-wrap gap-2">
            {availableTaskTags.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => setTaskTagInput(tag)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  taskTagInput === tag
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">所属清单</label>
          <div className="flex flex-wrap gap-2">
            {lists.map((todoList) => (
              <button
                type="button"
                key={todoList.id}
                onClick={() => setTaskListId(todoList.id)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  taskListId === todoList.id
                    ? 'border-white/20 bg-white/10 text-white'
                    : 'border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                {todoList.title}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">截止日期</label>
            {taskDueDateInput && (
              <button
                type="button"
                onClick={() => setTaskDueDateInput('')}
                className="text-sm text-slate-400 transition-colors hover:text-rose-300"
              >
                清空
              </button>
            )}
          </div>
          <input
            type="date"
            value={taskDueDateInput}
            onChange={(event) => setTaskDueDateInput(event.target.value)}
            className="h-12 w-full rounded-lg border border-white/10 bg-[#1d2126] px-4 text-sm text-white outline-none transition-colors [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
        <div className="flex gap-3 pt-2">
          {editingTask && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-10 items-center justify-center rounded-md border border-rose-400/20 px-4 text-rose-300 transition-colors hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!taskInput.trim()}
            className="h-10 flex-1 rounded-md bg-emerald-500 text-sm font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 disabled:text-black/60"
          >
            保存任务
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
