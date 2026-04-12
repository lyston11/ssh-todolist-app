import React from 'react';
import { ArrowRight } from 'lucide-react';
import { BottomSheet } from '../../../components/BottomSheet';
import { TodoList } from '../../../types/api';

interface TaskMoveSheetProps {
  open: boolean;
  lists: TodoList[];
  onClose: () => void;
  onMove: (listId: string) => void;
}

export const TaskMoveSheet: React.FC<TaskMoveSheetProps> = ({ open, lists, onClose, onMove }) => {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="移动到清单"
      description="选择目标清单后立即执行移动。"
    >
      <div className="grid grid-cols-1 gap-2">
        {lists.map((todoList) => (
          <button
            key={todoList.id}
            onClick={() => onMove(todoList.id)}
            className="group flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#1c2025] px-4 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            {todoList.title}
            <ArrowRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-emerald-300" />
          </button>
        ))}
      </div>
    </BottomSheet>
  );
};
