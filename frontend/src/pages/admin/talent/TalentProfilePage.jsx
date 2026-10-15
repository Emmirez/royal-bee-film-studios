import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, CalendarPlus, Check, Copy, ExternalLink, Mail, MoreHorizontal, Pencil, Phone, RotateCcw, Save, Send, Trash2, UserRound, X } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Textarea from '../../../components/ui/Textarea';
import { Badge, Card, ErrorState, PageLoader, Switch } from '../../../components/ui/Primitives';
import { useAdminItem, useAdminMutation } from '../../../features/admin/adminApi';
import BookingModal from '../../../features/talent/BookingModal';
import {
  ApplicationStatusBadge,
  AvailabilityBadge,
  BookingStatusBadge,
  DocumentList,
  DocumentUploader,
  PhotoManager,
  ProfileFields,
  TalentStatusBadge,
  bookingDates,
  formToBody,
  profileToForm,
} from '../../../features/talent/talentUi';
import { useAuth } from '../../../context/AuthContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useToast } from '../../../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError } from '../../../lib/api';
import { imageUrl } from '../../../lib/images';
import { P } from '../../../lib/permissions';
import { formatDate, formatDateTime, timeAgo } from '../../../lib/format';

const NOTIFY = { invalidate: [['admin', 'notifications']] };

function Fact({ label, children }) {
  if (!children && children !== 0) return null;
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-app-subtle">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}

function InviteLink({ invite, name, onClose }) {
  const toast = useToast();
  if (!invite) return null;
  return (
    <Modal open onClose={onClose} title="Approved" size="sm" footer={<Button onClick={onClose}>Done</Button>}>
      {invite.emailStatus === 'sent' ? (
        <p className="text-sm text-app-subtle">{name} has been emailed an invitation to set up their talent portal.</p>
      ) : (
        <div className="space-y-3 text-sm text-app-subtle">
          <p>The email couldn’t be sent, so share this single-use link with {name} yourself:</p>
          <div className="flex items-center gap-2 rounded-xl border border-app-border bg-app-raised p-2">
            <code className="min-w-0 flex-1 truncate text-xs">{invite.inviteLink}</code>
            <Button size="sm" variant="secondary" icon={Copy} onClick={() => navigator.clipboard?.writeText(invite.inviteLink).then(() => toast.success('Link copied'))}>
              Copy
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Staff: one talent — review, profile, photos, bookings, castings and private documents. */
export default function TalentProfilePage() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const manage = can(P.TALENT_MANAGE);
  const { data, isLoading, error, refetch } = useAdminItem('/talent', id);

  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [notes, setNotes] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reject, setReject] = useState({ reason: '', notify: true });
  const [invite, setInvite] = useState(null);
  const [booking, setBooking] = useState(null);
  const [menu, setMenu] = useState(false);

  const act = useAdminMutation('/talent', ({ path, body, method = 'post' }) => api[method](`/talent/${id}${path}`, body).then((r) => r?.data), NOTIFY);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', '/talent'] });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { profile: t, applications = [], bookings = [], documents = [] } = data;

  const run = async (fn, success) => {
    try {
      const res = await fn();
      if (success) toast.success(success);
      return res;
    } catch (err) {
      if (err instanceof ApiRequestError) setErrors(err.fieldErrors);
      toast.error(err.message);
      return null;
    }
  };

  const approve = async () => {
    const ok = await confirm({ title: `Approve ${t.displayName}?`, message: `They join the roster and get an email inviting them to set up their talent portal.`, confirmLabel: 'Approve & invite' });
    if (!ok) return;
    const res = await run(() => act.mutateAsync({ path: '/approve' }));
    if (res?.invite) setInvite(res.invite);
    else if (res) toast.success('Approved — they can sign in to their portal');
  };

  const saveProfile = async () => {
    setErrors({});
    const res = await run(() => act.mutateAsync({ path: '', method: 'patch', body: formToBody(editing) }), 'Profile saved');
    if (res) setEditing(null);
  };

  const simple = async (path, { title, message, confirmLabel, tone, success }) => {
    setMenu(false);
    if (!(await confirm({ title, message, confirmLabel, tone }))) return null;
    return run(() => act.mutateAsync({ path }), success);
  };

  const removeApplication = async () => {
    setMenu(false);
    if (!(await confirm({ title: 'Delete this application?', message: 'The application and its photos are removed for good.', tone: 'danger', confirmLabel: 'Delete' }))) return;
    const res = await run(() => act.mutateAsync({ path: '', method: 'del' }), 'Application deleted');
    if (res) navigate('/admin/talent?status=pending', { replace: true });
  };

    const deleteTalent = async () => {
    setMenu(false);
    const ok = await confirm({
      title: `Delete ${t.displayName} permanently?`,
      message: 'This removes their profile, photos, portal account, bookings and booking messages, casting applications and private documents. It can’t be undone — use Restore instead if you might work with them again.',
      tone: 'danger',
      confirmLabel: 'Delete permanently',
      typeToConfirm: 'DELETE',
    });
    if (!ok) return;
    const res = await run(() => act.mutateAsync({ path: '', method: 'del' }), 'Talent deleted');
    if (res) navigate('/admin/talent?status=archived', { replace: true });
  };

  const deleteDoc = async (d) => {
    if (!(await confirm({ title: `Delete “${d.title}”?`, tone: 'danger', confirmLabel: 'Delete' }))) return;
    await run(() => act.mutateAsync({ path: `/documents/${d.id}`, method: 'del' }), 'Document deleted');
  };

  return (
    <>
      <Link to={`/admin/talent${t.status === 'approved' ? '' : `?status=${t.status}`}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Talent roster
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end">
        <div className="h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-app-muted">
          {t.photo?.url ? <img src={imageUrl(t.photo, 300)} alt="" className="h-full w-full object-cover" /> : <UserRound className="m-auto mt-8 h-10 w-10 text-app-subtle" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-app-subtle">{t.reference}</p>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{t.displayName}</h1>
          <p className="text-sm text-app-subtle">
            {t.stageName ? `${t.name} · ` : ''}
            {t.talentTypeLabels.join(' · ')}
            {t.city ? ` · ${t.city}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <TalentStatusBadge status={t.status} />
            {t.status === 'approved' && <AvailabilityBadge availability={t.availability} />}
            {t.status === 'approved' && t.accountStatus === 'invited' && <Badge tone="warning">Invite not accepted yet</Badge>}
          </div>
        </div>
        {manage && (
          <div className="flex flex-wrap items-center gap-2">
            {['pending', 'rejected'].includes(t.status) && (
              <Button icon={Check} loading={act.isPending} onClick={approve}>
                Approve
              </Button>
            )}
            {t.status === 'pending' && (
              <Button variant="secondary" icon={X} onClick={() => { setReject({ reason: '', notify: true }); setRejectOpen(true); }}>
                Decline
              </Button>
            )}
            {t.status === 'approved' && (
              <Button icon={CalendarPlus} onClick={() => setBooking({ talentId: t.id })}>
                Offer booking
              </Button>
            )}
            <Button variant="secondary" icon={Pencil} onClick={() => { setErrors({}); setEditing(profileToForm(t)); }}>
              Edit
            </Button>
            <div className="relative">
              <Button size="icon" variant="ghost" aria-label="More actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {menu && (
                <div role="menu" className="absolute right-0 z-20 mt-1 w-56 animate-scale-in rounded-xl border border-app-border bg-app-surface p-1 shadow-lift">
                  {t.status === 'approved' && t.accountStatus === 'invited' && (
                    <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={async () => { setMenu(false); const res = await run(() => act.mutateAsync({ path: '/resend-invite' })); if (res) setInvite(res.invite); }}>
                      <Send className="h-4 w-4" aria-hidden /> Resend invitation
                    </button>
                  )}
                  {t.status === 'approved' && (
                    <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10" onClick={() => simple('/archive', { title: `Archive ${t.displayName}?`, message: 'They leave the active roster and lose portal access. Their records are kept and you can restore them later.', confirmLabel: 'Archive', tone: 'danger', success: 'Archived' })}>
                      <Archive className="h-4 w-4" aria-hidden /> Archive
                    </button>
                  )}
                  {t.status === 'archived' && (
                    <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-app-muted" onClick={() => simple('/restore', { title: `Restore ${t.displayName}?`, message: 'They return to the roster and can sign in again.', confirmLabel: 'Restore', success: 'Restored to the roster' })}>
                    <RotateCcw className="h-4 w-4" aria-hidden /> Restore to roster
                    </button>
                  )}
                  {t.status === 'archived' && (
                    <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10" onClick={deleteTalent}>
                      <Trash2 className="h-4 w-4" aria-hidden /> Delete permanently
                    </button>
                  )}
                  {['pending', 'rejected'].includes(t.status) && !t.hasAccount && (
                    <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-status-danger hover:bg-status-danger/10" onClick={removeApplication}>
                      <Trash2 className="h-4 w-4" aria-hidden /> Delete application
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {t.status === 'rejected' && (
        <p className="mb-5 rounded-2xl bg-app-muted px-4 py-3 text-sm">
          Declined {formatDate(t.reviewedAt)}
          {t.reviewedBy ? ` by ${t.reviewedBy}` : ''}
          {t.rejectionReason ? ` — ${t.rejectionReason}` : ''}
        </p>
      )}

      {editing ? (
        <Card
          title="Edit profile"
          actions={
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button size="sm" icon={Save} loading={act.isPending} onClick={saveProfile}>
                Save
              </Button>
            </div>
          }
        >
          <ProfileFields form={editing} setForm={setEditing} errors={errors} rateHint="Staff only — never shown publicly." />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-6">
            {t.status === 'pending' && (
              <Card title="Application">
                <p className="text-sm text-app-subtle">Applied {formatDateTime(t.application?.submittedAt)} · confirmed they are 18 or older</p>
                {t.application?.message && <p className="mt-3 whitespace-pre-line text-sm">{t.application.message}</p>}
              </Card>
            )}

            <Card title="Photos">
              {manage ? (
                <PhotoManager
                  photos={t.photos}
                  uploadPath={`/talent/${id}/photos`}
                  busy={act.isPending}
                  onUploaded={refresh}
                  onChange={(photos) => run(() => act.mutateAsync({ path: '', method: 'patch', body: { photos } }), 'Photos updated')}
                />
              ) : t.photos.length ? (
                <ul className="grid grid-cols-3 gap-3 lg:grid-cols-4">
                  {t.photos.map((p) => (
                    <li key={p.publicId || p.url}>
                      <img src={imageUrl(p, 400)} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-app-subtle">No photos yet.</p>
              )}
            </Card>

            <Card title="Profile">
              {t.bio && <p className="mb-4 whitespace-pre-line text-sm">{t.bio}</p>}
              <dl className="grid gap-x-8 divide-y divide-app-border sm:grid-cols-2 sm:divide-y-0">
                <Fact label="Gender">{t.gender}</Fact>
                <Fact label="Playing age">{t.playingAgeMin ? `${t.playingAgeMin}${t.playingAgeMax ? `–${t.playingAgeMax}` : '+'}` : ''}</Fact>
                <Fact label="Height">{t.heightCm ? `${t.heightCm} cm` : ''}</Fact>
                <Fact label="Build">{t.build}</Fact>
                <Fact label="Hair">{t.hairColour}</Fact>
                <Fact label="Eyes">{t.eyeColour}</Fact>
                <Fact label="Languages">{t.languages?.join(', ')}</Fact>
                <Fact label="Skills">{t.skills?.join(', ')}</Fact>
                <Fact label="Location">{[t.city, t.country].filter(Boolean).join(', ')}</Fact>
              </dl>
              {t.showreels?.length > 0 && (
                <div className="mt-4 border-t border-app-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-subtle">Showreels</p>
                  <ul className="mt-2 space-y-1">
                    {t.showreels.map((r) => (
                      <li key={r.url}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold hover:underline">
                          {r.title || r.url} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card title="Bookings" actions={manage && t.status === 'approved' && <Button size="sm" variant="secondary" icon={CalendarPlus} onClick={() => setBooking({ talentId: t.id })}>Offer booking</Button>}>
              {bookings.length === 0 ? (
                <p className="text-sm text-app-subtle">No bookings yet.</p>
              ) : (
                <ul className="divide-y divide-app-border">
                  {bookings.map((b) => (
                    <li key={b.id}>
                      <Link to={`/admin/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{b.role}</span>
                          <span className="block truncate text-xs text-app-subtle">
                            {bookingDates(b)}
                            {b.project ? ` · ${b.project.title}` : ''}
                          </span>
                        </span>
                        <BookingStatusBadge status={b.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Casting applications">
              {applications.length === 0 ? (
                <p className="text-sm text-app-subtle">Hasn’t applied to any casting calls yet.</p>
              ) : (
                <ul className="divide-y divide-app-border">
                  {applications.map((a) => (
                    <li key={a.id}>
                      <Link to={`/admin/castings/${a.casting?.id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{a.casting?.title}</span>
                          <span className="block text-xs text-app-subtle">Applied {timeAgo(a.createdAt)}</span>
                        </span>
                        <ApplicationStatusBadge status={a.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="min-w-0 space-y-6">
            <Card title="Contact">
              <div className="space-y-2 text-sm">
                <a href={`mailto:${t.email}`} className="flex items-center gap-2 hover:underline">
                  <Mail className="h-4 w-4 text-app-subtle" aria-hidden /> <span className="truncate">{t.email}</span>
                </a>
                {t.phone && (
                  <a href={`tel:${t.phone}`} className="flex items-center gap-2 hover:underline">
                    <Phone className="h-4 w-4 text-app-subtle" aria-hidden /> {t.phone}
                  </a>
                )}
                <p className="pt-1 text-xs text-app-subtle">
                  Portal account: {t.hasAccount ? (t.accountStatus === 'active' ? 'active' : t.accountStatus) : 'none (not approved)'}
                </p>
              </div>
            </Card>

            <Card title="Rate & availability" description="Staff only.">
              <dl className="divide-y divide-app-border">
                <Fact label="Day rate">{t.dayRate?.amount ? `${t.dayRate.currency} ${Number(t.dayRate.amount).toLocaleString('en-US')}` : 'Not set'}</Fact>
                <Fact label="Rate notes">{t.rateNotes}</Fact>
                <Fact label="Availability">
                  <AvailabilityBadge availability={t.availability} />
                </Fact>
                <Fact label="Note">{t.availability?.note}</Fact>
              </dl>
            </Card>

            <Card title="Internal notes" description="Only staff see these.">
              <Textarea aria-label="Internal notes" rows={5} value={notes ?? t.internalNotes ?? ''} onChange={(e) => setNotes(e.target.value)} maxLength={3000} disabled={!manage} />
              {manage && notes !== null && notes !== t.internalNotes && (
                <Button size="sm" className="mt-3" icon={Save} loading={act.isPending} onClick={async () => { const res = await run(() => act.mutateAsync({ path: '', method: 'patch', body: { internalNotes: notes } }), 'Notes saved'); if (res) setNotes(null); }}>
                  Save notes
                </Button>
              )}
            </Card>

            <Card title="Private documents" description="Contracts, release forms, ID.">
              <DocumentList documents={documents} downloadPath={(d) => `/talent/${id}/documents/${d.id}/download`} canDelete={() => manage} onDelete={deleteDoc} />
              {manage && t.status === 'approved' && (
                <div className="mt-4">
                  <DocumentUploader path={`/talent/${id}/documents`} bookings={bookings.filter((b) => !['declined', 'cancelled'].includes(b.status))} onUploaded={refresh} />
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={`Decline ${t.displayName}’s application?`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={act.isPending}
              onClick={async () => {
                const res = await run(() => act.mutateAsync({ path: '/reject', body: reject }), 'Application declined');
                if (res) setRejectOpen(false);
              }}
            >
              Decline
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Textarea label="Reason (staff only)" rows={3} value={reject.reason} onChange={(e) => setReject((r) => ({ ...r, reason: e.target.value }))} maxLength={500} />
          <Switch checked={reject.notify} onChange={(v) => setReject((r) => ({ ...r, notify: v }))} label="Send a polite ‘thank you’ email" description="The reason above is never included." />
        </div>
      </Modal>

      <InviteLink invite={invite} name={t.firstName} onClose={() => setInvite(null)} />
      <BookingModal open={Boolean(booking)} onClose={() => setBooking(null)} initial={booking} fixedTalent={t.displayName} onSaved={(b) => navigate(`/admin/bookings/${b.id}`)} />
    </>
  );
}