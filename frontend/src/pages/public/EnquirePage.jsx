import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bookmark, CheckCircle2, Copy } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Switch } from '../../components/ui/Primitives';
import EnquiryProgress from '../../features/public/enquiry/EnquiryProgress';
import StepService from '../../features/public/enquiry/steps/StepService';
import StepProject from '../../features/public/enquiry/steps/StepProject';
import StepBudget from '../../features/public/enquiry/steps/StepBudget';
import StepContact from '../../features/public/enquiry/steps/StepContact';
import StepReview from '../../features/public/enquiry/steps/StepReview';
import { EMPTY_ENQUIRY, STEPS, toDraft, toPayload, validateStep } from '../../features/public/enquiry/enquiryModel';
import { PublicLoading } from '../../features/public/components/PublicStates';
import { useEnquiryForm, usePublicSettings, useServices } from '../../features/public/publicApi';
import { api, ApiRequestError } from '../../lib/api';

const DRAFT_KEY = 'rb-enquiry-draft-token';

const storage = {
  get: () => {
    try {
      return localStorage.getItem(DRAFT_KEY);
    } catch {
      return null;
    }
  },
  set: (v) => {
    try {
      if (v) localStorage.setItem(DRAFT_KEY, v);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

/** Guided multi-step project enquiry → creates a CRM record and a reference number. */
export default function EnquirePage() {
  const [params, setParams] = useSearchParams();
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { data: settings } = usePublicSettings();

  const [data, setData] = useState(EMPTY_ENQUIRY);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null);
  const [draftToken, setDraftToken] = useState(storage.get());
  const [saveOpen, setSaveOpen] = useState(false);
  const [resume, setResume] = useState({ open: false, token: '', email: '', error: '', loading: false });
  const startedAt = useRef(Date.now());
  const tracked = useRef(new Set());
  const headingRef = useRef(null);

  const { data: form } = useEnquiryForm(data.serviceSlug || null);
  const questions = useMemo(() => (data.serviceSlug ? form?.questions || [] : []), [form, data.serviceSlug]);

  const track = useCallback(
    (event, stepIndex = 0) => {
      const key = `${event}-${stepIndex}`;
      if (tracked.current.has(key)) return;
      tracked.current.add(key);
      api.post('/public/enquiries/funnel', { event, step: stepIndex, service: data.serviceSlug || 'any' }).catch(() => {});
    },
    [data.serviceSlug],
  );

  // Preselect service from ?service=slug
  useEffect(() => {
    const slug = params.get('service');
    if (slug && services.length && !data.serviceSlug) {
      const s = services.find((x) => x.slug === slug);
      if (s) setData((d) => ({ ...d, serviceSlug: s.slug, serviceId: s.id, serviceTitle: s.title }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

  // Resume link: ?resume=token → ask for the email to verify identity
  useEffect(() => {
    const token = params.get('resume');
    if (token) setResume((r) => ({ ...r, open: true, token }));
    else if (storage.get()) setResume((r) => ({ ...r, token: storage.get() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    track('start');
  }, [track]);

  const update = (patch) => setData((d) => ({ ...d, ...(typeof patch === 'function' ? patch(d) : patch) }));

  const goTo = (i) => {
    setStep(i);
    setMaxReached((m) => Math.max(m, i));
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => headingRef.current?.focus(), 250);
  };

  const next = () => {
    const e = validateStep(STEPS[step].key, data, questions);
    setErrors(e);
    if (Object.keys(e).length) {
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 30);
      return;
    }
    track('step', step + 1);
    goTo(step + 1);
  };

  const submit = async () => {
    if (submitting) return;
    for (let i = 0; i < STEPS.length - 1; i += 1) {
      const e = validateStep(STEPS[i].key, data, questions);
      if (Object.keys(e).length) {
        setErrors(e);
        goTo(i);
        return;
      }
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data: res } = await api.post('/public/enquiries', toPayload(data, startedAt.current, draftToken));
      storage.set(null);
      setResult(res);
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 422) {
        const fe = err.fieldErrors;
        setErrors(fe);
        const firstStep = ['description', 'answers', 'preferredEndDate'].some((k) => Object.keys(fe).some((f) => f.startsWith(k)))
          ? 1
          : Object.keys(fe).some((f) => ['name', 'email', 'phone', 'privacyAccepted'].includes(f))
            ? 3
            : step;
        goTo(firstStep);
      }
      setSubmitError(err.message || 'We could not send your enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const doResume = async (e) => {
    e.preventDefault();
    setResume((r) => ({ ...r, loading: true, error: '' }));
    try {
      const { data: draft } = await api.post('/public/enquiries/drafts/resume', { token: resume.token, email: resume.email.trim() });
      setData({ ...EMPTY_ENQUIRY, ...draft.data, attachments: [] });
      setDraftToken(resume.token);
      storage.set(resume.token);
      setResume({ open: false, token: resume.token, email: '', error: '', loading: false });
      const s = Math.min(draft.step || 0, STEPS.length - 1);
      setMaxReached(s);
      goTo(s);
      setParams({});
    } catch (err) {
      setResume((r) => ({ ...r, loading: false, error: err.message }));
    }
  };

  if (servicesLoading) return <PublicLoading />;

  if (result) {
    return (
      <>
        <Seo title="Enquiry received" noIndex />
        <section className="flex min-h-[85vh] items-center bg-paper-100 pb-24 pt-32">
          <div className="container-site max-w-2xl text-center" role="status">
            <CheckCircle2 className="mx-auto h-14 w-14 text-status-success" aria-hidden />
            <h1 className="mt-6 heading-lg">Thank you, {data.name.split(' ')[0]}.</h1>
            <p className="mt-4 text-lg text-ink-600">Your enquiry has been received. We’ll review it and get back to you by {data.preferredContactMethod === 'phone' ? 'phone' : 'email'}.</p>
            <div className="mx-auto mt-10 inline-flex items-center gap-3 rounded-2xl border border-paper-300 bg-paper-50 px-6 py-4">
              <span className="text-sm text-ink-500">Reference</span>
              <span className="font-mono text-lg font-semibold tracking-wide text-ink-900">{result.reference}</span>
              <button type="button" onClick={() => navigator.clipboard?.writeText(result.reference)} className="rounded-full p-2 hover:bg-paper-200" aria-label="Copy reference number">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mx-auto mt-6 max-w-md text-sm text-ink-500">An enquiry is not a booking or contract. Pricing and dates are confirmed in a formal quotation.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button to="/productions" variant="dark">
                Explore our work
              </Button>
              <Button to="/" variant="outline">
                Back to home
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  const stepKey = STEPS[step].key;
  const isLast = step === STEPS.length - 1;

  return (
    <>
      <Seo title="Start a project" description="Tell us about your production — we’ll respond with next steps." />
      <section className="bg-paper-100 pb-28 pt-28 sm:pt-36">
        <div className="container-site max-w-3xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-4">Start a project</p>
              <h1 ref={headingRef} tabIndex={-1} className="heading-lg focus:outline-none">
                Project enquiry
              </h1>
            </div>
            {resume.token && !params.get('resume') && step === 0 && (
              <button type="button" onClick={() => setResume((r) => ({ ...r, open: true }))} className="text-sm font-semibold text-ink-700 underline underline-offset-4">
                Continue a saved enquiry
              </button>
            )}
          </div>

          <EnquiryProgress current={step} maxReached={maxReached} onJump={goTo} />

          <form
            noValidate
            className="relative rounded-3xl border border-paper-300 bg-white p-5 shadow-soft sm:p-10"
            onSubmit={(e) => {
              e.preventDefault();
              if (isLast) submit();
              else next();
            }}
          >
            <div className="absolute -left-[9999px]" aria-hidden>
              <label htmlFor="enq-website">Website</label>
              <input id="enq-website" tabIndex={-1} autoComplete="off" value={data.website} onChange={(e) => update({ website: e.target.value })} />
            </div>

            {stepKey === 'service' && <StepService services={services} data={data} update={update} />}
            {stepKey === 'project' && <StepProject data={data} update={update} errors={errors} questions={questions} />}
            {stepKey === 'budget' && <StepBudget data={data} update={update} errors={errors} budgetRanges={settings?.enquiry?.budgetRanges} currency={settings?.enquiry?.currency} />}
            {stepKey === 'contact' && <StepContact data={data} update={update} errors={errors} privacyNotice={settings?.enquiry?.privacyNotice} />}
            {stepKey === 'review' && <StepReview data={data} questions={questions} onEdit={goTo} currency={settings?.enquiry?.currency} />}

            {submitError && (
              <p role="alert" className="mt-6 rounded-xl bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
                {submitError}
              </p>
            )}

            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-paper-300 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="outline" icon={ArrowLeft} onClick={() => goTo(step - 1)}>
                    Back
                  </Button>
                )}
                {step > 0 && (
                  <Button variant="link" icon={Bookmark} onClick={() => setSaveOpen(true)} className="!px-3 text-ink-700">
                    Save for later
                  </Button>
                )}
              </div>
              <Button type="submit" variant={isLast ? 'gold' : 'dark'} size="lg" iconRight={isLast ? undefined : ArrowRight} loading={submitting} className="justify-center">
                {isLast ? 'Send enquiry' : 'Continue'}
              </Button>
            </div>
          </form>
          <p className="mt-6 text-center text-xs text-ink-500">
            Prefer to talk first? <Link to="/contact" className="underline underline-offset-4">Contact the studio</Link>.
          </p>
        </div>
      </section>

      <SaveDraftDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        data={data}
        step={step}
        token={draftToken}
        onSaved={(token) => {
          setDraftToken(token);
          storage.set(token);
        }}
      />

      <Modal
        open={resume.open}
        onClose={() => setResume((r) => ({ ...r, open: false }))}
        title="Continue your saved enquiry"
        description="For your privacy, confirm the email address you used."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResume((r) => ({ ...r, open: false }))}>
              Start fresh
            </Button>
            <Button type="submit" form="resume-form" variant="primary" loading={resume.loading}>
              Continue
            </Button>
          </>
        }
      >
        <form id="resume-form" onSubmit={doResume}>
          <Input label="Email address" type="email" required value={resume.email} onChange={(e) => setResume((r) => ({ ...r, email: e.target.value }))} error={resume.error} data-autofocus />
        </form>
      </Modal>
    </>
  );
}

function SaveDraftDialog({ open, onClose, data, step, token, onSaved }) {
  const [email, setEmail] = useState(data.email);
  const [sendLink, setSendLink] = useState(true);
  const [state, setState] = useState({ loading: false, error: '', saved: null });

  useEffect(() => {
    if (open) {
      setEmail(data.email);
      setState({ loading: false, error: '', saved: null });
    }
  }, [open, data.email]);

  const save = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setState((s) => ({ ...s, error: 'Enter a valid email address' }));
      return;
    }
    setState({ loading: true, error: '', saved: null });
    try {
      const { data: res } = await api.post('/public/enquiries/drafts', { token: token || undefined, email: email.trim(), step, data: toDraft({ ...data, email: email.trim() }), sendResumeLink: sendLink && !token });
      onSaved(res.token);
      setState({ loading: false, error: '', saved: res });
    } catch (err) {
      setState({ loading: false, error: err.message, saved: null });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save and finish later"
      size="sm"
      footer={
        state.saved ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="save-draft-form" loading={state.loading}>
              Save draft
            </Button>
          </>
        )
      }
    >
      {state.saved ? (
        <div className="text-sm text-app-subtle" role="status">
          <p className="font-semibold text-app-text">Your draft is saved until {new Date(state.saved.expiresAt).toLocaleDateString('en-GB')}.</p>
          <p className="mt-2">You can continue on this device any time{sendLink && !token ? ', and if email is set up at the studio we’ve sent you a link to continue elsewhere' : ''}. Uploaded files aren’t saved in drafts — you’ll add them again before sending.</p>
        </div>
      ) : (
        <form id="save-draft-form" onSubmit={save} className="space-y-4">
          <Input label="Your email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={state.error} data-autofocus hint="You’ll confirm this email to reopen the draft." />
          {!token && <Switch checked={sendLink} onChange={setSendLink} label="Email me a link to continue" />}
        </form>
      )}
    </Modal>
  );
}
