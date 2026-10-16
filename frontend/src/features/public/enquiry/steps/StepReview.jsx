import { Pencil } from 'lucide-react';
import { formatDate, formatMoney } from '../../../../lib/format';

function Row({ label, value }) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return null;
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[200px_1fr] sm:gap-6">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="whitespace-pre-line text-[15px] text-ink-900">{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
    </div>
  );
}

function Group({ title, onEdit, children }) {
  return (
    <section className="rounded-2xl border border-paper-300 bg-paper-50 px-5 py-2 sm:px-6">
      <div className="flex items-center justify-between border-b border-paper-300 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-700">{title}</h3>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-paper-200">
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
        </button>
      </div>
      <dl className="divide-y divide-paper-300">{children}</dl>
    </section>
  );
}

/** Step 5 — review everything before submitting. */
export default function StepReview({ data, questions, onEdit, currency }) {
  const answerLabel = (q) => {
    const v = data.answers?.[q.key];
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return v;
  };
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink-900">Review your enquiry</h2>
        <p className="mt-2 text-ink-600">Check the details below, then send. You’ll receive a reference number straight away.</p>
      </div>
      <Group title="Service" onEdit={() => onEdit(0)}>
        <Row label="Service" value={data.serviceTitle || 'Not sure yet'} />
      </Group>
      <Group title="Project" onEdit={() => onEdit(1)}>
        <Row label="Title" value={data.projectTitle} />
        <Row label="Description" value={data.description} />
        {questions.map((q) => (
          <Row key={q.key} label={q.label} value={answerLabel(q)} />
        ))}
        <Row label="Location" value={data.location} />
        <Row label="Deliverables" value={data.deliverables.filter(Boolean)} />
        <Row label="Dates" value={[data.preferredStartDate && formatDate(data.preferredStartDate), data.preferredEndDate && formatDate(data.preferredEndDate)].filter(Boolean).join(' → ')} />
        <Row label="Flexible dates" value={data.datesFlexible ? 'Yes' : 'No'} />
      </Group>
      <Group title="Budget & files" onEdit={() => onEdit(2)}>
        <Row label="Budget range" value={data.budgetRange} />
        <Row label="Amount" value={data.budgetAmount !== '' ? formatMoney(data.budgetAmount, currency) : ''} />
        <Row label="Files" value={data.attachments.map((a) => a.name)} />
      </Group>
      <Group title="Your details" onEdit={() => onEdit(3)}>
        <Row label="Name" value={data.name} />
        <Row label="Email" value={data.email} />
        <Row label="Phone" value={data.phone} />
        <Row label="Organization" value={data.organization} />
        <Row label="Contact by" value={{ email: 'Email', phone: 'Phone', any: 'Email or phone' }[data.preferredContactMethod]} />
        {/* <Row label="Studio updates" value={data.marketingConsent ? 'Yes, please' : 'No'} /> */}
      </Group>
    </div>
  );
}
