/**
 * Default content for the "Partner with us" page.
 * Used to pre-fill the admin editor and as the public fallback until the page is published.
 */
export const PARTNERSHIP_TYPES = [
  {
    key: 'brand',
    title: 'Brand partnerships',
    description: 'Product placement, branded content and campaigns woven naturally into our films and series.',
  },
  {
    key: 'co_production',
    title: 'Co-production',
    description: 'Studios and producers who want to develop and produce a project together with Royal Bee.',
  },
  {
    key: 'sponsorship',
    title: 'Sponsorship & investment',
    description: 'Back a production, a festival screening or a slate of projects and grow with us.',
  },
  {
    key: 'distribution',
    title: 'Distribution & streaming',
    description: 'Cinemas, broadcasters and streaming platforms looking for original African stories.',
  },
  {
    key: 'talent',
    title: 'Talent & crew',
    description: 'Actors, directors, writers and freelancers who want to collaborate on upcoming productions.',
  },
];

export const DEFAULT_PARTNER_PAGE = {
  eyebrow: 'Partner with us',
  heading: 'Let’s create something remarkable together.',
  intro:
    'Royal Bee Film Studios works with brands, studios, sponsors, platforms and creative talent to bring bold stories to the screen. Tell us how you would like to work with us.',
  image: {
    url: 'https://images.unsplash.com/photo-1632187981988-40f3cbaeef5e?auto=format&fit=crop&w=1800&q=80',
    alt: 'Crew gathered around a cinema camera',
    isPlaceholder: true,
  },
  typesHeading: 'Ways to partner',
  types: PARTNERSHIP_TYPES,
  stepsHeading: 'How it works',
  steps: [
    { title: 'Send your proposal', description: 'Fill in the form with a few details about you and the partnership you have in mind.' },
    { title: 'We review and call you', description: 'Our team reviews every proposal and reaches out to talk it through.' },
    { title: 'We agree and create', description: 'Once we agree on the details, we get to work on something great together.' },
  ],
  formHeading: 'Send a partnership proposal',
  formIntro: 'We read every proposal and usually reply within a few working days.',
  successMessage: 'Thank you — your proposal has been received. Our partnerships team will be in touch soon.',
};