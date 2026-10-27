# Kruger Marloth Services & Bookings

Static website for handpicked self-catering stays in Marloth Park, a local services directory, and an owner dashboard for managing bookings. Hosted on GitHub Pages:
https://obsidianstudiodesigns.github.io/Kruger-Marloth-Services-Bookings/

## What's in here

| Path | What it is |
|---|---|
| `index.html` | Public website — stays, services, experiences, contact |
| `admin.html` | Owner dashboard — bookings, calendar, guest history (not linked from menus; "Owner login" in the footer) |
| `assets/js/data.js` | **All listing and service content.** Edit this to change names, prices, descriptions, amenities and providers |
| `assets/js/common.js` | Shared helpers (icons, dates, availability) |
| `assets/js/site.js` / `admin.js` | Public site and dashboard logic |
| `images/stays/<id>/` | Property photos (`01.jpg` is the cover), `thumb/` versions and `flyer.jpg` |
| `images/services/` | Service provider flyers |
| `data/availability.json` | Booked date ranges shown on the public calendars (no guest details). Written by the dashboard |
| `data/bookings.vault.json` | All bookings and guest details, **encrypted** with the owner's passphrase. Created by the dashboard |

The raw source folder (`kruger marloth services and bookings data files/`) is git-ignored and never published.

## Placeholder content still to replace

Every stay in `data.js` has a `draft` list naming the fields that are still dummy values. Real details came from the property flyers where available. Still needed from the owner:

- **Nightly rates** for every property except Tarentaal (R1 980 out of season / R3 300 school holidays).
- **House rules** — check-in/out times, minimum nights and deposit terms are dummy values in `DEFAULT_RULES`.
- **Sleeps / bedrooms / bathrooms** where marked in `draft` (no flyer for Afrika Safari Gastehuis, Buffalo Chalets, Bushfire Mongoose).
- **Bookings email address** (`SITE.email`) — the site uses WhatsApp only until it's added.
- **Spelling check:** the folder says "Phai *Thong* Hide Away", the flyer says "Phai *Tong*".
- **Service categories with no providers yet:** Activities, Shuttles, Restaurants, Butcheries, Private Chefs, House Cleaning (shown as "Coming soon").

## How bookings work

1. A guest picks dates on a property's calendar (booked nights are blocked) and taps **Request to book**. This opens WhatsApp to Nadia with the request filled in — nothing is charged or saved automatically.
2. Nadia confirms with the guest and adds the booking in the **dashboard** (`admin.html`). The dates are blocked on the public calendar straight away (the website updates within about a minute).
3. Check-out day is free for the next arrival: a 27–29 October booking blocks the nights of the 27th and 28th.
4. **Dates are released automatically** once check-out has passed, and immediately if a booking is cancelled. Finished and cancelled bookings stay in **Bookings → History / Cancelled** with the guest's details and a change log.

### Dashboard features
- Dashboard: who's staying now, arrivals, departures today, occupancy, which homes are free tonight
- Calendar: month planner of all 16 properties — click an empty day to book, click a booking to see the guest
- Bookings: Upcoming / Staying now / History / Cancelled, search by guest, phone or property, CSV export
- Guest booking or "block dates" (owner use, maintenance), conflict checking, payment and deposit tracking
- Backup download / restore

### Demo mode vs live mode
- **Demo mode** (no setup): sample bookings live in that browser only. Good for trying it out.
- **Live mode**: bookings are saved to this GitHub repository so they work from any device. Setup:
  1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
  2. Repository access: only `obsidianstudiodesigns/Kruger-Marloth-Services-Bookings`. Permission: **Contents → Read and write**.
  3. Open `admin.html`, paste the token, choose a strong **bookings passphrase** (it encrypts guest details), confirm it.
  4. Use the same token + passphrase on every device. **If the passphrase is lost, the bookings cannot be recovered** — keep regular backups (Settings → Download backup).

Because this repository is public (required for free GitHub Pages), guest details are only ever stored encrypted (AES-256-GCM, key derived from the passphrase with PBKDF2). The public availability file contains dates only.

## Going live later
When the site moves to its own domain and a real database (Supabase + Vercel, as discussed), `data.js` can seed the listings table and the dashboard's backup JSON can seed bookings. Online payments and instant booking can be added at that point.

## Local preview
```bash
python -m http.server 8765
```
Then open http://localhost:8765 (opening `index.html` directly from disk works too, but the availability file needs a server).
