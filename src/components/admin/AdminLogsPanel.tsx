import { useMemo, useState } from 'react';
import { formatDateTimeId } from '../../utils/studioLogic';
import type { ActivityLog } from '../../types/studio';

interface AdminLogsPanelProps {
  logs: ActivityLog[];
}

export function AdminLogsPanel({ logs }: AdminLogsPanelProps) {
  const [entityFilter, setEntityFilter] = useState<'all' | ActivityLog['entityType']>('all');

  const filtered = useMemo(() => {
    if (entityFilter === 'all') return logs;
    return logs.filter((log) => log.entityType === entityFilter);
  }, [logs, entityFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[#171717]">Activity Logs</h2>
          <p className="text-xs sm:text-sm text-[#525252]">
            Catatan audit append-only setiap perubahan pesanan, layanan, portofolio, media, FAQ,
            dan pengaturan website.
          </p>
        </div>

        <select
          aria-label="Filter tipe entitas log"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value as typeof entityFilter)}
          className="nb-input w-full sm:w-auto text-xs sm:text-sm"
        >
          <option value="all">Semua Entitas</option>
          <option value="order">Pesanan</option>
          <option value="service">Layanan</option>
          <option value="portfolio">Portofolio</option>
          <option value="media">Media Drive</option>
          <option value="faq">FAQ</option>
          <option value="site_settings">Pengaturan</option>
          <option value="contact">Kontak</option>
        </select>
      </div>

      <div className="nb-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs sm:text-sm text-[#525252]">
            Belum ada catatan aktivitas yang tersimpan di Firestore.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#F8F8E1] border-b-2 border-[#171717] text-[11px] font-display font-bold">
                  <th className="px-3.5 py-2.5">Waktu</th>
                  <th className="px-3.5 py-2.5">Aksi</th>
                  <th className="px-3.5 py-2.5">Entitas</th>
                  <th className="px-3.5 py-2.5">Ringkasan</th>
                  <th className="px-3.5 py-2.5">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171717]/15">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8F8E1]/40">
                    <td className="px-3.5 py-2.5 font-mono text-xs whitespace-nowrap text-[#525252]">
                      {formatDateTimeId(log.createdAt)}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-xs font-bold text-[#0F3D3A] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-3.5 py-2.5 text-xs font-mono whitespace-nowrap">
                      {log.entityType}
                    </td>
                    <td className="px-3.5 py-2.5 text-xs sm:text-sm text-[#171717]">{log.summary}</td>
                    <td className="px-3.5 py-2.5 text-xs text-[#525252]">{log.actorEmail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
