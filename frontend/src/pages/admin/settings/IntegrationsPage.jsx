import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, PlugZap } from 'lucide-react';
import Button from '../../../components/ui/Button';
import { Badge, Card, ErrorState, PageHeader, PageLoader, StatusBadge } from '../../../components/ui/Primitives';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';

/** Integration status, connection tests and the transactional email log. */
export default function IntegrationsPage() {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', '/admin/integrations'], queryFn: async () => (await api.get('/admin/integrations')).data });
  const { data: emails } = useQuery({ queryKey: ['admin', '/admin/emails'], queryFn: () => api.get('/admin/emails', { query: { limit: 15 } }) });
  const [testing, setTesting] = useState(null);
  const [results, setResults] = useState({});

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const test = async (key) => {
    setTesting(key);
    try {
      const { data: r } = await api.post(`/admin/integrations/${key}/test`);
      setResults((x) => ({ ...x, [key]: r }));
      if (r.ok) toast.success('Connection confirmed');
      else toast.warning(`Not connected: ${r.status}${r.error ? ` — ${r.error}` : ''}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Integrations" description="External services are only reported as working after a real connection test succeeds. Credentials live in the server environment and are never shown here." />
      <div className="grid gap-6 lg:grid-cols-2">
        {data.map((i) => {
          const r = results[i.key];
          return (
            <Card key={i.key} title={i.name} description={i.purpose} actions={<Button size="sm" variant="secondary" icon={PlugZap} loading={testing === i.key} onClick={() => test(i.key)}>Test connection</Button>}>
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2">
                  {i.configured ? <CheckCircle2 className="h-4 w-4 text-status-success" /> : <CircleAlert className="h-4 w-4 text-status-warning" />}
                  {i.configured ? 'Credentials configured' : 'Not configured — setup required'}
                </p>
                {r && (
                  <p>
                    Last test: <Badge tone={r.ok ? 'success' : 'danger'}>{r.status}</Badge>
                  </p>
                )}
                {i.lastSuccess && <p className="text-app-subtle">Last successful email: {formatDateTime(i.lastSuccess)}</p>}
                {i.lastFailure && <p className="text-status-danger">Last failure: {formatDateTime(i.lastFailure.at)} — {i.lastFailure.error}</p>}
                {!i.configured && <p className="rounded-xl bg-app-muted p-3 text-app-subtle">{i.setup}</p>}
              </div>
            </Card>
          );
        })}
      </div>

      <Card title="Recent transactional emails" className="mt-6" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-app-border text-left text-xs uppercase tracking-wider text-app-subtle">
              <tr>
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Template</th>
                <th className="px-5 py-3 font-semibold">To</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {(emails?.data || []).map((e) => (
                <tr key={e._id}>
                  <td className="px-5 py-3 text-app-subtle">{formatDateTime(e.createdAt)}</td>
                  <td className="px-5 py-3">{e.template}</td>
                  <td className="max-w-[220px] truncate px-5 py-3">{e.to.join(', ')}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={e.status === 'sent' ? 'published' : e.status === 'failed' ? 'spam' : 'draft'} label={e.status.replace(/_/g, ' ')} />
                  </td>
                </tr>
              ))}
              {!emails?.data?.length && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-app-subtle">No emails yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
