import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { TodoList } from '../../../types/api';

interface TaskMoveSheetProps {
  open: boolean;
  lists: TodoList[];
  onClose: () => void;
  onMove: (listId: string) => void;
}

export const TaskMoveSheet: React.FC<TaskMoveSheetProps> = ({ open, lists, onClose, onMove }) => {
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
            className="fixed bottom-0 left-0 right-0 z-[60] mx-auto w-full max-w-md rounded-t-[32px] border-t border-white/10 bg-[#1A1A1A] p-6 pb-10"
          >
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-white/10" />
            <h3 className="mb-6 text-lg font-bold text-white">移动到清单</h3>
            <div className="grid grid-cols-1 gap-2">
              {lists.map((todoList) => (
                <button
                  key={todoList.id}
                  onClick={() => onMove(todoList.id)}
                  className="group flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 text-left text-sm font-medium text-white transition-all hover:bg-emerald-500/10"
                >
                  {todoList.title}
                  <ArrowRight className="h-4 w-4 text-slate-600 transition-colors group-hover:text-emerald-500" />
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
