# Royal Bee Film Studios — Frontend

React · Vite · Tailwind CSS · React Router · TanStack Query
**Public website + staff CMS** (Stages 1–2), wired to the `royal-bee-backend` API.

---

## 1. Quick start (Windows / macOS / Linux)

Requirement: **Node.js 20+**.

1. Start the backend first (see its README). It runs on `http://localhost:5000` by default.
2. Install and start the frontend:

   ```bash
   cd royal-bee-frontend
   npm install
   npm run dev                  # http://localhost:5173
   ```

3. Staff sign in at **http://localhost:5173/login** with the Super Admin you created using `npm run create-admin` in the backend.

During development, Vite proxies every `/api` request to the backend, so cookies and CORS work with no extra setup. If your backend runs on a different port, copy `.env.example` to `.env` and set `VITE_BACKEND_URL`.

**Production:**

1. Run `npm run build`. Deploy the `dist/` folder to any static host (Netlify, Vercel, Nginx and so on).
2. Set `VITE_API_URL` to your API URL, e.g. `https://api.yourdomain.com/api/v1`, before building.
3. Configure the host to serve `index.html` for all routes (SPA fallback).
4. On the backend, set `CLIENT_URL` to your site's URL and `COOKIE_SECURE=true`.

---

## 2. Your files

| What | Where |
|---|---|
| **Hero video** | `public/images/hero-video.mp4` |
| Lighter mobile hero video (optional) | `public/images/hero-video-mobile.mp4` |
| **Logo** | `public/logo.png` (also used as the browser tab and app icon) |

All other photos are **Unsplash placeholders**. Replace them in the admin:

- Admin → Website → *any section* → **Replace** on the image
- Media library → **Upload** (needs Cloudinary on the backend)
- Or paste any image URL, or a path like `/images/my-photo.jpg` after you drop the file into `public/images/`

Seeded productions and news show a small **“Sample”** badge until you switch off *Sample content* on each one.

If your logo already contains the studio name, hide the text wordmark next to it by setting `showWordmark={false}` where `<Logo />` is used in `src/components/public/Navbar.jsx`.

---

## 3. Where everything lives (one section per file)

```
src/
├── App.jsx                         # all routes
├── main.jsx                        # providers + PWA service-worker registration
├── styles/index.css                # design tokens (light/dark), base styles
├── lib/                            # api client, image helpers, formatting, permissions
├── context/                        # Auth, Theme, Toast, Confirm (custom dialogs — no browser popups)
├── hooks/                          # useFormState, useMediaQuery, useInView
├── components/
│   ├── ui/                         # Button, Input, Textarea, Select (custom rounded), Modal, Drawer, Badges, Tabs…
│   ├── media/                      # SmartImage, Lightbox, SampleBadge
│   ├── public/                     # Navbar, MobileNav, Footer, SearchOverlay, Logo, Seo
│   └── admin/                      # MediaPicker, ImageField, VideoField, WorkflowBar, SortableList, ListEditor, CommandMenu
├── features/
│   ├── public/
│   │   ├── home/sections/          # ← each homepage section in its own file
│   │   │   ├── HeroSection.jsx              (video hero)
│   │   │   ├── TickerSection.jsx            (continuous moving image ticker)
│   │   │   ├── IntroSection.jsx
│   │   │   ├── FeaturedProductionsSection.jsx
│   │   │   ├── ServicesSection.jsx
│   │   │   ├── FounderSpotlightSection.jsx
│   │   │   ├── NewsSection.jsx
│   │   │   ├── TestimonialsSection.jsx
│   │   │   ├── CtaBannerSection.jsx
│   │   │   └── ContactSection.jsx
│   │   ├── home/HomeSections.jsx   # maps CMS section types → components
│   │   ├── founder/FounderGallery.jsx
│   │   ├── enquiry/                # multi-step enquiry (one file per step)
│   │   └── components/             # cards, page hero, section shell
│   └── admin/                      # shared CMS building blocks (lists, editors, image collections)
├── layouts/                        # PublicLayout, AuthLayout, AdminLayout
└── pages/
    ├── public/                     # Home, Founder, Services, Productions, Gallery, News, Search, Contact, Enquire, 404
    ├── auth/                       # Login (+ 2-step), Forgot/Reset password, Accept invite
    └── admin/                      # Dashboard, website editors, media, enquiries, CRM, staff, roles, settings…
```

---

## 4. Highlights

**Hero video** (`HeroSection.jsx`)
- Muted, looping, no autoplay audio, with a visible pause/play control.
- Phones can get the full video, a lighter mobile video, or the poster only (set in the admin).
- Falls back to the poster image if the video fails, and pauses while off-screen.
- Visitors with *reduced motion* switched on see the poster.

**Moving image ticker** (`TickerSection.jsx`)
- Seamless loop with no gap or jump at the loop point.
- Pauses on hover, keyboard focus or touch, and has a pause button.
- The duplicated copy is hidden from screen readers, so nothing is announced twice.
- With reduced motion on, it becomes a static, swipeable row.
- Admins manage it in Admin → Website → Image ticker: upload, remove, drag to reorder, hide/show, link to a production or the gallery or any URL, and set speed, direction and height.

**Founder** (`FounderSpotlightSection.jsx`, `pages/public/FounderPage.jsx`)
- There is a homepage spotlight plus a full About → Founder page.
- The page covers portrait, biography, vision, philosophy, experience, achievements, media appearances and links.
- **Only achievements marked *verified* are shown publicly.**

**Founder gallery**
- Responsive masonry layout with category filters.
- Accessible lightbox: arrows, keyboard, swipe and captions.
- Admin can upload, caption, reorder, feature and remove photos.
- Featured photos appear in the homepage spotlight.

**Publishing workflow**
- Content moves through draft → review → approve → publish, with optional scheduling and expiry.
- Hero and founder edits stay in draft until published, so you can preview them first.

**Enquiries**
- Guided 5-step form with questions that change per service.
- Save & resume, private file attachments and spam protection.
- Each submission gets a reference number and goes into the CRM.

**Staff workspace**
- Sidebar on desktop and a bottom bar with a *More* sheet on mobile.
- Light and dark themes, and a command menu (**Ctrl/⌘ K**).
- Two-factor sign-in.
- Role-based menus. The backend re-checks every permission anyway.

**Images**
- Cloudinary images are delivered as `f_auto,q_auto` at responsive widths.
- Everything is lazy-loaded.

**PWA**
- The site has a manifest and a service worker that caches static files only.
- API data is never cached offline, per the specification.

---

## 5. Verified for this zip

- `npm run build` succeeds.
- A browser test ran against the real backend and seeded data, on desktop and mobile. It covered:
  - every public page, the founder lightbox, and the full enquiry submission (reference issued);
  - staff login and every admin page;
  - the hero edit → submit → approve → publish flow;
  - dark theme and the command menu.
- No console or page errors were reported. Unsplash images were blocked in the test sandbox; they load normally on your machine.
