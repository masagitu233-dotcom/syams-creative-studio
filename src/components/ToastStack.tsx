import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';

export function ToastStack() {
  const { toasts, dismissToast } = useStudioData();

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const styles =
            toast.type === 'success'
              ? 'bg-[#0F3D3A] text-[#F8F8E1]'
              : toast.type === 'error'
                ? 'bg-[#6C151E] text-[#F8F8E1]'
                : 'bg-[#F3C95B] text-[#171717]';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto border-2 border-[#171717] nb-shadow rounded-[4px] p-4 flex items-start gap-3 ${styles}`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#F3C95B]" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#F3C95B]" />}
              {toast.type === 'info' && <Info className="w-5 h-5 shrink-0 mt-0.5 text-[#171717]" />}
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm leading-snug">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs opacity-90 mt-1 leading-relaxed">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Tutup notifikasi"
                className="p-1 hover:opacity-75 transition-opacity shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
