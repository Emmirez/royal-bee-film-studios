import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, CheckCircle2, Clapperboard, Film, Handshake, Megaphone, Send, Tv, Users } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import SmartImage from '../../components/media/SmartImage';
import ConsentFields from '../../features/public/enquiry/ConsentFields';
import { PublicError, PublicLoading } from '../../features/public/components/PublicStates';
import { usePublicSettings } from '../../features/public/publicApi';
import { api, ApiRequestError } from '../../lib/api';
import { cx } from '../../lib/format';

const TYPE_ICONS = { brand: Megaphone, co_production: Clapperboard, sponsorship: Handshake, distribution: Tv, talent: Users };

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  companyWebsite: '',
  partnershipType: '',
  message: '',
  privacyAccepted: false,
  marketingConsent: false,
  website: '', // honeypot — must stay empty
};

/** Public "Partner with us" page — content from Admin → Website → Partner page. */
export default function PartnerPage() {
  const { data: settings } = usePublicSettings();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['public', 'partner'],
    queryFn: async () => (await api.get('/public/partner')).data,
  });
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');
  const startedAt = useRef(Date.now());
  const formRef = useRef(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  if (isLoading) return <PublicLoading />;
  if (error) return <PublicError error={error} onRetry={refetch} />;
  const page = data || {};
  const types = page.types || [];

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const chooseType = (key) => {
    setForm((f) => ({ ...f, partnershipType: key }));
    setErrors((e) => ({ ...e, partnershipType: undefined }));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.partnershipType) e.partnershipType = 'Choose a partnership type';
    if (form.message.trim().length < 20) e.message = 'Tell us a little more about your proposal (at least 20 characters)';
    if (!form.privacyAccepted) e.privacyAccepted = 'Please accept the privacy notice';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending' || !validate()) return;
    setStatus('sending');
    try {
      const res = await api.post('/public/partner', { ...form, formStartedAt: startedAt.current });
      setReference(res.data?.reference || '');
      setStatus('sent');
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setStatus('error');
      if (err instanceof ApiRequestError && err.status === 422) setErrors(err.fieldErrors);
      setMessage(err.message);
    }
  };

  return (
    <>
      <Seo title="Partner with us" description={page.intro?.slice(0, 160)} />

      {/* Intro */}
      <header className="bg-paper-100 pb-16 pt-32 sm:pb-20 sm:pt-40">
        <div className="container-site grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div className="min-w-0">
            {page.eyebrow && <p className="eyebrow mb-6">{page.eyebrow}</p>}
            <h1 className="heading-xl text-balance">{page.heading}</h1>
            {page.intro && <p className="prose-body mt-6 max-w-xl text-lg">{page.intro}</p>}
            <Button variant="dark" size="lg" iconRight={ArrowDown} className="mt-10" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              Send a proposal
            </Button>
          </div>
          {page.image?.url && (
            <SmartImage image={page.image} width={1400} sizes="(min-width:1024px) 45vw, 100vw" aspect="4/3" priority className="rounded-[28px] shadow-lift sm:rounded-[36px]" />
          )}
        </div>
      </header>

      {/* Ways to partner */}
      {types.length > 0 && (
        <section aria-labelledby="partner-types" className="bg-paper-50 py-20 sm:py-28">
          <div className="container-site">
            <h2 id="partner-types" className="heading-lg mb-12 max-w-2xl">
              {page.typesHeading || 'Ways to partner'}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {types.map((t) => {
                const Icon = TYPE_ICONS[t.key] || Film;
                const active = form.partnershipType === t.key;
                return (
                  <li key={t.key} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => chooseType(t.key)}
                      className={cx(
                        'group flex h-full w-full flex-col rounded-[24px] border p-6 text-left transition sm:p-8',
                        active ? 'border-ink-900 bg-ink-950 text-paper-50' : 'border-paper-300 bg-paper-100 hover:border-ink-900',
                      )}
                    >
                      <span className={cx('flex h-12 w-12 items-center justify-center rounded-2xl', active ? 'bg-gold-500 text-ink-950' : 'bg-gold-500/15 text-gold-700')}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="mt-6 font-display text-2xl font-semibold">{t.title}</span>
                      {t.description && <span className={cx('mt-3 text-sm leading-relaxed', active ? 'text-paper-300' : 'text-ink-600')}>{t.description}</span>}
                      <span className={cx('mt-6 text-sm font-semibold', active ? 'text-gold-300' : 'text-ink-900 underline-offset-4 group-hover:underline')}>
                        {active ? 'Selected ✓' : 'Choose this →'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* How it works */}
      {page.steps?.length > 0 && (
        <section aria-labelledby="partner-steps" className="bg-paper-100 py-20 sm:py-28">
          <div className="container-site">
            <h2 id="partner-steps" className="heading-lg mb-12">
              {page.stepsHeading || 'How it works'}
            </h2>
            <ol className="grid gap-8 md:grid-cols-3">
              {page.steps.map((s, i) => (
                <li key={`${s.title}-${i}`} className="border-t border-paper-400 pt-6">
                  <span className="font-mono text-sm text-gold-700">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-3 font-display text-2xl font-semibold">{s.title}</h3>
                  {s.description && <p className="mt-2 text-ink-600">{s.description}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Form */}
      <section aria-labelledby="partner-form" className="bg-paper-100 pb-24">
        <div ref={formRef} className="container-site scroll-mt-28">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-paper-300 bg-paper-50 p-6 sm:rounded-[36px] sm:p-12">
            {status === 'sent' ? (
              <div className="py-10 text-center" role="status">
                <CheckCircle2 className="mx-auto h-12 w-12 text-status-success" aria-hidden />
                <h2 className="mt-5 heading-md">Proposal received</h2>
                <p className="mx-auto mt-3 max-w-md text-ink-600">{page.successMessage}</p>
                {reference && (
                  <p className="mt-4 text-sm text-ink-500">
                    Your reference: <span className="font-mono font-semibold text-ink-900">{reference}</span>
                  </p>
                )}
                <Button to="/" variant="outline" className="mt-8">
                  Back to the homepage
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="relative space-y-6">
                <div>
                  <h2 id="partner-form" className="font-display text-3xl font-semibold sm:text-4xl">
                    {page.formHeading}
                  </h2>
                  {page.formIntro && <p className="mt-2 text-ink-600">{page.formIntro}</p>}
                </div>

                {status === 'error' && (
                  <p role="alert" className="rounded-xl bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
                    {message || 'We could not send your proposal. Please try again.'}
                  </p>
                )}

                {/* Honeypot — hidden from people, tempting for bots */}
                <div className="absolute -left-[9999px]" aria-hidden>
                  <label htmlFor="partner-website-hp">Website</label>
                  <input id="partner-website-hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
                </div>

                <fieldset>
                  <legend className="field-label">
                    Type of partnership <span className="text-status-danger">*</span>
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {types.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        aria-pressed={form.partnershipType === t.key}
                        onClick={() => {
                          setForm((f) => ({ ...f, partnershipType: t.key }));
                          setErrors((e) => ({ ...e, partnershipType: undefined }));
                        }}
                        className={cx(
                          'rounded-full border px-4 py-2 text-sm font-semibold transition',
                          form.partnershipType === t.key ? 'border-ink-900 bg-ink-900 text-paper-100' : 'border-paper-400 text-ink-700 hover:border-ink-900',
                        )}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                  {errors.partnershipType && <p className="field-error mt-2">{errors.partnershipType}</p>}
                </fieldset>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Input label="Your name" required value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
                  <Input label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
                  <Input label="Phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                  <Input label="Company / organisation" value={form.organization} onChange={set('organization')} maxLength={160} autoComplete="organization" />
                </div>
                <Input label="Company website (optional)" value={form.companyWebsite} onChange={set('companyWebsite')} placeholder="https://" maxLength={300} />
                <Textarea
                  label="Your proposal"
                  required
                  rows={6}
                  value={form.message}
                  onChange={set('message')}
                  error={errors.message}
                  maxLength={5000}
                  placeholder="Tell us who you are, what you have in mind and any timelines."
                />
                <ConsentFields
                  privacyNotice={settings?.enquiry?.privacyNotice}
                  privacyAccepted={form.privacyAccepted}
                  marketingConsent={form.marketingConsent}
                  onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
                  error={errors.privacyAccepted}
                />
               <Button type="submit" variant="dark" size="lg" icon={Send} loading={status === 'sending'} className="w-full justify-center sm:w-auto">
                  Send proposal
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}