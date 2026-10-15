import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Lock, MoreHorizontal, Pencil, Send, Star, Trash2, UserRound, X } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Card, EmptyState, ErrorState, PageHeader, PageLoader, Switch, Tabs } from '../../../components/ui/Primitives';
import { useAdminItem, useAdminMutation } from '../../../features/admin/adminApi';
import BookingModal from '../../../features/talent/BookingModal';
import CastingFormModal, { castingToForm } from '../../../features/talent/CastingFormModal';
import { ApplicationStatusBadge, CastingStatusBadge, dayUtc } from '../../../features/talent/talentUi';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useToast } from '../../../context/ToastContext';
import { api } from '../../../lib/api';
import { imageUrl } from '../../../lib/images';
import { P } from '../../../lib/permissions';
import { timeAgo } from '../../../lib/format';

const NOTIFY = { invalidate: [['admin', 'notifications']] };

/** Staff: one casting call and its applicants. */
export default function CastingDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const manage = can(P.TALENT_MANAGE);
  const { data, isLoading, error, refetch } = useAdminItem('/castings', id);
  const [editing, setEditing] = useState(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [filter, setFilter] = useState('active');
  const [booking, setBooking] = useState(null);
  const [menu, setMenu] = useState(false);

  const act = useAdminMutation('/castings', ({ path, body, method = 'post' }) => api[method](`/castings/${id}${path}`, body).then((r) => r?.data), NOTIFY);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { casting: c, applications = [] } = data;

  const run = async (fn, success) => {
    try {
      const res = await fn();
      if (success) toast.success(typeof success === 'function' ? success(res) : success);
      return res;
    } catch (err) {
      toast.error(err.message);
      return null;
    }
  };

  const publish = async () => {
    const res = await run(() => act.mutateAsync({ path: '/publish', body: { notify } }), (r) => (notify ? `Open — ${r.notified} talent emailed` : 'Casting call is open'));
    if (res) setPublishOpen(false);
  };

  const setStatus = (a, status) =>
    run(() => act.mutateAsync({ path: `/applications/${a.id}`, method: 'patch', body: { status, notify: true } }), status === 'shortlisted' ? `${a.talent?.displayName} shortlisted — they’ve been emailed` : status === 'declined' ? 'Marked as not selected — they’ve been told politely' : 'Updated');

  const shown = applications.filter((a) => (filter === 'active' ? ['applied', 'shortlisted', 'booked'].includes(a.status) : filter === 'all' ? true : a.status === filter));

  return (
    <>
      <Link to="/admin/castings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Casting calls
      </Link>
      <PageHeader
        eyebrow={c.reference}
        title={c.title}
        description={c.talentTypeLabels?.length ? `For: ${c.talentTypeLabels.join(', ')}` : 'Open to all talent'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CastingStatusBadge status={c.status} />
            {manage && c.status !== 'open' && (
              <Button icon={Send} onClick={() => { setNotify(true); setPublishOpen(true); }}>
                {c.status === 'closed' ? 'Re-open' : 'Open to talent'}
              </Button>
            )}
            {manage && (
              <Button variant="secondary" icon={Pencil} onClick={() => setEditing(castingToForm(c))}>
                Edit
              </Button>
            )}
            {manage && (
              <div className="relative">
                <Button size="icon" variant="ghost" aria-label="More actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {menu && (
                  <div role="menu" className="absolute right-0 z-20 mt-1 w-52 animate-scale-in rounded-xl border border-app-border bg-app-surface p-1 shadow-lift">
                    {c.status === 'open' && (
                      <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={async () => { setMenu(false); if (await confirm({ title: 'Close this casting call?', message: 'Talent can no longer apply. Existing applicants keep their status.', confirmLabel: 'Close casting' })) run(() => act.mutateAsync({ path: '/close' }), 'Casting closed'); }}>
                        <Lock className="h-4 w-4" aria-hidden /> Close casting
                      </button>
                    )}
                    {applications.length === 0 && (
                      <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10" onClick={async () => { setMenu(false); if (await confirm({ title: 'Delete this casting call?', tone: 'danger', confirmLabel: 'Delete' })) { const r = await run(() => act.mutateAsync({ path: '', method: 'del' }), 'Deleted'); if (r) navigate('/admin/castings', { replace: true }); } }}>
                        <Trash2 className="h-4 w-4" aria-hidden /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Card title={`Applicants (${c.applications?.total || 0})`}>
            <Tabs
              className="mb-4"
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: 'active', label: 'In the running' },
                { value: 'shortlisted', label: 'Shortlisted', count: c.applications?.shortlisted || 0 },
                { value: 'booked', label: 'Booked', count: c.applications?.booked || 0 },
                { value: 'all', label: 'All' },
              ]}
            />
            {shown.length === 0 ? (
              <EmptyState icon={UserRound} title={c.status === 'draft' ? 'Open the casting to start receiving applications' : 'No applicants here'} className="py-6" />
            ) : (
              <ul className="space-y-3">
                {shown.map((a) => (
                  <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-app-border p-3 sm:flex-row sm:items-start">
                    <Link to={`/admin/talent/${a.talent?.id}`} className="flex min-w-0 flex-1 gap-3">
                      <span className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-app-muted">
                        {a.talent?.photo?.url ? <img src={imageUrl(a.talent.photo, 200)} alt="" className="h-full w-full object-cover" /> : <UserRound className="m-auto mt-6 h-6 w-6 text-app-subtle" aria-hidden />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold hover:underline">{a.talent?.displayName}</span>
                          <ApplicationStatusBadge status={a.status} />
                        </span>
                        <span className="block truncate text-xs text-app-subtle">
                          {a.talent?.talentTypeLabels?.join(' · ')}
                          {a.talent?.city ? ` · ${a.talent.city}` : ''} · applied {timeAgo(a.createdAt)}
                        </span>
                        {a.note && <span className="mt-1 block whitespace-pre-line text-sm">“{a.note}”</span>}
                      </span>
                    </Link>
                    {manage && ['applied', 'shortlisted'].includes(a.status) && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {a.status === 'applied' && (
                          <Button size="sm" variant="secondary" icon={Star} onClick={() => setStatus(a, 'shortlisted')}>
                            Shortlist
                          </Button>
                        )}
                        <Button size="sm" icon={CalendarPlus} onClick={() => setBooking({ talentId: a.talent?.id, castingApplicationId: a.id, role: c.title, location: c.location, _name: a.talent?.displayName })}>
                          Book
                        </Button>
                        <Button size="sm" variant="ghost" icon={X} onClick={async () => { if (await confirm({ title: `Not selecting ${a.talent?.displayName}?`, message: 'They get a polite “thank you” email.', confirmLabel: 'Mark not selected' })) setStatus(a, 'declined'); }}>
                          Not selected
                        </Button>
                      </div>
                    )}
                    {a.status === 'booked' && a.booking && (
                      <Button size="sm" variant="secondary" to={`/admin/bookings/${a.booking}`}>
                        View booking
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="min-w-0 space-y-6">
          <Card title="Details">
            <dl className="space-y-2 text-sm">
              {[
                ['Location', c.location],
                ['Shoot dates', c.shootDates],
                ['Fee', c.fee],
                ['Apply by', c.applyBy && dayUtc(c.applyBy)],
                ['Project', c.project?.title],
                ['Opened', c.publishedAt && dayUtc(c.publishedAt)],
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
          {c.description && (
            <Card title="Description">
              <p className="whitespace-pre-line text-sm">{c.description}</p>
            </Card>
          )}
          {c.requirements && (
            <Card title="Requirements">
              <p className="whitespace-pre-line text-sm">{c.requirements}</p>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="Open this casting call?"
        description="Approved talent see it in their portal and can apply."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button icon={Send} loading={act.isPending} onClick={publish}>
              Open casting
            </Button>
          </>
        }
      >
        <Switch checked={notify} onChange={setNotify} label="Email matching talent" description={c.talentTypeLabels?.length ? `Everyone on the roster listed as ${c.talentTypeLabels.join(' / ')}.` : 'Everyone on the roster.'} />
      </Modal>

      <CastingFormModal open={Boolean(editing)} onClose={() => setEditing(null)} initial={editing} />
      <BookingModal open={Boolean(booking)} onClose={() => setBooking(null)} initial={booking} fixedTalent={booking?._name} onSaved={(b) => navigate(`/admin/bookings/${b.id}`)} />
    </>
  );
}