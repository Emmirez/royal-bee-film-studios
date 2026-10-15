import { Mail, MapPin, Phone, Clock, ArrowRight } from 'lucide-react';
import SectionShell from '../../components/SectionShell';
import Button from '../../../../components/ui/Button';

/** Contact details strip, pulled from studio settings. */
export default function ContactSection({ data, content = {}, theme }) {
  const c = data?.contact || {};
  const rows = [
    c.email && { icon: Mail, label: 'Email', value: c.email, href: `mailto:${c.email}` },
    c.phone && { icon: Phone, label: 'Phone', value: c.phone, href: `tel:${c.phone.replace(/\s/g, '')}` },
    (c.address || c.city) && { icon: MapPin, label: 'Studio', value: [c.address, c.city, c.country].filter(Boolean).join(', '), href: c.mapUrl || undefined },
    c.officeHours && { icon: Clock, label: 'Hours', value: c.officeHours },
  ].filter(Boolean);

  return (
    <SectionShell theme={theme || 'white'} labelledBy="contact-heading">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div>
          <p className="eyebrow mb-5">Get in touch</p>
          <h2 id="contact-heading" className="heading-md">
            {content.heading || 'Visit or call the studio'}
          </h2>
          {content.body && <p className="mt-4 text-ink-600">{content.body}</p>}
          <Button to="/contact" variant="dark" size="lg" iconRight={ArrowRight} className="mt-8">
            Send a message
          </Button>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          {rows.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="rounded-2xl border border-paper-300 bg-paper-100 p-6">
              <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-700">
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </dt>
              <dd className="mt-3 text-[15px] font-medium text-ink-900">
                {href ? (
                  <a href={href} className="underline-offset-4 hover:underline" {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionShell>
  );
}
