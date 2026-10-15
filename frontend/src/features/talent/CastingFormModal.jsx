import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { useAdminList, useAdminMutation } from '../admin/adminApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, ApiRequestError } from '../../lib/api';
import { P } from '../../lib/permissions';
import { TypePicker, toDateInput } from './talentUi';

const EMPTY = { title: '', description: '', requirements: '', talentTypes: [], projectId: null, location: '', shootDates: '', fee: '', applyBy: '' };

export const castingToForm = (c) => ({
  id: c.id,
  title: c.title,
  description: c.description || '',
  requirements: c.requirements || '',
  talentTypes: c.talentTypes || [],
  projectId: c.project?.id || null,
  location: c.location || '',
  shootDates: c.shootDates || '',
  fee: c.fee || '',
  applyBy: toDateInput(c.applyBy),
});

/** Create or edit a casting call. */
export default function CastingFormModal({ open, onClose, initial, onSaved }) {
  const { can } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const isEdit = Boolean(initial?.id);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, ...(initial || {}) });
      setErrors({});
    }
  }, [open, initial]);

  const { data: projects } = useAdminList('/projects', { limit: 100 }, { enabled: open && can(P.PROJECTS_VIEW), staleTime: 60_000 });
  const save = useAdminMutation('/castings', (body) => (isEdit ? api.patch(`/castings/${initial.id}`, body) : api.post('/castings', body)).then((r) => r.data));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async () => {
    setErrors({});
    const { id, ...body } = form;
    try {
      const saved = await save.mutateAsync({ ...body, applyBy: form.applyBy || null, projectId: form.projectId || null });
      toast.success(isEdit ? 'Casting call saved' : 'Casting call saved as a draft');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (err instanceof ApiRequestError) setErrors(err.fieldErrors);
      toast.error(err.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit casting call' : 'New casting call'}
      description={isEdit ? undefined : 'Saved as a draft — talent see it once you open it.'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={submit}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Title" required value={form.title} onChange={set('title')} error={errors.title} maxLength={160} className="sm:col-span-2" placeholder="e.g. Female lead (25–30) — bank commercial" />
        <div className="sm:col-span-2">
          <TypePicker label="Who is it for?" value={form.talentTypes} onChange={set('talentTypes')} />
          <p className="mt-1 text-xs text-app-subtle">Talent with these types get an email when you open it. Leave empty to show it to everyone.</p>
        </div>
        <Textarea label="Description" rows={5} value={form.description} onChange={set('description')} maxLength={4000} className="sm:col-span-2" placeholder="The project, the role and the character." />
        <Textarea label="Requirements" rows={3} value={form.requirements} onChange={set('requirements')} maxLength={2000} className="sm:col-span-2" placeholder="Age range, look, skills, languages…" />
        <Input label="Location" value={form.location} onChange={set('location')} maxLength={160} />
        <Input label="Shoot dates" value={form.shootDates} onChange={set('shootDates')} maxLength={160} placeholder="e.g. 10–12 November" />
        <Input label="Fee (shown to talent)" value={form.fee} onChange={set('fee')} maxLength={160} placeholder="e.g. ₦300,000 per day" />
        <Input label="Apply by" type="date" value={form.applyBy} onChange={set('applyBy')} error={errors.applyBy} />
        {can(P.PROJECTS_VIEW) && (
          <Select label="Project (optional)" value={form.projectId} onChange={set('projectId')} clearable searchable options={(projects?.data || []).map((p) => ({ value: p.id, label: p.title, description: p.reference }))} className="sm:col-span-2" placeholder="Not linked to a client project" />
        )}
      </div>
    </Modal>
  );
}