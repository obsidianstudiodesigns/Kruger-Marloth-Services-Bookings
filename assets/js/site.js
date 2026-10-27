/* =========================================================
   PUBLIC SITE
   ========================================================= */

const state = {
  filter: 'all',
  search: null,          // { checkin, checkout, guests }
  ranges: {},            // booked nights per stay, from data/availability.json
  serviceCat: (SERVICE_CATEGORIES.find(c => c.providers.length) || SERVICE_CATEGORIES[0]).id,
};
const $ = sel => document.querySelector(sel);
const TODAY = todayISO();

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg, ms = 4200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------- Static bits ---------- */
function renderChrome() {
  $('#navWhatsapp').href = waHref(SITE.whatsapp, 'Hi ' + SITE.contactName + ', I found you on the Kruger Marloth website.');
  $('#navWhatsapp').innerHTML = icon('whatsapp') + '<span>WhatsApp us</span>';
  $('#menuBtn').innerHTML = icon('menu');
  $('#heroEyebrow').innerHTML = icon('pin') + 'Marloth Park · Mpumalanga';
  $('#searchBtn').innerHTML = icon('search') + 'Check availability';
  $('#heroTrust').innerHTML = [
    ['home', `${STAYS.length} handpicked homes`],
    ['paw', 'Wildlife at your doorstep'],
    ['whatsapp', `Book direct with ${SITE.contactName}`],
  ].map(([i, t]) => `<span>${icon(i)}${t}</span>`).join('');

  $('#whyGrid').innerHTML = [
    ['pin', 'Local & personal', 'We live in Marloth Park. Every home is managed by our own team, so you get honest advice and quick help.'],
    ['calendar', 'Live availability', 'Booked dates are blocked on each home’s calendar, so you only request dates that are actually open.'],
    ['wrench', 'One call for everything', 'Need laundry, a plumber or a photographer during your stay? Our services directory has you covered.'],
  ].map(([i, h, p]) => `<div class="why-item">${icon(i)}<h3>${h}</h3><p>${p}</p></div>`).join('');

  $('#expGrid').innerHTML = EXPERIENCES.map(e => `
    <button class="exp" data-exp="${esc(e.name)}">
      <img src="${e.image}" alt="" loading="lazy" />
      <div class="exp-body"><h3>${esc(e.name)}</h3><p>${esc(e.text)}</p><span>${icon('whatsapp')}Arrange on request</span></div>
    </button>`).join('');
  $('#expGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-exp]');
    if (b) window.open(waHref(SITE.whatsapp, `Hi ${SITE.contactName}, could you help us arrange: ${b.dataset.exp}?`), '_blank', 'noopener');
  });

  const contacts = [
    ['whatsapp', 'WhatsApp / Call ' + SITE.contactName, SITE.phone, waHref(SITE.whatsapp)],
    ...(SITE.email ? [['mail', 'Email', SITE.email, 'mailto:' + SITE.email]] : []),
    ['pin', 'Location', SITE.location, null],
  ];
  $('#contactList').innerHTML = contacts.map(([i, s, v, href]) => `
    <${href ? `a href="${href}" target="_blank" rel="noopener"` : 'div'} class="contact-item">
      <div class="cat-icon">${icon(i)}</div><div><strong>${s}</strong><span>${esc(v)}</span></div>
    </${href ? 'a' : 'div'}>`).join('');
  $('#contactBtn').innerHTML = icon('whatsapp') + 'Send via WhatsApp';
  $('#contactNote').innerHTML = icon('info') + `<span>Your message opens in WhatsApp, addressed to ${SITE.contactName} (${SITE.phone}). See our <a href="privacy.html" style="text-decoration:underline">privacy notice</a> for how we use your details.</span>`;
  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const text = `Hi ${SITE.contactName}, my name is ${$('#cName').value.trim()}${$('#cPhone').value.trim() ? ' (' + $('#cPhone').value.trim() + ')' : ''}.\n\n${$('#cMsg').value.trim()}`;
    window.open(waHref(SITE.whatsapp, text), '_blank', 'noopener');
    e.target.reset();
  });

  $('#footerServices').innerHTML = SERVICE_CATEGORIES.filter(c => c.providers.length)
    .map(c => `<li><a href="#services" data-cat-link="${c.id}">${esc(c.name)}</a></li>`).join('');
  $('#footerServices').addEventListener('click', e => {
    const a = e.target.closest('[data-cat-link]');
    if (a) { state.serviceCat = a.dataset.catLink; renderServices(); }
  });
  $('#footerContact').innerHTML = `<li><a href="${waHref(SITE.whatsapp)}" target="_blank" rel="noopener">${SITE.contactName} · ${SITE.phone}</a></li>`
    + (SITE.email ? `<li><a href="mailto:${SITE.email}">${SITE.email}</a></li>` : '')
    + `<li>${esc(SITE.location)}</li>`;
  $('#year').textContent = new Date().getFullYear();

  const links = $('#navLinks');
  $('#menuBtn').addEventListener('click', () => {
    const open = links.classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded', open);
    $('#menuBtn').innerHTML = icon(open ? 'x' : 'menu');
  });
  links.addEventListener('click', e => {
    if (e.target.closest('a')) { links.classList.remove('open'); $('#menuBtn').innerHTML = icon('menu'); }
  });
}

/* ---------- Search ---------- */
function initSearch() {
  const sIn = $('#sIn'), sOut = $('#sOut');
  sIn.min = TODAY; sOut.min = addDays(TODAY, 1);
  sIn.addEventListener('change', () => {
    sOut.min = sIn.value ? addDays(sIn.value, 1) : addDays(TODAY, 1);
    if (sOut.value && sOut.value <= sIn.value) sOut.value = addDays(sIn.value, 2);
    if (!sOut.value && sIn.value) sOut.value = addDays(sIn.value, 2);
  });
  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!sIn.value || !sOut.value || sOut.value <= sIn.value) { toast('Please choose a check-in and a later check-out date.'); return; }
    state.search = { checkin: sIn.value, checkout: sOut.value, guests: Number($('#sGuests').value) };
    renderStays();
    document.getElementById('stays').scrollIntoView({ behavior: 'smooth' });
  });
}

function stayAvailable(s) {
  if (!state.search) return true;
  return s.sleeps >= state.search.guests && isRangeFree(state.ranges[s.id], state.search.checkin, state.search.checkout);
}

/* ---------- Stay grid ---------- */
function renderFilters() {
  $('#filterRow').innerHTML = STAY_FILTERS.map(f => {
    const n = f.id === 'all' ? STAYS.length : STAYS.filter(s => s.filters.includes(f.id)).length;
    return `<button class="pill ${state.filter === f.id ? 'active' : ''}" data-filter="${f.id}" aria-pressed="${state.filter === f.id}">${f.label} <span class="count">${n}</span></button>`;
  }).join('');
}

function renderStays() {
  renderFilters();
  let list = STAYS.filter(s => state.filter === 'all' || s.filters.includes(state.filter));
  const bar = $('#resultsBar');
  if (state.search) {
    const { checkin, checkout, guests } = state.search;
    const avail = list.filter(stayAvailable);
    // Available homes first, unavailable ones stay visible but dimmed
    list = avail.concat(list.filter(s => !avail.includes(s)));
    bar.innerHTML = `<span><strong>${avail.length} of ${list.length}</strong> homes available · ${fmtRange(checkin, checkout)} · ${nightsBetween(checkin, checkout)} nights · ${guests}+ guests</span><button class="link-btn" id="clearSearch">Clear dates</button>`;
    bar.classList.add('show');
    $('#clearSearch').onclick = () => { state.search = null; $('#searchForm').reset(); renderStays(); };
  } else {
    bar.classList.remove('show');
  }

  $('#stayGrid').innerHTML = list.map(s => {
    const ok = stayAvailable(s);
    const flag = state.search ? `<span class="avail-flag ${ok ? '' : 'no'}">${icon(ok ? 'check' : 'x')}${ok ? 'Available' : s.sleeps < state.search.guests ? 'Too small' : 'Unavailable'}</span>` : '';
    return `
    <a class="stay-card ${state.search && !ok ? 'is-unavailable' : ''}" href="stays/${s.id}/" data-stay="${s.id}">
      <div class="stay-media">
        <img src="${stayImg(s.id, 1, true)}" alt="${esc(s.name)}" loading="lazy" />
        <span class="badge">${esc(s.tag)}</span>
        ${flag}
        <span class="photo-count">${icon('images')}${s.photos}</span>
      </div>
      <div class="stay-info">
        <div class="stay-title"><h3>${esc(s.name)}</h3><div class="stay-price">${money(s.price)} <small>/night</small></div></div>
        <p class="stay-tagline">${esc(s.tagline)}</p>
        <ul class="facts">
          <li>${icon('users')}${s.sleeps} guests</li>
          <li>${icon('bed')}${s.bedrooms} bedroom${s.bedrooms > 1 ? 's' : ''}</li>
          <li>${icon('bath')}${s.bathrooms} bath${s.bathrooms > 1 ? 's' : ''}</li>
          ${s.filters.includes('pool') ? `<li>${icon('pool')}Pool</li>` : ''}
        </ul>
      </div>
    </a>`;
  }).join('');
}

function initStayGrid() {
  $('#filterRow').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    state.filter = b.dataset.filter;
    renderStays();
  });
  // Cards are real links to each property's page (for Google and for
  // opening in a new tab); a plain click opens the property in place.
  $('#stayGrid').addEventListener('click', e => {
    const card = e.target.closest('[data-stay]');
    if (!card || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    openStay(card.dataset.stay);
  });
}

/* ---------- Stay detail ----------
   Each property has its own address, stays/<id>/ (built by
   tools/build-pages.cjs), so shared links show that property's photo and
   description in WhatsApp and Google. The <base> tag keeps relative links
   pointing at the site root while the address bar shows the property. */
const SITE_ROOT = document.baseURI;
const HOME_TITLE = 'Kruger Marloth Services & Bookings — Self-catering stays in Marloth Park';
function stayUrl(id) { return new URL(`stays/${id}/`, SITE_ROOT).href; }
function stayFromUrl() {
  const rel = location.href.startsWith(SITE_ROOT) ? location.href.slice(SITE_ROOT.length) : '';
  const m = rel.match(/^stays\/([\w-]+)/) || location.hash.match(/^#stay\/([\w-]+)/);
  return m ? m[1] : null;
}

let cal = null;   // calendar state for the open stay

function openStay(id, push = true) {
  const s = stayById(id);
  if (!s) return;
  if (push) history.pushState({ stay: id }, '', stayUrl(id));
  const photos = Array.from({ length: s.photos }, (_, i) => i + 1);
  const rules = DEFAULT_RULES;
  const sheet = $('#sheet');

  sheet.innerHTML = `
    <div class="sheet-bar"><div class="container">
      <button class="icon-btn" data-close aria-label="Back to all stays">${icon('left')}</button>
      <h2 id="sheetTitle">${esc(s.name)}</h2>
      <button class="icon-btn" data-share aria-label="Share this stay">${icon('share')}</button>
    </div></div>
    <div class="sheet-body"><div class="container">
      <div class="gallery">
        ${photos.slice(0, 5).map((n, i) => `<button data-photo="${i}" aria-label="View photo ${n}"><img src="${stayImg(s.id, n, i > 0)}" alt="" ${i ? 'loading="lazy"' : ''} /></button>`).join('')}
        <button class="gallery-all" data-photo="0">${icon('grid')}View all ${s.photos} photos</button>
      </div>
      <div class="detail-grid detail">
        <div>
          <div class="detail-head">
            <h1>${esc(s.name)}</h1>
            <div class="detail-loc">${icon('pin')}Marloth Park, next to the Kruger National Park</div>
          </div>
          <div class="detail-facts">
            <div><div class="cat-icon">${icon('users')}</div><div><strong>${s.sleeps}</strong><small>Guests</small></div></div>
            <div><div class="cat-icon">${icon('bed')}</div><div><strong>${s.bedrooms}</strong><small>Bedrooms</small></div></div>
            <div><div class="cat-icon">${icon('bath')}</div><div><strong>${s.bathrooms}</strong><small>Bathrooms</small></div></div>
          </div>
          <p class="detail-desc">${esc(s.description)}</p>
          <h3 class="sub">What this place offers</h3>
          <ul class="amenities">${s.amenities.map(([i, t]) => `<li>${icon(i)}${esc(t)}</li>`).join('')}</ul>
          <h3 class="sub">Good to know</h3>
          <div class="rules">
            <div class="rule">${icon('clock')}<div><strong>Check-in</strong>From ${rules.checkIn}</div></div>
            <div class="rule">${icon('clock')}<div><strong>Check-out</strong>By ${rules.checkOut}</div></div>
            <div class="rule">${icon('calendar')}<div><strong>Minimum stay</strong>${rules.minNights} nights</div></div>
            <div class="rule">${icon('info')}<div><strong>Deposit</strong>${esc(rules.deposit)}</div></div>
          </div>
          ${s.flyer ? `
          <h3 class="sub">Property flyer</h3>
          <button class="flyer-btn" data-flyer>
            <img src="images/stays/${s.id}/flyer.jpg" alt="" loading="lazy" />
            <div><strong>View the ${esc(s.name)} flyer</strong><span>Full feature list at a glance</span></div>
          </button>` : ''}
        </div>
        <aside class="book-card" id="bookCard">
          <div class="book-price"><strong>${money(s.price)}</strong><span>/ night</span></div>
          ${s.peakPrice ? `<div class="peak-note">${esc(s.peakLabel)}: ${money(s.peakPrice)} / night</div>` : ''}
          ${s.priceNote ? `<div class="peak-note">${esc(s.priceNote)}</div>` : ''}
          <div class="date-boxes">
            <div><small>Check-in</small><span id="bkIn" class="placeholder">Add date</span></div>
            <div><small>Check-out</small><span id="bkOut" class="placeholder">Add date</span></div>
          </div>
          <div class="cal" id="cal"></div>
          <div class="cal-msg" id="calMsg"></div>
          <form class="book-form" id="bookForm" novalidate>
            <div class="row">
              <div class="field"><label for="bAdults">Adults</label>
                <select id="bAdults">${Array.from({ length: s.sleeps }, (_, i) => `<option ${i === 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
              <div class="field"><label for="bKids">Children</label>
                <select id="bKids">${Array.from({ length: s.sleeps }, (_, i) => `<option>${i}</option>`).join('')}</select></div>
            </div>
            <div class="field"><label for="bName">Full name</label><input id="bName" autocomplete="name" required /></div>
            <div class="field"><label for="bPhone">Phone / WhatsApp</label><input id="bPhone" type="tel" autocomplete="tel" required /></div>
            <div class="field"><label for="bNotes">Message (optional)</label><textarea id="bNotes" rows="2" style="min-height:64px" placeholder="Arrival time, special requests…"></textarea></div>
            <div class="quote" id="quote"></div>
            <label class="consent"><input type="checkbox" id="bConsent" />
              <span>I agree that my details may be used to process this booking request, as set out in the <a href="privacy.html" target="_blank" rel="noopener">privacy notice</a> (POPIA).</span></label>
            <div class="book-actions">
              <button class="btn btn-wa" type="submit">${icon('whatsapp')}Book via WhatsApp</button>
              <button class="btn btn-ghost" type="button" data-book-email>${icon('mail')}Book via email</button>
            </div>
            <p class="form-note">${icon('info')}<span>No payment now. Your request opens in WhatsApp or your email app, ready to send. ${SITE.contactName} then confirms availability and the booking details with you.</span></p>
          </form>
        </aside>
      </div>
    </div></div>
    <div class="mobile-book">
      <div><strong>${money(s.price)}</strong> <span>per night · indicative</span></div>
      <button class="btn btn-primary" data-jump>${icon('calendar')}Check dates</button>
    </div>`;

  const start = state.search && isRangeFree(state.ranges[s.id], state.search.checkin, state.search.checkout) ? state.search : null;
  const first = parseISO(start ? start.checkin : TODAY);
  cal = { stay: s, y: first.getFullYear(), m: first.getMonth(), ci: start ? start.checkin : null, co: start ? start.checkout : null };
  renderCal();

  sheet.onclick = e => {
    const t = e.target;
    if (t.closest('[data-close]')) return closeStay();
    if (t.closest('[data-share]')) return shareStay(s);
    if (t.closest('[data-book-email]')) return sendRequest('email');
    if (t.closest('[data-jump]')) return $('#bookCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (t.closest('[data-flyer]')) return openLightbox([{ src: `images/stays/${s.id}/flyer.jpg` }], 0, s.name + ' flyer');
    const p = t.closest('[data-photo]');
    if (p) return openLightbox(photos.map(n => ({ src: stayImg(s.id, n), thumb: stayImg(s.id, n, true) })), Number(p.dataset.photo), s.name);
    const d = t.closest('[data-day]');
    if (d) return pickDay(d.dataset.day);
    const nav = t.closest('[data-month]');
    if (nav) { shiftMonth(Number(nav.dataset.month)); }
  };
  $('#bookForm').addEventListener('submit', e => { e.preventDefault(); sendRequest('whatsapp'); });

  sheet.scrollTop = 0;
  sheet.classList.add('open');
  document.body.classList.add('locked');
  document.title = `${s.name} | Self-catering in Marloth Park`;
}

function hideStay() {
  $('#sheet').classList.remove('open');
  document.body.classList.remove('locked');
  document.title = HOME_TITLE;
}
function closeStay() {
  // Opened from the grid: go back. Arrived straight on a property link: show the home page.
  if (history.state && history.state.stay && !history.state.entry) history.back();
  else { history.replaceState(null, '', SITE_ROOT + '#stays'); hideStay(); }
}
window.addEventListener('popstate', () => {
  const id = stayFromUrl();
  if (id) openStay(id, false); else hideStay();
});

async function shareStay(s) {
  const url = stayUrl(s.id);
  try {
    if (navigator.share) await navigator.share({ title: s.name, text: s.tagline, url });
    else { await navigator.clipboard.writeText(url); toast('Link copied to clipboard'); }
  } catch (e) { /* share cancelled */ }
}

/* ---------- Availability calendar ---------- */
function renderCal() {
  const { stay, y, m, ci, co } = cal;
  const ranges = state.ranges[stay.id];
  const firstDow = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const atStart = y === new Date().getFullYear() && m === new Date().getMonth();
  let html = `<div class="cal-head">
      <button type="button" class="icon-btn" data-month="-1" ${atStart ? 'disabled style="opacity:.3"' : ''} aria-label="Previous month">${icon('left')}</button>
      <strong>${MONTHS[m]} ${y}</strong>
      <button type="button" class="icon-btn" data-month="1" aria-label="Next month">${icon('right')}</button>
    </div><div class="cal-grid">${DAYS.map(d => `<div class="cal-dn">${d.slice(0, 2)}</div>`).join('')}`;
  html += '<div></div>'.repeat(firstDow);
  for (let d = 1; d <= days; d++) {
    const iso = toISO(new Date(y, m, d));
    const past = iso < TODAY;
    const booked = isNightBooked(ranges, iso);
    const held = booked && isNightHeld(ranges, iso);
    // A booked night can still be a check-out day if the nights before it are free
    const asCheckout = ci && !co && iso > ci && isRangeFree(ranges, ci, iso);
    const on = !past && (!booked || asCheckout);
    const cls = ['cal-d',
      past && 'past', booked && !past && (held ? 'booked held' : 'booked'), on && 'on', iso === TODAY && 'today',
      iso === ci && 'start', iso === co && 'end', ci && co && iso > ci && iso < co && 'range'].filter(Boolean).join(' ');
    html += `<div class="${cls}" ${on ? `data-day="${iso}" role="button" tabindex="0"` : ''} aria-label="${fmtDate(iso)}${held ? ' (on hold)' : booked ? ' (booked)' : ''}">${d}</div>`;
  }
  html += `</div><div class="cal-legend"><span><i style="background:var(--bush)"></i>Your dates</span><span><i style="background:repeating-linear-gradient(-45deg,#eee 0 2px,#e3c4bf 2px 4px)"></i>Booked</span><span><i style="background:repeating-linear-gradient(-45deg,#fdf3e3 0 2px,#ecc58f 2px 4px)"></i>On hold</span><span><i style="background:var(--sun);border-radius:50%"></i>Today</span></div>`;
  $('#cal').innerHTML = html;
  updateQuote();
}

function shiftMonth(dir) {
  let m = cal.m + dir, y = cal.y;
  if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
  const now = new Date();
  if (y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth())) return;
  cal.m = m; cal.y = y;
  renderCal();
}

function pickDay(iso) {
  const ranges = state.ranges[cal.stay.id];
  if (!cal.ci || cal.co || iso <= cal.ci) {
    if (isNightBooked(ranges, iso)) return;
    cal.ci = iso; cal.co = null;
  } else if (isRangeFree(ranges, cal.ci, iso)) {
    cal.co = iso;
  } else {
    cal.ci = iso; cal.co = null;
  }
  renderCal();
}

function updateQuote() {
  const { stay, ci, co } = cal;
  $('#bkIn').textContent = ci ? fmtDate(ci) : 'Add date';
  $('#bkIn').classList.toggle('placeholder', !ci);
  $('#bkOut').textContent = co ? fmtDate(co) : 'Add date';
  $('#bkOut').classList.toggle('placeholder', !co);
  const msg = $('#calMsg');
  const nights = nightsBetween(ci, co);
  msg.classList.remove('warn');
  if (!ci) msg.textContent = 'Select your check-in date.';
  else if (!co) msg.textContent = 'Now select your check-out date.';
  else if (nights < DEFAULT_RULES.minNights) { msg.textContent = `Minimum stay is ${DEFAULT_RULES.minNights} nights.`; msg.classList.add('warn'); }
  else msg.textContent = `${nights} nights selected — these dates are open.`;
  $('#quote').innerHTML = nights ? `
    <div><span>${money(stay.price)} × ${nights} night${nights > 1 ? 's' : ''}</span><span>${money(stay.price * nights)}</span></div>
    <div class="total"><span>Estimated total</span><span>${money(stay.price * nights)}</span></div>
    <small>Indicative rate — ${SITE.contactName} confirms the final price${stay.peakPrice ? ' (school-holiday rates may apply)' : ''}.</small>` : '';
}

/* Send the booking request to the owner via 'whatsapp' or 'email' */
function sendRequest(channel) {
  const { stay, ci, co } = cal;
  const nights = nightsBetween(ci, co);
  const name = $('#bName').value.trim(), phone = $('#bPhone').value.trim();
  if (!ci || !co) { toast('Please select your check-in and check-out dates on the calendar.'); return; }
  if (nights < DEFAULT_RULES.minNights) { toast(`Minimum stay is ${DEFAULT_RULES.minNights} nights.`); return; }
  if (!name || !phone) { toast('Please add your name and phone number.'); (name ? $('#bPhone') : $('#bName')).focus(); return; }
  if (!$('#bConsent').checked) { toast('Please tick the box to agree to the privacy notice.'); $('#bConsent').closest('label').classList.add('need'); return; }
  const adults = $('#bAdults').value, kids = $('#bKids').value, notes = $('#bNotes').value.trim();
  const viaEmail = channel === 'email';
  const text = [
    `Hi ${SITE.contactName}, I'd like to book ${viaEmail ? stay.name : `*${stay.name}*`}.`,
    '',
    `Check-in: ${fmtDate(ci)}`,
    `Check-out: ${fmtDate(co)} (${nights} nights)`,
    `Guests: ${adults} adult${adults > 1 ? 's' : ''}${Number(kids) ? `, ${kids} child${kids > 1 ? 'ren' : ''}` : ''}`,
    `Name: ${name}`,
    `Phone: ${phone}`,
    notes ? `Notes: ${notes}` : null,
    '',
    `Estimated total: ${money(stay.price * nights)}`,
    stayUrl(stay.id),
  ].filter(l => l !== null).join('\n');
  if (viaEmail) {
    const subject = `Booking request — ${stay.name}, ${fmtRange(ci, co)}`;
    location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    toast(`Your email app opened with the request — press send and ${SITE.contactName} will confirm your booking.`, 6000);
  } else {
    window.open(waHref(SITE.whatsapp, text), '_blank', 'noopener');
    toast(`WhatsApp opened with your request — press send and ${SITE.contactName} will confirm your booking.`, 6000);
  }
}

/* ---------- Lightbox ---------- */
const lb = { items: [], i: 0, title: '' };
function openLightbox(items, i, title) {
  Object.assign(lb, { items, i, title });
  const el = $('#lightbox');
  el.innerHTML = `
    <div class="lb-top"><span id="lbCount"></span><button class="icon-btn" data-lb-close aria-label="Close">${icon('x')}</button></div>
    <div class="lb-stage">
      ${items.length > 1 ? `<button class="icon-btn lb-nav lb-prev" data-lb="-1" aria-label="Previous photo">${icon('left')}</button>` : ''}
      <img id="lbImg" alt="" />
      ${items.length > 1 ? `<button class="icon-btn lb-nav lb-next" data-lb="1" aria-label="Next photo">${icon('right')}</button>` : ''}
    </div>
    ${items.length > 1 ? `<div class="lb-thumbs">${items.map((p, n) => `<button data-lb-go="${n}" aria-label="Photo ${n + 1}"><img src="${p.thumb || p.src}" alt="" loading="lazy" /></button>`).join('')}</div>` : ''}`;
  el.classList.add('open');
  showLb();
}
function showLb() {
  const { items, i, title } = lb;
  $('#lbImg').src = items[i].src;
  $('#lbImg').alt = `${title} — photo ${i + 1}`;
  $('#lbCount').textContent = items.length > 1 ? `${title} · ${i + 1} / ${items.length}` : title;
  document.querySelectorAll('.lb-thumbs button').forEach((b, n) => b.classList.toggle('active', n === i));
  const active = document.querySelector('.lb-thumbs .active');
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
  if (items[i + 1]) new Image().src = items[i + 1].src;
}
function stepLb(d) { lb.i = (lb.i + d + lb.items.length) % lb.items.length; showLb(); }
function closeLb() { $('#lightbox').classList.remove('open'); }
function initLightbox() {
  const el = $('#lightbox');
  el.addEventListener('click', e => {
    if (e.target.closest('[data-lb-close]') || e.target.classList.contains('lb-stage')) return closeLb();
    const s = e.target.closest('[data-lb]');
    if (s) return stepLb(Number(s.dataset.lb));
    const g = e.target.closest('[data-lb-go]');
    if (g) { lb.i = Number(g.dataset.lbGo); showLb(); }
  });
  let x0 = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 == null || lb.items.length < 2) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) stepLb(dx < 0 ? 1 : -1);
    x0 = null;
  });
  document.addEventListener('keydown', e => {
    if (el.classList.contains('open')) {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight') stepLb(1);
      if (e.key === 'ArrowLeft') stepLb(-1);
    } else if (e.key === 'Escape' && $('#sheet').classList.contains('open')) closeStay();
  });
}

/* ---------- Services ---------- */
function renderServices() {
  $('#catGrid').innerHTML = SERVICE_CATEGORIES.map(c => `
    <button class="cat ${c.id === state.serviceCat ? 'active' : ''}" role="tab" aria-selected="${c.id === state.serviceCat}" data-cat="${c.id}">
      <span class="cat-icon">${icon(c.icon)}</span>
      <span><strong>${esc(c.name)}</strong>${c.providers.length
        ? `<small>${c.providers.length} provider${c.providers.length > 1 ? 's' : ''}</small>`
        : '<small class="soon">Coming soon</small>'}</span>
    </button>`).join('');

  const c = SERVICE_CATEGORIES.find(x => x.id === state.serviceCat);
  const area = $('#providerArea');
  if (!c.providers.length) {
    area.innerHTML = `<div class="empty-state">${icon(c.icon)}
      <h4>${esc(c.name)} — coming soon</h4>
      <p>We’re lining up the best ${esc(c.name.toLowerCase())} in Marloth Park. Need one now? Ask ${SITE.contactName} for a recommendation — or get your business listed here.</p>
      <a class="btn btn-wa" target="_blank" rel="noopener" href="${waHref(SITE.whatsapp, `Hi ${SITE.contactName}, I'm looking for ${c.name.toLowerCase()} in Marloth Park.`)}">${icon('whatsapp')}Ask for a recommendation</a>
    </div>`;
    return;
  }
  area.innerHTML = `
    <div class="provider-head"><h3>${esc(c.name)}</h3><p>${esc(c.blurb)}</p></div>
    <div class="provider-grid">${c.providers.map((p, i) => `
      <article class="provider">
        <button class="provider-media" data-flyer-img="${p.image}" data-flyer-name="${esc(p.name)}" aria-label="View ${esc(p.name)} flyer">
          <img src="${p.image}" alt="${esc(p.name)} flyer" loading="lazy" />
          <span class="photo-count">${icon('file')}View flyer</span>
        </button>
        <div class="provider-body">
          <h4>${esc(p.name)}</h4>
          <p>${esc(p.description)}</p>
          <div class="tag-list">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          <div class="provider-meta">
            ${p.phones.map(ph => `<span>${icon('phone')}${esc(ph)}</span>`).join('')}
            ${p.email ? `<span>${icon('mail')}${esc(p.email)}</span>` : ''}
            ${p.address ? `<span>${icon('pin')}${esc(p.address)}</span>` : p.area ? `<span>${icon('pin')}${esc(p.area)}</span>` : ''}
          </div>
          <div class="provider-actions">
            <a class="btn btn-primary" href="${telHref(p.phones[0])}">${icon('phone')}Call</a>
            <a class="btn btn-wa" target="_blank" rel="noopener" href="${waHref(p.phones[0], `Hi, I found ${p.name} on the Kruger Marloth website.`)}">${icon('whatsapp')}WhatsApp</a>
            ${p.email ? `<a class="btn btn-ghost" href="mailto:${p.email}">${icon('mail')}Email</a>` : ''}
          </div>
        </div>
      </article>`).join('')}
    </div>`;
}
function initServices() {
  $('#catGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    state.serviceCat = b.dataset.cat;
    renderServices();
  });
  $('#providerArea').addEventListener('click', e => {
    const f = e.target.closest('[data-flyer-img]');
    if (f) openLightbox([{ src: f.dataset.flyerImg }], 0, f.dataset.flyerName);
  });
}

/* ---------- Boot ---------- */
renderChrome();
initSearch();
initStayGrid();
initLightbox();
initServices();
renderStays();
renderServices();

loadAvailability().then(ranges => {
  state.ranges = ranges;
  renderStays();
  if ($('#sheet').classList.contains('open') && cal) renderCal();
});

// Property pages (stays/<id>/) and older #stay/<id> links open straight on the property
const entryStay = document.body.dataset.stay || stayFromUrl();
if (entryStay && stayById(entryStay)) {
  history.replaceState({ stay: entryStay, entry: true }, '', stayUrl(entryStay));
  openStay(entryStay, false);
}
