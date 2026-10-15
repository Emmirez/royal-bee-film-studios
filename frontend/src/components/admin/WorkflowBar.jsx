import { useState } from 'react';
import { Archive, CalendarClock, CheckCircle2, EyeOff, RotateCcw, Send, Upload, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { StatusBadge } from '../ui/Primitives';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { P } from '../../lib/permissions';
import { formatDateTime } from '../../lib/format';
import { useAdminItem } from '../../features/admin/adminApi';

/** Whether content must be approved before publishing (studio setting). */
export function useApprovalRequired() {
  const { data } = useAdminItem('/cms/settings', null, { staleTime: 5 * 60 * 1000 });
  return data?.workflow?.contentApprovalRequired !== false;
}

const toLocalInput = (d) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

/**
 * Status + actions for full-workflow content (services, productions, news, sections).
 * The server enforces every rule; buttons only appear when they could succeed.
 */
export default function WorkflowBar({ item, onTransition, dirty, busy }) {
  const { can } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [publishAt, setPublishAt] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const approvalRequired = useApprovalRequired();
  const status = item?.status;

  const run = async (action, extra = {}, success) => {
    try {
      await onTransition({ action, ...extra });
      toast.success(success);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const reject = async () => {
    const res = await confirm({ title: 'Send back for changes', message: 'Explain what needs to change before this can be approved.', withComment: true, commentRequired: true, commentLabel: 'What needs to change?', confirmLabel: 'Send back' });
    if (res) run('reject', { comment: res.comment }, 'Sent back to draft');
  };

  const openSchedule = () => {
    setPublishAt(toLocalInput(item.publishAt));
    setExpireAt(toLocalInput(item.expireAt));
    setScheduleOpen(true);
  };

  const publish = async () => {
    await run('publish', { publishAt: publishAt ? new Date(publishAt).toISOString() : null, expireAt: expireAt ? new Date(expireAt).toISOString() : null }, publishAt && new Date(publishAt) > new Date() ? 'Scheduled for publication' : 'Published — now live on the website');
    setScheduleOpen(false);
  };

  if (!item) return null;
  const scheduled = status === 'published' && item.publishAt && new Date(item.publishAt) > new Date();
  const lastReject = [...(item.reviewHistory || [])].reverse().find((h) => h.action === 'reject');

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-app-border bg-app-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={status} label={scheduled ? 'Scheduled' : undefined} />
        {scheduled && <span className="text-app-subtle">goes live {formatDateTime(item.publishAt)}</span>}
        {status === 'published' && item.expireAt && <span className="text-app-subtle">· expires {formatDateTime(item.expireAt)}</span>}
        {status === 'draft' && lastReject?.comment && <span className="text-status-warning">Changes requested: “{lastReject.comment}”</span>}
        {dirty && <span className="text-status-warning">· Unsaved changes</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {status === 'draft' && can(P.CMS_EDIT) && (
          <Button size="sm" variant="secondary" icon={Send} disabled={dirty || busy} onClick={() => run('submit', {}, 'Submitted for review')}>
            Submit for review
          </Button>
        )}
        {status === 'in_review' && can(P.CMS_APPROVE) && (
          <>
            <Button size="sm" variant="ghost" icon={XCircle} disabled={busy} onClick={reject}>
              Request changes
            </Button>
            <Button size="sm" variant="secondary" icon={CheckCircle2} disabled={dirty || busy} onClick={() => run('approve', {}, 'Approved')}>
              Approve
            </Button>
          </>
        )}
        {(status === 'approved' || (!approvalRequired && ['draft', 'in_review'].includes(status))) && can(P.CMS_PUBLISH) && (
          <Button size="sm" variant="accent" icon={Upload} disabled={dirty || busy} onClick={openSchedule}>
            Publish…
          </Button>
        )}
        {status === 'published' && can(P.CMS_PUBLISH) && (
          <>
            <Button size="sm" variant="ghost" icon={CalendarClock} disabled={busy} onClick={openSchedule}>
              Schedule
            </Button>
            <Button size="sm" variant="secondary" icon={EyeOff} disabled={busy} onClick={async () => (await confirm({ title: 'Unpublish?', message: 'This will remove it from the public website.', confirmLabel: 'Unpublish' })) && run('unpublish', {}, 'Unpublished')}>
              Unpublish
            </Button>
          </>
        )}
        {['draft', 'approved', 'published'].includes(status) && can(P.CMS_PUBLISH) && (
          <Button size="sm" variant="ghost" icon={Archive} disabled={busy} onClick={async () => (await confirm({ title: 'Archive this item?', message: 'Archived items are hidden from the website and can be restored later.', confirmLabel: 'Archive' })) && run('archive', {}, 'Archived')}>
            Archive
          </Button>
        )}
        {status === 'archived' && can(P.CMS_EDIT) && (
          <Button size="sm" variant="secondary" icon={RotateCcw} disabled={busy} onClick={() => run('restore', {}, 'Restored to draft')}>
            Restore
          </Button>
        )}
      </div>

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title={status === 'published' ? 'Update schedule' : 'Publish'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" loading={busy} onClick={publish}>
              {publishAt && new Date(publishAt) > new Date() ? 'Schedule' : status === 'published' ? 'Save' : 'Publish now'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Publish at (optional)" type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} hint="Leave empty to publish immediately." />
          <Input label="Expire at (optional)" type="datetime-local" value={expireAt} onChange={(e) => setExpireAt(e.target.value)} hint="Hidden from the website after this time." />
        </div>
      </Modal>
    </div>
  );
}

/** Draft/publish controls for singleton content (hero, founder). */
export function SingletonWorkflowBar({ doc, onAction, dirty, busy }) {
  const { can } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const approvalRequired = useApprovalRequired();
  if (!doc) return null;

  const run = async (action, body = {}, success) => {
    try {
      await onAction(action, body);
      toast.success(success);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const status = doc.reviewStatus;
  const label = !doc.hasUnpublishedChanges ? 'Published — no changes' : status === 'in_review' ? 'In review' : status === 'approved' ? 'Approved — ready to publish' : 'Draft changes';
  const tone = !doc.hasUnpublishedChanges ? 'published' : status === 'editing' ? 'draft' : status;
  const lastReject = [...(doc.reviewHistory || [])].reverse().find((h) => h.action === 'reject');

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-app-border bg-app-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={tone} label={label} />
        {doc.publishedAt && <span className="text-app-subtle">Last published {formatDateTime(doc.publishedAt)}</span>}
        {status === 'editing' && doc.hasUnpublishedChanges && lastReject?.comment && <span className="text-status-warning">Changes requested: “{lastReject.comment}”</span>}
        {dirty && <span className="text-status-warning">· Unsaved changes</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {doc.hasUnpublishedChanges && doc.published && can(P.CMS_EDIT) && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={async () => (await confirm({ title: 'Discard draft changes?', message: 'The draft will be reset to what is currently live.', tone: 'danger', confirmLabel: 'Discard' })) && run('discard', {}, 'Draft reset to the live version')}>
            Discard changes
          </Button>
        )}
        {status === 'editing' && doc.hasUnpublishedChanges && can(P.CMS_EDIT) && (
          <Button size="sm" variant="secondary" icon={Send} disabled={dirty || busy} onClick={() => run('submit', {}, 'Submitted for review')}>
            Submit for review
          </Button>
        )}
        {status === 'in_review' && can(P.CMS_APPROVE) && (
          <>
            <Button
              size="sm"
              variant="ghost"
              icon={XCircle}
              disabled={busy}
              onClick={async () => {
                const res = await confirm({ title: 'Request changes', withComment: true, commentRequired: true, commentLabel: 'What needs to change?', confirmLabel: 'Send back' });
                if (res) run('reject', { comment: res.comment }, 'Sent back for changes');
              }}
            >
              Request changes
            </Button>
            <Button size="sm" variant="secondary" icon={CheckCircle2} disabled={dirty || busy} onClick={() => run('approve', {}, 'Approved')}>
              Approve
            </Button>
          </>
        )}
        {doc.hasUnpublishedChanges && can(P.CMS_PUBLISH) && (status === 'approved' || !approvalRequired) && (
          <Button size="sm" variant="accent" icon={Upload} disabled={dirty || busy} onClick={async () => (await confirm({ title: 'Publish to the website?', message: 'Visitors will see these changes immediately.', confirmLabel: 'Publish' })) && run('publish', {}, 'Published — now live')}>
            Publish
          </Button>
        )}
      </div>
    </div>
  );
}
