import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Download, FileText, ImagePlus, Plus, Star, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import CommaListInput from '../../components/ui/CommaListInput';
import { Badge } from '../../components/ui/Primitives';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { imageUrl } from '../../lib/images';
import { cx, formatBytes, formatDate } from '../../lib/format';

/* ───────── Shared lists (mirror backend constants/talent.js) ───────── */

export const TALENT_TYPES = [
  { value: 'actor', label: 'Actor' },
  { value: 'model', label: 'Model' },
  { value: 'voice', label: 'Voice artist' },
  { value: 'presenter', label: 'Presenter / host' },
  { value: 'dancer', label: 'Dancer' },
  { value: 'musician', label: 'Musician / singer' },
  { value: 'extra', label: 'Extra / background' },
  { value: 'crew', label: 'Crew' },
  { value: 'other', label: 'Other' },
];
export const typeLabel = (v) => TALENT_TYPES.find((t) => t.value === v)?.label || v;

export const AVAILABILITY = [
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited availability' },
  { value: 'unavailable', label: 'Not available' },
];
export const DOCUMENT_KINDS = [
  { value: 'contract', label: 'Contract' },
  { value: 'release', label: 'Release form' },
  { value: 'id', label: 'ID document' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'other', label: 'Other' },
];
export const docKindLabel = (v) => DOCUMENT_KINDS.find((d) => d.value === v)?.label || v;

export const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'].map((g) => ({ value: g, label: g }));
export const BUILDS = ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Plus size'].map((g) => ({ value: g, label: g }));

const TALENT_STATUS = {
  pending: { label: 'Application', tone: 'gold' },
  approved: { label: 'On roster', tone: 'success' },
  rejected: { label: 'Declined', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'neutral' },
};
export function TalentStatusBadge({ status }) {
  const s = TALENT_STATUS[status] || TALENT_STATUS.pending;
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

const AVAIL_TONE = { available: 'success', limited: 'warning', unavailable: 'danger' };
export function AvailabilityBadge({ availability }) {
  const status = availability?.status || 'available';
  return <Badge tone={AVAIL_TONE[status]}>{AVAILABILITY.find((a) => a.value === status)?.label}</Badge>;
}

const BOOKING = {
  offered: { label: 'Awaiting reply', tone: 'gold' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  completed: { label: 'Completed', tone: 'info' },
};
export function BookingStatusBadge({ status }) {
  const s = BOOKING[status] || BOOKING.offered;
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

const APPLICATION = {
  applied: { label: 'Applied', tone: 'gold' },
  shortlisted: { label: 'Shortlisted', tone: 'info' },
  booked: { label: 'Booked', tone: 'success' },
  declined: { label: 'Not selected', tone: 'neutral' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
};
export function ApplicationStatusBadge({ status }) {
  const s = APPLICATION[status] || APPLICATION.applied;
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

const CASTING = { draft: { label: 'Draft', tone: 'neutral' }, open: { label: 'Open', tone: 'success' }, closed: { label: 'Closed', tone: 'neutral' } };
export function CastingStatusBadge({ status }) {
  const s = CASTING[status] || CASTING.draft;
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

/** Booking dates are calendar dates — format in UTC so they never shift a day. */
export function bookingDates(b) {
  const f = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  if (!b.startDate) return '';
  return b.endDate && b.endDate !== b.startDate ? `${f(b.startDate)} – ${f(b.endDate)}` : f(b.startDate);
}
export const dayUtc = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
export const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

const SYMBOLS = { NGN: '₦', USD: '$', GBP: '£' };
export const feeText = (fee) => (fee?.amount || fee?.amount === 0 ? `${SYMBOLS[fee.currency] || ''}${Number(fee.amount).toLocaleString('en-US')}${fee.note ? ` ${fee.note}` : ''}` : fee?.note || '');

/* ───────── Talent type chips (multi-select) ───────── */

export function TypePicker({ value = [], onChange, error, label = 'What do you do?' }) {
  return (
    <fieldset>
      <legend className="field-label">
        {label} <span className="text-status-danger">*</span>
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {TALENT_TYPES.map((t) => {
          const on = value.includes(t.value);
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== t.value) : [...value, t.value])}
              className={cx('rounded-full border px-3.5 py-1.5 text-sm font-semibold transition', on ? 'border-app-text bg-app-text text-app-bg' : 'border-app-border text-app-subtle hover:border-app-text hover:text-app-text')}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {error && <p className="field-error mt-2">{error}</p>}
    </fieldset>
  );
}

/* ───────── Showreel links ───────── */

export function ShowreelEditor({ value = [], onChange, errors = {} }) {
  const set = (i, k, v) => onChange(value.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-3">
      {value.map((r, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="grid gap-2 sm:grid-cols-[200px_1fr_auto] sm:items-end">
          <Input label={i === 0 ? 'Title' : undefined} aria-label={i === 0 ? undefined : 'Showreel title'} value={r.title} onChange={(e) => set(i, 'title', e.target.value)} placeholder="e.g. Acting reel 2026" maxLength={120} />
          <Input label={i === 0 ? 'Link' : undefined} aria-label={i === 0 ? undefined : 'Showreel link'} value={r.url} onChange={(e) => set(i, 'url', e.target.value)} placeholder="https://youtube.com/…" error={errors[`showreels.${i}.url`]} />
          <Button variant="ghost" size="icon" aria-label="Remove link" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
            <Trash2 className="h-4 w-4 text-status-danger" />
          </Button>
        </div>
      ))}
      {value.length < 6 && (
        <Button size="sm" variant="secondary" icon={Plus} onClick={() => onChange([...value, { title: '', url: '' }])}>
          Add a showreel link
        </Button>
      )}
    </div>
  );
}

/* ───────── Profile fields (talent self-edit + staff edit) ───────── */

export const profileToForm = (p) => ({
  firstName: p.firstName || '',
  lastName: p.lastName || '',
  stageName: p.stageName || '',
  phone: p.phone || '',
  talentTypes: p.talentTypes || [],
  bio: p.bio || '',
  city: p.city || '',
  country: p.country || '',
  languages: p.languages || [],
  skills: p.skills || [],
  gender: p.gender || '',
  playingAgeMin: p.playingAgeMin ?? '',
  playingAgeMax: p.playingAgeMax ?? '',
  heightCm: p.heightCm ?? '',
  build: p.build || '',
  hairColour: p.hairColour || '',
  eyeColour: p.eyeColour || '',
  showreels: p.showreels || [],
  dayRate: { amount: p.dayRate?.amount ?? '', currency: p.dayRate?.currency || 'NGN' },
  rateNotes: p.rateNotes || '',
  availability: { status: p.availability?.status || 'available', note: p.availability?.note || '' },
});

/** Clean the form for the API ('' → null for numbers, drop empty showreel rows). */
export const formToBody = (f) => ({
  ...f,
  playingAgeMin: f.playingAgeMin === '' ? null : Number(f.playingAgeMin),
  playingAgeMax: f.playingAgeMax === '' ? null : Number(f.playingAgeMax),
  heightCm: f.heightCm === '' ? null : Number(f.heightCm),
  dayRate: { amount: f.dayRate.amount === '' ? null : Number(f.dayRate.amount), currency: f.dayRate.currency },
  showreels: f.showreels.filter((r) => r.url.trim()),
});

function Section({ title, description, children }) {
  return (
    <section className="border-t border-app-border pt-6 first:border-0 first:pt-0">
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-0.5 text-sm text-app-subtle">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProfileFields({ form, setForm, errors = {}, rateHint = 'Only the studio team sees this.' }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  return (
    <div className="space-y-8">
      <Section title="About you">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" required value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
          <Input label="Last name" required value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
          <Input label="Stage / professional name" value={form.stageName} onChange={set('stageName')} maxLength={100} hint="Optional — used instead of your real name in castings." />
          <Input label="Phone" value={form.phone} onChange={set('phone')} />
          <Input label="City" value={form.city} onChange={set('city')} />
          <Input label="Country" value={form.country} onChange={set('country')} />
          <div className="sm:col-span-2">
            <TypePicker value={form.talentTypes} onChange={set('talentTypes')} error={errors.talentTypes} />
          </div>
          <Textarea label="Short bio" rows={4} value={form.bio} onChange={set('bio')} maxLength={1500} className="sm:col-span-2" placeholder="Your experience, training and the kind of work you love." />
          <CommaListInput label="Languages" value={form.languages} onChange={set('languages')} max={15} placeholder="English, Yoruba, Pidgin" hint="Separate with commas." />
          <CommaListInput label="Skills" value={form.skills} onChange={set('skills')} max={30} placeholder="Stage combat, horse riding, singing" hint="Separate with commas." />
        </div>
      </Section>

      <Section title="Casting details" description="Helps the team match you to the right roles.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Gender" value={form.gender || null} onChange={set('gender')} options={GENDERS} clearable placeholder="Optional" />
          <Input label="Playing age from" type="number" min="18" max="100" value={form.playingAgeMin} onChange={set('playingAgeMin')} error={errors.playingAgeMin} />
          <Input label="Playing age to" type="number" min="18" max="100" value={form.playingAgeMax} onChange={set('playingAgeMax')} error={errors.playingAgeMax} />
          <Input label="Height (cm)" type="number" min="50" max="250" value={form.heightCm} onChange={set('heightCm')} error={errors.heightCm} />
          <Select label="Build" value={form.build || null} onChange={set('build')} options={BUILDS} clearable placeholder="Optional" />
          <Input label="Hair colour" value={form.hairColour} onChange={set('hairColour')} maxLength={40} />
          <Input label="Eye colour" value={form.eyeColour} onChange={set('eyeColour')} maxLength={40} />
        </div>
      </Section>

      <Section title="Showreels" description="YouTube, Vimeo or Google Drive links (make sure they can be viewed).">
        <ShowreelEditor value={form.showreels} onChange={set('showreels')} errors={errors} />
      </Section>

      <Section title="Rate & availability" description={rateHint}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Day rate" type="number" min="0" value={form.dayRate.amount} onChange={(e) => setForm((f) => ({ ...f, dayRate: { ...f.dayRate, amount: e.target.value } }))} error={errors['dayRate.amount']} />
          <Select label="Currency" value={form.dayRate.currency} onChange={(v) => setForm((f) => ({ ...f, dayRate: { ...f.dayRate, currency: v } }))} options={['NGN', 'USD', 'GBP'].map((c) => ({ value: c, label: c }))} />
          <Input label="Rate notes" value={form.rateNotes} onChange={set('rateNotes')} maxLength={300} placeholder="e.g. Negotiable for long shoots" />
          <Select label="Availability" value={form.availability.status} onChange={(v) => setForm((f) => ({ ...f, availability: { ...f.availability, status: v } }))} options={AVAILABILITY} />
          <Input label="Availability note" value={form.availability.note} onChange={(e) => setForm((f) => ({ ...f, availability: { ...f.availability, note: e.target.value } }))} maxLength={300} className="sm:col-span-2" placeholder="e.g. Away 1–14 December" />
        </div>
      </Section>
    </div>
  );
}

/* ───────── Photos ───────── */

/**
 * Photo grid: upload (to `uploadPath`), make main, move, remove.
 * onChange(photos) saves a reordered/trimmed list; onUploaded(profile) receives the server's updated profile.
 */
export function PhotoManager({ photos = [], uploadPath, onChange, onUploaded, max = 12, busy }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(0);

  const upload = async (files) => {
    const list = Array.from(files || []).slice(0, Math.max(0, max - photos.length));
    if (!list.length) return;
    setUploading(list.length);
    for (const file of list) {
      const form = new FormData();
      form.append('file', file);
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await api.upload(uploadPath, form);
        onUploaded?.(res.data);
      } catch (err) {
        toast.error(err.message);
      }
      setUploading((n) => n - 1);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const move = (i, dir) => {
    const next = [...photos];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.publicId || p.url} className="group relative overflow-hidden rounded-2xl border border-app-border bg-app-muted">
            <img src={imageUrl(p, 400)} alt="" className="aspect-[3/4] w-full object-cover" loading="lazy" />
            {i === 0 && (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-app-text px-2 py-0.5 text-[11px] font-semibold text-app-bg">
                <Star className="h-3 w-3 fill-current" aria-hidden /> Main photo
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2">
              <div className="flex gap-1">
                <button type="button" disabled={busy || i === 0} onClick={() => move(i, -1)} className="rounded-lg bg-white/90 p-1.5 text-ink-900 disabled:opacity-40" aria-label="Move earlier">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button type="button" disabled={busy || i === photos.length - 1} onClick={() => move(i, 1)} className="rounded-lg bg-white/90 p-1.5 text-ink-900 disabled:opacity-40" aria-label="Move later">
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <button type="button" disabled={busy} onClick={() => onChange(photos.filter((_, idx) => idx !== i))} className="rounded-lg bg-white/90 p-1.5 text-status-danger disabled:opacity-40" aria-label="Remove photo">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
        {photos.length < max && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading > 0}
              className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-app-border text-sm font-semibold text-app-subtle transition hover:border-app-text hover:text-app-text disabled:opacity-60"
            >
              <ImagePlus className="h-6 w-6" aria-hidden />
              {uploading > 0 ? `Uploading ${uploading}…` : 'Add photos'}
            </button>
          </li>
        )}
      </ul>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      <p className="mt-2 text-xs text-app-subtle">
        JPG, PNG or WebP up to 10MB each · {photos.length}/{max}. The first photo is your main headshot — use the arrows to reorder.
      </p>
    </div>
  );
}

/* ───────── Documents ───────── */

/** Opens a short-lived private download link. */
export async function openDocument(path) {
  const { data } = await api.get(path);
  window.open(data.url, '_blank', 'noopener');
}

export function DocumentList({ documents = [], downloadPath, onDelete, canDelete = () => false, emptyText = 'No documents yet.' }) {
  const toast = useToast();
  if (!documents.length) return <p className="text-sm text-app-subtle">{emptyText}</p>;
  return (
    <ul className="divide-y divide-app-border">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center gap-3 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-muted">
            <FileText className="h-5 w-5 text-app-subtle" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{d.title}</p>
            <p className="truncate text-xs text-app-subtle">
              {docKindLabel(d.kind)} · {formatBytes(d.size)} · {d.fromTalent ? 'Uploaded by talent' : 'From the studio'} · {formatDate(d.createdAt)}
              {d.booking?.reference ? ` · ${d.booking.reference}` : ''}
            </p>
          </div>
          <Button size="icon-sm" variant="ghost" aria-label={`Download ${d.title}`} onClick={() => openDocument(downloadPath(d)).catch((e) => toast.error(e.message))}>
            <Download className="h-4 w-4" />
          </Button>
          {canDelete(d) && (
            <Button size="icon-sm" variant="ghost" aria-label={`Delete ${d.title}`} onClick={() => onDelete(d)}>
              <Trash2 className="h-4 w-4 text-status-danger" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Small upload form for documents. */
export function DocumentUploader({ path, bookings = [], onUploaded, fixedBookingId }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [kind, setKind] = useState('contract');
  const [title, setTitle] = useState('');
  const [bookingId, setBookingId] = useState(fixedBookingId || null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    form.append('title', title);
    if (bookingId) form.append('bookingId', bookingId);
    setBusy(true);
    try {
      const res = await api.upload(path, form);
      toast.success('Document uploaded');
      setFile(null);
      setTitle('');
      if (inputRef.current) inputRef.current.value = '';
      onUploaded?.(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-app-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Type" value={kind} onChange={setKind} options={DOCUMENT_KINDS} />
        <Input label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="e.g. Signed contract" />
        {!fixedBookingId && bookings.length > 0 && (
          <Select label="Booking (optional)" value={bookingId} onChange={setBookingId} clearable options={bookings.map((b) => ({ value: b.id, label: `${b.reference} · ${b.role}` }))} className="sm:col-span-2" placeholder="Not linked to a booking" />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-app-muted file:px-4 file:py-2 file:text-sm file:font-semibold" />
        <Button size="sm" loading={busy} disabled={!file} onClick={submit}>
          Upload
        </Button>
      </div>
      <p className="text-xs text-app-subtle">PDF, Word or a photo of the document, up to 10MB. Documents are private.</p>
    </div>
  );
}