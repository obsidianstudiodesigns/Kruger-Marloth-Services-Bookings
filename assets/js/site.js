/* =========================================================
   PUBLIC SITE
   ========================================================= */

const state = {
  filter: 'all',
  search: null,          // { checkin, checkout, guests }
  ranges: {},            // booked nights per stay, from the bookings repository's availability.json
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
    ['home', `${LISTINGS.length} handpicked homes`],
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
  const units = unitsOf(s.id);
  if (units.length) return units.some(stayAvailable);
  return s.sleeps >= state.search.guests && isRangeFree(state.ranges[s.id], state.search.checkin, state.search.checkout);
}

/* ---------- Stay grid ---------- */
function renderFilters() {
  $('#filterRow').innerHTML = STAY_FILTERS.map(f => {
    const n = f.id === 'all' ? LISTINGS.length : LISTINGS.filter(s => s.filters.includes(f.id)).length;
    return `<button class="pill ${state.filter === f.id ? 'active' : ''}" data-filter="${f.id}" aria-pressed="${state.filter === f.id}">${f.label} <span class="count">${n}</span></button>`;
  }).join('');
}

function renderStays() {
  renderFilters();
  let list = LISTINGS.filter(s => state.filter === 'all' || s.filters.includes(state.filter));
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
    const sum = listingSummary(s);
    const n = sum.units.length;
    const freeUnits = n && state.search ? sum.units.filter(stayAvailable).length : 0;
    const flagText = ok ? (n ? `${freeUnits} of ${n} available` : 'Available') : sum.sleeps < state.search?.guests ? 'Too small' : 'Unavailable';
    const flag = state.search ? `<span class="avail-flag ${ok ? '' : 'no'}">${icon(ok ? 'check' : 'x')}${flagText}</span>` : '';
    const unitWord = s.unitLabel || 'unit';
    return `
    <a class="stay-card ${state.search && !ok ? 'is-unavailable' : ''}" href="stays/${s.id}/" data-stay="${s.id}">
      <div class="stay-media">
        <img src="${stayImg(s.id, 1, true)}" alt="${esc(s.name)}" loading="lazy" />
        <span class="badge">${esc(s.tag)}</span>
        ${flag}
        <span class="photo-count">${icon('images')}${s.photos}</span>
      </div>
      <div class="stay-info">
        <div class="stay-title"><h3>${esc(s.name)}</h3><div class="stay-price">${sum.priceFrom ? '<small>from</small> ' : ''}${money(sum.price)} <small>/night</small></div></div>
        <p class="stay-tagline">${esc(s.tagline)}</p>
        <ul class="facts">${n ? `
          <li>${icon('home')}${n} ${unitWord}s</li>
          <li>${icon('users')}${sum.minSleeps}–${sum.sleeps} guests</li>` : `
          <li>${icon('users')}${s.sleeps} guests</li>
          <li>${icon('bed')}${s.bedrooms} bedroom${s.bedrooms > 1 ? 's' : ''}</li>
          <li>${icon('bath')}${s.bathrooms} bath${s.bathrooms > 1 ? 's' : ''}</li>`}
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
  const rules = stayRules(s);
  const sum = listingSummary(s);
  const units = sum.units;                                   // set when this is a property with units
  const parent = s.parent && stayById(s.parent);             // set when this is one of those units
  const unitWord = (parent || s).unitLabel || 'unit';
  const sheet = $('#sheet');
  const pin = stayPin(s);
  const pinPos = pin && mapPos(pin);

  sheet.innerHTML = `
    <div class="sheet-bar"><div class="container">
      <button class="icon-btn" data-close aria-label="Back to all stays">${icon('left')}</button>
      <h2 id="sheetTitle">${esc(stayLabel(s))}</h2>
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
            <div class="detail-loc">${icon('pin')}${pin ? `${esc(pin.where)}, Marloth Park · <button class="link-btn" data-show-map>Show on map</button>` : 'Marloth Park, next to the Kruger National Park'}</div>
            ${parent ? `<button class="parent-link" data-parent>${icon('left')}Part of ${esc(parent.name)} · see all ${unitsOf(parent.id).length} ${unitWord}s</button>` : ''}
          </div>
          <div class="detail-facts">${units.length ? `
            <div><div class="cat-icon">${icon('home')}</div><div><strong>${units.length}</strong><small>${esc(unitWord[0].toUpperCase() + unitWord.slice(1))}s</small></div></div>
            <div><div class="cat-icon">${icon('users')}</div><div><strong>${sum.minSleeps}–${sum.sleeps}</strong><small>Guests per ${esc(unitWord)}</small></div></div>` : `
            <div><div class="cat-icon">${icon('users')}</div><div><strong>${s.sleeps}</strong><small>Guests</small></div></div>
            <div><div class="cat-icon">${icon('bed')}</div><div><strong>${s.bedrooms}</strong><small>Bedrooms</small></div></div>
            <div><div class="cat-icon">${icon('bath')}</div><div><strong>${s.bathrooms}</strong><small>Bathrooms</small></div></div>`}
          </div>
          <p class="detail-desc">${esc(s.description)}</p>
          ${units.length ? `
          <h3 class="sub" id="unitsHead">Choose your ${esc(unitWord)}</h3>
          <div class="unit-list">${units.map(u => {
            const free = stayAvailable(u);
            return `
            <a class="unit-card ${state.search && !free ? 'is-unavailable' : ''}" href="stays/${u.id}/" data-unit="${u.id}">
              <div class="unit-media"><img src="${stayImg(u.id, 1, true)}" alt="${esc(u.name)}" loading="lazy" />
                ${state.search ? `<span class="avail-flag ${free ? '' : 'no'}">${icon(free ? 'check' : 'x')}${free ? 'Available' : u.sleeps < state.search.guests ? 'Too small' : 'Unavailable'}</span>` : ''}</div>
              <div class="unit-body">
                <div class="stay-title"><h4>${esc(u.name)}</h4><div class="stay-price">${money(u.price)} <small>/night</small></div></div>
                <p class="stay-tagline">${esc(u.tagline)}</p>
                <ul class="facts">
                  <li>${icon('users')}${u.sleeps} guests</li>
                  <li>${icon('bed')}${u.bedrooms} bedroom${u.bedrooms > 1 ? 's' : ''}</li>
                  <li>${icon('bath')}${u.bathrooms} bath${u.bathrooms > 1 ? 's' : ''}</li>
                </ul>
                <span class="unit-cta">${icon('calendar')}See calendar &amp; book</span>
              </div>
            </a>`;
          }).join('')}</div>` : ''}
          <h3 class="sub">What this place offers</h3>
          <ul class="amenities">${s.amenities.map(([i, t]) => `<li>${icon(i)}${esc(t)}</li>`).join('')}</ul>
          <h3 class="sub">Good to know</h3>
          <div class="rules">
            <div class="rule">${icon('clock')}<div><strong>Check-in</strong>From ${rules.checkIn}</div></div>
            <div class="rule">${icon('clock')}<div><strong>Check-out</strong>By ${rules.checkOut}</div></div>
            <div class="rule">${icon('calendar')}<div><strong>Minimum stay</strong>${rules.minNights} nights</div></div>
            <div class="rule">${icon('info')}<div><strong>Deposit</strong>${esc(rules.deposit)}</div></div>
            ${(rules.notes || []).map(([title, text]) => `<div class="rule">${icon('info')}<div><strong>${esc(title)}</strong>${esc(text)}</div></div>`).join('')}
          </div>
          ${pin ? `
          <h3 class="sub">Where it is</h3>
          <div class="stay-where">
            <button class="stay-where-map" data-show-map aria-label="Show ${esc(s.name)} on the park map">
              <img src="images/map/marloth-park.svg?v=20261112d" alt="" style="transform:translate(-${pinPos.x.toFixed(2)}%,-${pinPos.y.toFixed(2)}%)" />
              <span class="map-pin stay on" style="left:50%;top:50%"><span>${pin.badge}</span></span>
            </button>
            <div class="stay-where-info">
              <strong>${esc(pin.where)}</strong>
              <span>Marloth Park, between the Kruger National Park and Lionspruit</span>
              <div class="stay-where-actions">
                <button class="btn btn-ghost" data-show-map>${icon('map')}Show on park map</button>
                <a class="btn btn-primary" href="${gmapsHref(pin)}" target="_blank" rel="noopener">${icon('pin')}Google Maps</a>
              </div>
            </div>
          </div>` : ''}
          ${s.flyer ? `
          <h3 class="sub">Property flyer</h3>
          <button class="flyer-btn" data-flyer>
            <img src="images/stays/${s.id}/flyer.jpg" alt="" loading="lazy" />
            <div><strong>View the ${esc(s.name)} flyer</strong><span>Full feature list at a glance</span></div>
          </button>` : ''}
        </div>
        ${units.length ? `
        <aside class="book-card" id="bookCard">
          <div class="book-price"><span>From</span><strong>${money(sum.price)}</strong><span>/ night</span></div>
          <p class="peak-note">${units.length} ${esc(unitWord)}s, each with its own calendar. Choose one to check dates and book.</p>
          <ul class="unit-mini">${units.map(u => `<li><button type="button" data-unit="${u.id}"><span>${esc(u.name)}</span><small>Sleeps ${u.sleeps} · ${money(u.price)}</small></button></li>`).join('')}</ul>
        </aside>` : `
        <aside class="book-card" id="bookCard">
          <div class="book-price">${s.priceFrom ? '<span>From</span>' : ''}<strong>${money(s.price)}</strong><span>/ night</span></div>
          ${s.peakPrice ? `<div class="peak-note">${esc(s.peakLabel)}: ${money(s.peakPrice)} / night</div>` : ''}
          ${s.priceNote ? `<div class="peak-note">${esc(s.priceNote)}</div>` : ''}
          ${s.rates ? rateTable(s) : ''}
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
        </aside>`}
      </div>
    </div></div>
    <div class="mobile-book">
      <div>${sum.priceFrom ? '<span>From</span> ' : ''}<strong>${money(sum.price)}</strong> <span>per night · indicative</span></div>
      ${units.length
        ? `<button class="btn btn-primary" data-jump-units>${icon('home')}Choose a ${esc(unitWord)}</button>`
        : `<button class="btn btn-primary" data-jump>${icon('calendar')}Check dates</button>`}
    </div>`;

  if (!units.length) {
    const start = state.search && isRangeFree(state.ranges[s.id], state.search.checkin, state.search.checkout) ? state.search : null;
    const first = parseISO(start ? start.checkin : TODAY);
    cal = { stay: s, y: first.getFullYear(), m: first.getMonth(), ci: start ? start.checkin : null, co: start ? start.checkout : null };
    renderCal();
  } else cal = null;

  sheet.onclick = e => {
    const t = e.target;
    if (t.closest('[data-close]')) return closeStay();
    const unit = t.closest('[data-unit]');
    if (unit) { e.preventDefault(); return openStay(unit.dataset.unit); }
    if (t.closest('[data-parent]')) return openStay(parent.id);
    if (t.closest('[data-jump-units]')) return $('#unitsHead').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (t.closest('[data-share]')) return shareStay(s);
    if (t.closest('[data-show-map]')) {
      hideStay();
      history.replaceState(null, '', SITE_ROOT + '#map');
      return showOnMap(pin.key);
    }
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
  if (!units.length) {
    $('#bookForm').addEventListener('submit', e => { e.preventDefault(); sendRequest('whatsapp'); });
    // Group-size pricing: the estimate changes with the number of guests
    if (s.rates) ['#bAdults', '#bKids'].forEach(id => $(id).addEventListener('change', updateQuote));
  }

  sheet.scrollTop = 0;
  sheet.classList.add('open');
  document.body.classList.add('locked');
  document.title = `${stayLabel(s)} | Self-catering in Marloth Park`;
}

function hideStay() {
  $('#sheet').classList.remove('open');
  document.body.classList.remove('locked');
  document.title = HOME_TITLE;
}
function closeStay() {
  // Opened from the grid: go back. Arrived straight on a property link: show the home page.
  const open = stayById(history.state && history.state.stay);
  if (history.state && history.state.stay && !history.state.entry) history.back();
  else if (open && open.parent) { history.replaceState({ stay: open.parent, entry: true }, '', stayUrl(open.parent)); openStay(open.parent, false); }
  else { history.replaceState(null, '', SITE_ROOT + '#stays'); hideStay(); }
}
window.addEventListener('popstate', () => {
  const id = stayFromUrl();
  if (id) openStay(id, false); else hideStay();
});

async function shareStay(s) {
  const url = stayUrl(s.id);
  try {
    if (navigator.share) await navigator.share({ title: stayLabel(s), text: s.tagline, url });
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
  else if (nights < stayRules(cal.stay).minNights) { msg.textContent = `Minimum stay is ${stayRules(cal.stay).minNights} nights.`; msg.classList.add('warn'); }
  else msg.textContent = `${nights} nights selected — these dates are open.`;
  const rate = nightlyRate(stay, guestCount());
  $('#quote').innerHTML = nights ? `
    <div><span>${money(rate)} × ${nights} night${nights > 1 ? 's' : ''}</span><span>${money(rate * nights)}</span></div>
    <div class="total"><span>Estimated total</span><span>${money(rate * nights)}</span></div>
    <small>Indicative rate — ${SITE.contactName} confirms the final price${stay.peakPrice ? ` (${esc(stay.peakLabel)}: ${money(stay.peakPrice)} / night)` : ''}.</small>` : '';
}

/* Stays priced by group size list `rates`: one table per season, rows of [guests, price per night] */
function guestCount() { return Number($('#bAdults').value) + Number($('#bKids').value); }
function nightlyRate(stay, guests) {
  if (!stay.rates) return stay.price;
  const rows = stay.rates[0].rows;
  return (rows.find(([n]) => n >= guests) || rows[rows.length - 1])[1];
}
function rateTable(s) {
  const sizes = s.rates[0].rows.map(([n]) => n);
  return `<table class="rate-table">
    <thead><tr><th>Guests</th>${s.rates.map(r => `<th>${esc(r.label)}</th>`).join('')}</tr></thead>
    <tbody>${sizes.map((n, i) => `<tr><td>Up to ${n}</td>${s.rates.map(r => `<td>${money(r.rows[i][1])}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>${s.rates.filter(r => r.note).map(r => `<div class="peak-note">${esc(r.label)}: ${esc(r.note)}</div>`).join('')}`;
}

/* Send the booking request to the owner via 'whatsapp' or 'email' */
function sendRequest(channel) {
  const { stay, ci, co } = cal;
  const nights = nightsBetween(ci, co);
  const name = $('#bName').value.trim(), phone = $('#bPhone').value.trim();
  if (!ci || !co) { toast('Please select your check-in and check-out dates on the calendar.'); return; }
  const minNights = stayRules(stay).minNights;
  if (nights < minNights) { toast(`Minimum stay is ${minNights} nights.`); return; }
  if (!name || !phone) { toast('Please add your name and phone number.'); (name ? $('#bPhone') : $('#bName')).focus(); return; }
  if (!$('#bConsent').checked) { toast('Please tick the box to agree to the privacy notice.'); $('#bConsent').closest('label').classList.add('need'); return; }
  const adults = $('#bAdults').value, kids = $('#bKids').value, notes = $('#bNotes').value.trim();
  const viaEmail = channel === 'email';
  const text = [
    `Hi ${SITE.contactName}, I'd like to book ${viaEmail ? stayLabel(stay) : `*${stayLabel(stay)}*`}.`,
    '',
    `Check-in: ${fmtDate(ci)}`,
    `Check-out: ${fmtDate(co)} (${nights} nights)`,
    `Guests: ${adults} adult${adults > 1 ? 's' : ''}${Number(kids) ? `, ${kids} child${kids > 1 ? 'ren' : ''}` : ''}`,
    `Name: ${name}`,
    `Phone: ${phone}`,
    notes ? `Notes: ${notes}` : null,
    '',
    `Estimated total: ${money(nightlyRate(stay, guestCount()) * nights)}`,
    stayUrl(stay.id),
  ].filter(l => l !== null).join('\n');
  if (viaEmail) {
    const subject = `Booking request — ${stayLabel(stay)}, ${fmtRange(ci, co)}`;
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
        <button class="provider-media" data-flyer-img="${[p.image, ...(p.moreImages || [])].join('|')}" data-flyer-name="${esc(p.name)}" aria-label="View ${esc(p.name)} flyer">
          <img src="${p.image}" alt="${esc(p.name)} flyer" loading="lazy" />
          <span class="photo-count">${icon('file')}${p.moreImages ? `View ${p.moreImages.length + 1} flyers` : 'View flyer'}</span>
        </button>
        <div class="provider-body">
          <h4>${esc(p.name)}</h4>
          <p>${esc(p.description)}</p>
          <div class="tag-list">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          <div class="provider-meta">
            ${p.phones.map(ph => `<span>${icon('phone')}${esc(ph)}</span>`).join('')}
            ${p.email ? `<span>${icon('mail')}${esc(p.email)}</span>` : ''}
            ${p.address ? `<span>${icon('pin')}${esc(p.address)}</span>` : p.area ? `<span>${icon('pin')}${esc(p.area)}</span>` : ''}
            ${p.website ? `<a href="${p.website}" target="_blank" rel="noopener">${icon('globe')}${esc(p.website.replace(/^https?:\/\/(www\.)?/, ''))}</a>` : ''}
          </div>
          <div class="provider-actions">
            ${p.phones.length ? `<a class="btn btn-primary" href="${telHref(p.phones[0])}">${icon('phone')}Call</a>
            <a class="btn btn-wa" target="_blank" rel="noopener" href="${waHref(p.phones[0], `Hi, I found ${p.name} on the Kruger Marloth website.`)}">${icon('whatsapp')}WhatsApp</a>` : ''}
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
    if (f) openLightbox(f.dataset.flyerImg.split('|').map(src => ({ src })), 0, f.dataset.flyerName);
  });
}

/* ---------- Property for sale ---------- */
function renderSale() {
  const p = PROPERTY_SALE;
  const grid = $('#saleGrid');
  grid.innerHTML = `
    <button class="sale-ad" type="button" data-sale-ad aria-label="View the ${esc(p.agency)} advert">
      <img src="${p.image}" alt="${esc(p.agency)} — houses and stands for sale in Marloth Park" loading="lazy" />
    </button>
    <div>
      <span class="eyebrow">Property for sale</span>
      <h2 id="saleTitle">Own a home in Marloth Park</h2>
      <p class="sale-intro">${esc(p.intro)}</p>
      <ul class="sale-list">${p.listings.map(([i, t]) => `<li>${icon(i)}${esc(t)}</li>`).join('')}</ul>
      ${(p.galleries || []).map(g => `
      <button class="sale-gallery" type="button" data-sale-gallery="${g.id}">
        <img src="images/sale/${g.id}/thumb/01.jpg" alt="" loading="lazy" />
        <span><strong>${esc(g.title)}</strong><small>${esc(g.text)}</small><em>${icon('images')}View ${g.photos} photos</em></span>
      </button>`).join('')}
      <p class="sale-agent">Contact <strong>${esc(p.agent)}</strong> · ${esc(p.agency)} · ${esc(p.phone)}</p>
      <div class="sale-actions">
        <a class="btn btn-wa" target="_blank" rel="noopener" href="${waHref(p.phone, `Hi ${p.agent.split(' ')[0]}, I saw the properties for sale on the Kruger Marloth website. Please send me more information.`)}">${icon('whatsapp')}WhatsApp ${esc(p.agent.split(' ')[0])}</a>
        <a class="btn btn-sun" href="${telHref(p.phone)}">${icon('phone')}Call ${esc(p.phone)}</a>
      </div>
    </div>`;
  grid.querySelector('[data-sale-ad]').addEventListener('click', () => openLightbox([{ src: p.image }], 0, p.agency));
  grid.querySelectorAll('[data-sale-gallery]').forEach(b => b.addEventListener('click', () => {
    const g = p.galleries.find(x => x.id === b.dataset.saleGallery);
    const n = i => String(i + 1).padStart(2, '0');
    openLightbox(Array.from({ length: g.photos }, (_, i) => ({ src: `images/sale/${g.id}/${n(i)}.jpg`, thumb: `images/sale/${g.id}/thumb/${n(i)}.jpg` })), 0, g.title);
  }));
}

/* ---------- Park map ---------- */
function gmapsHref(p) { return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`; }
function mapPos(p) {
  const b = MAP.bounds;
  return { x: (p.lng - b.west) / (b.east - b.west) * 100, y: (b.north - p.lat) / (b.north - b.south) * 100 };
}
const mp = { z: 1, tx: 0, ty: 0, filter: 'all', active: null, pts: new Map(), moved: 0, pinch: null };
// Every pin, stays numbered and shops lettered, in legend order
const MAP_PINS = [
  ...MAP.stays.map((p, i) => {
    const s = stayById(p.stay);
    return { ...p, kind: 'stay', key: `s${i}`, badge: String(i + 1), name: s.name, s };
  }),
  ...MAP.places.map((p, i) => ({ ...p, kind: 'place', key: `p${i}`, badge: 'ABCDEFGHIJKLMNOP'[i] })),
];
// The map pin for a stay, or for the property a unit belongs to
function stayPin(s) { return MAP_PINS.find(p => p.kind === 'stay' && (p.stay === s.id || p.stay === s.parent)); }
function showOnMap(key) {
  const p = MAP_PINS.find(x => x.key === key);
  if (!p) return;
  if (mp.filter !== 'all') { mp.filter = 'all'; renderMap(); }
  mapLoad();
  // Jump (not glide) to the map. Some phone browsers reject behavior:'instant', so switch the page's
  // smooth scrolling off for a moment instead.
  const root = document.documentElement, view = $('#mapView');
  root.style.scrollBehavior = 'auto';
  const r = view.getBoundingClientRect();
  window.scrollTo(0, Math.max(0, scrollY + r.top - Math.max(70, (innerHeight - r.height) / 2)));
  setTimeout(() => { root.style.scrollBehavior = ''; }, 100);
  const { w, h } = mapSize(), { x, y } = mapPos(p);
  mp.z = 3;
  mp.tx = w / 2 - x / 100 * w * mp.z;
  mp.ty = h / 2 - y / 100 * h * mp.z;
  $('#mapView').classList.add('used');
  mapApply();
  openPop(key);
  const el = $(`.map-pin[data-pin="${key}"]`);
  el.classList.remove('hl'); void el.offsetWidth; el.classList.add('hl');
}
let mapLoad = () => {};
function renderMap() {
  $('#mapPins').innerHTML = MAP_PINS.map(p => {
    const { x, y } = mapPos(p);
    return `<button class="map-pin ${p.kind}" data-pin="${p.key}" style="left:${x}%;top:${y}%" aria-label="${esc(p.name)} — ${esc(p.where)}"><span>${p.badge}</span></button>`;
  }).join('') + MAP.landmarks.map(l => {
    const { x, y } = mapPos(l);
    return `<span class="map-mark ${l.side}" style="left:${x}%;top:${y}%">${icon(l.icon)}<em>${esc(l.name)}</em></span>`;
  }).join('');

  const item = p => `
    <li><a class="ml-item ${p.kind}" href="${gmapsHref(p)}" target="_blank" rel="noopener" data-hl="${p.key}">
      <span class="ml-badge">${p.badge}</span>
      <span class="ml-text"><strong>${esc(p.name)}</strong><small>${esc(p.kind === 'place' ? p.here : p.where)}</small></span>
      <span class="ml-go" aria-hidden="true">${icon('external')}</span>
      <span class="sr-only">(opens Google Maps)</span>
    </a></li>`;
  const chips = [['all', 'All'], ['stay', 'Stays'], ['place', 'Shops & services']];
  $('#mapLegend').innerHTML = `
    <div class="ml-chips" role="toolbar" aria-label="Show on map">${chips.map(([k, t]) =>
      `<button class="pill ${mp.filter === k ? 'active' : ''}" data-mf="${k}" aria-pressed="${mp.filter === k}">${t}</button>`).join('')}</div>
    ${mp.filter !== 'place' ? `<h3 class="ml-head">${icon('home')}Stays</h3><ol class="ml-list">${MAP_PINS.filter(p => p.kind === 'stay').map(item).join('')}</ol>` : ''}
    ${mp.filter !== 'stay' ? `<h3 class="ml-head">${icon('bag')}Shops &amp; services</h3><ol class="ml-list">${MAP_PINS.filter(p => p.kind === 'place').map(item).join('')}</ol>` : ''}`;
  $('#mapView').dataset.filter = mp.filter;
}
function mapSize() { const v = $('#mapView'); return { w: v.clientWidth, h: v.clientHeight }; }
function mapApply() {
  const { w, h } = mapSize();
  mp.z = Math.min(6, Math.max(1, mp.z));
  mp.tx = Math.min(0, Math.max(w - w * mp.z, mp.tx));
  mp.ty = Math.min(0, Math.max(h - h * mp.z, mp.ty));
  const st = $('#mapStage');
  st.style.transform = `translate(${mp.tx}px,${mp.ty}px) scale(${mp.z})`;
  st.style.setProperty('--z', mp.z);
  $('#mapView').classList.toggle('zoomed', mp.z > 1.01);
  placePop();
}
function mapZoomAt(factor, cx, cy) {
  const z = Math.min(6, Math.max(1, mp.z * factor));
  const f = z / mp.z;
  mp.tx = cx - (cx - mp.tx) * f;
  mp.ty = cy - (cy - mp.ty) * f;
  mp.z = z;
  mapApply();
}
function openPop(key) {
  const p = MAP_PINS.find(x => x.key === key);
  mp.active = p ? key : null;
  document.querySelectorAll('.map-pin.on').forEach(el => el.classList.remove('on'));
  const pop = $('#mapPop');
  if (!p) { pop.hidden = true; return; }
  $(`.map-pin[data-pin="${key}"]`).classList.add('on');
  let body;
  if (p.kind === 'stay') {
    const sum = listingSummary(p.s);
    body = `<img src="${stayImg(p.s.id, 1, true)}" alt="" />
      <div><strong>${esc(p.name)}</strong><small>${esc(p.where)}</small>
      <small>Sleeps ${sum.minSleeps !== sum.sleeps ? `${sum.minSleeps}–${sum.sleeps}` : sum.sleeps} · ${sum.priceFrom ? 'from ' : ''}${money(sum.price)}/night</small></div>`;
  } else {
    body = `<div><strong>${esc(p.name)}</strong><small>${esc(p.where)}</small><small>${esc(p.here)}</small></div>`;
  }
  pop.innerHTML = `<button class="map-pop-x" data-pop-close aria-label="Close">${icon('x')}</button>
    <div class="map-pop-body ${p.kind}">${body}</div>
    <div class="map-pop-actions">
      <a class="btn btn-primary" href="${gmapsHref(p)}" target="_blank" rel="noopener">${icon('map')}Google Maps</a>
      ${p.kind === 'stay' ? `<button class="btn btn-ghost" data-pop-stay="${p.s.id}">View stay</button>`
        : `<button class="btn btn-ghost" data-pop-dir="${esc(p.providers[0])}">In directory</button>`}
    </div>`;
  pop.hidden = false;
  placePop();
}
function placePop() {
  const pop = $('#mapPop');
  if (pop.hidden || !mp.active) return;
  const p = MAP_PINS.find(x => x.key === mp.active);
  const { w, h } = mapSize();
  const { x, y } = mapPos(p);
  const px = mp.tx + x / 100 * w * mp.z, py = mp.ty + y / 100 * h * mp.z;
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  const left = Math.min(w - pw - 8, Math.max(8, px - pw / 2));
  const below = py - ph - 46 < 8;
  pop.style.left = `${left}px`;
  pop.style.top = `${below ? py + 10 : py - ph - 42}px`;
  pop.classList.toggle('off', px < 0 || px > w || py < 0 || py > h);
}
function initMap() {
  const view = $('#mapView');
  renderMap();
  $('#mapZoom').innerHTML = `<button data-mz="in" aria-label="Zoom in">${icon('plus')}</button><button data-mz="out" aria-label="Zoom out">${icon('minus')}</button><button data-mz="reset" aria-label="Show the whole park">${icon('refresh')}</button>`;
  $('#mapHint').textContent = matchMedia('(pointer:coarse)').matches ? 'Pinch to zoom · tap a pin' : 'Drag to move · Ctrl + scroll or +/− to zoom';
  $('#mapZoom').addEventListener('click', e => {
    const b = e.target.closest('[data-mz]');
    if (!b) return;
    const { w, h } = mapSize();
    if (b.dataset.mz === 'reset') { mp.z = 1; mp.tx = mp.ty = 0; mapApply(); } else mapZoomAt(b.dataset.mz === 'in' ? 1.6 : 1 / 1.6, w / 2, h / 2);
  });
  $('#mapLegend').addEventListener('click', e => {
    const c = e.target.closest('[data-mf]');
    if (c) { mp.filter = c.dataset.mf; renderMap(); openPop(null); }
  });
  const hl = (e, on) => {
    const a = e.target.closest('[data-hl]');
    if (a) $(`.map-pin[data-pin="${a.dataset.hl}"]`)?.classList.toggle('hl', on);
  };
  $('#mapLegend').addEventListener('mouseover', e => hl(e, true));
  $('#mapLegend').addEventListener('mouseout', e => hl(e, false));
  $('#mapLegend').addEventListener('focusin', e => hl(e, true));
  $('#mapLegend').addEventListener('focusout', e => hl(e, false));
  $('#mapPop').addEventListener('click', e => {
    if (e.target.closest('[data-pop-close]')) return openPop(null);
    const st = e.target.closest('[data-pop-stay]');
    if (st) return openStay(st.dataset.popStay);
    const d = e.target.closest('[data-pop-dir]');
    if (d) {
      const cat = SERVICE_CATEGORIES.find(c => c.providers.some(x => x.name === d.dataset.popDir));
      if (cat) { state.serviceCat = cat.id; renderServices(); }
      document.getElementById('services').scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Pan with one pointer, pinch with two; a press that barely moves is a tap
  const rel = e => { const r = view.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  view.addEventListener('pointerdown', e => {
    view.classList.add('used');
    if (e.target.closest('.map-zoom, .map-pop') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    mp.pts.set(e.pointerId, rel(e));
    if (mp.pts.size === 1) mp.moved = 0;
    if (mp.pts.size === 2) {
      const [a, b] = [...mp.pts.values()];
      mp.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: mp.z };
    }
  });
  view.addEventListener('pointermove', e => {
    if (!mp.pts.has(e.pointerId)) return;
    const prev = mp.pts.get(e.pointerId), cur = rel(e);
    mp.pts.set(e.pointerId, cur);
    if (mp.pts.size === 2 && mp.pinch) {
      const [a, b] = [...mp.pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      mapZoomAt(mp.pinch.z * d / mp.pinch.d / mp.z, (a.x + b.x) / 2, (a.y + b.y) / 2);
      mp.moved = 99;
    } else if (mp.pts.size === 1) {
      mp.moved += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
      if (mp.moved > 6 && mp.z > 1) {
        if (!view.hasPointerCapture(e.pointerId)) view.setPointerCapture(e.pointerId);
        view.classList.add('dragging');
        mp.tx += cur.x - prev.x; mp.ty += cur.y - prev.y; mapApply();
      }
    }
  });
  const up = e => {
    mp.pts.delete(e.pointerId);
    if (mp.pts.size < 2) mp.pinch = null;
    if (!mp.pts.size) view.classList.remove('dragging');
  };
  view.addEventListener('pointerup', up);
  view.addEventListener('pointercancel', up);
  view.addEventListener('click', e => {
    if (mp.moved > 6) return;
    const pin = e.target.closest('[data-pin]');
    if (pin) openPop(mp.active === pin.dataset.pin ? null : pin.dataset.pin);
    else if (!e.target.closest('.map-pop, .map-zoom')) openPop(null);
  });
  view.addEventListener('dblclick', e => { if (!e.target.closest('.map-pop, .map-zoom, [data-pin]')) { const p = rel(e); mapZoomAt(1.8, p.x, p.y); } });
  view.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const p = rel(e);
    mapZoomAt(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y);
  }, { passive: false });
  addEventListener('resize', mapApply);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && mp.active) openPop(null); });

  // Load the drawn map when the section comes near the screen
  let loading = false;
  const load = mapLoad = () => {
    if (loading) return;
    loading = true;
    fetch('images/map/marloth-park.svg?v=20261112d').then(r => r.text()).then(t => { $('#mapSvg').innerHTML = t; view.classList.add('ready'); });
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '800px' });
    io.observe(view);
    addEventListener('load', () => setTimeout(load, 3000));  // fetch it anyway once the page has settled
  } else load();
}

/* ---------- Boot ---------- */
renderChrome();
initSearch();
initStayGrid();
initLightbox();
initServices();
renderStays();
renderServices();
renderSale();
initMap();

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
