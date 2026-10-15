import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clapperboard, Mail, MapPin, Phone, Clock, Send, Star } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import PageHero from '../../features/public/components/PageHero';
import ConsentFields from '../../features/public/enquiry/ConsentFields';
import { usePublicSettings } from '../../features/public/publicApi';
import { api, ApiRequestError } from '../../lib/api';

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '', privacyAccepted: false, marketingConsent: false, website: '' };

export default function ContactPage() {
  const { data: settings } = usePublicSettings();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [message, setMessage] = useState('');
  const startedAt = useRef(Date.now());
  const c = settings?.contact || {};

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.message.trim().length < 10) e.message = 'Your message is a little short';
    if (!form.privacyAccepted) e.privacyAccepted = 'Please accept the privacy notice';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending' || !validate()) return;
    setStatus('sending');
    try {
      await api.post('/public/contact', { ...form, formStartedAt: startedAt.current });
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      if (err instanceof ApiRequestError && err.status === 422) setErrors(err.fieldErrors);
      setMessage(err.message);
    }
  };

  const details = [
    c.email && { icon: Mail, label: 'Email', value: c.email, href: `mailto:${c.email}` },
    c.phone && { icon: Phone, label: 'Phone', value: c.phone, href: `tel:${c.phone.replace(/\s/g, '')}` },
    (c.address || c.city) && { icon: MapPin, label: 'Studio', value: [c.address, c.city, c.country].filter(Boolean).join(', ') },
    c.officeHours && { icon: Clock, label: 'Hours', value: c.officeHours },
  ].filter(Boolean);

  return (
    <>
      <Seo title="Contact" description="Get in touch with Royal Bee Film Studios." />
      <PageHero eyebrow="Contact" title="Let’s talk." intro="Questions, collaborations or press — send us a message. For a new production, the project enquiry form helps us respond faster." breadcrumbs={[{ label: 'Contact' }]} />
      <section className="bg-paper-100 pb-24">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <aside className="space-y-4">
            {details.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex gap-4 rounded-2xl border border-paper-300 bg-paper-50 p-6">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-700" aria-hidden />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">{label}</p>
                  {href ? (
                    <a href={href} className="mt-1 block font-semibold text-ink-900 underline-offset-4 hover:underline">
                      {value}
                    </a>
                  ) : (
                    <p className="mt-1 font-semibold text-ink-900">{value}</p>
                  )}
                </div>
              </div>
            ))}
            <div className="rounded-2xl bg-ink-950 p-6 text-paper-100">
              <p className="font-display text-2xl">Planning a production?</p>
              <p className="mt-2 text-sm text-paper-300">Use our guided enquiry to share your brief, budget and dates.</p>
              <Button to="/enquire" variant="gold" icon={Clapperboard} className="mt-5">
                Start a project
              </Button>
            </div>
            <div className="rounded-2xl border border-gold-500/40 bg-paper-50 p-6">
              <p className="font-display text-2xl">Are you an actor, model or crew?</p>
              <p className="mt-2 text-sm text-ink-600">Apply to our talent roster to hear about casting calls and bookings.</p>
              <Button to="/join-talent" variant="outline" icon={Star} className="mt-5">
                Join our talent roster
              </Button>
            </div>
          </aside>

          <div className="rounded-3xl border border-paper-300 bg-paper-50 p-6 sm:p-10">
            {status === 'sent' ? (
              <div className="py-12 text-center" role="status">
                <CheckCircle2 className="mx-auto h-12 w-12 text-status-success" aria-hidden />
                <h2 className="mt-5 heading-md">Message received</h2>
                <p className="mt-3 text-ink-600">Thank you, {form.name.split(' ')[0]}. We’ll reply to {form.email} soon.</p>
                <Button variant="outline" className="mt-8" onClick={() => { setForm(EMPTY); setStatus('idle'); startedAt.current = Date.now(); }}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="relative space-y-5">
                <h2 className="font-display text-3xl font-semibold">Send a message</h2>
                {status === 'error' && (
                  <p role="alert" className="rounded-xl bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
                    {message || 'We could not send your message. Please try again.'}
                  </p>
                )}
                {/* Honeypot — hidden from people, tempting for bots */}
                <div className="absolute -left-[9999px]" aria-hidden>
                  <label htmlFor="contact-website">Website</label>
                  <input id="contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input label="Your name" required value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
                  <Input label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
                  <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                  <Input label="Subject" value={form.subject} onChange={set('subject')} maxLength={160} />
                </div>
                <Textarea label="Message" required rows={6} value={form.message} onChange={set('message')} error={errors.message} maxLength={5000} />
                <ConsentFields
                  privacyNotice={settings?.enquiry?.privacyNotice}
                  privacyAccepted={form.privacyAccepted}
                  marketingConsent={form.marketingConsent}
                  onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
                  error={errors.privacyAccepted}
                />
            <Button type="submit" variant="dark" size="lg" icon={Send} loading={status === 'sending'} className="w-full justify-center sm:w-auto">
                  Send message
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
