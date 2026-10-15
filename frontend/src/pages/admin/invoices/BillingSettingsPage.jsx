import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Landmark, Plus, Save, Trash2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import { Card, ErrorState, PageHeader, PageLoader, Switch } from '../../../components/ui/Primitives';
import { useAdminMutation } from '../../../features/admin/adminApi';
import { CURRENCIES } from '../../../features/invoices/invoiceUi';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { api, ApiRequestError } from '../../../lib/api';
import { P } from '../../../lib/permissions';

const FIELDS = ['businessName', 'address', 'email', 'phone', 'taxId', 'defaultCurrency', 'vatEnabledByDefault', 'defaultVatRate', 'paymentTermsDays', 'quoteValidDays', 'bankAccounts', 'defaultNotes', 'defaultTerms'];
const blankBank = (currency = 'NGN') => ({ currency, bankName: '', accountName: '', accountNumber: '', extra: '' });

/** Business + bank details printed on invoices, quotes, receipts and emails. */
export default function BillingSettingsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const manage = can(P.INVOICES_MANAGE);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', '/invoices', 'settings'], queryFn: async () => (await api.get('/invoices/settings')).data });
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const save = useAdminMutation('/invoices', (body) => api.patch('/invoices/settings', body).then((r) => r.data));

  useEffect(() => {
    if (data && !form) setForm(Object.fromEntries(FIELDS.map((k) => [k, data[k] ?? ''])));
  }, [data, form]);

  if (isLoading || (!form && !error)) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const setBank = (idx, k, v) => setForm((f) => ({ ...f, bankAccounts: f.bankAccounts.map((b, i) => (i === idx ? { ...b, [k]: v } : b)) }));

  const submit = async () => {
    setErrors({});
    try {
      await save.mutateAsync({
        ...form,
        defaultVatRate: Number(form.defaultVatRate) || 0,
        paymentTermsDays: Number(form.paymentTermsDays) || 0,
        quoteValidDays: Number(form.quoteValidDays) || 1,
      });
      toast.success('Billing details saved');
    } catch (err) {
      if (err instanceof ApiRequestError) setErrors(err.fieldErrors);
      toast.error(err.message);
    }
  };

  return (
    <>
      <Link to="/admin/invoices" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-app-subtle hover:text-app-text">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Invoices & quotes
      </Link>
      <PageHeader
        eyebrow="Invoices & quotes"
        title="Billing details"
        description="Printed on every invoice, quote and PDF, and included in invoice emails."
        actions={manage && <Button icon={Save} loading={save.isPending} onClick={submit}>Save</Button>}
      />
      <fieldset disabled={!manage} className="grid gap-6 xl:grid-cols-2">
        <Card title="Business">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Business name" required value={form.businessName} onChange={set('businessName')} error={errors.businessName} className="sm:col-span-2" />
            <Textarea label="Address" rows={3} value={form.address} onChange={set('address')} maxLength={500} className="sm:col-span-2" />
            <Input label="Billing email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
            <Input label="Phone" value={form.phone} onChange={set('phone')} />
            <Input label="Tax ID (TIN)" value={form.taxId} onChange={set('taxId')} className="sm:col-span-2" />
          </div>
        </Card>

        <Card title="Defaults for new documents">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Default currency" value={form.defaultCurrency} onChange={set('defaultCurrency')} options={CURRENCIES} className="sm:col-span-2" />
            <Input label="Invoice due after (days)" type="number" min="0" max="365" value={form.paymentTermsDays} onChange={set('paymentTermsDays')} error={errors.paymentTermsDays} />
            <Input label="Quotes valid for (days)" type="number" min="1" max="365" value={form.quoteValidDays} onChange={set('quoteValidDays')} error={errors.quoteValidDays} />
            <Switch className="sm:col-span-2" checked={form.vatEnabledByDefault} onChange={set('vatEnabledByDefault')} label="Add VAT by default" />
            <Input label="Default VAT rate (%)" type="number" min="0" max="100" step="0.01" value={form.defaultVatRate} onChange={set('defaultVatRate')} error={errors.defaultVatRate} />
          </div>
        </Card>

        <Card
          title="Bank accounts"
          description="Clients see the account(s) matching the invoice currency. Add one per currency."
          className="xl:col-span-2"
          actions={manage && form.bankAccounts.length < 10 && <Button size="sm" variant="secondary" icon={Plus} onClick={() => setForm((f) => ({ ...f, bankAccounts: [...f.bankAccounts, blankBank()] }))}>Add account</Button>}
        >
          {form.bankAccounts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-app-subtle">
              <Landmark className="h-6 w-6" aria-hidden />
              <p>No bank accounts yet — add one so clients know where to pay.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {form.bankAccounts.map((b, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={idx} className="rounded-2xl border border-app-border p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Select label="Currency" value={b.currency} onChange={(v) => setBank(idx, 'currency', v)} options={CURRENCIES} />
                    <Input label="Bank name" value={b.bankName} onChange={(e) => setBank(idx, 'bankName', e.target.value)} />
                    <Input label="Account name" value={b.accountName} onChange={(e) => setBank(idx, 'accountName', e.target.value)} />
                    <Input label="Account number" value={b.accountNumber} onChange={(e) => setBank(idx, 'accountNumber', e.target.value)} />
                    <Input label="Other details (optional)" value={b.extra} onChange={(e) => setBank(idx, 'extra', e.target.value)} placeholder="SWIFT / IBAN / sort code" className="sm:col-span-2 lg:col-span-3" />
                    <div className="flex items-end">
                      {manage && (
                        <Button variant="ghost" icon={Trash2} className="text-status-danger" onClick={() => setForm((f) => ({ ...f, bankAccounts: f.bankAccounts.filter((_, i) => i !== idx) }))}>
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Default notes & terms" className="xl:col-span-2">
          <div className="grid gap-4 lg:grid-cols-2">
            <Textarea label="Notes (new invoices & quotes)" rows={4} value={form.defaultNotes} onChange={set('defaultNotes')} maxLength={2000} />
            <Textarea label="Payment terms (new invoices)" rows={4} value={form.defaultTerms} onChange={set('defaultTerms')} maxLength={3000} />
          </div>
        </Card>
      </fieldset>
    </>
  );
}