import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  destructive = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={busy ? undefined : onCancel}
            className="fixed inset-0 bg-[#171717]/65"
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="relative z-10 bg-white border-2 border-[#171717] nb-shadow-lg rounded-[4px] max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 shrink-0 border-2 border-[#171717] rounded-[2px] flex items-center justify-center ${
                  destructive ? 'bg-[#6C151E] text-[#F8F8E1]' : 'bg-[#F3C95B] text-[#171717]'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <h2 id="confirm-dialog-title" className="font-display font-bold text-base sm:text-lg text-[#171717]">
                  {title}
                </h2>
                <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">{description}</p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={onCancel}
                className="nb-btn nb-btn-surface nb-btn-md w-full sm:w-auto"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className={`nb-btn nb-btn-md w-full sm:w-auto ${
                  destructive ? 'nb-btn-burgundy' : 'nb-btn-primary'
                }`}
              >
                {busy ? 'Memproses...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
