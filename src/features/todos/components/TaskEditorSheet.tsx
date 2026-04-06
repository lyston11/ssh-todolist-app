import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
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
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [open]);

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
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-md rounded-t-[32px] border-t border-white/10 bg-[#1A1A1A] p-8"
          >
            <div className="mx-auto mb-8 h-1.5 w-12 rounded-full bg-white/10" />
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">任务内容</label>
                <input
                  autoFocus
                  value={taskInput}
                  onChange={(event) => setTaskInput(event.target.value)}
                  placeholder="今天要做什么？"
                  className="h-16 w-full rounded-2xl border border-white/10 bg-white/5 px-6 text-lg text-white outline-none transition-all placeholder:text-slate-600 focus:border-emerald-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">任务分类</label>
                <div className="flex flex-wrap gap-2">
                  {availableTaskTags.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setTaskTagInput(tag)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        taskTagInput === tag
                          ? 'bg-emerald-500 text-black'
                          : 'border border-white/5 bg-white/5 text-slate-500'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">所属清单</label>
                <div className="flex flex-wrap gap-2">
                  {lists.map((todoList) => (
                    <button
                      type="button"
                      key={todoList.id}
                      onClick={() => setTaskListId(todoList.id)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        taskListId === todoList.id
                          ? 'bg-white text-black'
                          : 'border border-white/5 bg-white/5 text-slate-500'
                      }`}
                    >
                      {todoList.title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">截止日期</label>
                  {taskDueDateInput && (
                    <button
                      type="button"
                      onClick={() => setTaskDueDateInput('')}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-rose-400"
                    >
                      清空
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={taskDueDateInput}
                  onChange={(event) => setTaskDueDateInput(event.target.value)}
                  className="h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-all [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
              <div className="flex gap-3 pt-4">
                {editingTask && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="h-14 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-6 text-rose-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!taskInput.trim()}
                  className="h-14 flex-1 rounded-2xl bg-emerald-500 font-bold text-black shadow-lg shadow-emerald-500/20 disabled:cursor-not-allowed disabled:bg-emerald-500/40 disabled:text-black/60 disabled:shadow-none"
                >
                  保存任务
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
