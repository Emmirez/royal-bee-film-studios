# Royal Bee Film Studios — Backend API

Node.js · Express · MongoDB (Mongoose) · ES modules
**Stage 1 (foundation)** + **Stage 2 (public website & CMS)** of the Royal Bee platform.

---

## 1. Quick start (Windows / macOS / Linux)

Requirements: **Node.js 20+** and **MongoDB 6+** (local install or MongoDB Atlas).

```bash
cd royal-bee-backend
npm install
copy .env.example .env        # Windows   (macOS/Linux: cp .env.example .env)
```

Open `.env` and set at least:

| Variable | What to put |
|---|---|
| `MONGODB_URI` | e.g. `mongodb://127.0.0.1:27017/royal_bee_studios` or your Atlas URI |
| `JWT_ACCESS_SECRET` | a long random string (48+ chars) |
| `MFA_ENCRYPTION_KEY` | exactly 64 hex characters |
| `CLIENT_URL` | your frontend URL, e.g. `http://localhost:5173` |

Generate both secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The first line is for `JWT_ACCESS_SECRET` and the second (64 hex characters) is for `MFA_ENCRYPTION_KEY`.

Then:

```bash
npm run seed                   # roles + starter website content (Unsplash placeholders)
npm run create-admin -- --email you@yourstudio.com --password "ChooseALongPassword1" --first Your --last Name
npm run dev                    # http://localhost:5000/api/v1/health
npm test                       # unit + HTTP tests (no database needed)
```

On first sign-in the Super Admin is asked to set up **two-factor authentication** (any authenticator app). It is mandatory for privileged roles.

---

## 2. Files you add to the FRONTEND

| File | Where it goes |
|---|---|
| Hero video | `public/images/hero-video.mp4` in the frontend project |
| Logo | `public/logo.png` in the frontend project |

The seeded hero uses exactly these paths. Later you can switch the hero to a Cloudinary upload or a YouTube/Vimeo link from the CMS.

---

## 3. Folder structure

```
royal-bee-backend/
├── scripts/
│   ├── seed.js                     # roles + starter content (idempotent; --reset to replace content)
│   ├── createSuperAdmin.js         # first Super Admin (no public staff sign-up)
│   └── seed/
│       ├── content.js              # all starter copy — edit freely
│       └── placeholderImages.js    # every Unsplash placeholder URL in one place
├── src/
│   ├── server.js                   # boot: env check → DB → listen
│   ├── app.js                      # express app, security headers, CORS, logging
│   ├── routes.js                   # mounts every module under /api/v1
│   ├── config/                     # env, db, cloudinary
│   ├── constants/                  # permission catalog + default roles, content workflow rules
│   ├── middleware/                 # auth/permissions, validation, errors, rate limits, uploads
│   ├── models/                     # one Mongoose model per file
│   ├── services/                   # audit, tokens, MFA, email (Brevo), media (Cloudinary), CRM, workflow
│   ├── emails/                     # branded email layout + templates
│   ├── utils/
│   └── modules/
│       ├── auth/                   # login, MFA, refresh, reset, invitations, profile, preferences
│       ├── users/                  # staff admin: invite, edit, deactivate, revoke sessions
│       ├── roles/                  # custom roles + permission editor
│       ├── cms/                    # one file per website section ↓
│       │   ├── hero.routes.js
│       │   ├── ticker.routes.js
│       │   ├── founder.routes.js
│       │   ├── founderGallery.routes.js
│       │   ├── gallery.routes.js
│       │   ├── services.routes.js
│       │   ├── productions.routes.js
│       │   ├── news.routes.js
│       │   ├── homeSections.routes.js
│       │   ├── ctas.routes.js
│       │   ├── settings.routes.js
│       │   ├── crudFactory.js       # shared list/create/edit/reorder/workflow logic
│       │   └── singletonFactory.js  # shared draft → publish logic (hero, founder)
│       ├── media/                  # media library, uploads, usage check before delete
│       ├── public/                 # public website API + public search
│       ├── enquiries/              # multi-step enquiries, drafts, contact form, staff inbox
│       ├── crm/                    # CRM contacts
│       └── admin/                  # dashboard overview, integrations, email log, audit trail
└── tests/
```

---

## 4. How content publishing works

**Services, productions, news, homepage sections** use the full workflow:

`draft → in_review → approved → published → archived`

- New content always starts as **draft**. The public site only shows **published** items whose `publishAt` has passed and whose `expireAt` hasn't.
- Editing **approved** content sends it back to draft, so it has to be approved again.
- Editing **published** content requires *publish* (and *approve*) permission. Every change is audited.
- Approvals can be switched off by a Super Admin (`PATCH /cms/settings/workflow`).

**Hero and founder profile** have a separate **draft** and **published** copy. Staff edit the draft and preview it. The public site only changes when someone publishes.

**Ticker images, founder gallery, studio gallery and CTAs** use a simple publish on/off toggle, with drag-to-reorder via `POST …/reorder`.

---

## 5. API map (prefix `/api/v1`)

All responses use one of two shapes: `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details? } }`.

### Public (no login)
| Method | Path | Notes |
|---|---|---|
| GET | `/public/settings` | studio name, logo, contact, social, ticker settings, enquiry budget ranges |
| GET | `/public/home` | ordered homepage sections with resolved data |
| GET | `/public/hero` | published hero (video, poster, CTAs) |
| GET | `/public/ticker` | `{ settings, items }` |
| GET | `/public/founder` | full founder page + gallery + related productions |
| GET | `/public/founder/gallery` | founder photos |
| GET | `/public/gallery?category=` | studio/production gallery |
| GET | `/public/services` · `/public/services/:slug` | services + detail |
| GET | `/public/services/:slug/enquiry-form` | conditional questions for that service |
| GET | `/public/productions?category=&featured=&page=` · `/public/productions/:slug` | portfolio |
| GET | `/public/news?category=&page=` · `/public/news/:slug` | news |
| GET | `/public/ctas?placement=` · POST `/public/ctas/:id/click` | CTAs + aggregate click tracking |
| GET | `/public/search?q=&type=&sort=` · `/public/search/suggest?q=` · `/public/search/popular` | public search |
| POST | `/public/enquiries` | submit enquiry → CRM + reference number |
| POST | `/public/enquiries/attachments` | multipart `file` → returns `token` to include in `attachmentTokens` |
| POST | `/public/enquiries/drafts` · `/public/enquiries/drafts/resume` | save & resume (token + email) |
| POST | `/public/enquiries/funnel` | `{ event: start|step|submit, step }` aggregate only |
| POST | `/public/contact` | general contact form |

Public forms expect the honeypot `website: ""` and `formStartedAt: <Date.now() when the form opened>`.

### Auth
`POST /auth/login` returns either `{ accessToken, user, mfaSetupRequired }` or `{ mfaRequired, challengeToken }`.
The remaining auth routes are:

- `POST /auth/mfa/verify` · `POST /auth/refresh` (httpOnly cookie) · `POST /auth/logout` · `POST /auth/logout-all`
- `GET /auth/me` · `PATCH /auth/me` · `PATCH|DELETE /auth/me/preferences` · `GET /auth/sessions`
- `POST /auth/mfa/setup` · `POST /auth/mfa/enable` · `POST /auth/mfa/disable` · `POST /auth/mfa/recovery-codes`
- `POST /auth/forgot-password` · `POST /auth/reset-password` · `GET /auth/invite/:token` · `POST /auth/accept-invite`

The frontend must send requests with `credentials: 'include'` so the refresh cookie works.

### Staff (Bearer token + permission)
| Area | Paths |
|---|---|
| Staff | `GET/POST /users`, `GET/PATCH /users/:id`, `POST /users/:id/{resend-invite,deactivate,reactivate,revoke-sessions}` |
| Roles | `GET/POST /roles`, `PATCH/DELETE /roles/:id`, `GET /roles/permissions` |
| Hero / Founder | `GET/PATCH /cms/{hero,founder}`, `POST /cms/{hero,founder}/{submit,approve,reject,publish,discard}` |
| Collections | `/cms/{services,productions,news,home-sections}`: list/get/create/patch/delete + `POST /:id/transition` `{ action, comment, publishAt, expireAt }` + `POST /reorder` |
| Image collections | `/cms/{ticker/items,founder-gallery,gallery,ctas}`: list/get/create/patch/delete + `POST /:id/{publish,unpublish}` + `POST /reorder` |
| Ticker settings | `GET/PATCH /cms/ticker/settings` (speed, direction, pause on hover, height, on/off) |
| Settings | `GET/PATCH /cms/settings`, `PATCH /cms/settings/workflow` |
| Media | `GET /media`, `POST /media/upload` (multipart), `POST /media/sign` + `POST /media/register` (large videos), `PATCH /media/:id`, `GET /media/:id/usage`, `DELETE /media/:id` |
| Enquiries | `GET /enquiries`, `GET /enquiries/:id`, `PATCH /enquiries/:id`, `POST /enquiries/:id/{assign,notes}`, `GET /enquiries/:id/attachments/:attachmentId`, `GET /enquiries/export`, `GET /enquiries/funnel` |
| Contact messages | `GET /contact-messages`, `GET/PATCH /contact-messages/:id` |
| CRM | `GET /crm/contacts`, `GET/PATCH /crm/contacts/:id`, `POST /crm/contacts/:id/notes` |
| Admin | `GET /admin/overview`, `GET /admin/integrations`, `POST /admin/integrations/:key/test`, `GET /admin/emails`, `GET /admin/audit`, `GET /admin/analytics/search` |

---

## 6. External services

**Cloudinary** handles media uploads.

1. Create an account and copy the cloud name, API key and API secret into `.env`.
2. Until those values are set, the upload endpoints return `503 CLOUDINARY_NOT_CONFIGURED`. Everything else keeps working, including Unsplash and local image URLs.
3. Enquiry attachments are stored with *authenticated* delivery. Staff download them through short-lived signed links.

**Brevo** handles email.

1. Add `BREVO_API_KEY` and a verified `EMAIL_FROM_ADDRESS` on your domain. Set up SPF, DKIM and DMARC in Brevo → Senders & Domains.
2. Until Brevo is configured, emails are recorded as `skipped_not_configured` and are never reported as sent.
3. In that state, staff invitations return the invite link to the admin so onboarding isn't blocked.

---

## 7. Security notes

- **Passwords and sessions:** Passwords use bcrypt (12 rounds). Access tokens are 15-minute JWTs. Refresh tokens are httpOnly cookies that rotate on every use, and only their hashes are stored. Reusing an old refresh token revokes the whole session family.
- **Login protection:** Accounts lock for 15 minutes after 5 failed attempts. Endpoints are rate limited. Forgot-password returns the same response whether or not the account exists.
- **MFA:** MFA secrets are encrypted at rest with AES-256-GCM. Recovery codes are hashed.
- **Server-side checks on every request:** The user is re-loaded on each request, so deactivation, role changes and session revocation take effect immediately.
- **Audit trail:** Audit events are append-only at the model level. In production, also give the app's database user no `remove` rights on `auditevents`.
- **Public responses:** Public serializers strip hidden prices, unapproved testimonials, unverified founder achievements, client names without permission, and all workflow metadata.
- **Spam protection:** Public forms use a honeypot, a minimum fill time, a link limit and rate limits. Spam gets a fake success response and nothing is stored.

---

## 8. Stage 1–2 acceptance criteria

| Criterion | How it's covered |
|---|---|
| Server starts only with valid secrets | Missing or invalid secrets fail fast |
| Health check | `/health` reports database state |
| Staff onboarding | No public staff sign-up; Super Admin is created by script |
| Invitations | Single-use, expire in 72 hours, invitee sets their own password |
| Password reset | Single-use links that expire in 30 minutes |
| Mandatory MFA | Enforced for the Super Admin role; MFA-pending tokens can't reach any other route |
| Deactivation | Takes effect on the very next request |
| Backend authorization | Enforced on every staff endpoint; editors can't approve, publish or manage users |
| Hidden content | Draft, scheduled, expired, private and unlisted content never appears in public lists or search |
| CMS management | Hero, ticker, founder, founder gallery, gallery, services, productions, news, homepage sections, CTAs and settings are all manageable |
| Ordering and visibility | Reorder and publish/unpublish work |
| Enquiries | Create or update one CRM contact per email, get a reference (`RBF-ENQ-YYYY-0001`) and flag possible duplicates |
| Media deletion | Refused while a file is still in use, unless forced (audited) |
| Integrations | Unconfigured integrations are shown as such and never faked |

**Verified for this zip:**
- `npm test`: 33/33 passed.
- An 82-step end-to-end run against a MongoDB-compatible database passed. It covered seeding, the MFA login flow, the publish workflow, hero publish, ticker reorder and speed, founder gallery, enquiries, drafts, contact, staff invite and permissions, and deactivation.

---

## 9. What comes next

The **frontend zip** (public website + admin CMS) is built against this API.

Later stages from the master specification add the following on top of this foundation:

- **Stage 3:** projects, tasks, calendar
- **Stage 4:** client and talent portals
- **Stage 5:** finance
- **Later stages:** the remaining modules, with permissions extended in `src/constants/permissions.js`
