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
import { toDateInput } from './talentUi';

const EMPTY = { talentId: null, projectId: null, castingApplicationId: null, role: '', details: '', startDate: '', endDate: '', callTime: '', location: '', fee: { amount: '', currency: 'NGN', note: '' } };

export const bookingToForm = (b) => ({
  id: b.id,
  projectId: b.project?.id || null,
  role: b.role,
  details: b.details || '',
  startDate: toDateInput(b.startDate),
  endDate: toDateInput(b.endDate),
  callTime: b.callTime || '',
  location: b.location || '',
  fee: { amount: b.fee?.amount ?? '', currency: b.fee?.currency || 'NGN', note: b.fee?.note || '' },
});

/**
 * Offer a new booking (or edit one). `initial` can pre-fill talentId,
 * castingApplicationId, role, location… `fixedTalent` hides the talent picker.
 */
export default function BookingModal({ open, onClose, initial, fixedTalent, onSaved }) {
  const { can } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const isEdit = Boolean(initial?.id);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, ...(initial || {}), fee: { ...EMPTY.fee, ...(initial?.fee || {}) } });
      setErrors({});
    }
  }, [open, initial]);

  const { data: roster } = useAdminList('/talent', { status: 'approved', limit: 100 }, { enabled: open && !fixedTalent && !isEdit, staleTime: 60_000 });
  const { data: projects } = useAdminList('/projects', { limit: 100 }, { enabled: open && can(P.PROJECTS_VIEW), staleTime: 60_000 });
  const save = useAdminMutation(
    '/bookings',
    (body) => (isEdit ? api.patch(`/bookings/${initial.id}`, body) : api.post('/bookings', body)).then((r) => r.data),
    { invalidate: [['admin', '/talent'], ['admin', '/castings'], ['admin', 'notifications']] },
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const setFee = (k, v) => setForm((f) => ({ ...f, fee: { ...f.fee, [k]: v } }));

  const submit = async () => {
    setErrors({});
    const { id, ...rest } = form;
    const body = {
      ...rest,
      endDate: form.endDate || null,
      projectId: form.projectId || null,
      fee: { amount: form.fee.amount === '' ? null : Number(form.fee.amount), currency: form.fee.currency, note: form.fee.note },
    };
    if (isEdit) {
      delete body.talentId;
      delete body.castingApplicationId;
    }
    try {
      const saved = await save.mutateAsync(body);
      toast.success(isEdit ? 'Booking updated — the talent has been told' : 'Booking offered — the talent has been emailed');
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
      title={isEdit ? 'Edit booking' : `Offer a booking${fixedTalent ? ` to ${fixedTalent}` : ''}`}
      description={isEdit ? 'If dates, time, place or fee change, the talent gets an email.' : 'The talent gets an email and confirms or declines in their portal.'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={submit}>
            {isEdit ? 'Save changes' : 'Send offer'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {!fixedTalent && !isEdit && (
          <Select
            label="Talent"
            required
            searchable
            value={form.talentId}
            onChange={set('talentId')}
            error={errors.talentId}
            options={(roster?.data || []).map((t) => ({ value: t.id, label: t.displayName, description: [t.talentTypeLabels?.join(', '), t.city].filter(Boolean).join(' · ') }))}
            className="sm:col-span-2"
          />
        )}
        <Input label="Role / job" required value={form.role} onChange={set('role')} error={errors.role} maxLength={160} className="sm:col-span-2" placeholder="e.g. Lead — bank commercial" />
        <Input label="First day" type="date" required value={form.startDate} onChange={set('startDate')} error={errors.startDate} />
        <Input label="Last day (optional)" type="date" value={form.endDate} onChange={set('endDate')} error={errors.endDate} />
        <Input label="Call time" value={form.callTime} onChange={set('callTime')} maxLength={60} placeholder="e.g. 6:30am" />
        <Input label="Location" value={form.location} onChange={set('location')} maxLength={200} />
        <Input label="Fee" type="number" min="0" value={form.fee.amount} onChange={(e) => setFee('amount', e.target.value)} error={errors['fee.amount']} />
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Select label="Currency" value={form.fee.currency} onChange={(v) => setFee('currency', v)} options={['NGN', 'USD', 'GBP'].map((c) => ({ value: c, label: c }))} />
          <Input label="Fee note" value={form.fee.note} onChange={(e) => setFee('note', e.target.value)} maxLength={200} placeholder="per day" />
        </div>
        {can(P.PROJECTS_VIEW) && (
          <Select label="Project (optional)" value={form.projectId} onChange={set('projectId')} clearable searchable options={(projects?.data || []).map((p) => ({ value: p.id, label: p.title, description: p.reference }))} className="sm:col-span-2" placeholder="Not linked to a client project" />
        )}
        <Textarea label="Details for the talent" rows={4} value={form.details} onChange={set('details')} maxLength={3000} className="sm:col-span-2" placeholder="What to bring, wardrobe, contact on the day…" />
      </div>
    </Modal>
  );
}