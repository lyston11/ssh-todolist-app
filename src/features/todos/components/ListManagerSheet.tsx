import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { TodoList } from '../../../types/api';

interface ListManagerSheetProps {
  open: boolean;
  lists: TodoList[];
  activeListId: string;
  onClose: () => void;
  onSelectList: (id: string) => void;
  onCreateList: (title: string) => Promise<void>;
  onRenameList: (id: string, title: string) => Promise<void>;
  onDeleteList: (id: string) => Promise<void>;
}

export const ListManagerSheet: React.FC<ListManagerSheetProps> = ({
  open,
  lists,
  activeListId,
  onClose,
  onSelectList,
  onCreateList,
  onRenameList,
  onDeleteList
}) => {
  const [newListTitle, setNewListTitle] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [busyListId, setBusyListId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewListTitle('');
      setEditingListId(null);
      setEditingTitle('');
      setBusyListId(null);
      setIsCreating(false);
    }
  }, [open]);

  const handleCreate = async () => {
    const trimmedTitle = newListTitle.trim();
    if (!trimmedTitle) {
      return;
    }

    setIsCreating(true);
    try {
      await onCreateList(trimmedTitle);
      setNewListTitle('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async (listId: string) => {
    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      return;
    }

    setBusyListId(listId);
    try {
      await onRenameList(listId, trimmedTitle);
      setEditingListId(null);
      setEditingTitle('');
    } finally {
      setBusyListId(null);
    }
  };

  const handleDelete = async (listId: string) => {
    setBusyListId(listId);
    try {
      await onDeleteList(listId);
      if (editingListId === listId) {
        setEditingListId(null);
        setEditingTitle('');
      }
    } finally {
      setBusyListId(null);
    }
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
            className="fixed bottom-0 left-0 right-0 z-[60] mx-auto w-full max-w-md rounded-t-[32px] border-t border-white/10 bg-[#1A1A1A] p-6 pb-10"
          >
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-white/10" />
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">清单管理</h3>
                <p className="mt-1 text-[11px] text-slate-500">新增、重命名和删除任务清单，同时指定当前清单。</p>
              </div>
              <button onClick={onClose} className="rounded-xl bg-white/5 p-2 text-slate-400 transition-colors hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 flex gap-3">
              <input
                value={newListTitle}
                onChange={(event) => setNewListTitle(event.target.value)}
                placeholder="新清单名称"
                className="h-14 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-emerald-500/40"
              />
              <button
                onClick={handleCreate}
                disabled={isCreating || !newListTitle.trim()}
                className="flex h-14 items-center gap-2 rounded-2xl bg-emerald-500 px-5 font-bold text-black transition-all disabled:opacity-50 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                新增
              </button>
            </div>

            <div className="space-y-3">
              {lists.map((todoList) => {
                const isEditing = editingListId === todoList.id;
                const isBusy = busyListId === todoList.id;
                const canDelete = lists.length > 1;
                return (
                  <div
                    key={todoList.id}
                    className={`rounded-[24px] border p-4 transition-all ${
                      activeListId === todoList.id
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-white/5 bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isEditing ? (
                        <div className="flex flex-1 flex-col items-start text-left">
                          <input
                            autoFocus
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white outline-none transition-all focus:border-emerald-500/40"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => onSelectList(todoList.id)}
                          className="flex flex-1 flex-col items-start text-left"
                        >
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{todoList.title}</span>
                              {activeListId === todoList.id && (
                                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-black">
                                  当前
                                </span>
                              )}
                            </div>
                              <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">List</span>
                            </>
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <button
                            onClick={() => void handleRename(todoList.id)}
                            disabled={isBusy || !editingTitle.trim()}
                            className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 transition-colors disabled:opacity-40"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingListId(todoList.id);
                              setEditingTitle(todoList.title);
                            }}
                            className="rounded-xl bg-white/5 p-2 text-slate-400 transition-colors hover:text-white"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => void handleDelete(todoList.id)}
                          disabled={!canDelete || isBusy}
                          className="rounded-xl bg-rose-500/10 p-2 text-rose-400 transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
