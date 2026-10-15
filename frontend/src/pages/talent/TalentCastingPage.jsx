import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, Undo2 } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import { Card, ErrorState, PageLoader } from '../../components/ui/Primitives';
import { ApplicationStatusBadge, dayUtc } from '../../features/talent/talentUi';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/format';

const STATUS_COPY = {
  applied: 'You’ve applied. The team will be in touch if you’re shortlisted.',
  shortlisted: 'Good news — you’re shortlisted! The team will contact you with next steps.',
  booked: 'You’ve been booked for this — see your Bookings.',
  declined: 'You weren’t selected this time. Thank you for applying — keep an eye out for new castings.',
  withdrawn: 'You withdrew your application.',
};

/** Talent: one casting call — read it and apply. */
export default function TalentCastingPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [note, setNote] = useState('');
  const key = ['talent', 'casting', id];
  const { data: c, isLoading, error, refetch } = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/talent-portal/castings/${id}`)).data });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ['talent', 'castings'] }), qc.invalidateQueries({ queryKey: ['talent', 'overview'] })]);
  const apply = useMutation({ mutationFn: () => api.post(`/talent-portal/castings/${id}/apply`, { note }), onSuccess: refresh });
  const withdraw = useMutation({ mutationFn: () => api.post(`/talent-portal/castings/${id}/withdraw`), onSuccess: refresh });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const mine = c.myApplication;
  const canApply = c.status === 'open' && (!mine || mine.status === 'withdrawn');

  return (
    <>
      <Seo title={c.title} noIndex />
      <Link to="/talent/castings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Casting calls
      </Link>
      <p className="font-mono text-xs text-app-subtle">{c.reference}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold sm:text-5xl">{c.title}</h1>
      <p className="mt-2 text-app-subtle">{c.talentTypeLabels?.length ? `For: ${c.talentTypeLabels.join(', ')}` : 'Open to all talent'}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {c.description && (
            <Card title="About the role">
              <p className="whitespace-pre-line text-sm">{c.description}</p>
            </Card>
          )}
          {c.requirements && (
            <Card title="What we’re looking for">
              <p className="whitespace-pre-line text-sm">{c.requirements}</p>
            </Card>
          )}
        </div>
        <div className="min-w-0 space-y-6">
          <Card title="Details">
            <dl className="space-y-2 text-sm">
              {[
                ['Location', c.location],
                ['Shoot dates', c.shootDates],
                ['Fee', c.fee],
                ['Apply by', c.applyBy && dayUtc(c.applyBy)],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-app-subtle">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
          </Card>

          <Card title={mine && mine.status !== 'withdrawn' ? 'Your application' : 'Apply'}>
            {mine && (
              <div className="mb-4 space-y-2 text-sm">
                <ApplicationStatusBadge status={mine.status} />
                <p className="text-app-subtle">{STATUS_COPY[mine.status]}</p>
                {mine.status !== 'withdrawn' && <p className="text-xs text-app-subtle">Applied {timeAgo(mine.createdAt)}</p>}
              </div>
            )}
            {canApply ? (
              <div className="space-y-3">
                <Textarea label="Note to the team (optional)" rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1500} placeholder="Why you’re right for it, your availability, a link to relevant work…" />
                <Button
                  icon={Send}
                  className="w-full justify-center"
                  loading={apply.isPending}
                  onClick={() => apply.mutateAsync().then(() => toast.success('Application sent — good luck!')).catch((e) => toast.error(e.message))}
                >
                  Apply for this role
                </Button>
                <p className="text-xs text-app-subtle">The team sees your profile and photos, so keep them up to date.</p>
              </div>
            ) : (
              mine &&
              ['applied', 'shortlisted'].includes(mine.status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Undo2}
                  loading={withdraw.isPending}
                  onClick={async () => {
                    if (await confirm({ title: 'Withdraw your application?', confirmLabel: 'Withdraw' })) withdraw.mutateAsync().then(() => toast.success('Application withdrawn')).catch((e) => toast.error(e.message));
                  }}
                >
                  Withdraw application
                </Button>
              )
            )}
            {!canApply && !mine && <p className="text-sm text-app-subtle">This casting call is closed.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}