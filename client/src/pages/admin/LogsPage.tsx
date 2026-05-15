import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { AuditLog } from '@/lib/types';

interface LogsResp {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

export default function LogsPage() {
  const toast = useToast();
  const { t } = useTranslation('admin');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<LogsResp>('/admin/audit-logs', { params: { page, limit: PAGE_SIZE } })
      .then((r) => {
        setLogs(r.data.logs);
        setTotalPages(r.data.totalPages);
      })
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div>
      <h1 className="page-title mb-5">{t('logs.title')}</h1>
      {loading ? (
        <div className="card text-center py-10">
          <Spinner />
        </div>
      ) : logs.length === 0 ? (
        <div className="card">
          <EmptyState icon={Activity} title={t('logs.no_logs')} description={t('logs.description')} />
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">{t('logs.when')}</th>
                <th className="text-left px-5 py-3">{t('logs.who')}</th>
                <th className="text-left px-5 py-3">{t('logs.action_col')}</th>
                <th className="text-left px-5 py-3">{t('logs.entity_col')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="table-row hover:bg-surface/50">
                  <td className="px-5 py-3 text-muted whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{l.user?.fullName ?? '—'}</p>
                    <p className="text-xs text-muted">{l.user?.email}</p>
                  </td>
                  <td className="px-5 py-3"><code className="text-xs">{l.action}</code></td>
                  <td className="px-5 py-3 text-muted">
                    <code className="text-xs">{l.entityType}</code>
                    <span className="text-muted/70"> · {l.entityId.slice(0, 8)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-line flex items-center justify-end gap-2 text-sm">
            <button
              className="btn-outline btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              {t('logs.previous')}
            </button>
            <span className="text-muted">
              {page} / {totalPages}
            </span>
            <button
              className="btn-outline btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              {t('logs.next_page')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
