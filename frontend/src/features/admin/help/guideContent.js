import { P } from '../../../lib/permissions';

/**
 * Staff Help & Guide content.
 *
 * Each section and article can be limited with `perm` (one permission, or an array — any of them).
 * Staff only see what their role can use. `routes` link admin pages to the matching article,
 * so the "Help" button in the top bar opens the right topic for the page you're on.
 *
 * Article fields (all optional except id/title):
 *   summary  — one or two sentences
 *   steps    — numbered steps
 *   points   — bullet points
 *   tip      — green "good to know" box
 *   warning  — amber "be careful" box
 */
export const GUIDE = [
  /* ─────────────────────────── START HERE ─────────────────────────── */
  {
    id: 'start',
    title: 'Start here',
    intro: 'The basics every staff member needs: signing in, finding your way around and keeping your account safe.',
    articles: [
      {
        id: 'how-it-fits',
        title: 'How the platform fits together',
        routes: ['/admin/help'],
        summary: 'There is one website with three private areas. Each person only sees the area made for them.',
        points: [
          'Public website (royalbeefilmstudios.com): what visitors see — homepage, services, productions, founder, news, gallery, contact and enquiry forms, partner page and "Join our talent roster".',
          'Staff dashboard (/admin): where you work. What you see here depends on your role.',
          'Client portal (/portal): clients you invite follow their projects, review deliverables, read messages and see quotes and invoices.',
          'Talent portal (/talent): approved actors, models and crew see casting calls, confirm bookings, message the team and get documents.',
          'Everyone signs in on the same page. The system sends each person to the right area automatically.',
        ],
      },
      {
        id: 'signing-in',
        title: 'Signing in and two-factor authentication',
        routes: ['/admin/security/setup-mfa'],
        summary: 'Staff accounts are invite-only — there is no public sign-up for staff.',
        steps: [
          'Open the invitation email and click the link (it works once and expires after 72 hours).',
          'Choose a strong password — at least 12 characters, ideally a short sentence.',
          'If your role requires it, you’ll be asked to set up two-factor authentication (2FA): scan the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…) and type the 6-digit code.',
          'Save your recovery codes somewhere safe. They are the only way in if you lose your phone.',
        ],
        tip: 'Forgot your password? Use “Forgot password” on the sign-in page. The reset link works once and expires after 30 minutes.',
        warning: 'After 5 wrong passwords the account locks for 15 minutes. Never share your password or authenticator codes — staff will never ask for them.',
      },
      {
        id: 'dashboard',
        title: 'The dashboard',
        routes: ['/admin'],
        summary: 'Your home screen shows what needs attention today.',
        points: [
          'Counters: new and unassigned enquiries, unread messages, content waiting for review and published productions (you only see the ones your role covers).',
          'Latest enquiries and quick actions (new production, new article, edit ticker).',
          'System health: whether email and media uploads are connected.',
        ],
      },
      {
        id: 'finding-things',
        title: 'Search, notifications and the menu',
        points: [
          'Search or jump to… (top bar, or press Ctrl K / ⌘ K): type a page name to jump straight to it.',
          'The bell shows things waiting for you — new enquiries, client messages, talent applications, booking replies and more. Click an item to open it.',
          'On a phone, the bottom bar holds your four most-used pages; everything else is under “More”.',
          'The Help button (?) in the top bar opens this guide on the topic for the page you’re on.',
        ],
      },
      {
        id: 'your-account',
        title: 'Your account and security',
        routes: ['/admin/security'],
        summary: 'Open your avatar (top right) → Account & security.',
        points: [
          'Profile: your name, phone and photo.',
          'Change password: you’ll need your current password.',
          'Two-factor authentication: turn on, get new recovery codes, or turn off (if your role allows it).',
          'Active sessions: see every device you’re signed in on. “Sign out everywhere” logs out all of them — use it if you lose a device or used a shared computer.',
          'Workspace preferences: light, dark or system theme.',
        ],
      },
      {
        id: 'golden-rules',
        title: 'Golden rules',
        points: [
          'Everything important is recorded in the audit trail — who did what, and when.',
          'Prefer Archive over Delete. Archived things can be restored; deleted things are gone.',
          'Anything that can’t be undone asks you to confirm, and the most serious actions ask you to type DELETE.',
          'Internal notes are staff-only. Clients and talent never see them.',
          'Day rates, internal notes and private documents are never shown on the public website.',
          'Only publish facts you can prove — especially awards, press and client names.',
        ],
      },
    ],
  },

  /* ─────────────────────────── WEBSITE ─────────────────────────── */
  {
    id: 'website',
    title: 'Website content',
    perm: [P.CMS_VIEW, P.MEDIA_VIEW],
    intro: 'How to change what visitors see on the public website — safely, with review before anything goes live.',
    articles: [
      {
        id: 'publishing-workflow',
        title: 'How publishing works (draft → review → live)',
        perm: P.CMS_VIEW,
        routes: ['/admin/website'],
        summary: 'Nothing you type goes live until someone with publishing rights publishes it. The status bar at the top of each editor shows where the item is and which buttons you can use.',
        steps: [
          'Draft: create or edit, then click Save. Saving never changes the live website.',
          'Submit for review: sends it to a manager. (Save first — the button is disabled while you have unsaved changes.)',
          'Approve or Request changes: a reviewer approves it, or sends it back with a comment that appears on the draft.',
          'Publish…: makes it live now, or pick a “Publish at” date to schedule it. “Expire at” hides it automatically later.',
          'Unpublish takes it off the website but keeps it. Archive hides it until someone restores it.',
        ],
        points: [
          'Services, productions, news and homepage sections use the full workflow above.',
          'Hero video and Founder have a draft copy and a live copy: edit the draft, then Publish. “Discard changes” resets the draft to what is live.',
          'Image ticker, studio gallery, founder gallery and calls to action use a simple Live / Hidden switch.',
          'A Super Admin can switch off “Require approval before publishing” in Studio settings → Publishing workflow. Then publishers can publish drafts directly.',
        ],
        tip: 'Who can do what: Content Editors draft and submit; Managers approve, publish and delete; Production Staff can only look.',
      },
      {
        id: 'hero',
        title: 'Hero video (top of the homepage)',
        perm: P.CMS_VIEW,
        routes: ['/admin/website/hero'],
        steps: [
          'Video: choose “Upload from your device” and pick an MP4, WebM or MOV (up to 100 MB). YouTube, Vimeo or a direct .mp4 link also work.',
          'Poster / fallback image: always add one. It shows while the video loads, on slow connections and when there is no video.',
          'On phones: play the full video, a lighter mobile version (720p, under 15 MB is ideal) or just the poster.',
          'Text and Buttons: eyebrow, headline, supporting text and up to two buttons.',
          'Check the Draft preview, then Publish.',
        ],
        tip: 'Export hero videos at 1080p, 15–30 seconds, no sound needed (it plays muted). Smaller files load faster and look just as good.',
        warning: '“Delete video” removes the video from the hero only — the poster image shows instead. The file stays in the Media library.',
      },
      {
        id: 'homepage-sections',
        title: 'Homepage sections',
        perm: P.CMS_VIEW,
        routes: ['/admin/website/homepage'],
        summary: 'The homepage is built from sections you can add, reorder, hide and edit.',
        steps: [
          'Add a homepage section → choose a type (intro, featured productions, services, founder, news, gallery, partner, talent, testimonials, call to action, contact…).',
          'Drag sections to change their order. Use the Enabled switch to hide one without deleting it.',
          'Edit the section’s text, images and background (Warm paper, Off-white or Charcoal).',
          'Each section goes through the publishing workflow before changes show.',
        ],
        tip: 'Featured productions, services and news sections fill themselves from published items — mark items as “Featured” in their own editors.',
      },
      {
        id: 'ticker',
        title: 'Image ticker',
        perm: P.CMS_VIEW,
        routes: ['/admin/website/ticker'],
        points: [
          'The moving strip of photos. Add images, give each alt text and choose what happens on click (nothing, a production page, the gallery or a custom link).',
          'Ticker behaviour: speed, direction, height, pause on hover, or switch the whole ticker off.',
          'Drag to reorder. Use Live / Hidden per image.',
        ],
      },
      {
        id: 'founder',
        title: 'Founder page and founder gallery',
        perm: P.CMS_VIEW,
        routes: ['/admin/website/founder', '/admin/website/founder-gallery'],
        points: [
          'Profile: name, title, portrait, short introduction and the button at the bottom.',
          'Biography & vision: the full story, quote, creative philosophy and vision.',
          'Experience: Period, Role, Organization and a short description for each step of her career.',
          'Achievements: only items with “Verified” switched on appear on the website. Add an internal evidence link so anyone can check it.',
          'Media & links: interviews and press (with the real link), plus profile buttons such as Instagram or IMDb.',
          'Related & SEO: pick published productions to show at the bottom, and set the Google title and description.',
          'Turn off “Placeholder content” once the real details are in.',
          'Founder gallery: extra photos (portrait, studio, on set, behind the scenes, press).',
        ],
        warning: 'Never publish an award, festival selection or press mention that can’t be proved. It damages trust if anyone checks.',
      },
      {
        id: 'services',
        title: 'Services',
        perm: P.CMS_VIEW,
        routes: ['/admin/website/services'],
        points: [
          'Basics: name, summary, cover image, URL slug and “Featured service”.',
          'Content: description, benefits, deliverables and the production process.',
          'Packages & pricing: show a starting price or packages — or keep prices hidden.',
          'Enquiry questions: extra questions this service adds to the enquiry form (short text, choices, yes/no, date…).',
          'FAQs & testimonials: testimonials only appear when “Approved for publication” is on.',
          'Portfolio & SEO: link example productions and set the Google title and description.',
        ],
      },
      {
        id: 'productions',
        title: 'Productions (portfolio)',
        perm: P.CMS_VIEW,
        routes: ['/admin/website/productions'],
        points: [
          'Basics: title, category, year, logline, synopsis and “Featured”.',
          'Images & trailer: cover image (used on the Work page and homepage), stills, behind-the-scenes photos and a trailer.',
          'Credits & client: crew credits. The client’s name only shows publicly when “Show client name publicly” is on — ask the client first.',
          'Visibility: Public (listed everywhere), Unlisted (only people with the link) or Private (never shown).',
        ],
        tip: 'Use landscape cover images (16:9), at least 1600 px wide.',
      },
      {
        id: 'news',
        title: 'News articles',
        perm: P.CMS_VIEW,
        routes: ['/admin/website/news'],
        steps: [
          'New article → headline, excerpt, cover image, category, author.',
          'Build the body with blocks: paragraph, heading, image and quote. Drag blocks to reorder.',
          'Fill in SEO, then submit for review and publish (or schedule it).',
        ],
      },
      {
        id: 'galleries-ctas-partner',
        title: 'Studio gallery, calls to action and partner page',
        perm: P.CMS_VIEW,
        routes: ['/admin/website/gallery', '/admin/website/ctas', '/admin/website/partner'],
        points: [
          'Studio gallery: photos by category (studio, production, behind the scenes, on set, crew). Live / Hidden per photo.',
          'Calls to action: buttons placed around the site (navbar, hero, homepage, footer, service or production pages). Set the text, link and style, and optionally show them only between two dates. The list shows how many clicks each one gets.',
          'Partner page: the top of the page, the ways to partner, how it works and the form text. Partnership requests arrive as enquiries.',
        ],
      },
      {
        id: 'media-library',
        title: 'Media library',
        perm: P.MEDIA_VIEW,
        routes: ['/admin/media'],
        points: [
          'Every uploaded image, video and document in one place. Filter by type or search by name.',
          'Click a file to edit its alt text and caption, and to see where it is used.',
          'A file can’t be deleted while it is still used somewhere — remove it from those pages first.',
          'Always write alt text for images (describe what’s in the photo). It helps people using screen readers and helps Google.',
        ],
        tip: 'Before uploading, resize photos to around 2000 px on the long side and export as JPG or WebP. Huge files slow the website down.',
      },
    ],
  },

  /* ─────────────────────────── ENQUIRIES & CRM ─────────────────────────── */
  {
    id: 'enquiries',
    title: 'Enquiries & CRM',
    perm: [P.ENQUIRIES_VIEW, P.CRM_VIEW],
    intro: 'Where new business arrives, and how to follow it up until it becomes a project.',
    articles: [
      {
        id: 'enquiry-flow',
        title: 'Handling an enquiry',
        perm: P.ENQUIRIES_VIEW,
        routes: ['/admin/enquiries'],
        summary: 'Every form on “Start a project” and the partner page creates an enquiry with a reference like RBF-ENQ-2026-0001. Staff get an email and a bell notification.',
        steps: [
          'Open the enquiry from Enquiries (newest first) or the bell.',
          'Assign it to the person who will handle it (needs the assign permission).',
          'Contact the person, then update the Status: New → Contacted → Qualified → Proposal sent → Converted (or Closed / Spam).',
          'Add internal notes after every call or email, and set a Follow-up date so nothing is forgotten.',
          'When it becomes real work, invite them as a client and create a project (see Clients, projects & invoices).',
        ],
        points: [
          '“Possible duplicate” means the same email already sent an enquiry — check the CRM contact before replying twice.',
          'Attachments open through short-lived private links that expire after 5 minutes.',
          'Export CSV downloads the current list (needs the export permission).',
        ],
      },
      {
        id: 'messages',
        title: 'Contact messages',
        perm: P.ENQUIRIES_VIEW,
        routes: ['/admin/messages'],
        points: [
          'General questions from the Contact page arrive here, not in Enquiries.',
          'Set the status as you work: New → Read → Replied, or Archived / Spam.',
          'Reply from your normal email — the message shows the sender’s email and phone.',
        ],
      },
      {
        id: 'crm',
        title: 'CRM contacts',
        perm: P.CRM_VIEW,
        routes: ['/admin/contacts'],
        summary: 'One record per person or organisation, created automatically from enquiries and messages (matched by email).',
        points: [
          'Stage: Lead → Prospect → Client, or Inactive.',
          'Owner: the staff member responsible for the relationship.',
          'Notes & activity: every enquiry, message and note in one timeline.',
          '“Follow-up due” shows everyone you promised to get back to.',
          'Marketing consent shows whether they agreed to receive news — only email people who said yes.',
        ],
      },
    ],
  },

  /* ─────────────────────────── CLIENTS ─────────────────────────── */
  {
    id: 'clients',
    title: 'Clients, projects & invoices',
    perm: [P.PROJECTS_VIEW, P.CLIENTS_MANAGE, P.INVOICES_VIEW],
    intro: 'From signed client to delivered film: portal accounts, project tracking, deliverables, quotes, invoices and payments.',
    articles: [
      {
        id: 'invite-client',
        title: 'Inviting a client to the portal',
        perm: P.CLIENTS_MANAGE,
        routes: ['/admin/clients'],
        steps: [
          'Client accounts → Invite client.',
          'Enter first name, last name and email (plus phone and company if you have them).',
          'They get an email with a link to set their password. If email isn’t working, the box shows a link you can copy and send yourself (WhatsApp is fine).',
          'Invited clients show under the “Invited” tab until they accept. Use “Resend invitation” if the link expired.',
        ],
        points: [
          'Deactivate stops a client signing in without deleting their history.',
          'One email can only be one type of account (staff, client or talent).',
        ],
      },
      {
        id: 'projects',
        title: 'Running a project',
        perm: P.PROJECTS_VIEW,
        routes: ['/admin/projects'],
        steps: [
          'Projects → New project. Choose the client, project manager, service, dates and write a Summary for the client.',
          'Turn on “Show in the client’s portal” — otherwise the client can’t see it.',
          'Move the Stage as work progresses: Briefing → Pre-production → Production → Post-production → Client review → Delivered. The client sees this timeline.',
          'Status (Active, On hold, Completed, Cancelled) is for your team’s overview.',
        ],
        points: [
          'Conversation: messages between your team and the client. Tick “internal” to leave a staff-only note — it shows with a dashed amber border and the client never sees it.',
          'When the client writes, the project shows “The client is waiting for a reply” until someone answers.',
          'The project manager gets the emails for that project.',
        ],
      },
      {
        id: 'deliverables',
        title: 'Sharing deliverables for review',
        perm: P.PROJECTS_VIEW,
        routes: ['/admin/projects/'],
        steps: [
          'On the project, add a deliverable: title, link (Google Drive, Vimeo, Frame.io, WeTransfer…), notes for the client, optional “Review by” date and preview image.',
          'The client is emailed and sees it under “Ready for your review”.',
          'They click Approve, or Request changes with a comment.',
          'For a new cut, use “Share new version” on that deliverable — the client is asked to review again and earlier versions are kept.',
        ],
        tip: 'Use password-protected or private links for unreleased work, and put the password in the notes.',
      },
      {
        id: 'quotes',
        title: 'Quotes',
        perm: P.INVOICES_VIEW,
        routes: ['/admin/invoices/new'],
        steps: [
          'Invoices & quotes → New → choose Quote. Pick the client (and project if there is one).',
          'Add line items (description, quantity, price). Choose the currency (NGN, USD or GBP), add VAT if needed (7.5% by default) and an optional discount.',
          'Save, check the PDF, then Send to client.',
          'The client can Accept or Decline in their portal — or you can mark it yourself from the ⋯ menu if they told you by phone.',
          'Convert to invoice creates the invoice from the quote with the same lines.',
        ],
      },
      {
        id: 'invoices-payments',
        title: 'Invoices and recording payments',
        perm: P.INVOICES_VIEW,
        routes: ['/admin/invoices'],
        summary: 'Invoices are records and PDFs — clients pay by bank transfer, and staff record each payment here.',
        steps: [
          'Create the invoice (or convert a quote), check it, then Send to client. They get an email and see it in their portal.',
          'When money arrives, open the invoice → Record payment. Enter the amount, date received, method and bank reference.',
          'Leave “Email a receipt to the client” on to send them a receipt automatically.',
          'Part payments show as “Partially paid” with the balance left. When the balance reaches zero it becomes Paid.',
        ],
        points: [
          'Overdue and unpaid filters show who still owes money. The totals at the top show what is outstanding and what came in this month.',
          'Drafts can be edited or deleted. Sent invoices can be edited only until a payment is recorded.',
          'Cancel an invoice from the ⋯ menu (it stays on record as cancelled). Invoices with payments can’t be cancelled — remove the payment first if it was a mistake.',
          'Amounts in naira print as “NGN” on PDFs.',
        ],
        warning: 'Only record a payment once you’ve seen it in the bank account — a receipt email goes out straight away.',
      },
      {
        id: 'billing-settings',
        title: 'Billing details and defaults',
        perm: P.INVOICES_MANAGE,
        routes: ['/admin/invoices/settings'],
        points: [
          'Business: the name, address, email, phone and Tax ID (TIN) printed on every PDF.',
          'Bank accounts: the accounts clients should pay into — add one per currency.',
          'Defaults: currency, VAT on/off and rate, days until an invoice is due and how long quotes stay valid.',
          'Default notes and payment terms for new documents.',
        ],
      },
      {
        id: 'client-view',
        title: 'What the client sees',
        perm: [P.PROJECTS_VIEW, P.CLIENTS_MANAGE],
        points: [
          'Their projects (only ones with “Show in the client’s portal” on), the stage timeline and the summary.',
          'Deliverables to approve or comment on, and the conversation (never your internal notes).',
          'Their quotes and invoices with PDF downloads, the bank details and the balance due.',
          'Emails when you share a deliverable, reply, send a quote or invoice, or record a payment.',
        ],
      },
    ],
  },

  /* ─────────────────────────── TALENT ─────────────────────────── */
  {
    id: 'talent',
    title: 'Talent & castings',
    perm: P.TALENT_VIEW,
    intro: 'The private talent roster: applications, casting calls, bookings and documents. Nothing here is ever shown on the public website.',
    articles: [
      {
        id: 'applications',
        title: 'Reviewing applications',
        routes: ['/admin/talent'],
        summary: 'People apply on the website (“Join our talent roster”). Applications wait under Talent roster → Applications, and staff get notified.',
        steps: [
          'Open the application — check photos, showreels, details and their message. Applicants confirm they are 18 or older.',
          'Approve & invite: they join the roster and get an email to set up their talent portal. If email isn’t working, copy the link shown and send it to them.',
          'Or Decline with a private reason. You can choose to send a polite “thank you” email — the reason is never included.',
          'Spam or test applications that were never approved can be deleted from the ⋯ menu.',
        ],
      },
      {
        id: 'roster',
        title: 'The roster and talent profiles',
        routes: ['/admin/talent/'],
        points: [
          'Filter by status (On roster, Applications, Declined, Archived), type and availability, or search by name, skill, language or city.',
          'Edit: update their details and photos (up to 12). Talent can also update their own profile.',
          'Rate & availability: day rate and notes are staff-only — talent and the public never see them.',
          'Internal notes: staff-only notes about the person.',
          '“Invite not accepted yet” means they haven’t set up their account — use Resend invitation.',
        ],
      },
      {
        id: 'castings',
        title: 'Casting calls',
        routes: ['/admin/castings'],
        steps: [
          'Casting calls → New. Add title, description, requirements, who it’s for (actor, model, crew…), location, shoot dates, the fee shown to talent and the “Apply by” date.',
          'It starts as a Draft — talent can’t see it yet.',
          'Open it. Tick “Email matching talent” to email everyone on the roster of the selected types.',
          'Talent apply from their portal. Shortlist people, mark others “not selected”, and book the ones you choose.',
          'Close the casting when you’re done — talent can no longer apply.',
        ],
      },
      {
        id: 'bookings',
        title: 'Bookings',
        routes: ['/admin/bookings'],
        steps: [
          'Offer a booking from a talent profile, a casting application or Bookings → New: role, dates, call time, location, fee and details.',
          'The talent is emailed and Confirms or Declines in their portal.',
          'Use the booking conversation for questions (tick “internal” for staff-only notes).',
          'Share contracts or release forms under “Documents for this booking”.',
          'After the shoot, Mark completed. If plans change, Cancel with a reason — the talent is told.',
        ],
      },
      {
        id: 'talent-documents',
        title: 'Private documents',
        points: [
          'Contracts, release forms, ID and invoices are stored privately. Download links expire after 5 minutes.',
          'Staff upload from the talent’s profile or a booking. Talent can upload their own from the portal (for example a signed contract).',
          'Every download is recorded in the audit trail.',
        ],
      },
      {
        id: 'archive-delete-talent',
        title: 'Archive, restore and delete',
        perm: P.TALENT_MANAGE,
        points: [
          'Archive: takes someone off the active roster and switches off their portal sign-in. Everything is kept.',
          'Restore to roster: brings them back; they can sign in again with their old password.',
          'Delete permanently (archived talent only): removes the profile, photos, portal account, bookings, booking messages, casting applications and documents. You must type DELETE to confirm.',
        ],
        warning: 'Deleting can’t be undone. If you might work with the person again, leave them archived.',
      },
      {
        id: 'talent-view',
        title: 'What talent see',
        points: [
          'Their own profile (they can update photos, showreels, skills and availability — not rates or notes).',
          'Open casting calls that match them, and the ones they applied to.',
          'Their bookings, each with a conversation, and documents shared with them.',
          'They never see other talent, day rates, internal notes or staff-only messages.',
        ],
      },
    ],
  },

  /* ─────────────────────────── TEAM, SETTINGS & SECURITY (admins) ─────────────────────────── */
  {
    id: 'admin',
    title: 'Team, settings & security',
    perm: [P.USERS_MANAGE, P.ROLES_MANAGE, P.SETTINGS_MANAGE, P.INTEGRATIONS_MANAGE, P.AUDIT_VIEW],
    intro: 'For administrators: who has access, what they can do, studio-wide settings and keeping the platform secure.',
    articles: [
      {
        id: 'staff',
        title: 'Staff accounts',
        perm: [P.USERS_MANAGE],
        routes: ['/admin/staff'],
        steps: [
          'Staff → Invite staff. Enter their name, work email, job title and choose a Role.',
          'They get an invitation email (or you get a link to send them if email isn’t working).',
          'When someone leaves: Deactivate them straight away. They are signed out on their very next click.',
          'Only a Super Admin can delete a staff account, and only after it is deactivated. Their past work stays; their enquiries become unassigned.',
        ],
        points: [
          '“Sign out everywhere” ends all of someone’s sessions — use it if a laptop or phone is lost.',
          'Give people the lowest role that lets them do their job.',
        ],
      },
      {
        id: 'roles',
        title: 'Roles and permissions',
        perm: P.ROLES_MANAGE,
        routes: ['/admin/roles'],
        summary: 'A role is a set of permissions. Every staff member has exactly one role.',
        points: [
          'Super Admin: everything, and 2FA is mandatory. Keep this to one or two people.',
          'Manager: website (including approve and publish), enquiries, CRM, projects, clients, invoices and talent; can view staff.',
          'Content Editor: drafts website content and submits it for approval; can upload media.',
          'Production Staff: read-only website access.',
          'New role: pick exactly the permissions needed — for example a “Casting Assistant” with only talent permissions, or an “Accounts” role with only invoices.',
          'Turn on “Require two-factor authentication” for any role that can publish, see money or manage people.',
          'Client and Talent roles are system roles for the portals — don’t give them to staff.',
        ],
      },
      {
        id: 'settings',
        title: 'Studio settings',
        perm: P.SETTINGS_MANAGE,
        routes: ['/admin/settings'],
        points: [
          'Studio: name, tagline, logo, footer text and the copyright line ({year} updates itself every year).',
          'Contact & social: email, phone, address, office hours, map link and social profiles — used across the website and emails.',
          'Enquiries & notifications: budget ranges on the enquiry form, how long saved drafts last, the privacy notice and which emails receive new enquiries and contact messages.',
          'SEO & search: default Google title/description, public search and the Google Analytics ID.',
          'Publishing workflow: whether content must be approved before publishing (Super Admin only).',
        ],
      },
      {
        id: 'integrations',
        title: 'Integrations (email and media)',
        perm: P.INTEGRATIONS_MANAGE,
        routes: ['/admin/integrations'],
        points: [
          'Shows whether email (Brevo) and media uploads (Cloudinary) are connected. Use “Test connection” to check.',
          'Recent transactional emails: every email the system tried to send and whether it was sent, failed or skipped. Check here first when someone says “I didn’t get the email”.',
          'If email isn’t connected, invitations still work — the dashboard shows a link to copy and send yourself.',
        ],
        tip: 'Connection keys are set on the server by the developer, never typed into the dashboard.',
      },
      {
        id: 'audit',
        title: 'Audit trail',
        perm: P.AUDIT_VIEW,
        routes: ['/admin/audit'],
        points: [
          'A permanent record of important actions: sign-ins, failed sign-ins, publishing, deletes, role changes, invoices, payments, talent decisions and document downloads.',
          'Filter by action and open “Show details” to see exactly what changed.',
          'Entries can’t be edited or deleted — not even by a Super Admin.',
        ],
      },
      {
        id: 'security-checklist',
        title: 'Security checklist for admins',
        perm: [P.USERS_MANAGE, P.ROLES_MANAGE],
        points: [
          'Deactivate leavers on their last day.',
          'Review the staff list and roles every few months.',
          'Make sure everyone who can publish, see invoices or manage staff uses 2FA.',
          'Check the audit trail for repeated failed sign-ins.',
          'Never share one account between several people — everyone gets their own.',
          'Lost your 2FA phone and recovery codes? The developer can reset 2FA from the server.',
        ],
      },
    ],
  },
];

const asList = (perm) => (perm ? (Array.isArray(perm) ? perm : [perm]) : []);
const allowed = (perm, can) => !perm || asList(perm).some((p) => can(p));

/** Sections and articles this person is allowed to see. */
export function visibleGuide(can) {
  return GUIDE.filter((s) => allowed(s.perm, can))
    .map((s) => ({ ...s, articles: s.articles.filter((a) => allowed(a.perm, can)) }))
    .filter((s) => s.articles.length);
}

/** The article that best matches an admin path (longest matching route wins). */
export function articleForPath(sections, path) {
  let best = null;
  let bestLen = -1;
  for (const s of sections) {
    for (const a of s.articles) {
      for (const r of a.routes || []) {
        const match = r.endsWith('/') ? path.startsWith(r) && path.length > r.length : path === r || path.startsWith(`${r}/`);
        if (match && r.length > bestLen) {
          best = a.id;
          bestLen = r.length;
        }
      }
    }
  }
  return best;
}

/** Plain text of an article — used by the search box. */
export function articleText(a) {
  return [a.title, a.summary, ...(a.steps || []), ...(a.points || []), a.tip, a.warning].filter(Boolean).join(' ').toLowerCase();
}