import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Trash2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm
}) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed left-1/2 top-1/2 z-[60] w-[85%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-[#16181c] p-5"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
              <Trash2 className="h-5 w-5 text-rose-300" />
            </div>
            <h3 className="mb-2 text-left text-base font-semibold text-white">{title}</h3>
            <p className="mb-5 text-left text-sm leading-6 text-slate-400">{description}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="h-10 flex-1 rounded-md border border-white/10 text-sm text-slate-300 transition-colors hover:bg-white/5"
              >
                取消
              </button>
              <button
                onClick={onConfirm}
                className="h-10 flex-1 rounded-md bg-rose-500 text-sm font-medium text-white transition-colors hover:bg-rose-400"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
