import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useStudioData } from '../contexts/StudioDataContext';
import { FaqAccordion } from '../components/FaqAccordion';
import { SectionHeader } from '../components/SectionHeader';
import { Reveal } from '../components/Reveal';
import { FAQ_CATEGORY_LABELS } from '../utils/studioLogic';
import type { FaqCategory } from '../types/studio';

const FAQ_TABS: { value: FaqCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua Topik' },
  { value: 'pemesanan', label: FAQ_CATEGORY_LABELS.pemesanan },
  { value: 'harga', label: FAQ_CATEGORY_LABELS.harga },
  { value: 'revisi', label: FAQ_CATEGORY_LABELS.revisi },
  { value: 'teknis', label: FAQ_CATEGORY_LABELS.teknis },
];

export function FaqPage() {
  const { faqs, loadingFaqs } = useStudioData();
  const [category, setCategory] = useState<FaqCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return faqs.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
      );
    });
  }, [faqs, category, search]);

  return (
    <div className="nb-section">
      <div className="nb-container max-w-4xl space-y-6">
        <Reveal>
          <SectionHeader
            asPageTitle
            kicker="Pusat Bantuan & FAQ"
            title="Pertanyaan yang Sering Diajukan"
            subtitle="Jawaban ringkas seputar alur pemesanan, estimasi biaya, kebijakan revisi, hingga keamanan berkas."
          />
        </Reveal>

        <div className="nb-card p-3 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#525252] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="faq-search" className="sr-only">
              Cari pertanyaan FAQ
            </label>
            <input
              id="faq-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari topik pertanyaan (mis. revisi, pembayaran, estimasi)..."
              className="nb-input pl-9 text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter kategori FAQ">
            {FAQ_TABS.map((tab) => {
              const active = category === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(tab.value)}
                  className="nb-tab"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {loadingFaqs ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="nb-card h-16 animate-pulse bg-[#E5E5C7]/60" />
            ))}
          </div>
        ) : (
          <FaqAccordion items={filtered} showCategoryMeta />
        )}

        <div className="nb-card-cream p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
          <div className="space-y-0.5">
            <h2 className="font-display font-bold text-base text-[#171717]">
              Masih ada pertanyaan lain?
            </h2>
            <p className="text-xs sm:text-sm text-[#404040]">
              Tim SYAMS CREATIVE STUDIO siap membantu menjawab kebutuhan spesifik proyek Anda.
            </p>
          </div>
          <Link to="/kontak" className="nb-btn nb-btn-primary nb-btn-md w-full sm:w-auto shrink-0">
            Hubungi Kami
          </Link>
        </div>
      </div>
    </div>
  );
}
