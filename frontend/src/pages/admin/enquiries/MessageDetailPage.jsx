import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, Trash2, UserRound } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Card, ErrorState, PageLoader, StatusBadge } from '../../../components/ui/Primitives';
import { useAdminItem, useAdminMutation } from '../../../features/admin/adminApi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { api } from '../../../lib/api';
import { P } from '../../../lib/permissions';
import { formatDateTime, titleCase } from '../../../lib/format';

/** One contact-form message — opens as a normal page so the header and bottom nav stay visible. */
export default function MessageDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const manage = can(P.ENQUIRIES_MANAGE);
  const [deleting, setDeleting] = useState(false);

  const { data: m, isLoading, error, refetch } = useAdminItem('/contact-messages', id);
  const update = useAdminMutation('/contact-messages', (status) => api.patch(`/contact-messages/${id}`, { status }), { invalidate: [['admin', 'notifications']] });

  // Opening a new message marks it as read — refresh the list count and the bell
  useEffect(() => {
    if (!m) return;
    qc.invalidateQueries({ queryKey: ['admin', '/contact-messages', 'list'] });
    qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
  }, [m?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteMessage = async () => {
    const ok = await confirm({ title: 'Delete this message?', message: 'It’s removed for good. The person’s CRM contact is kept.', tone: 'danger', confirmLabel: 'Delete' });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.del(`/contact-messages/${id}`);
      toast.success('Message deleted');
      navigate('/admin/messages', { replace: true });
      qc.removeQueries({ queryKey: ['admin', '/contact-messages', 'item', id] });
      qc.invalidateQueries({ queryKey: ['admin', '/contact-messages', 'list'] });
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
      qc.invalidateQueries({ queryKey: ['admin', 'overview'] });
    } catch (e) {
      toast.error(e.message);
      setDeleting(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <Link to="/admin/messages" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Messages
      </Link>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 font-display text-3xl font-semibold sm:text-4xl">{m.subject || 'No subject'}</h1>
          <StatusBadge status={m.status} />
        </div>
        <p className="mt-1 text-sm text-app-subtle">Received {formatDateTime(m.createdAt)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="Message">
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{m.message}</p>
          <p className="mt-4 text-xs text-app-subtle">Marketing consent: {m.consent?.marketing ? 'Yes' : 'No'}</p>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card title="From">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <UserRound className="h-4 w-4 shrink-0 text-app-subtle" aria-hidden />
                <span className="min-w-0 font-medium">{m.name}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-app-subtle" aria-hidden />
                <a href={`mailto:${m.email}`} className="min-w-0 break-all hover:underline">{m.email}</a>
              </li>
              {m.phone && (
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-app-subtle" aria-hidden />
                  <a href={`tel:${m.phone}`} className="min-w-0 hover:underline">{m.phone}</a>
                </li>
              )}
            </ul>
            <Button href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'Your message'}`)}`} icon={Mail} className="mt-5 w-full justify-center">
              Reply by email
            </Button>
          </Card>

          {manage && (
            <Card title="Handling">
              <Select
                label="Status"
                value={m.status}
                onChange={(s) => update.mutateAsync(s).then(() => toast.success('Status updated')).catch((e) => toast.error(e.message))}
                options={['new', 'read', 'replied', 'archived', 'spam'].map((s) => ({ value: s, label: titleCase(s) }))}
              />
              <Button variant="secondary" icon={Trash2} onClick={deleteMessage} loading={deleting} className="mt-5 w-full justify-center text-status-danger hover:bg-status-danger/10">
                Delete message
              </Button>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}