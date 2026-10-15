import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Save, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import { ErrorState, PageLoader, Tabs } from '../../components/ui/Primitives';
import WorkflowBar from '../../components/admin/WorkflowBar';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useFormState } from '../../hooks/useFormState';
import { useAdminItem, useCrud } from './adminApi';
import { ApiRequestError } from '../../lib/api';
import { P } from '../../lib/permissions';

/**
 * Shared editor shell for workflow content.
 * - toForm(doc) → editable form value; toPayload(form) → API body
 * - renderTab(tab, form, errors) renders the fields
 */
export default function ContentEditor({ resource, basePath, publicPath, label, empty, tabs, toForm = (d) => d, toPayload = (f) => f, renderTab }) {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: doc, isLoading, error, refetch } = useAdminItem(resource, isNew ? null : id, { enabled: !isNew });
  const { create, update, remove, transition } = useCrud(resource);
  const form = useFormState(isNew ? empty : null);
  const [tab, setTab] = useState(tabs[0].value);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (doc && !form.dirty) form.reset(toForm(doc));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  if (!isNew && isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!form.value) return <PageLoader />;

  const canEdit = can(P.CMS_EDIT) && (doc?.status !== 'published' || (can(P.CMS_PUBLISH) && can(P.CMS_APPROVE)));

  const save = async () => {
    setErrors({});
    try {
      const body = toPayload(form.value);
      if (isNew) {
        const created = await create.mutateAsync(body);
        form.reset(toForm(created));
        toast.success(`${label} created as a draft`);
        navigate(`${basePath}/${created._id}`, { replace: true });
      } else {
        const saved = await update.mutateAsync({ id, ...body });
        form.reset(toForm(saved));
        toast.success(saved.status === 'published' ? 'Saved — live on the website' : saved.status === 'draft' && doc?.status === 'approved' ? 'Saved — sent back to draft for re-approval' : 'Changes saved');
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 422) {
        setErrors(err.fieldErrors);
        toast.error('Some fields need attention');
      } else toast.error(err.message);
    }
  };

  const del = async () => {
    if (!(await confirm({ title: `Delete this ${label.toLowerCase()}?`, message: 'This permanently removes it. This can’t be undone.', tone: 'danger', confirmLabel: 'Delete', typeToConfirm: 'DELETE' }))) return;
    try {
      await remove.mutateAsync(id);
      toast.success(`${label} deleted`);
      navigate(basePath);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onTransition = async (body) => {
    const next = await transition.mutateAsync({ id, ...body });
    form.reset(toForm(next));
  };

  const title = form.value.title || form.value.name || `New ${label.toLowerCase()}`;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button type="button" onClick={() => navigate(basePath)} className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-app-subtle hover:text-app-text">
            <ArrowLeft className="h-4 w-4" /> All {label.toLowerCase()}s
          </button>
          <h1 className="truncate font-display text-3xl font-semibold">{title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isNew && doc?.status === 'published' && publicPath && (
            <Button href={`${publicPath}/${doc.slug}`} variant="ghost" icon={ExternalLink}>
              View live
            </Button>
          )}
          {!isNew && can(P.CMS_DELETE) && ['draft', 'archived'].includes(doc?.status) && (
            <Button variant="ghost" icon={Trash2} className="text-status-danger" onClick={del}>
              Delete
            </Button>
          )}
          {canEdit && (
            <Button icon={Save} loading={create.isPending || update.isPending} disabled={!isNew && !form.dirty} onClick={save}>
              {isNew ? 'Create draft' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {!isNew && <WorkflowBar item={doc} onTransition={onTransition} dirty={form.dirty} busy={transition.isPending} />}
      {!canEdit && !isNew && can(P.CMS_EDIT) && <p className="mt-3 text-sm text-status-warning">This item is live. Only publishers can edit it — or unpublish it first.</p>}

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="my-6 w-fit max-w-full" />
      <fieldset disabled={!canEdit}>{renderTab(tab, form, errors)}</fieldset>
    </>
  );
}
