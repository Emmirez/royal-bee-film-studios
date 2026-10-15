import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Receipt } from 'lucide-react';
import Seo from '../../components/public/Seo';
import { EmptyState, ErrorState, PageLoader, Tabs } from '../../components/ui/Primitives';
import { DocStatusBadge, day, money } from '../../features/invoices/invoiceUi';
import { api } from '../../lib/api';
import { cx } from '../../lib/format';

/** Client portal: the client's invoices and quotes. */
export default function PortalInvoicesPage() {
  const [kind, setKind] = useState('invoice');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['portal', 'invoices'], queryFn: async () => (await api.get('/portal/invoices')).data, refetchOnWindowFocus: true });
  const all = data || [];
  const items = all.filter((d) => d.kind === kind);
  const quotesWaiting = all.filter((d) => d.kind === 'quote' && d.displayStatus === 'sent').length;

  // Outstanding balance per currency
  const due = {};
  all.filter((d) => d.kind === 'invoice' && ['sent', 'part_paid'].includes(d.status)).forEach((d) => {
    due[d.currency] = (due[d.currency] || 0) + d.balance;
  });

  return (
    <>
      <Seo title="Invoices" noIndex />
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-app-accent">Client portal</p>
        <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Invoices & quotes</h1>
        <p className="mt-2 max-w-2xl text-app-subtle">Download your invoices and receipts, and accept quotes. Payments are made by bank transfer — the details are on each invoice.</p>
      </div>

      {Object.keys(due).length > 0 && (
        <div className="mb-6 flex flex-wrap gap-4">
          {Object.entries(due).map(([cur, amt]) => (
            <div key={cur} className="card px-5 py-4">
              <p className="text-xs text-app-subtle">Balance due ({cur})</p>
              <p className="text-2xl font-semibold tabular">{money(amt, cur)}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs
        className="mb-5"
        value={kind}
        onChange={setKind}
        tabs={[
          { value: 'invoice', label: 'Invoices', count: all.filter((d) => d.kind === 'invoice').length },
          { value: 'quote', label: quotesWaiting ? `Quotes · ${quotesWaiting} to review` : 'Quotes', count: all.filter((d) => d.kind === 'quote').length },
        ]}
      />

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon={Receipt} title={kind === 'quote' ? 'No quotes yet' : 'No invoices yet'} message="When the studio sends you one, it appears here and you’ll get an email." />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-app-border">
            {items.map((d) => (
              <li key={d.id}>
                <Link to={`/portal/invoices/${d.id}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-app-muted/60">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold">{d.reference}</p>
                    <p className="truncate text-xs text-app-subtle">
                      {d.title || d.project?.title || (kind === 'quote' ? 'Quote' : 'Invoice')} · {day(d.issueDate)}
                    </p>
                    <p className={cx('text-xs sm:hidden', d.displayStatus === 'overdue' ? 'font-semibold text-status-danger' : 'text-app-subtle')}>
                      {kind === 'quote' ? 'Valid until' : 'Due'} {day(d.dueDate)}
                    </p>
                  </div>
                  <p className={cx('hidden text-xs sm:block', d.displayStatus === 'overdue' ? 'font-semibold text-status-danger' : 'text-app-subtle')}>
                    {kind === 'quote' ? 'Valid until' : 'Due'} {day(d.dueDate)}
                  </p>
                  <div className="text-right">
                    <p className="font-semibold tabular">{money(d.total, d.currency)}</p>
                    {kind === 'invoice' && d.amountPaid > 0 && d.balance > 0 && <p className="text-xs text-app-subtle tabular">{money(d.balance, d.currency)} due</p>}
                  </div>
                  <DocStatusBadge doc={d} />
                  <ArrowRight className="hidden h-4 w-4 text-app-subtle transition group-hover:translate-x-0.5 sm:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}