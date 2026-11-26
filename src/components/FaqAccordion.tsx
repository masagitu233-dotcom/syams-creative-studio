import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { FAQ_CATEGORY_LABELS } from '../utils/studioLogic';
import type { FaqItem } from '../types/studio';

interface FaqAccordionProps {
  items: FaqItem[];
  showCategoryMeta?: boolean;
}

export function FaqAccordion({ items, showCategoryMeta = false }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  if (items.length === 0) {
    return (
      <div className="nb-card p-6 text-center">
        <p className="font-display font-semibold text-sm text-[#171717]">
          Belum ada pertanyaan untuk kategori ini.
        </p>
        <p className="text-xs text-[#525252] mt-1">
          Silakan hubungi tim kami melalui halaman Kontak apabila Anda memiliki pertanyaan khusus.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className="bg-white border-2 border-[#171717] rounded-[4px] nb-shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              className="w-full text-left px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-[#F8F8E1]/60 transition-colors cursor-pointer"
            >
              <div className="space-y-0.5 min-w-0">
                {showCategoryMeta && (
                  <p className="text-[11px] font-medium text-[#525252]">
                    {String(idx + 1).padStart(2, '0')} · {FAQ_CATEGORY_LABELS[item.category]}
                  </p>
                )}
                <span className="font-display font-semibold text-sm sm:text-[15px] text-[#171717] block leading-snug">
                  {item.question}
                </span>
              </div>
              <span
                className={`w-7 h-7 shrink-0 border-2 border-[#171717] rounded-[2px] flex items-center justify-center transition-colors ${
                  isOpen ? 'bg-[#0F3D3A] text-[#F8F8E1]' : 'bg-[#F3C95B] text-[#171717]'
                }`}
                aria-hidden="true"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 sm:px-5 sm:pb-4 pt-2.5 border-t border-[#171717]/15 text-xs sm:text-sm leading-relaxed text-[#333333]">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
