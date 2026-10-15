import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ImagePlus, Loader2, Plus, Send, Trash2, X } from 'lucide-react';
import Seo from '../../components/public/Seo';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import CommaListInput from '../../components/ui/CommaListInput';
import PageHero from '../../features/public/components/PageHero';
import { GENDERS, TALENT_TYPES } from '../../features/talent/talentUi';
import { api, ApiRequestError } from '../../lib/api';
import { cx } from '../../lib/format';

const MAX_PHOTOS = 6;
const EMPTY = {
  talentTypes: [],
  firstName: '',
  lastName: '',
  stageName: '',
  email: '',
  phone: '',
  city: '',
  country: 'Nigeria',
  gender: '',
  playingAgeMin: '',
  playingAgeMax: '',
  heightCm: '',
  languages: [],
  skills: [],
  bio: '',
  showreels: [{ title: '', url: '' }],
  message: '',
  ageConfirmed: false,
  privacyAccepted: false,
  website: '', // honeypot — must stay empty
};

function Check({ checked, onChange, error, children }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={Boolean(error) || undefined} className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-paper-400 accent-ink-900" />
        <span>{children}</span>
      </label>
      {error && <p className="field-error ml-8">{error}</p>}
    </div>
  );
}

/** Public "Join our talent roster" application. */
export default function JoinTalentPage() {
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState([]); // { token, url } | { uploading: true, name }
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');
  const startedAt = useRef(Date.now());
  const fileRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const uploadPhotos = async (files) => {
    const list = Array.from(files || []).slice(0, MAX_PHOTOS - photos.length);
    for (const file of list) {
      const key = `${file.name}-${Date.now()}-${Math.random()}`;
      setPhotos((p) => [...p, { key, uploading: true }]);
      const fd = new FormData();
      fd.append('file', file);
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await api.upload('/public/talent/photos', fd);
        setPhotos((p) => p.map((x) => (x.key === key ? { key, token: res.data.token, url: res.data.url } : x)));
      } catch (err) {
        setPhotos((p) => p.filter((x) => x.key !== key));
        setErrors((e) => ({ ...e, photos: err.message }));
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const validate = () => {
    const e = {};
    if (!form.talentTypes.length) e.talentTypes = 'Choose at least one';
    if (!form.firstName.trim()) e.firstName = 'Enter your first name';
    if (!form.lastName.trim()) e.lastName = 'Enter your last name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.phone.trim().length < 6) e.phone = 'Enter a phone number';
    if (form.city.trim().length < 2) e.city = 'Enter your city';
    if (!form.ageConfirmed) e.ageConfirmed = 'You must be 18 or older to apply';
    if (!form.privacyAccepted) e.privacyAccepted = 'Please accept the privacy notice';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending' || photos.some((p) => p.uploading)) return;
    if (!validate()) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setStatus('sending');
    try {
      const body = {
        ...form,
        playingAgeMin: form.playingAgeMin === '' ? null : Number(form.playingAgeMin),
        playingAgeMax: form.playingAgeMax === '' ? null : Number(form.playingAgeMax),
        heightCm: form.heightCm === '' ? null : Number(form.heightCm),
        showreels: form.showreels.filter((r) => r.url.trim()),
        photoTokens: photos.filter((p) => p.token).map((p) => p.token),
        formStartedAt: startedAt.current,
      };
      const res = await api.post('/public/talent', body);
      setReference(res.data?.reference || '');
      setStatus('sent');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStatus('error');
      if (err instanceof ApiRequestError && err.status === 422) setErrors(err.fieldErrors);
      setMessage(err.message);
    }
  };

  return (
    <>
      <Seo title="Join our talent roster" description="Actors, models, presenters, voice artists and crew — apply to join the Royal Bee Film Studios talent roster." />
      <PageHero
        eyebrow="Talent"
        title="Join our talent roster."
        intro="Actors, models, presenters, voice artists, dancers and crew — tell us about yourself. Approved talent get their own portal to see casting calls, confirm bookings and message the team."
        breadcrumbs={[{ label: 'Join our talent roster' }]}
      />

      <section className="bg-paper-100 pb-24">
        <div className="container-site">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-paper-300 bg-paper-50 p-6 sm:rounded-[36px] sm:p-12">
            {status === 'sent' ? (
              <div className="py-10 text-center" role="status">
                <CheckCircle2 className="mx-auto h-12 w-12 text-status-success" aria-hidden />
                <h2 className="mt-5 heading-md">Application received</h2>
                <p className="mx-auto mt-3 max-w-md text-ink-600">Thank you! Our team reviews every application. If it’s a fit, we’ll email you an invitation to set up your talent portal.</p>
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
              <form ref={formRef} onSubmit={submit} noValidate className="relative space-y-8">
                {status === 'error' && (
                  <p role="alert" className="rounded-xl bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
                    {message || 'We could not send your application. Please try again.'}
                  </p>
                )}

                {/* Honeypot */}
                <div className="absolute -left-[9999px]" aria-hidden>
                  <label htmlFor="talent-website-hp">Website</label>
                  <input id="talent-website-hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
                </div>

                <fieldset>
                  <legend className="font-display text-2xl font-semibold">
                    What do you do? <span className="text-status-danger">*</span>
                  </legend>
                  <p className="mt-1 text-sm text-ink-600">Choose all that apply.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {TALENT_TYPES.map((t) => {
                      const on = form.talentTypes.includes(t.value);
                      return (
                        <button
                          key={t.value}
                          type="button"
                          aria-pressed={on}
                          aria-invalid={errors.talentTypes ? 'true' : undefined}
                          onClick={() => setForm((f) => ({ ...f, talentTypes: on ? f.talentTypes.filter((x) => x !== t.value) : [...f.talentTypes, t.value] }))}
                          className={cx('rounded-full border px-4 py-2 text-sm font-semibold transition', on ? 'border-ink-900 bg-ink-900 text-paper-100' : 'border-paper-400 text-ink-700 hover:border-ink-900')}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.talentTypes && <p className="field-error mt-2">{errors.talentTypes}</p>}
                </fieldset>

                <div>
                  <h2 className="font-display text-2xl font-semibold">About you</h2>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <Input label="First name" required value={form.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" />
                    <Input label="Last name" required value={form.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" />
                    <Input label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
                    <Input label="Phone" type="tel" required value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" />
                    <Input label="Stage / professional name" value={form.stageName} onChange={set('stageName')} maxLength={100} hint="Optional" />
                    <Input label="City" required value={form.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" />
                    <Textarea label="Short bio" rows={4} value={form.bio} onChange={set('bio')} maxLength={1500} className="sm:col-span-2" placeholder="Your experience, training and the kind of work you love." />
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-semibold">Casting details</h2>
                  <p className="mt-1 text-sm text-ink-600">Optional, but it helps us match you to the right roles.</p>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <Select label="Gender" value={form.gender || null} onChange={set('gender')} options={GENDERS} clearable placeholder="Optional" />
                    <Input label="Height (cm)" type="number" min="50" max="250" value={form.heightCm} onChange={set('heightCm')} error={errors.heightCm} />
                    <Input label="Playing age from" type="number" min="18" max="100" value={form.playingAgeMin} onChange={set('playingAgeMin')} error={errors.playingAgeMin} />
                    <Input label="Playing age to" type="number" min="18" max="100" value={form.playingAgeMax} onChange={set('playingAgeMax')} error={errors.playingAgeMax} />
                    <CommaListInput label="Languages" value={form.languages} onChange={set('languages')} max={15} placeholder="English, Yoruba, Pidgin" hint="Separate with commas." />
                    <CommaListInput label="Skills" value={form.skills} onChange={set('skills')} max={30} placeholder="Dance, stage combat, horse riding" hint="Separate with commas." />
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-semibold">Photos & showreel</h2>
                  <p className="mt-1 text-sm text-ink-600">Up to {MAX_PHOTOS} recent photos — a clear headshot first. JPG, PNG or WebP up to 10MB.</p>
                  <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {photos.map((p) => (
                      <li key={p.key} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-paper-200">
                        {p.uploading ? (
                          <span className="flex h-full items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-ink-500" aria-label="Uploading" />
                          </span>
                        ) : (
                          <>
                            <img src={p.url} alt="" className="h-full w-full object-cover" />
                            <button type="button" onClick={() => setPhotos((x) => x.filter((y) => y.key !== p.key))} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-ink-900" aria-label="Remove photo">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                      <li>
                        <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-paper-400 text-xs font-semibold text-ink-600 hover:border-ink-900">
                          <ImagePlus className="h-5 w-5" aria-hidden /> Add
                        </button>
                      </li>
                    )}
                  </ul>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => uploadPhotos(e.target.files)} />
                  {errors.photos && <p className="field-error mt-2">{errors.photos}</p>}

                  <div className="mt-6 space-y-3">
                    {form.showreels.map((r, i) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <div key={i} className="flex items-end gap-2">
                        <Input
                          label={i === 0 ? 'Showreel link (YouTube, Vimeo, Google Drive)' : undefined}
                          aria-label={i === 0 ? undefined : 'Showreel link'}
                          className="min-w-0 flex-1"
                          value={r.url}
                          onChange={(e) => setForm((f) => ({ ...f, showreels: f.showreels.map((x, idx) => (idx === i ? { ...x, url: e.target.value } : x)) }))}
                          placeholder="https://"
                          error={errors[`showreels.${i}.url`]}
                        />
                        {form.showreels.length > 1 && (
                          <Button variant="outline" size="icon" aria-label="Remove link" onClick={() => setForm((f) => ({ ...f, showreels: f.showreels.filter((_, idx) => idx !== i) }))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {form.showreels.length < 3 && (
                      <button type="button" onClick={() => setForm((f) => ({ ...f, showreels: [...f.showreels, { title: '', url: '' }] }))} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900 underline-offset-4 hover:underline">
                        <Plus className="h-4 w-4" aria-hidden /> Add another link
                      </button>
                    )}
                  </div>
                </div>

                <Textarea label="Anything else you’d like us to know?" rows={3} value={form.message} onChange={set('message')} maxLength={2000} />

                <div className="space-y-3 rounded-2xl bg-paper-100 p-5">
                  <Check checked={form.ageConfirmed} onChange={set('ageConfirmed')} error={errors.ageConfirmed}>
                    I confirm I am <strong>18 years or older</strong>.
                  </Check>
                  <Check checked={form.privacyAccepted} onChange={set('privacyAccepted')} error={errors.privacyAccepted}>
                    I agree that Royal Bee Film Studios may store my details and photos to consider me for work. My profile is private and never published on the website. See our <Link to="/contact" className="underline">contact page</Link> to ask for it to be deleted.
                  </Check>
                </div>

                <Button type="submit" variant="dark" size="lg" icon={Send} loading={status === 'sending'} disabled={photos.some((p) => p.uploading)} className="w-full justify-center sm:w-auto">
                  Send application
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}