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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed left-1/2 top-1/2 z-[60] w-[85%] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-white/10 bg-[#1A1A1A] p-8 text-center shadow-2xl"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
              <Trash2 className="h-8 w-8 text-rose-500" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
            <p className="mb-8 text-sm leading-relaxed text-slate-500">{description}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onConfirm}
                className="h-14 w-full rounded-2xl bg-rose-500 font-bold text-white transition-all active:scale-95"
              >
                {confirmLabel}
              </button>
              <button
                onClick={onClose}
                className="h-14 w-full rounded-2xl bg-white/5 font-bold text-slate-400 transition-all active:scale-95"
              >
                取消
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
