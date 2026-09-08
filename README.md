# Click4Tech Solutions — Website CMS

This adds a real browser CMS to click4techsolutions.com — the same pattern as
the CMS built for srisubramaniarlokkawi.org: a password-gated `/cms.html`
dashboard, content stored in Supabase (Postgres) instead of hardcoded in the
HTML, and Netlify Functions in between so the browser never touches the
database directly.

**Nothing changes for a visitor if you never finish setup.** The homepage
still has all of today's real content hardcoded in it as a fallback — the CMS
only takes over once you've done the one-time setup below. If the CMS is
ever unreachable for any reason, the site quietly falls back to that
hardcoded content instead of breaking.

## What's in here

- `index.html` — the homepage, mostly unchanged. The old inline `<script>`
  block was split into two files (see below) so content can be swapped in
  before the page's animations/behaviour run.
- `assets/cms-loader.js` — fetches live content from Supabase (via
  `cms-content.js`) and rewrites the hero, clients, services, why-us cards,
  work items, pricing factors, FAQs, and contact info sections. Falls back
  silently if that fetch fails or times out.
- `assets/site-animations.js` — the site's original scroll reveal, hero
  particle background, count-up stats, marquee, FAQ accordion, etc. Loaded
  only *after* `cms-loader.js` finishes, so it always initializes against
  final content.
- `cms.html` — the admin dashboard. Log in with one shared password, edit
  any section, hit Save.
- `netlify/functions/cms-content.js` — public endpoint the homepage calls;
  returns all published content in one request.
- `netlify/functions/cms-crud.js` — password-gated endpoint the dashboard
  uses to list/create/update/delete/reorder content.
- `netlify/functions/cms-upload-image.js` — password-gated image upload
  (client logos etc.), stores files in Supabase Storage.
- `supabase/cms-schema.sql` — creates all the tables + storage bucket, run
  once in Supabase's SQL Editor.
- `supabase/cms-schema-v2.sql` — a small additive migration: adds the
  `marquee_items` table for the scrolling ticker strip under the hero, and
  seeds it with the current wording so nothing changes until you edit it.
  Run once, after `cms-schema.sql`.
- `content/site-content.json` + `content/images/` — the site's real,
  current content and images, extracted from the live page. Used only by...
- `scripts/seed.mjs` — a one-time script that uploads those images and
  inserts that content into Supabase, so the CMS starts out already
  matching what's live today instead of empty.
- `manifest.json`, `sw.js`, `assets/icon-192.png`, `assets/icon-512.png` —
  makes the homepage installable as an app on a phone (same "Add to Home
  Screen" / "Install app" setup used for the MediTouch app), see
  [Installing on a phone](#installing-on-a-phone) below.

## One-time setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free project (any
region close to Malaysia, e.g. Singapore). Once it's ready:

- In the sidebar, go to **SQL Editor** → **New query**, paste the entire
  contents of `supabase/cms-schema.sql`, and click **Run**. This creates
  every table plus a public `click4tech-media` storage bucket for images.
- Then, in another **new query**, paste the entire contents of
  `supabase/cms-schema-v2.sql` and click **Run**. This adds the ticker
  strip (the scrolling client/tech names just under the hero) as an
  editable "Ticker" tab in the dashboard.
- Go to **Project Settings → API**. Copy the **Project URL** and the
  **service_role** key (not the `anon` key — the service role key is what
  lets the Netlify Functions manage content; it must never be exposed in
  the browser).

### 2. Seed the CMS with the site's real content

On your own computer (needs Node.js installed):

```bash
cd click4tech-cms          # this folder
npm install
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx npm run seed
```

(Or put those two lines in a `.env` file in this folder instead of passing
them inline, then just run `npm run seed`.)

This uploads the 7 client logos + footer logo to Supabase Storage and
fills every table with the site's current real content — so the first time
you open the CMS, it already matches what's live.

### 3. Set environment variables in Netlify

In your Netlify project (click4techsolutionsupdated) → **Project
configuration → Environment variables**, add:

| Key | Value |
|---|---|
| `SUPABASE_URL` | same Project URL from step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | same service_role key from step 1 |
| `ADMIN_PASSWORD` | a password you choose for logging into `/cms.html` |

### 4. Merge this into the GitHub repo and redeploy

Add every file in this folder to your `click4techsolutions` GitHub repo
(same repo the homepage already lives in), keeping the folder structure:
`index.html` at the root (replacing the current one), plus the new
`assets/`, `netlify/`, `cms.html`, `netlify.toml`, `manifest.json`, and
`sw.js` (the last two go at the repo root, next to `index.html`). You don't
need to include `content/`, `scripts/`, `package.json` or this README in
the repo — those were only needed for the one-time seed step above — but
leaving them in doesn't hurt anything either.

Push to `main`. Netlify will redeploy automatically (same as always) and
pick up the new functions.

### 5. Log in and start editing

Visit `https://click4techsolutions.com/cms.html`, enter the
`ADMIN_PASSWORD` you set in step 3, and edit away. Changes go live on the
homepage within about a minute (no redeploy needed).

## What's in the CMS vs. what isn't

Editable: hero text and stats, the scrolling ticker strip just under the
hero, client logos, all 12 services (title, description, icon, which group
they're in), the 4 "why choose us" cards, all portfolio/work items
(including their bullet points), the 3 pricing factors, every FAQ, and the
contact phone/email/address/WhatsApp link.

Not in the CMS (fixed in the code, matches the "what's not editable" scope
used for the temple site too): the overall page design/layout, the "Why
Choose Us" intro paragraph and its 4-item checklist on the left of that
section, the contact form itself, and each icon is chosen from a fixed set
of built-in icons rather than a fully custom image.

## Notes

- The admin password is a single shared password (same pattern as the
  other Click4Tech-built CMS panels) — there's no per-user login. Treat it
  like any shared password.
- Re-running `npm run seed` resets every table back to this original seed
  content — don't re-run it after you've made your own edits in the CMS
  unless you actually want to wipe those edits back to today's starting
  point. The one exception is the "Ticker" table (`marquee_items`) — it's
  seeded once by `cms-schema-v2.sql` instead, so `npm run seed` never
  touches or resets your ticker edits.
- All eight images (7 client logos + the footer logo) were extracted
  directly from the live page's embedded image data, so what you see in
  the CMS after seeding is pixel-identical to what's live now.

## Installing on a phone

Once `manifest.json`, `sw.js`, and the two `assets/icon-*.png` files are on
the live site (step 4 above — no extra setup, they're just static files),
visitors get a real "Install app" prompt instead of a plain bookmark, the
same way the MediTouch app does:

- **Android/Chrome**: a small "Install app" banner appears automatically,
  or via the ⋮ menu → **Install app**.
- **iPhone/Safari**: Share icon → **Add to Home Screen** (iOS never shows
  an automatic banner for any site, this is normal).

Installed, it opens full-screen with no browser address bar, uses the
orange power-icon mark on a navy background as its home-screen icon, and
is titled "Click4Tech" underneath. It's still the same live website under
the hood — there's no separate app to maintain, and CMS edits show up
immediately, same as in a browser. The only thing the service worker
caches is the empty page shell (so it can open instantly even on a slow
connection); it always fetches fresh content over the network first.
