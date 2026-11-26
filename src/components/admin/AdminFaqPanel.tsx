import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { deleteFaqByAdmin, saveFaqByAdmin } from '../../services/firestoreService';
import { formatUserFriendlyError } from '../../lib/firestoreErrors';
import { FAQ_CATEGORY_LABELS } from '../../utils/studioLogic';
import { ConfirmDialog } from '../ConfirmDialog';
import type { FaqCategory, FaqItem } from '../../types/studio';

interface AdminFaqPanelProps {
  faqs: FaqItem[];
  actor: { uid: string; email: string };
  onRefresh: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

const EMPTY_FAQ = {
  id: '',
  question: '',
  answer: '',
  category: 'pemesanan' as FaqCategory,
  sortOrder: 1,
  isPublished: true,
};

export function AdminFaqPanel({ faqs, actor, onRefresh, onToast }: AdminFaqPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FAQ);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openNew() {
    setForm({ ...EMPTY_FAQ, sortOrder: faqs.length + 1 });
    setFormOpen(true);
  }

  function openEdit(faq: FaqItem) {
    setForm({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      sortOrder: faq.sortOrder,
      isPublished: faq.isPublished,
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.question.trim().length < 5 || form.answer.trim().length < 10) {
      onToast({
        type: 'error',
        title: 'FAQ Belum Lengkap',
        description: 'Pertanyaan minimal 5 karakter dan jawaban minimal 10 karakter.',
      });
      return;
    }

    setSaving(true);
    try {
      await saveFaqByAdmin(
        {
          id: form.id || undefined,
          question: form.question,
          answer: form.answer,
          category: form.category,
          sortOrder: Number(form.sortOrder),
          isPublished: form.isPublished,
        },
        actor
      );
      await onRefresh();
      setFormOpen(false);
      onToast({
        type: 'success',
        title: 'FAQ Tersimpan',
        description: 'Daftar FAQ telah diperbarui di Firestore.',
      });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menyimpan FAQ',
        description: formatUserFriendlyError(err, 'Gagal menyimpan FAQ.'),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFaqByAdmin(deleteTarget.id, deleteTarget.question, actor);
      await onRefresh();
      setDeleteTarget(null);
      onToast({ type: 'info', title: 'FAQ Dihapus' });
    } catch (err) {
      onToast({
        type: 'error',
        title: 'Gagal Menghapus FAQ',
        description: formatUserFriendlyError(err, 'Tidak dapat menghapus FAQ.'),
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">
            Manajemen FAQ
          </h2>
          <p className="text-xs sm:text-sm text-[#525252]">
            Perbarui pertanyaan umum yang tampil pada Beranda dan halaman FAQ.
          </p>
        </div>
        <button type="button" onClick={openNew} className="nb-btn nb-btn-primary px-3.5 py-2 text-xs sm:text-sm">
          <Plus className="w-4 h-4" />
          Tambah FAQ
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="nb-card p-5 space-y-3.5">
          <h3 className="font-display font-bold text-base text-[#171717]">
            {form.id ? 'Edit FAQ' : 'Tambah Pertanyaan Baru'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="faq-q" className="block text-xs font-bold">
                Pertanyaan *
              </label>
              <input
                id="faq-q"
                type="text"
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                className="nb-input text-sm"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="faq-cat" className="block text-xs font-bold">
                Kategori
              </label>
              <select
                id="faq-cat"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as FaqCategory }))}
                className="nb-input text-sm"
              >
                {Object.entries(FAQ_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="faq-a" className="block text-xs font-bold">
              Jawaban *
            </label>
            <textarea
              id="faq-a"
              rows={3}
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              className="nb-input text-sm"
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                className="w-4 h-4 accent-[#0F3D3A]"
              />
              Publikasikan
            </label>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="nb-btn nb-btn-surface px-3.5 py-2 text-xs sm:text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="nb-btn nb-btn-primary px-4 py-2 text-xs sm:text-sm"
              >
                {saving ? 'Menyimpan...' : 'Simpan FAQ'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {faqs.map((faq) => (
          <div key={faq.id} className="nb-card p-4 flex flex-col sm:flex-row justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] text-[#525252]">
                {FAQ_CATEGORY_LABELS[faq.category]} · {faq.isPublished ? 'Publik' : 'Draf'}
              </p>
              <h3 className="font-display font-bold text-sm sm:text-base text-[#171717]">
                {faq.question}
              </h3>
              <p className="text-xs sm:text-sm text-[#404040] leading-relaxed">{faq.answer}</p>
            </div>
            <div className="flex sm:flex-col items-end justify-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openEdit(faq)}
                className="nb-btn nb-btn-mustard px-2.5 py-1 text-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(faq)}
                aria-label={`Hapus FAQ ${faq.question}`}
                className="nb-btn nb-btn-surface p-1.5 text-[#6C151E]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus FAQ Ini?"
        description={
          deleteTarget ? `Pertanyaan "${deleteTarget.question}" akan dihapus permanen.` : ''
        }
        confirmLabel="Hapus FAQ"
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
