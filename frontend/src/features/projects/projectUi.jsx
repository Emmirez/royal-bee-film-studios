import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Clock, ExternalLink, Lock, MessageSquareWarning, Send } from 'lucide-react';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import { Avatar, Badge, Switch } from '../../components/ui/Primitives';
import { imageUrl } from '../../lib/images';
import { cx, formatDate, formatDateTime } from '../../lib/format';

/** Production stages (mirrors backend constants/projects.js). */
export const PROJECT_STAGES = [
  { value: 'briefing', label: 'Briefing' },
  { value: 'pre_production', label: 'Pre-production' },
  { value: 'production', label: 'Production' },
  { value: 'post_production', label: 'Post-production' },
  { value: 'review', label: 'Client review' },
  { value: 'delivered', label: 'Delivered' },
];
export const stageLabel = (key) => PROJECT_STAGES.find((s) => s.value === key)?.label || key;

export const PROJECT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const STATUS_TONE = { active: 'success', on_hold: 'warning', completed: 'info', cancelled: 'neutral' };

export function ProjectStatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONE[status] || 'neutral'} dot>
      {PROJECT_STATUSES.find((s) => s.value === status)?.label || status}
    </Badge>
  );
}

const DELIVERABLE = {
  awaiting_review: { label: 'Awaiting review', tone: 'warning', icon: Clock },
  approved: { label: 'Approved', tone: 'success', icon: CheckCircle2 },
  changes_requested: { label: 'Changes requested', tone: 'danger', icon: MessageSquareWarning },
};

export function DeliverableStatusBadge({ status }) {
  const d = DELIVERABLE[status] || DELIVERABLE.awaiting_review;
  return (
    <Badge tone={d.tone} dot>
      {d.label}
    </Badge>
  );
}

/** Horizontal stage progress (stacks vertically on phones). */
export function StageTimeline({ stage, history = [] }) {
  const current = Math.max(0, PROJECT_STAGES.findIndex((s) => s.value === stage));
  const reachedAt = (key) => [...history].reverse().find((h) => h.stage === key)?.at;
  return (
    <ol className="grid gap-3 sm:grid-cols-6 sm:gap-0" aria-label="Project progress">
      {PROJECT_STAGES.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const at = reachedAt(s.value);
        return (
          <li key={s.value} className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2 sm:pr-3" aria-current={active ? 'step' : undefined}>
            {/* connector line */}
            {i < PROJECT_STAGES.length - 1 && <span aria-hidden className={cx('absolute left-[15px] top-8 hidden h-0.5 sm:left-8 sm:right-0 sm:top-[15px] sm:block', i < current ? 'bg-app-accent' : 'bg-app-border')} />}
            <span
              className={cx(
                'relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                done && 'border-app-accent bg-app-accent text-app-accent-ink',
                active && 'border-app-accent bg-app-surface text-app-text ring-4 ring-app-accent/20',
                !done && !active && 'border-app-border bg-app-surface text-app-subtle',
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={cx('block text-sm font-semibold', !done && !active && 'text-app-subtle')}>{s.label}</span>
              {(done || active) && at && <span className="block text-xs text-app-subtle">{formatDate(at)}</span>}
              <span className="sr-only">{done ? '(completed)' : active ? '(current stage)' : '(upcoming)'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Link + optional preview image for a deliverable. */
export function DeliverablePreview({ deliverable }) {
  return (
    <div className="flex min-w-0 gap-4">
      {deliverable.previewImage?.url && (
        <img src={imageUrl(deliverable.previewImage, 300)} alt="" className="h-20 w-28 shrink-0 rounded-xl object-cover sm:h-24 sm:w-36" loading="lazy" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{deliverable.title}</p>
          <span className="text-xs text-app-subtle">v{deliverable.version}</span>
          <DeliverableStatusBadge status={deliverable.status} />
        </div>
        {deliverable.description && <p className="mt-1 whitespace-pre-line text-sm text-app-subtle">{deliverable.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-app-subtle">
          {deliverable.link && (
            <a href={deliverable.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-app-text underline-offset-4 hover:underline">
              Open link <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
          {deliverable.dueDate && <span>Due {formatDate(deliverable.dueDate)}</span>}
          <span>Updated {formatDate(deliverable.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

/** Review history for a deliverable (newest first). */
export function DecisionHistory({ decisions = [] }) {
  if (!decisions.length) return null;
  return (
    <ul className="mt-3 space-y-2 border-t border-app-border pt-3">
      {[...decisions].reverse().map((d) => (
        <li key={d.id} className="text-xs text-app-subtle">
          <span className={cx('font-semibold', d.decision === 'approved' ? 'text-status-success' : 'text-status-danger')}>
            {d.decision === 'approved' ? 'Approved' : 'Changes requested'}
          </span>{' '}
          · v{d.version} · {d.by ? `${d.by} · ` : ''}
          {formatDateTime(d.at)}
          {d.comment && <p className="mt-1 whitespace-pre-line rounded-lg bg-app-muted px-3 py-2 text-sm text-app-text">{d.comment}</p>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Conversation between the studio and the client.
 * viewer: 'staff' | 'client' — staff see internal notes and can post them.
 * audience: who the outside party is ('client' or 'talent') — only changes the wording.
 */
export function MessageThread({ messages = [], viewer = 'staff', audience = 'client', onSend, sending, canPost = true, emptyText }) {
  const outsider = audience === 'talent' ? 'Talent' : 'Client';
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    const ok = await onSend({ body: body.trim(), internal: viewer === 'staff' ? internal : undefined });
    if (ok !== false) {
      setBody('');
      setInternal(false);
    }
  };

  return (
    <div>
      <ul className="max-h-[560px] space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && <li className="py-6 text-center text-sm text-app-subtle">{emptyText || 'No messages yet.'}</li>}
        {messages.map((m) => {
          if (m.system) {
            return (
              <li key={m.id} className="flex justify-center">
                <p className="max-w-[90%] rounded-full bg-app-muted px-4 py-1.5 text-center text-xs text-app-subtle">
                  {m.body} · {formatDateTime(m.createdAt)}
                </p>
              </li>
            );
          }
          const mine = viewer === 'client' ? m.fromClient : !m.fromClient;
          return (
            <li key={m.id} className={cx('flex gap-3', mine && 'flex-row-reverse')}>
            <Avatar name={m.author?.name || (m.fromClient ? outsider : 'Studio')} photo={m.author?.photo} size={32} className="mt-1 shrink-0" /> 
              <div className={cx('min-w-0 max-w-[85%]', mine && 'text-right')}>
                <p className="text-xs text-app-subtle">
                <span className="font-semibold text-app-text">{m.author?.name || (m.fromClient ? outsider : 'Studio')}</span>
                  {viewer === 'staff' && m.fromClient && ` · ${audience}`} · {formatDateTime(m.createdAt)}
                </p>
                <div
                  className={cx(
                    'mt-1 inline-block whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-left text-sm',
                    m.internal ? 'border border-dashed border-status-warning/50 bg-status-warning/10' : mine ? 'bg-app-text text-app-bg' : 'bg-app-muted',
                  )}
                >
                  {m.internal && (
                    <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-status-warning">
                      <Lock className="h-3 w-3" aria-hidden /> Internal note
                    </span>
                  )}
                  {m.body}
                </div>
              </div>
            </li>
          );
        })}
        <li ref={endRef} aria-hidden />
      </ul>

      {canPost && (
        <form onSubmit={submit} className="mt-5 space-y-3 border-t border-app-border pt-4">
          <Textarea
            label={viewer === 'staff' ? (internal ? 'Internal note (team only)' : `Message to the ${audience}`) : 'Message the studio'}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            placeholder={viewer === 'staff' ? (internal ? 'Only staff can see this.' : `The ${audience} gets this by email and in their portal.`) : 'Ask a question or share feedback…'}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            {viewer === 'staff' ? <Switch checked={internal} onChange={setInternal} label="Internal note" /> : <span />}
            <Button type="submit" icon={Send} loading={sending} disabled={!body.trim()}>
              {internal ? 'Add note' : 'Send'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}