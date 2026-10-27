# Kruger Marloth Services & Bookings

Static website for handpicked self-catering stays in Marloth Park, a local services directory, and an owner dashboard for managing bookings. Hosted on GitHub Pages:
https://obsidianstudiodesigns.github.io/Kruger-Marloth-Services-Bookings/

## What's in here

| Path | What it is |
|---|---|
| `index.html` | Public website — stays, services, experiences, contact |
| `admin.html` | Owner dashboard — bookings, calendar, guest history ("Owner login" in the footer; also opens at `/admin` and `/admin/`) |
| `assets/js/data.js` | **All listing and service content.** Edit this to change names, prices, descriptions, amenities and providers |
| `assets/js/common.js` | Shared helpers (icons, dates, availability) |
| `assets/js/site.js` / `admin.js` | Public site and dashboard logic |
| `images/stays/<id>/` | Property photos (`01.jpg` is the cover), `thumb/` versions and `flyer.jpg` |
| `images/services/` | Service provider flyers |
| `tools/` | Scripts that regenerate link-preview images, property pages and the sitemap (see below) |

Bookings are **not** stored in this repository. The dashboard saves them to a separate repository, [`obsidianstudiodesigns/Kruger-Marloth-Bookings-Data`](https://github.com/obsidianstudiodesigns/Kruger-Marloth-Bookings-Data) (`SITE.dataRepo` in `data.js`):

| File (bookings repository) | What it is |
|---|---|
| `availability.json` | Booked and on-hold date ranges per property (no guest details). Read by the public calendars |
| `bookings.vault.json` | All bookings and guest details, **encrypted** with the owner's password |
| `access.json` | The dashboard's GitHub token, **encrypted** with the owner's password, so she signs in with the password only |

The raw source folder (`kruger marloth services and bookings data files/`) is git-ignored and never published.

## Placeholder content still to replace

Every stay in `data.js` has a `draft` list naming the fields that are still dummy values. Real details came from the property flyers where available. Still needed from the owner:

- **Nightly rates** for every property except Tarentaal (R1 980 out of season / R3 300 school holidays).
- **House rules** — check-in/out times, minimum nights and deposit terms are dummy values in `DEFAULT_RULES`.
- **Sleeps / bedrooms / bathrooms** where marked in `draft` (no flyer for Afrika Safari Gastehuis, Buffalo Chalets, Bushfire Mongoose).
- **Privacy notice** (`privacy.html`): registered name and address, Information Officer and retention period are placeholders. It's a starting template — have the owner check it.
- **Spelling check:** the folder says "Phai *Thong* Hide Away", the flyer says "Phai *Tong*".
- **Service categories with no providers yet:** Game Rides, Activities, Shuttles, Restaurants, Butcheries, Private Chefs, House Cleaning (shown as "Coming soon").

## How bookings work

The dashboard is a **booking calendar only** (entry-level package): no invoices, payments or pricing — the client uses their own invoicing system.

1. A guest picks dates on a property's calendar (booked and on-hold nights are blocked), ticks the POPIA consent box and taps **Book via WhatsApp** or **Book via email**. Their request opens in WhatsApp or their mail app, ready to send to Nadia — nothing is saved automatically.
2. Nadia adds it in the **dashboard** (`admin.html`) as **Pending**. The dates immediately show as **on hold** on the public calendar, so nobody else can request them (the website updates within about a minute).
3. Once it's finalised with the guest she taps **Confirm booking** — the hold becomes a booked stay. Otherwise **Decline** releases the dates.
4. Bookings made elsewhere (LekkeSlaap, NightsBridge, phone) can be added directly as **Confirmed**, and **Block dates** covers owner use or maintenance.
5. Check-out day is free for the next arrival: a 27–29 October booking blocks the nights of the 27th and 28th.
6. **Dates are released automatically** once check-out has passed, and immediately if a booking is cancelled or declined. Finished, cancelled and declined bookings stay in **Bookings → History / Cancelled** with the guest's details and a change log. Pending requests whose dates pass without being confirmed show as "Expired request".

### Dashboard features
- Pending requests queue with Confirm booking / Decline
- Dashboard: who's staying now, arrivals, departures today, occupancy, which homes are free tonight
- Calendar: month planner of all 16 properties — click an empty day to book, click a booking to see the guest
- Bookings: Upcoming / Staying now / History / Cancelled, search by guest, phone or property, CSV export
- Guest booking or "block dates" (owner use, maintenance), double-booking check, guest details, where it was booked
- Backup download / restore

### Demo mode vs live mode
- **Demo mode** (no setup): sample bookings live in that browser only. Good for trying it out.
- **Live mode**: bookings are saved online and work from any device. The owner signs in with **one password**.

**One-time setup (Henry):**
1. The bookings repository `obsidianstudiodesigns/Kruger-Marloth-Bookings-Data` must exist (public, can be empty).
2. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token. Repository access: **only** `Kruger-Marloth-Bookings-Data` (not the website). Permission: **Contents → Read and write**. Pick an expiry.
3. Open the dashboard → **First-time setup (Henry)** → paste the token, choose the owner's password (12+ characters).
4. Give Nadia the dashboard link and the password. She ticks "Keep me signed in" on her phone/laptop.

**Why it's built this way:** the token can only change the bookings repository, never the website. It is stored encrypted with the owner's password and never saved on a device. Guest details are encrypted too (AES-256-GCM, key from the password via PBKDF2). The public availability file has dates only. **If the password is lost, the bookings cannot be recovered** — keep regular backups (Settings → Download backup). When the token expires, Henry creates a new one and saves it under Settings → Replace access token.

## Link previews (WhatsApp, Facebook) and Google

- Every property has its own page, e.g. `stays/kruger-naledi/`. Shared links show that property's photo, name and description; the home page shows a collage with the logo. The share button and the property cards use these addresses.
- Each page has its own title, description, canonical link and schema.org data (TravelAgency for the business, LodgingBusiness per property), and `sitemap.xml` lists every page with its photos.
- These are **generated** — after changing listings in `data.js`, a cover photo, or the site address (`SITE.url`, e.g. a new domain), run:
  ```bash
  python tools/make_og_images.py
  node tools/build-pages.cjs
  ```
  Don't hand-edit the `SEO:START … SEO:END` block in `index.html` or the files in `stays/`.
- **Google:** add the site in [Google Search Console](https://search.google.com/search-console) as a URL-prefix property, verify it (send me the verification meta tag and I'll add it), then submit `sitemap.xml`. Indexing usually takes days to a few weeks.
- `robots.txt` only takes effect at the root of a domain, so it starts working once the site has its own domain; until then the sitemap is submitted through Search Console.
- WhatsApp caches previews per link. If an old preview shows, add something like `?v=2` to the end of the link.

## Moving to your own domain (e.g. www.krugermarlothservicesbookings.co.za)
GitHub Pages hosts custom domains for free, with HTTPS:
1. Register the domain at a South African registrar.
2. In this repository: **Settings → Pages → Custom domain** → enter `www.krugermarlothservicesbookings.co.za` (GitHub adds a `CNAME` file). Tick **Enforce HTTPS** once it's available.
3. At the registrar's DNS: a `CNAME` record for `www` → `obsidianstudiodesigns.github.io`, and the four GitHub `A` records for the bare domain (listed in GitHub's Pages docs) so it redirects to `www`.
4. In `data.js`, set `SITE.url` to `https://www.krugermarlothservicesbookings.co.za/` and run `node tools/build-pages.cjs`, then push.

The dashboard then lives at `https://www.krugermarlothservicesbookings.co.za/admin`. Bookings, the password and the token don't change — but each device has to sign in once more on the new address, because browsers keep sign-ins per website address.

## Going live later
When the site moves to its own domain and a real database (Supabase + Vercel, as discussed), `data.js` can seed the listings table and the dashboard's backup JSON can seed bookings. Things that need that server-side step and are **not** in this version:
- Guest requests landing in the dashboard (and holding dates) automatically, instead of Nadia entering them from WhatsApp.
- Email notifications for new requests (a form service such as Web3Forms could add this sooner).
- Separate logins for third-party property owners who see only their own listing and calendar (needs Supabase Row Level Security; quoted as a separate add-on).

## Local preview
```bash
python -m http.server 8765
```
Then open http://localhost:8765 (opening `index.html` directly from disk works too, but the availability file needs a server).
