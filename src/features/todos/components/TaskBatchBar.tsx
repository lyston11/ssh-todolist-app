import React from 'react';
import { motion } from 'motion/react';
import { Check, Tag, Trash2, X } from 'lucide-react';

interface TaskBatchBarProps {
  selectedCount: number;
  onComplete: () => void;
  onMove: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export const TaskBatchBar: React.FC<TaskBatchBarProps> = ({
  selectedCount,
  onComplete,
  onMove,
  onDelete,
  onCancel
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#111315]"
    >
      <div className="mx-auto flex w-full max-w-[520px] items-center gap-2 px-4 py-3">
        <button
          onClick={onCancel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white">已选中 {selectedCount} 项任务</div>
          <div className="text-xs text-slate-400">可批量完成、移动或删除</div>
        </div>
        <button
          onClick={onComplete}
          disabled={selectedCount === 0}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-white/10 px-3 text-sm text-emerald-300 transition-colors hover:bg-white/5 disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          完成
        </button>
        <button
          onClick={onMove}
          disabled={selectedCount === 0}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-white/10 px-3 text-sm text-slate-200 transition-colors hover:bg-white/5 disabled:opacity-40"
        >
          <Tag className="h-4 w-4" />
          移动
        </button>
        <button
          onClick={onDelete}
          disabled={selectedCount === 0}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-rose-400/20 px-3 text-sm text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          删除
        </button>
      </div>
    </motion.div>
  );
};
