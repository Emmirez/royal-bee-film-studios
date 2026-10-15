/** Enquiry form state, steps and per-step validation. */

export const STEPS = [
  { key: 'service', label: 'Service' },
  { key: 'project', label: 'Project' },
  { key: 'budget', label: 'Budget & files' },
  { key: 'contact', label: 'Your details' },
  { key: 'review', label: 'Review' },
];

export const EMPTY_ENQUIRY = {
  serviceSlug: '',
  serviceId: null,
  serviceTitle: '',
  projectTitle: '',
  description: '',
  answers: {},
  deliverables: [],
  location: '',
  preferredStartDate: '',
  preferredEndDate: '',
  datesFlexible: true,
  budgetRange: '',
  budgetAmount: '',
  attachments: [], // [{ token, name, size }]
  name: '',
  email: '',
  phone: '',
  organization: '',
  preferredContactMethod: 'email',
  privacyAccepted: false,
  marketingConsent: false,
  website: '', // honeypot
};

const emailOk = (v) => /^\S+@\S+\.\S+$/.test(v || '');
const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

export function validateStep(stepKey, data, questions = []) {
  const e = {};
  if (stepKey === 'project') {
    if ((data.description || '').trim().length < 20) e.description = 'Tell us a little more about the project (at least 20 characters)';
    for (const q of questions) {
      if (q.required && isEmpty(data.answers?.[q.key])) e[`answers.${q.key}`] = `${q.label} is required`;
    }
    if (data.preferredStartDate && data.preferredEndDate && data.preferredEndDate < data.preferredStartDate) {
      e.preferredEndDate = 'End date must be after the start date';
    }
  }
  if (stepKey === 'budget') {
    if (data.budgetAmount !== '' && Number(data.budgetAmount) < 0) e.budgetAmount = 'Enter a positive amount';
  }
  if (stepKey === 'contact') {
    if ((data.name || '').trim().length < 2) e.name = 'Enter your name';
    if (!emailOk(data.email)) e.email = 'Enter a valid email address';
    if (data.preferredContactMethod === 'phone' && !data.phone) e.phone = 'Add a phone number so we can call you';
    if (!data.privacyAccepted) e.privacyAccepted = 'Please accept the privacy notice to continue';
  }
  return e;
}

/** Shape the API payload (only fields the backend accepts). */
export function toPayload(data, formStartedAt, draftToken) {
  return {
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    organization: data.organization.trim(),
    serviceId: data.serviceId || null,
    projectTitle: data.projectTitle.trim(),
    description: data.description.trim(),
    budgetRange: data.budgetRange,
    budgetAmount: data.budgetAmount === '' ? null : Number(data.budgetAmount),
    preferredStartDate: data.preferredStartDate || null,
    preferredEndDate: data.preferredEndDate || null,
    datesFlexible: data.datesFlexible,
    location: data.location.trim(),
    deliverables: data.deliverables.map((s) => s.trim()).filter(Boolean),
    answers: data.answers,
    attachmentTokens: data.attachments.map((a) => a.token),
    preferredContactMethod: data.preferredContactMethod,
    privacyAccepted: data.privacyAccepted,
    marketingConsent: data.marketingConsent,
    sourcePage: typeof window !== 'undefined' ? window.location.pathname : '',
    utm: readUtm(),
    draftToken: draftToken || undefined,
    website: data.website,
    formStartedAt,
  };
}

function readUtm() {
  if (typeof window === 'undefined') return undefined;
  const p = new URLSearchParams(window.location.search);
  const utm = { source: p.get('utm_source'), medium: p.get('utm_medium'), campaign: p.get('utm_campaign') };
  return Object.values(utm).some(Boolean) ? Object.fromEntries(Object.entries(utm).filter(([, v]) => v)) : undefined;
}

/** Data saved in a resumable draft — excludes attachments (tokens expire) and the honeypot. */
export function toDraft(data) {
  const { attachments, website, ...rest } = data;
  return rest;
}
