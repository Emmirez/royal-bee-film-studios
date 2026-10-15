# Royal Bee Film Studios — Developer & Hosting Guide

**Private: for the developer and site owner only.** Don't upload this file to the website, don't send it to staff, and never paste real keys or passwords into it. Staff have their own guide inside the dashboard under **Help & guide**.

---

## 1. What the platform is made of

| Part | Folder | Built with | Runs as |
|---|---|---|---|
| Frontend: the public website, staff dashboard, client portal and talent portal | `frontend/` | React 18, Vite, Tailwind | Static files (`npm run build` creates `dist/`) |
| Backend API | `backend/` | Node 20+, Express, Mongoose, ES modules | A Node server (`npm start`) |
| Database | — | MongoDB 6+ | MongoDB Atlas (recommended) |
| Media | — | Cloudinary | Photos are public uploads. Private documents use "authenticated" delivery. |
| Email | — | Brevo (transactional API) | Sends from `info@royalbeefilmstudios.com` |

```
Visitor / staff / client / talent
        │
        ▼
royalbeefilmstudios.com  ──(/api/v1)──►  API (Express)  ──►  MongoDB Atlas
        (React build)                       │
                                            ├──► Cloudinary (media, private documents)
                                            └──► Brevo (emails)
```

There are three sign-in areas, all on the same login page:

- staff go to `/admin`
- clients go to `/portal`
- talent go to `/talent`

The backend checks every permission on every request. The frontend only hides buttons the user can't use.

---

## 2. Running it locally (Windows)

Run the backend and frontend in two separate terminals.

**Terminal 1: backend**

```bash
cd backend
npm install
copy .env.example .env     # first time only, then fill it in (see section 3)
npm run dev                # http://localhost:5000/api/v1/health
```

**Terminal 2: frontend**

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

In development, Vite forwards `/api` to `http://localhost:5000`, so cookies work without any extra setup.

Useful backend commands:

| Command | What it does |
|---|---|
| `npm run seed` | Creates the roles and starter website content. Safe to run again. |
| `npm run seed:reset` | Replaces the website content with the starter content. **Wipes your real content.** |
| `npm run create-admin -- --email you@x.com --password "LongPassword123" --first Ada --last Obi` | Creates a Super Admin. |
| `npm run reset-mfa -- person@x.com` | Emergency: turns off 2FA for a staff member who lost both their phone and their recovery codes. |
| `npm test` | Runs the backend tests. |

---

## 3. Environment variables

### Backend (`backend/.env`)

| Variable | Production value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | whatever your host gives you | Many hosts set this for you. |
| `CLIENT_URL` | `https://royalbeefilmstudios.com,https://www.royalbeefilmstudios.com` | Allowed origins for CORS. **The first one is used in every email link** (invites, resets, portal links), so put the main domain first. |
| `SERVER_URL` | `https://api.royalbeefilmstudios.com` (or the site URL if the API lives on the same domain) | Used for the email logo and assets. |
| `MONGODB_URI` | your Atlas connection string | Use a database user that has access to this database only. |
| `JWT_ACCESS_SECRET` | 96 random hex characters | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MFA_ENCRYPTION_KEY` | exactly 64 hex characters | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **Never change this once people have set up 2FA**, or their authenticator codes stop working. |
| `MFA_ENFORCE` | `true` | Always keep this `true` in production. |
| `COOKIE_SECURE` | `true` | The site must be served over HTTPS. |
| `COOKIE_SAMESITE` | `lax` | Works when the API is on the same domain or a subdomain (`api.`). |
| `INVITE_EXPIRES_HOURS` | `72` | |
| `RESET_EXPIRES_MINUTES` | `30` | |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | from Cloudinary → Settings → API Keys | Uploads are switched off until these are set. |
| `CLOUDINARY_ROOT_FOLDER` | `royal-bee` | |
| `BREVO_API_KEY` | from Brevo → SMTP & API → API keys | Emails are logged as "skipped" until this is set. |
| `EMAIL_FROM_ADDRESS` | `info@royalbeefilmstudios.com` | Must be a verified sender in Brevo. |
| `EMAIL_FROM_NAME` | `Royal Bee Film Studios` | |
| `EMAIL_LOGO_URL` | optional public https URL of the logo | |
| `STAFF_NOTIFICATION_EMAILS` | fallback address(es) for staff alerts | Staff can also set these in Studio settings. |
| `LOG_LEVEL` | `info` | |

Rules for secrets:

- Keep secrets **only** in `.env` locally, and in the hosting provider's environment settings in production.
- Never commit `.env` to Git or send it in a chat.
- If a key leaks, rotate it in that service (Cloudinary, Brevo or Atlas) and update the environment variable.
- Changing `JWT_ACCESS_SECRET` signs everyone out. That's harmless.

### Frontend (build time)

| Variable | When to set it |
|---|---|
| `VITE_API_URL` | Only when the API is on a **different** address, for example `https://api.royalbeefilmstudios.com/api/v1`. Leave it unset if the API is served from the same domain under `/api/v1`. |

Vite variables are baked in when you run `npm run build`. If you change one, build and deploy again.

---

## 4. Hosting: recommended setup

**Option A: two services (simplest to run)**

| Piece | Where | Domain |
|---|---|---|
| Frontend | Vercel, Netlify or Cloudflare Pages | `royalbeefilmstudios.com` and `www` |
| Backend | Render, Railway or a VPS | `api.royalbeefilmstudios.com` |
| Database | MongoDB Atlas (M0 free tier to start; M10+ for automatic backups) | — |

Frontend host settings:

- **Build command:** `npm run build`
- **Output folder:** `dist`
- **Environment variable:** `VITE_API_URL=https://api.royalbeefilmstudios.com/api/v1`
- **SPA rewrite:** every path that isn't a file must serve `index.html`. Otherwise reloading `/admin/talent` gives a 404.
  - Netlify: create `public/_redirects` containing the line `/*  /index.html  200`.
  - Vercel: add a rewrite of `/(.*)` to `/index.html`.

Backend host settings:

- **Start command:** `npm start`
- **Node version:** 20 or newer
- **Environment variables:** everything from section 3
- **Health check path:** `/api/v1/health`

**Option B: one VPS (for example DigitalOcean or Hetzner) with Nginx**

1. Serve `frontend/dist` as static files, with `try_files $uri /index.html;`.
2. Proxy `/api/` to the Node process on `127.0.0.1:5000`.
3. Keep Node running with `pm2 start src/server.js --name royal-bee-api`.
4. Get free HTTPS certificates with Let's Encrypt (`certbot --nginx`).

Here the API is on the same domain, so leave `VITE_API_URL` unset. The app already trusts one proxy (`app.set('trust proxy', 1)`), so rate limits see the real visitor IP.

### Moving your local content to production

You've already built real content locally. To bring it across:

```bash
# on your computer: export the local database
mongodump --uri="mongodb://127.0.0.1:27017/royal_bee_studios" --out=./backup
# import into Atlas
mongorestore --uri="<your Atlas URI>" --nsFrom="royal_bee_studios.*" --nsTo="<atlas db name>.*" ./backup/royal_bee_studios
```

If you'd rather start clean:

1. Run `npm run seed` once on the server. This creates the roles.
2. Run `npm run create-admin`.
3. Rebuild the content in the dashboard.

Images that were uploaded to Cloudinary are already online. Files that point to `/images/...` must also exist in `frontend/public/images` in the build.

---

## 5. Brevo: email setup

1. In Brevo, go to **Senders, Domains & Dedicated IPs → Domains**, add `royalbeefilmstudios.com` and add the DNS records it gives you (DKIM, the Brevo code and DMARC) at your domain registrar.
2. Under **Senders**, add `info@royalbeefilmstudios.com` and verify it.
3. Create an API key and put it in `BREVO_API_KEY`.
4. Check it from **Dashboard → Integrations → Test connection**, then send a staff invite to yourself.

Without SPF, DKIM and DMARC, emails land in spam. If you already have an SPF record for other mail (for example Zoho or Google), merge the two into **one** SPF record. Don't add a second one.

---

## 6. Cloudinary: media setup

1. Copy the cloud name, API key and API secret into `.env`.
2. The free plan limits each video to 100 MB. The dashboard already blocks larger files.
3. Talent and enquiry documents are stored as **authenticated** assets. Nobody can open them without a signed link from the API, and those links expire after 5 minutes.
4. Media can't be deleted from the Media library while it's in use, unless it's force-deleted (which is audited).

---

## 7. Backups and recovery

- **Database:** Atlas M10+ keeps continuous backups. On M0, run a `mongodump` at least weekly and keep copies somewhere other than your laptop, such as Google Drive.
- **Media:** stays in Cloudinary. To keep your own copy, export from the Cloudinary console now and then.
- **Code:** keep both folders in a **private** Git repository (GitHub). Your `.gitignore` must include `node_modules`, `dist` and `.env`.
- **Test a restore** once by running `mongorestore` into a spare Atlas database. A backup you've never restored is only a hope.

---

## 8. Launch checklist

Server and configuration:

- [ ] `NODE_ENV=production`, `MFA_ENFORCE=true`, `COOKIE_SECURE=true`
- [ ] `CLIENT_URL` starts with `https://royalbeefilmstudios.com`
- [ ] HTTPS works on every domain, and `www` redirects to the main domain (or the other way round)
- [ ] `/api/v1/health` reports the database as connected
- [ ] Reloading a deep link (for example `/admin/help` or `/founder`) works

Integrations and email:

- [ ] **Integrations** shows both email and media as connected
- [ ] A test invite, password reset, enquiry and contact message arrive in the inbox, not spam

Accounts and security:

- [ ] The Super Admin has 2FA set up, and the recovery codes are stored safely offline
- [ ] Each staff member has their own account with the lowest role that fits their work
- [ ] Any test accounts you made while testing (staff, clients, talent) are deactivated or deleted

Content:

- [ ] Placeholder content is replaced and the "Placeholder content" / "Sample content" switches are off
- [ ] Founder achievements are only marked **Verified** when they're true
- [ ] **Studio settings** has the real contact details, social links, notification emails and copyright line
- [ ] **Billing details** has the real business name, TIN and bank accounts
- [ ] The privacy notice text on the forms is final

---

## 9. Troubleshooting

| Problem | Check |
|---|---|
| "Invalid environment configuration" on start | `JWT_ACCESS_SECRET` must be 32+ characters and `MFA_ENCRYPTION_KEY` exactly 64 hex characters. |
| `ERR_MODULE_NOT_FOUND` | Run `npm install` in that folder (for example `pdfkit` for invoice PDFs). |
| Signed out on every refresh | Using HTTPS with `COOKIE_SECURE=true`? Is the frontend domain listed in `CLIENT_URL`? Is the API on the same site (domain or subdomain)? |
| CORS error in the browser console | Add the exact frontend origin (including `https://` and `www` if used) to `CLIENT_URL`, then restart. |
| Emails not arriving | Look at **Dashboard → Integrations → Recent transactional emails** for the status and error. Then check the Brevo logs and DNS records. |
| Uploads fail with "Cloudinary not configured" | Cloudinary variables are missing or wrong. Restart after fixing them. |
| A deep link shows a 404 page from the host | The SPA rewrite to `index.html` is missing (section 4). |
| Someone lost their 2FA phone | On the server, run `npm run reset-mfa -- their@email.com`. They'll set up 2FA again on their next sign-in. |
| The site shows an old version after a deploy | Hard-refresh. The site installs a service worker in production, so visitors may need one refresh to get the new version. |

---

## 10. Where things live in the code

| What | Where |
|---|---|
| Permissions and default roles | `backend/src/constants/permissions.js` (mirrored in `frontend/src/lib/permissions.js`) |
| Content workflow rules | `backend/src/constants/content.js` |
| Email templates | `backend/src/emails/` |
| Admin menu | `frontend/src/features/admin/adminNav.js` |
| **Staff Help & guide text** | `frontend/src/features/admin/help/guideContent.js`. Update it whenever a feature changes. |
| Invoice PDF layout | `backend/src/modules/invoices/invoices.service.js` |
| Talent, castings and bookings | `backend/src/modules/talent/` |