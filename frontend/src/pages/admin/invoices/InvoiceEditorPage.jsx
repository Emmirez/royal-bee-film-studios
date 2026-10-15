import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Lock, Plus, Save, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import { Card, EmptyState, ErrorState, PageHeader, PageLoader, Switch } from '../../../components/ui/Primitives';
import { useAdminList, useAdminMutation } from '../../../features/admin/adminApi';
import { CURRENCIES, addDaysInput, computeTotals, money, toDateInput, todayInput } from '../../../features/invoices/invoiceUi';
import { useToast } from '../../../context/ToastContext';
import { api, ApiRequestError } from '../../../lib/api';

const blankLine = () => ({ description: '', quantity: 1, unitPrice: '' });
const DISCOUNTS = [
  { value: 'none', label: 'No discount' },
  { value: 'percent', label: 'Percentage (%)' },
  { value: 'amount', label: 'Fixed amount' },
];

/** Create or edit an invoice/quote. Totals are previewed here and recalculated by the server. */
export default function InvoiceEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  const settingsQ = useQuery({ queryKey: ['admin', '/invoices', 'settings'], queryFn: async () => (await api.get('/invoices/settings')).data });
  const docQ = useQuery({ queryKey: ['admin', '/invoices', 'item', id], queryFn: async () => (await api.get(`/invoices/${id}`)).data, enabled: !isNew });
  const { data: clients } = useAdminList('/clients', { limit: 200 }, { staleTime: 60_000 });
  const { data: projects } = useAdminList('/projects', { clientId: form?.clientId || undefined, limit: 100 }, { enabled: Boolean(form?.clientId) });

  // Build the starting form once the data is in
  useEffect(() => {
    if (form) return;
    const s = settingsQ.data;
    if (!s) return;
    if (isNew) {
      const kind = params.get('kind') === 'quote' ? 'quote' : 'invoice';
      const issueDate = todayInput();
      setForm({
        kind,
        clientId: params.get('clientId') || null,
        projectId: params.get('projectId') || null,
        title: '',
        currency: s.defaultCurrency || 'NGN',
        issueDate,
        dueDate: addDaysInput(issueDate, kind === 'quote' ? s.quoteValidDays : s.paymentTermsDays),
        items: [blankLine()],
        discountType: 'none',
        discountValue: 0,
        vatEnabled: s.vatEnabledByDefault,
        vatRate: s.defaultVatRate,
        notes: s.defaultNotes || '',
        terms: kind === 'invoice' ? s.defaultTerms || '' : '',
      });
    } else if (docQ.data) {
      const d = docQ.data;
      setForm({
        kind: d.kind,
        status: d.status,
        reference: d.reference,
        clientId: d.client?.id || null,
        projectId: d.project?.id || null,
        title: d.title || '',
        currency: d.currency,
        issueDate: toDateInput(d.issueDate),
        dueDate: toDateInput(d.dueDate),
        items: d.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
        discountType: d.discountType,
        discountValue: d.discountValue,
        vatEnabled: d.vatEnabled,
        vatRate: d.vatRate,
        notes: d.notes || '',
        terms: d.terms || '',
        payments: d.payments,
      });
    }
  }, [settingsQ.data, docQ.data, form, isNew, params]);

  const totals = useMemo(() => (form ? computeTotals(form) : null), [form]);
  const save = useAdminMutation('/invoices', (body) => (isNew ? api.post('/invoices', body) : api.patch(`/invoices/${id}`, body)).then((r) => r.data));

  if (settingsQ.isLoading || (!isNew && docQ.isLoading)) return <PageLoader />;
  if (settingsQ.error || docQ.error) return <ErrorState error={settingsQ.error || docQ.error} onRetry={() => (settingsQ.error ? settingsQ.refetch() : docQ.refetch())} />;
  if (!form) return <PageLoader />;

  const isQuote = form.kind === 'quote';
  const word = isQuote ? 'quote' : 'invoice';
  const locked = !isNew && (form.payments?.length || !['draft', 'sent'].includes(form.status));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const setLine = (idx, k, value) => setForm((f) => ({ ...f, items: f.items.map((l, i) => (i === idx ? { ...l, [k]: value } : l)) }));
  const lineError = (idx, k) => errors[`items.${idx}.${k}`];

  const clientOptions = (clients?.data || [])
    .filter((c) => c.status !== 'deactivated' || c.id === form.clientId)
    .map((c) => ({ value: c.id, label: c.fullName, description: [c.organization, c.email].filter(Boolean).join(' · ') }));
  const projectOptions = (projects?.data || []).map((p) => ({ value: p.id, label: p.title, description: p.reference }));

  const submit = async () => {
    setErrors({});
    const { status, reference, payments, kind, ...rest } = form;
    const body = {
      ...rest,
      ...(isNew ? { kind } : {}),
      projectId: form.projectId || null,
      dueDate: form.dueDate || null,
      discountValue: Number(form.discountValue) || 0,
      vatRate: Number(form.vatRate) || 0,
      items: form.items.map((l) => ({ description: l.description, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice || 0) })),
    };
    try {
      const saved = await save.mutateAsync(body);
      toast.success(isNew ? `${isQuote ? 'Quote' : 'Invoice'} saved as a draft` : 'Changes saved');
      navigate(`/admin/invoices/${saved.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiRequestError) setErrors(err.fieldErrors);
      toast.error(err.message);
    }
  };

  return (
    <>
      <Link to={isNew ? '/admin/invoices' : `/admin/invoices/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {isNew ? 'Invoices & quotes' : `Back to ${form.reference}`}
      </Link>
      <PageHeader
        eyebrow={isNew ? (isQuote ? 'New quote' : 'New invoice') : form.reference}
        title={isNew ? (isQuote ? 'Create a quote' : 'Create an invoice') : `Edit ${word}`}
        description={isNew ? `It’s saved as a draft first — the client sees nothing until you send it.` : form.status === 'sent' ? `Already sent — after saving, use “Resend” so the client gets the updated ${word}.` : undefined}
      />

      {locked ? (
        <EmptyState icon={Lock} title={`This ${word} can’t be edited`} message="Payments have been recorded, it has been answered, or it was cancelled." action={<Button variant="secondary" to={`/admin/invoices/${id}`}>Back to it</Button>} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            <Card title="Client">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Client"
                  required
                  value={form.clientId}
                  onChange={(v) => setForm((f) => ({ ...f, clientId: v, projectId: null }))}
                  options={clientOptions}
                  error={errors.clientId}
                  searchable
                  disabled={!isNew && form.status !== 'draft'}
                  placeholder={clientOptions.length ? 'Choose a client…' : 'Invite a client first'}
                />
                <Select label="Project (optional)" value={form.projectId} onChange={set('projectId')} options={projectOptions} error={errors.projectId} clearable disabled={!form.clientId} placeholder={form.clientId ? 'Not linked to a project' : 'Choose a client first'} />
                <Input label="Title (optional)" value={form.title} onChange={set('title')} maxLength={160} className="sm:col-span-2" placeholder="e.g. Brand film — spring campaign" />
              </div>
            </Card>

            <Card title="Items" description="Each line is quantity × unit price.">
              <ul className="space-y-3">
                {form.items.map((line, idx) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={idx} className="rounded-2xl border border-app-border p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_90px_160px]">
                      <Textarea label="Description" rows={2} value={line.description} onChange={(e) => setLine(idx, 'description', e.target.value)} error={lineError(idx, 'description')} maxLength={500} />
                      <Input label="Qty" type="number" min="0" step="any" inputMode="decimal" value={line.quantity} onChange={(e) => setLine(idx, 'quantity', e.target.value)} error={lineError(idx, 'quantity')} />
                      <Input label={`Unit price (${form.currency})`} type="number" min="0" step="0.01" inputMode="decimal" value={line.unitPrice} onChange={(e) => setLine(idx, 'unitPrice', e.target.value)} error={lineError(idx, 'unitPrice')} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-app-subtle">
                        Line total: <span className="font-semibold text-app-text tabular">{money(totals.lines[idx], form.currency)}</span>
                      </span>
                      {form.items.length > 1 && (
                        <Button size="sm" variant="ghost" icon={Trash2} className="text-status-danger" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {errors.items && <p className="field-error mt-2">{errors.items}</p>}
              <Button variant="secondary" icon={Plus} className="mt-4" onClick={() => setForm((f) => ({ ...f, items: [...f.items, blankLine()] }))} disabled={form.items.length >= 100}>
                Add line
              </Button>
            </Card>

            <Card title="Notes & terms" description="Shown on the document and the PDF.">
              <div className="space-y-4">
                <Textarea label="Notes for the client" rows={3} value={form.notes} onChange={set('notes')} maxLength={2000} />
                <Textarea label="Terms" rows={3} value={form.terms} onChange={set('terms')} maxLength={3000} />
              </div>
            </Card>
          </div>

          <div className="min-w-0 space-y-6">
            <Card title="Details">
              <div className="space-y-4">
                <Select label="Currency" value={form.currency} onChange={set('currency')} options={CURRENCIES} />
                <Input label="Issue date" type="date" required value={form.issueDate} onChange={set('issueDate')} error={errors.issueDate} />
                <Input label={isQuote ? 'Valid until' : 'Payment due'} type="date" value={form.dueDate} onChange={set('dueDate')} error={errors.dueDate} />
              </div>
            </Card>

            <Card title="Discount & VAT">
              <div className="space-y-4">
                <Select label="Discount" value={form.discountType} onChange={set('discountType')} options={DISCOUNTS} />
                {form.discountType !== 'none' && (
                  <Input
                    label={form.discountType === 'percent' ? 'Discount (%)' : `Discount (${form.currency})`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discountValue}
                    onChange={set('discountValue')}
                    error={errors.discountValue}
                  />
                )}
                <Switch checked={form.vatEnabled} onChange={set('vatEnabled')} label="Add VAT" description="Worked out after any discount." />
                {form.vatEnabled && <Input label="VAT rate (%)" type="number" min="0" max="100" step="0.01" value={form.vatRate} onChange={set('vatRate')} error={errors.vatRate} />}
              </div>
            </Card>

            <Card title="Total">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-app-subtle">Subtotal</dt>
                  <dd className="tabular">{money(totals.subtotal, form.currency)}</dd>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-app-subtle">Discount</dt>
                    <dd className="tabular">− {money(totals.discountAmount, form.currency)}</dd>
                  </div>
                )}
                {form.vatEnabled && (
                  <div className="flex justify-between">
                    <dt className="text-app-subtle">VAT ({form.vatRate || 0}%)</dt>
                    <dd className="tabular">{money(totals.vatAmount, form.currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-app-border pt-3 text-lg font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular">{money(totals.total, form.currency)}</dd>
                </div>
              </dl>
              <Button icon={Save} className="mt-5 w-full justify-center" loading={save.isPending} onClick={submit}>
                {isNew ? 'Save draft' : 'Save changes'}
              </Button>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}