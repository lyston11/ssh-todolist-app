import React, { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { BottomSheet } from '../../../components/BottomSheet';
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
    <BottomSheet
      open={open}
      onClose={onClose}
      title="清单管理"
      description="新增、重命名和删除任务清单，同时指定当前清单。"
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          <input
            value={newListTitle}
            onChange={(event) => setNewListTitle(event.target.value)}
            placeholder="新清单名称"
            className="h-10 flex-1 rounded-lg border border-white/10 bg-[#1d2126] px-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-400/40"
          />
          <button
            onClick={handleCreate}
            disabled={isCreating || !newListTitle.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-medium text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
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
                className={`rounded-lg border p-3 transition-colors ${
                  activeListId === todoList.id
                    ? 'border-emerald-400/40 bg-emerald-500/10'
                    : 'border-white/10 bg-[#1c2025]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isEditing ? (
                    <div className="flex flex-1 flex-col items-start text-left">
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        className="h-10 w-full rounded-md border border-white/10 bg-[#111315] px-3 text-sm font-medium text-white outline-none transition-colors focus:border-emerald-400/40"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => onSelectList(todoList.id)}
                      className="flex flex-1 flex-col items-start text-left"
                    >
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{todoList.title}</span>
                          {activeListId === todoList.id && (
                            <span className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                              当前清单
                            </span>
                          )}
                        </div>
                        <span className="mt-1 text-xs text-slate-400">点击切换到这个清单</span>
                      </>
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <button
                        onClick={() => void handleRename(todoList.id)}
                        disabled={isBusy || !editingTitle.trim()}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-emerald-300 transition-colors hover:bg-white/5 disabled:opacity-40"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingListId(todoList.id);
                          setEditingTitle(todoList.title);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => void handleDelete(todoList.id)}
                      disabled={!canDelete || isBusy}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-400/20 text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
};
