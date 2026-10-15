import { IMAGES } from './placeholderImages.js';

/**
 * Starter content. Everything here is PLACEHOLDER copy for layout purposes —
 * it makes no claims about real Royal Bee productions, clients or awards.
 * Productions and news are flagged `isPlaceholder` so the site can label them.
 */

export const settings = {
  studioName: 'Royal Bee Film Studios',
  tagline: 'Stories crafted for the big screen and beyond.',
  logo: { url: '/logo.png', alt: 'Royal Bee Film Studios' },
  contact: {
    email: 'hello@yourstudiodomain.com',
    phone: '+234 000 000 0000',
    address: 'Studio address — update in Settings',
    city: 'Lagos',
    country: 'Nigeria',
    officeHours: 'Mon – Fri, 9:00 – 18:00',
  },
  social: { instagram: '', youtube: '', facebook: '', x: '', linkedin: '' },
  seo: {
    title: 'Royal Bee Film Studios',
    description: 'Royal Bee Film Studios — film, commercial, documentary and music video production.',
  },
  footer: {
    blurb: 'A film production studio telling bold, beautifully crafted stories.',
    copyright: '© Royal Bee Film Studios. All rights reserved.',
  },
  enquiry: {
    privacyNotice:
      'We use the details you share only to respond to your enquiry and plan your project. We never sell your data.',
  },
};

export const hero = {
  eyebrow: 'Royal Bee Film Studios',
  headline: 'We make films that stay with you.',
  subheadline:
    'Feature films, commercials, documentaries and music videos — developed, shot and finished with cinematic care.',
  video: { type: 'local', url: '/images/hero-video.mp4', mobileUrl: '' },
  posterImage: IMAGES.soundstageCrew,
  mobileBehavior: 'full_video',
  overlayOpacity: 50,
  textAlign: 'left',
  ctas: [
    { label: 'Start a project', href: '/enquire', variant: 'primary' },
    { label: 'View our work', href: '/productions', variant: 'secondary' },
  ],
  showScrollCue: true,
};

export const founder = {
  name: 'Founder Name',
  title: 'Founder & Creative Director',
  portrait: IMAGES.founderPortrait,
  coverImage: IMAGES.crewInDark,
  spotlightEyebrow: 'The Founder',
  spotlightHeading: 'A storyteller behind the lens.',
  shortBio:
    'Placeholder: a short introduction to the founder — two or three sentences about who they are and what drives the studio. Replace this in the CMS.',
  quote: 'Placeholder quote — a line from the founder about why stories matter.',
  biography: [
    "Placeholder biography. Use this space for the founder's story: where they started, the moments that shaped their craft, and how Royal Bee Film Studios came to be.",
    'Add as many paragraphs as you need. Keep everything factual — only publish credentials, awards and appearances you can verify.',
  ],
  vision:
    'Placeholder vision statement — describe the kind of studio the founder is building and the stories it exists to tell.',
  philosophy:
    'Placeholder creative philosophy — how the founder approaches collaboration, craft and the audience.',
  experience: [],
  achievements: [],
  mediaAppearances: [],
  links: [],
  cta: { label: 'Work with us', href: '/enquire', variant: 'primary' },
  seo: { title: 'The Founder — Royal Bee Film Studios' },
  isPlaceholder: true,
};

export const founderGallery = [
  { image: IMAGES.founderPortrait, caption: 'Portrait (placeholder)', category: 'portrait', isFeatured: true },
  { image: IMAGES.founderOnSet, caption: 'On set (placeholder)', category: 'on_set', isFeatured: true },
  { image: IMAGES.founderDirecting, caption: 'Directing (placeholder)', category: 'on_set', isFeatured: true },
  { image: IMAGES.founderWithCamera, caption: 'Behind the camera (placeholder)', category: 'behind_the_scenes' },
  { image: IMAGES.founderTeam, caption: 'Reviewing footage (placeholder)', category: 'studio', isFeatured: true },
  { image: IMAGES.founderMonochrome, caption: 'Studio portrait (placeholder)', category: 'portrait' },
  { image: IMAGES.founderSunset, caption: 'Location scout (placeholder)', category: 'behind_the_scenes' },
  { image: IMAGES.cameraTrack, caption: 'Tracking shot setup (placeholder)', category: 'on_set' },
];

const commonQuestions = {
  film: [
    { key: 'format', label: 'What format is the project?', type: 'select', options: ['Feature film', 'Short film', 'Series / episodic', 'Not sure yet'], required: true },
    { key: 'script_stage', label: 'Where is the script?', type: 'select', options: ['Idea / concept', 'Treatment', 'Draft script', 'Final script'], required: true },
    { key: 'runtime', label: 'Expected runtime (minutes)', type: 'number' },
  ],
  commercial: [
    { key: 'brand', label: 'Brand or product', type: 'text', required: true },
    { key: 'channels', label: 'Where will it run?', type: 'multiselect', options: ['TV', 'Cinema', 'YouTube', 'Instagram / TikTok', 'Website', 'Events'] },
    { key: 'spot_lengths', label: 'Spot lengths needed', type: 'text', helpText: 'e.g. 60s, 30s and 15s cut-downs' },
  ],
  documentary: [
    { key: 'subject', label: 'Subject or story', type: 'textarea', required: true },
    { key: 'access', label: 'Do you already have access to the people/places involved?', type: 'boolean' },
  ],
  music: [
    { key: 'artist', label: 'Artist name', type: 'text', required: true },
    { key: 'track_ready', label: 'Is the track mixed and mastered?', type: 'boolean' },
    { key: 'release_date', label: 'Planned release date', type: 'date' },
  ],
  corporate: [
    { key: 'purpose', label: 'What is the video for?', type: 'select', options: ['Company profile', 'Training', 'Product launch', 'Internal communication', 'Other'], required: true },
  ],
  post: [
    { key: 'footage', label: 'How much footage do you have?', type: 'text', helpText: 'Approximate hours or TB' },
    { key: 'services_needed', label: 'What do you need?', type: 'multiselect', options: ['Editing', 'Colour grading', 'Sound design & mix', 'VFX', 'Subtitles'], required: true },
  ],
};

export const services = [
  {
    key: 'film',
    title: 'Feature & Short Film Production',
    icon: 'Clapperboard',
    coverImage: IMAGES.soundstageCrew,
    summary: 'From development to final master — full production for narrative films and series.',
    description:
      'We partner with writers, directors and producers to bring narrative stories to the screen. Our team handles development support, casting, crewing, production and post-production, so you can focus on the story.',
    benefits: ['End-to-end production management', 'Experienced department heads', 'Cinema-grade camera and lighting packages', 'Festival and distribution-ready deliverables'],
    process: [
      { title: 'Development', description: 'Script review, budgeting and scheduling.' },
      { title: 'Pre-production', description: 'Casting, locations, crew and planning.' },
      { title: 'Production', description: 'Principal photography with a dedicated team.' },
      { title: 'Post-production', description: 'Edit, sound, colour and final delivery.' },
    ],
    deliverables: ['DCP and broadcast masters', 'Trailer and teaser cuts', 'Subtitled versions', 'Stills and key art support'],
    faqs: [
      { question: 'Do you co-produce?', answer: 'We consider co-production on a project-by-project basis. Share your project details in the enquiry form.' },
      { question: 'Can you help with funding?', answer: 'We can discuss financing approaches during development. Nothing is committed until agreed in writing.' },
    ],
    questions: commonQuestions.film,
  },
  {
    key: 'commercial',
    title: 'Commercials & Brand Films',
    icon: 'Megaphone',
    coverImage: IMAGES.steadicamMonitors,
    summary: 'Cinematic advertising for TV, cinema and digital — built around your brand story.',
    description:
      'We develop concepts, produce and finish commercials and brand films that look premium on every screen, with cut-downs for each channel.',
    benefits: ['Concept development', 'Multi-format deliverables', 'Fast turnaround options', 'Brand-safe production processes'],
    process: [
      { title: 'Brief & concept', description: 'We shape the creative with your team.' },
      { title: 'Production', description: 'Casting, shoot and on-set client review.' },
      { title: 'Finishing', description: 'Edit, grade, sound and versioning.' },
    ],
    deliverables: ['Hero spot', 'Cut-downs (30s / 15s / 6s)', 'Vertical social versions', 'Behind-the-scenes stills'],
    faqs: [{ question: 'How long does a commercial take?', answer: 'Timelines depend on scope. We confirm a schedule in your formal quotation.' }],
    questions: commonQuestions.commercial,
  },
  {
    key: 'documentary',
    title: 'Documentary',
    icon: 'Film',
    coverImage: IMAGES.fieldWalk,
    summary: 'Character-led documentaries told with honesty, patience and craft.',
    description: 'From short-form documentary to feature length, we handle research, access, filming and post-production with sensitivity and care.',
    benefits: ['Research and story development', 'Small, discreet crews', 'Archival research support', 'Festival-ready finishing'],
    process: [
      { title: 'Research', description: 'Story, contributors and access.' },
      { title: 'Filming', description: 'Observational and interview shoots.' },
      { title: 'Story edit', description: 'Shaping the narrative in post.' },
    ],
    deliverables: ['Feature or short documentary', 'Trailer', 'Subtitled versions'],
    faqs: [],
    questions: commonQuestions.documentary,
  },
  {
    key: 'music',
    title: 'Music Videos',
    icon: 'Music',
    coverImage: IMAGES.stageSilhouette,
    summary: 'Bold visual storytelling for artists and labels.',
    description: 'We work with artists and labels to develop striking music video concepts and produce them to a high standard.',
    benefits: ['Treatment and concept writing', 'Styling and art direction', 'Performance and narrative shoots', 'Social cut-downs'],
    process: [
      { title: 'Treatment', description: 'Visual concept shaped with the artist.' },
      { title: 'Shoot', description: 'Performance and story sequences.' },
      { title: 'Edit & grade', description: 'Final cut and social versions.' },
    ],
    deliverables: ['Final music video', 'Vertical edits', 'Lyric/visualiser options'],
    faqs: [],
    questions: commonQuestions.music,
  },
  {
    key: 'corporate',
    title: 'Corporate & Brand Content',
    icon: 'Building2',
    coverImage: IMAGES.crewAroundCamera,
    summary: 'Company films, product launches and training content with cinematic polish.',
    description: 'Clear, engaging films that explain who you are and what you do — produced with the same craft we bring to narrative work.',
    benefits: ['Script and interview preparation', 'Professional crews', 'Motion graphics options'],
    process: [
      { title: 'Discovery', description: 'Understanding your audience and goals.' },
      { title: 'Production', description: 'Interviews, b-roll and on-location shoots.' },
      { title: 'Delivery', description: 'Final edits for every platform.' },
    ],
    deliverables: ['Main film', 'Short social edits', 'Captioned versions'],
    faqs: [],
    questions: commonQuestions.corporate,
  },
  {
    key: 'post',
    title: 'Post-Production',
    icon: 'Scissors',
    coverImage: IMAGES.projector,
    summary: 'Editing, colour, sound and finishing for projects shot by you or by us.',
    description: 'Our post-production team edits, grades, mixes and masters projects to broadcast, cinema and streaming specifications.',
    benefits: ['Offline and online editing', 'Colour grading', 'Sound design and mixing', 'Deliverables to spec'],
    process: [
      { title: 'Ingest', description: 'Media management and backup.' },
      { title: 'Edit', description: 'Story-focused editing.' },
      { title: 'Finish', description: 'Grade, mix and master.' },
    ],
    deliverables: ['Masters to spec', 'Subtitles', 'Archive handover'],
    faqs: [],
    questions: commonQuestions.post,
  },
];

export const productions = [
  {
    title: 'Harbour Lights',
    category: 'Feature Film',
    year: 2026,
    logline: 'Sample production: a fisherman’s daughter fights to keep her family’s harbour alive.',
    coverImage: IMAGES.clapperRoadside,
    isFeatured: true,
    tags: ['drama', 'coastal'],
  },
  {
    title: 'The Long Night',
    category: 'Short Film',
    year: 2025,
    logline: 'Sample production: one city block, one power cut, five strangers.',
    coverImage: IMAGES.crewInDark,
    isFeatured: true,
    tags: ['thriller', 'night shoot'],
  },
  {
    title: 'Golden Hour',
    category: 'Commercial',
    year: 2026,
    logline: 'Sample production: a brand film shot entirely in the last hour of daylight.',
    coverImage: IMAGES.fieldWalk,
    isFeatured: true,
    tags: ['brand', 'lifestyle'],
  },
  {
    title: 'Voices of the River',
    category: 'Documentary',
    year: 2025,
    logline: 'Sample production: the communities whose lives follow the river’s seasons.',
    coverImage: IMAGES.cameraTrack,
    tags: ['documentary', 'community'],
  },
  {
    title: 'Neon Static',
    category: 'Music Video',
    year: 2026,
    logline: 'Sample production: a performance video lit entirely by practical neon.',
    coverImage: IMAGES.stageSilhouette,
    isFeatured: true,
    tags: ['music', 'performance'],
  },
  {
    title: 'Behind the Frame',
    category: 'Series',
    year: 2026,
    logline: 'Sample production: an episodic look at the people who make films happen.',
    coverImage: IMAGES.soundstageCrew,
    tags: ['series', 'behind the scenes'],
  },
];

export const news = [
  {
    title: 'Welcome to the new Royal Bee Film Studios website',
    category: 'Studio News',
    excerpt: 'Sample article: our new home online, with our work, services and an easier way to start a project.',
    coverImage: IMAGES.cinemaHall,
    isFeatured: true,
    body: [
      { type: 'paragraph', text: 'This is a sample news article. Replace it in the CMS with real studio news.' },
      { type: 'paragraph', text: 'Articles support headings, quotes and images, plus scheduled publishing and optional expiry.' },
    ],
  },
  {
    title: 'Now booking productions for next season',
    category: 'Announcements',
    excerpt: 'Sample article: how to get your project on our production calendar.',
    coverImage: IMAGES.clapperHands,
    body: [{ type: 'paragraph', text: 'Sample content — tell visitors how to book or enquire.' }],
  },
  {
    title: 'Inside our post-production suite',
    category: 'Behind the Scenes',
    excerpt: 'Sample article: a look at how our edit, colour and sound teams work together.',
    coverImage: IMAGES.filmReel,
    body: [{ type: 'paragraph', text: 'Sample content about the studio’s post-production process.' }],
  },
];

export const ticker = [
  { image: IMAGES.clapperRoadside, caption: 'On location', category: 'film_set', productionIndex: 0 },
  { image: IMAGES.soundstageCrew, caption: 'Soundstage', category: 'film_set' },
  { image: IMAGES.clapperPortrait, caption: 'Scene one, take one', category: 'behind_the_scenes' },
  { image: IMAGES.crewAroundCamera2, caption: 'Camera department', category: 'behind_the_scenes' },
  { image: IMAGES.studioSetup, caption: 'In the studio', category: 'studio' },
  { image: IMAGES.stageSilhouette, caption: 'Performance shoot', category: 'production', productionIndex: 4 },
  { image: IMAGES.operatorCamera, caption: 'Handheld', category: 'behind_the_scenes' },
  { image: IMAGES.steadicamMonitors, caption: 'Video village', category: 'film_set', productionIndex: 2 },
  { image: IMAGES.crewInDark, caption: 'Night shoot', category: 'film_set', productionIndex: 1 },
  { image: IMAGES.videoCamera, caption: 'Camera prep', category: 'studio' },
  { image: IMAGES.cinemaAudience, caption: 'Premiere screening', category: 'production' },
  { image: IMAGES.crewSitting, caption: 'Between takes', category: 'behind_the_scenes' },
];

export const gallery = [
  { image: IMAGES.soundstageCrew, caption: 'Soundstage day', category: 'on_set', isFeatured: true },
  { image: IMAGES.crewAroundCamera, caption: 'Blocking the scene', category: 'crew' },
  { image: IMAGES.studioSetup, caption: 'Lighting setup', category: 'studio' },
  { image: IMAGES.clapperHands, caption: 'Slate', category: 'behind_the_scenes' },
  { image: IMAGES.operatorCamera, caption: 'Camera operator', category: 'crew' },
  { image: IMAGES.projector, caption: 'Screening room', category: 'studio' },
  { image: IMAGES.twoReels, caption: 'From the archive', category: 'studio' },
  { image: IMAGES.crewInDark, caption: 'Night exterior', category: 'on_set', isFeatured: true },
  { image: IMAGES.cinemaScreen, caption: 'Test screening', category: 'production' },
];

export const homeSections = (ids) => [
  { type: 'hero', name: 'Hero video', content: {} },
  {
    type: 'intro',
    name: 'Studio introduction',
    theme: 'light',
    content: {
      eyebrow: 'About the studio',
      heading: 'A home for ambitious stories.',
      body:
        'Royal Bee Film Studios develops and produces films, commercials, documentaries and music videos. We bring cinematic craft to every frame — whatever the screen.',
      image: IMAGES.crewSitting,
      stats: [
        { value: '6', label: 'Production services' },
        { value: 'End-to-end', label: 'Development to delivery' },
        { value: 'Cinema-grade', label: 'Camera & post' },
      ],
    },
  },
  {
    type: 'featured_productions',
    name: 'Featured productions',
    content: { eyebrow: 'Selected work', heading: 'Featured productions', productionIds: ids.featuredProductions, limit: 6 },
  },
  { type: 'ticker', name: 'Moving image ticker', content: { eyebrow: 'On set', heading: 'Moments from our sets' } },
  { type: 'services', name: 'Services', theme: 'warm', content: { eyebrow: 'What we do', heading: 'Production services', intro: 'From first idea to final master.', serviceIds: [], limit: 6 } },
  { type: 'founder', name: 'Founder spotlight', theme: 'dark', content: {} },
  { type: 'news', name: 'Latest news', content: { eyebrow: 'Studio news', heading: 'Latest from the studio', limit: 3 } },
  {
    type: 'cta',
    name: 'Start a project banner',
    theme: 'dark',
    content: {
      heading: 'Have a story to tell?',
      body: 'Tell us about your project and we’ll get back to you with next steps.',
      ctas: [
        { label: 'Start a project', href: '/enquire', variant: 'primary' },
        { label: 'Contact us', href: '/contact', variant: 'secondary' },
      ],
      backgroundImage: IMAGES.cinemaScreen,
    },
  },
  { type: 'contact', name: 'Contact details', content: { heading: 'Visit or call the studio', body: '' } },
];

export const ctas = [
  { name: 'Navbar — start a project', label: 'Start a project', href: '/enquire', placement: 'navbar', variant: 'primary' },
  { name: 'Service page — get a quote', label: 'Request a quote', href: '/enquire', placement: 'service_page', variant: 'primary' },
  { name: 'Production page — similar project', label: 'Make something like this', href: '/enquire', placement: 'production_page', variant: 'primary' },
  { name: 'Footer — newsletter placeholder', label: 'Contact the studio', href: '/contact', placement: 'global_footer', variant: 'secondary' },
];
