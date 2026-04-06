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
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-0 left-0 right-0 z-40 mx-auto flex w-full max-w-md items-center gap-3 border-t border-white/10 bg-[#1A1A1A] px-4 py-4 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
    >
      <button
        onClick={onCancel}
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 transition-all active:scale-95"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="flex-1 space-y-1">
        <div className="text-xs font-bold text-white">已选中 {selectedCount} 项任务</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Batch Actions</div>
      </div>
      <div className="flex flex-[1.6] gap-2">
        <button
          onClick={onComplete}
          disabled={selectedCount === 0}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-white/5 bg-white/5 p-2 text-emerald-500 transition-all disabled:opacity-20 active:scale-95"
        >
          <Check className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">完成</span>
        </button>
        <button
          onClick={onMove}
          disabled={selectedCount === 0}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-white/5 bg-white/5 p-2 text-white transition-all disabled:opacity-20 active:scale-95"
        >
          <Tag className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">移动</span>
        </button>
        <button
          onClick={onDelete}
          disabled={selectedCount === 0}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-2 text-rose-500 transition-all disabled:opacity-20 active:scale-95"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-widest">删除</span>
        </button>
      </div>
    </motion.div>
  );
};
