/* =========================================================
   OWNER DASHBOARD
   ---------------------------------------------------------
   Two ways to store bookings:
   • Demo mode — bookings live in this browser only (try it out).
   • Live mode — bookings are encrypted with the owner's passphrase
     and saved to data/bookings.vault.json in the GitHub repo. Booked
     date ranges (no guest details) are published to
     data/availability.json, which the public calendar reads.
   A booking's dates are released automatically once check-out has
   passed or when it is cancelled; it stays in History either way.
   ========================================================= */

const VAULT_PATH = 'data/bookings.vault.json';
const AVAIL_PATH = 'data/availability.json';
const PBKDF2_ITERATIONS = 250000;
const SOURCES = ['Direct / WhatsApp', 'Phone call', 'Website', 'LekkeSlaap', 'Booking.com', 'Airbnb', 'Returning guest', 'Other'];

const $ = s => document.querySelector(s);
const now = new Date();
const app = {
  mode: null,           // 'demo' | 'github'
  settings: {},         // { owner, repo, branch, token, passphrase, remember }
  passphrase: null,
  bookings: [],
  shas: {},
  view: 'dashboard',
  list: { tab: 'upcoming', q: '', stay: '' },
  month: { y: now.getFullYear(), m: now.getMonth() },
};
const TODAY = todayISO();

/* ---------- Small UI helpers ---------- */
let toastTimer;
function toast(msg, bad = false, ms = 3800) {
  const t = $('#toast');
  t.innerHTML = icon(bad ? 'info' : 'check') + `<span>${esc(msg)}</span>`;
  t.classList.toggle('bad', bad);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/* Resolves false when dismissed. With `collect`, resolves to whatever it
   returns from the dialog's inputs (returning false keeps the dialog open). */
function confirmDialog({ title, text = '', body = '', ok = 'Confirm', cancel = 'Keep it', danger = false, collect = null }) {
  return new Promise(resolve => {
    const root = $('#confirmRoot');
    root.innerHTML = `<div class="confirm"><div class="confirm-card" role="alertdialog" aria-modal="true">
      <h3>${esc(title)}</h3>${text ? `<p>${text}</p>` : ''}${body}
      <div class="row"><button class="btn btn-ghost" data-v="0">${esc(cancel)}</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-v="1">${esc(ok)}</button></div></div></div>`;
    root.querySelector('[data-v="1"]').focus();
    root.onclick = e => {
      const b = e.target.closest('[data-v]');
      if (!b && !e.target.classList.contains('confirm')) return;
      let value = b ? b.dataset.v === '1' : false;
      if (value && collect) {
        value = collect(root);
        if (value === false) return;
      }
      root.innerHTML = '';
      resolve(value);
    };
  });
}

function setSync(state, text) {
  for (const el of [$('#syncSide'), $('#syncTop')]) {
    el.className = 'sync ' + state;
    el.querySelector('.txt').textContent = text;
  }
}

function uid() { return 'bk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function enrich(b) {
  return { ...b, stay: stayById(b.stayId) || { name: b.stayId, id: b.stayId, price: 0 }, status: bookingStatus(b, TODAY), nights: nightsBetween(b.checkin, b.checkout) };
}
const STATUS_LABEL = { pending: 'Pending payment', upcoming: 'Upcoming', 'in-house': 'Staying now', completed: 'Completed', expired: 'Expired request', cancelled: 'Cancelled' };
function statusLabel(b) {
  if (b.type === 'block' && b.status !== 'cancelled') return 'Blocked';
  if (b.status === 'cancelled' && b.declined) return 'Declined';
  return STATUS_LABEL[b.status];
}
function statusBadge(b) {
  const cls = b.type === 'block' && b.status !== 'cancelled' ? 'block' : b.status;
  return `<span class="badge b-${cls}">${statusLabel(b)}</span>`;
}
function pendingCount() { return app.bookings.filter(b => bookingStatus(b, TODAY) === 'pending').length; }
function hoursSince(iso) { return iso ? (Date.now() - new Date(iso).getTime()) / 3600000 : 0; }
function nextInvoiceNo() {
  const year = TODAY.slice(0, 4);
  const max = app.bookings.reduce((m, b) => {
    const hit = (b.invoiceNo || '').match(new RegExp(`^KMS-${year}-(\\d+)$`));
    return hit ? Math.max(m, Number(hit[1])) : m;
  }, 0);
  return `KMS-${year}-${String(max + 1).padStart(4, '0')}`;
}
function guestLabel(b) { return b.type === 'block' ? 'Blocked — ' + (b.notes || 'owner use') : (b.name || 'Guest'); }
function payLabel(b) {
  if (b.type === 'block') return '';
  const map = { paid: 'Paid in full', deposit: 'Deposit paid', unpaid: 'Not paid' };
  return `<span class="pay ${b.payment}">${map[b.payment] || ''}</span>`;
}
function thumb(id) { return stayImg(id, 1, true); }

/* ---------- Encoding & encryption ---------- */
function bytesToB64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64ToBytes(b64) { return Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)); }
const textToB64 = s => bytesToB64(new TextEncoder().encode(s));
const b64ToText = b => new TextDecoder().decode(b64ToBytes(b));

async function deriveKey(passphrase, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encryptVault(obj, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return { v: 1, alg: 'AES-256-GCM, PBKDF2-SHA256', iter: PBKDF2_ITERATIONS, salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(data)) };
}
async function decryptVault(vault, passphrase) {
  const key = await deriveKey(passphrase, b64ToBytes(vault.salt), vault.iter);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(vault.iv) }, key, b64ToBytes(vault.data));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch (e) {
    const err = new Error('Wrong passphrase — the bookings could not be unlocked.');
    err.code = 'passphrase';
    throw err;
  }
}

/* ---------- GitHub storage ---------- */
async function gh(path, opts = {}) {
  const { owner, repo, token } = app.settings;
  return fetch(`https://api.github.com/repos/${owner}/${repo}/${path}`, {
    cache: 'no-store',
    ...opts,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) },
  });
}
async function ghError(res) {
  let detail = '';
  try { detail = (await res.json()).message || ''; } catch (e) { /* no body */ }
  const msg = {
    401: 'GitHub rejected the access token — it may be wrong or expired.',
    403: 'The access token is not allowed to change this repository (it needs Contents: Read and write).',
    404: 'Repository not found — check the owner/name, and that the token has access to it.',
    409: 'The bookings were changed somewhere else at the same time.',
    422: 'The bookings were changed somewhere else at the same time.',
  }[res.status] || `GitHub error ${res.status}${detail ? ': ' + detail : ''}`;
  const err = new Error(msg);
  err.status = res.status;
  return err;
}
async function ghRead(path) {
  const res = await gh(`contents/${path}?ref=${encodeURIComponent(app.settings.branch)}`);
  if (res.status === 404) {
    // 404 also means "no access" — tell the two apart by checking the repo itself
    const repoRes = await gh('');
    if (!repoRes.ok) throw await ghError(repoRes);
    return null;
  }
  if (!res.ok) throw await ghError(res);
  const j = await res.json();
  let text = j.content ? b64ToText(j.content) : null;
  if (!text && j.size > 0) {   // files over 1 MB come without inline content
    const raw = await gh(`contents/${path}?ref=${encodeURIComponent(app.settings.branch)}`, { headers: { Accept: 'application/vnd.github.raw+json' } });
    if (!raw.ok) throw await ghError(raw);
    text = await raw.text();
  }
  return { text: text || '', sha: j.sha };
}
async function ghWrite(path, text, sha, message) {
  const body = { message, content: textToB64(text), branch: app.settings.branch };
  if (sha) body.sha = sha;
  const res = await gh(`contents/${path}`, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) throw await ghError(res);
  return (await res.json()).content.sha;
}

/* ---------- Load & save ---------- */
async function loadData() {
  if (app.mode === 'demo') {
    app.bookings = lsGet(LS.demoBookings, []);
    setSync('demo', 'Demo mode · this browser only');
    return;
  }
  setSync('busy', 'Loading…');
  const vault = await ghRead(VAULT_PATH);
  if (vault && vault.text.trim()) {
    const obj = await decryptVault(JSON.parse(vault.text), app.passphrase);
    app.bookings = obj.bookings || [];
  } else {
    app.bookings = [];
  }
  app.shas.vault = vault ? vault.sha : null;
  const avail = await ghRead(AVAIL_PATH);
  app.shas.avail = avail ? avail.sha : null;
  app.vaultExists = !!vault;
  setSync('ok', 'Synced with GitHub');
}

async function persist(message) {
  if (app.mode === 'demo') {
    lsSet(LS.demoBookings, app.bookings);
    return;
  }
  setSync('busy', 'Saving…');
  const vault = await encryptVault({ bookings: app.bookings, savedAt: new Date().toISOString() }, app.passphrase);
  app.shas.vault = await ghWrite(VAULT_PATH, JSON.stringify(vault) + '\n', app.shas.vault, `Bookings: ${message}`);
  app.vaultExists = true;
  const avail = JSON.stringify(computeAvailability(app.bookings, TODAY), null, 2) + '\n';
  app.shas.avail = await ghWrite(AVAIL_PATH, avail, app.shas.avail, `Availability: ${message}`);
  setSync('ok', 'Saved · website updates in ~1 min');
}

/* Apply a change, save it, and roll back if saving fails */
async function commit(mutate, message, okText) {
  const before = JSON.parse(JSON.stringify(app.bookings));
  mutate();
  try {
    await persist(message);
    render();
    if (okText) toast(okText);
    return true;
  } catch (e) {
    app.bookings = before;
    if (e.status === 409 || e.status === 422) {
      toast('Bookings were changed on another device — loaded the latest. Please try again.', true, 6000);
      try { await loadData(); } catch (e2) { /* shown below */ }
    } else {
      toast(e.message || 'Could not save — check your internet connection.', true, 6000);
      setSync('err', 'Not saved');
    }
    render();
    return false;
  }
}

/* ---------- Demo data ---------- */
function demoBookings() {
  const mk = (stayId, checkin, checkout, f) => ({
    id: uid() + Math.random().toString(36).slice(2, 4), stayId, checkin, checkout, type: 'guest', status: 'confirmed',
    adults: 2, children: 0, payment: 'deposit', source: 'Direct / WhatsApp', cancelled: false,
    createdAt: new Date(parseISO(checkin).getTime() - 20 * 86400000).toISOString(),
    log: [{ at: new Date(parseISO(checkin).getTime() - 20 * 86400000).toISOString(), text: 'Booking created' }], ...f,
  });
  return [
    mk('kruger-naledi', '2026-10-27', '2026-10-29', { name: 'Henry Kruger', phone: '082 555 0147', email: 'henry.kruger@example.com', idNumber: '8001015009087', address: 'Nelspruit, Mpumalanga', vehicle: 'Toyota Fortuner · CA 123-456', total: 3300, deposit: 1650, notes: 'Arriving around 15:00. Anniversary trip — would love a bottle of bubbly in the fridge.' }),
    mk('cheetah', '2026-10-24', '2026-10-31', { name: 'Marius van der Merwe', phone: '083 555 0192', email: 'marius.vdm@example.com', adults: 8, children: 4, total: 24500, deposit: 24500, payment: 'paid', source: 'Returning guest', vehicle: '2 vehicles', notes: 'Family reunion. Extra braai wood requested.' }),
    mk('phai-thong', '2026-10-26', '2026-10-28', { name: 'Sipho Dlamini', phone: '071 555 0133', email: 'sipho.d@example.com', total: 4400, deposit: 4400, payment: 'paid', source: 'Website' }),
    mk('waterpeer', '2026-10-29', '2026-11-02', { name: 'Anna Botha', phone: '072 555 0170', email: 'anna.botha@example.com', adults: 2, children: 2, total: 6000, deposit: 3000 }),
    mk('tarentaal', '2026-10-30', '2026-11-03', { name: 'Johan Pretorius', phone: '084 555 0116', email: 'johan.p@example.com', adults: 4, total: 7920, deposit: 0, payment: 'unpaid', source: 'LekkeSlaap' }),
    mk('porcupine', '2026-11-02', '2026-11-05', { type: 'block', name: '', notes: 'Pool pump service', payment: 'unpaid', total: 0, deposit: 0, adults: 0 }),
    mk('my-africa-chalet', '2026-11-06', '2026-11-09', { name: 'Elize Smit', phone: '079 555 0158', email: 'elize.smit@example.com', adults: 6, children: 2, total: 7500, deposit: 3750 }),
    mk('moepel', '2026-11-13', '2026-11-16', { name: 'Mark Taylor', phone: '082 555 0124', email: 'mark.taylor@example.com', total: 4800, deposit: 2400, source: 'Booking.com', notes: 'Visiting from the UK. Late arrival ~19:00.' }),
    mk('salamah', '2026-12-15', '2026-12-22', { name: 'Thandi Nkosi', phone: '073 555 0181', email: 'thandi.nkosi@example.com', adults: 4, children: 3, total: 15400, deposit: 7700 }),
    mk('indabush', '2026-12-18', '2026-12-27', { name: 'Kobus Steyn', phone: '076 555 0109', email: 'kobus.steyn@example.com', adults: 4, children: 2, total: 21600, deposit: 10800, source: 'Returning guest' }),
    mk('kruger-naledi', '2026-10-16', '2026-10-19', { name: 'Pieter de Wet', phone: '083 555 0141', email: 'pieter.dewet@example.com', total: 4950, deposit: 4950, payment: 'paid' }),
    mk('tarentaal', '2026-10-02', '2026-10-05', { name: 'Liezel Joubert', phone: '082 555 0163', email: 'liezel.j@example.com', adults: 5, total: 5940, deposit: 5940, payment: 'paid', source: 'Website' }),
    mk('elephant-bush-house', '2026-09-25', '2026-09-28', { name: 'Coetzee family', phone: '071 555 0187', email: 'coetzee@example.com', adults: 4, children: 3, total: 6900, deposit: 6900, payment: 'paid' }),
    mk('bosgenade', '2026-10-09', '2026-10-12', { name: 'Ruan Venter', phone: '084 555 0122', email: 'ruan.venter@example.com', adults: 6, total: 7800, deposit: 7800, payment: 'paid', source: 'Phone call' }),
    mk('shingwedzi', '2026-11-20', '2026-11-23', { name: 'Grant Wilson', phone: '072 555 0195', email: 'grant.w@example.com', adults: 4, total: 6900, deposit: 0, payment: 'unpaid', cancelled: true, cancelledAt: '2026-10-21T09:12:00.000Z', notes: 'Cancelled — change of travel plans.' }),
    // Requests awaiting payment — their dates are on hold
    { ...mk('bushfire-mongoose', '2026-11-20', '2026-11-23', { name: 'Zanele Mokoena', phone: '061 555 0175', email: 'zanele.m@example.com', adults: 4, total: 5850, deposit: 0, payment: 'unpaid', source: 'Website', notes: 'Asked whether the pool is heated.' }),
      status: 'pending', createdAt: new Date(Date.now() - 3 * 3600000).toISOString(), log: [{ at: new Date(Date.now() - 3 * 3600000).toISOString(), text: 'Request received — dates on hold' }] },
    { ...mk('phai-thong', '2026-12-24', '2026-12-27', { name: 'Daniel Fourie', phone: '082 555 0119', email: 'daniel.fourie@example.com', total: 6600, deposit: 0, payment: 'unpaid', source: 'Direct / WhatsApp', notes: 'Proposal trip — please keep it a surprise!' }),
      status: 'pending', invoiceNo: 'KMS-2026-0001', createdAt: new Date(Date.now() - 52 * 3600000).toISOString(), log: [{ at: new Date(Date.now() - 52 * 3600000).toISOString(), text: 'Request received — dates on hold' }, { at: new Date(Date.now() - 50 * 3600000).toISOString(), text: 'Invoice KMS-2026-0001 issued' }] },
  ];
}

/* ---------- Sign-in / setup ---------- */
function renderAuth(step = 'start', error = '') {
  $('#shell').classList.add('hidden');
  const auth = $('#auth');
  auth.classList.remove('hidden');
  const s = { owner: SITE.repo.owner, repo: SITE.repo.name, branch: SITE.repo.branch, ...lsGet(LS.settings, {}) };
  const unlockOnly = step === 'unlock';
  const confirmNew = step === 'confirm';
  auth.innerHTML = `
    <div class="auth-card">
      <img class="logo" src="logo.jpg" alt="" />
      <h1 class="serif">Owner dashboard</h1>
      <p>${confirmNew ? 'No bookings saved yet. Confirm your passphrase to create the secure bookings file.'
        : unlockOnly ? 'Enter your passphrase to unlock the bookings.' : 'Manage bookings, blocked dates and guest history.'}</p>
      ${error ? `<div class="err" style="margin-bottom:14px">${esc(error)}</div>` : ''}
      <form id="authForm" autocomplete="off">
        ${unlockOnly || confirmNew ? '' : `
        <div class="field"><label for="aToken">GitHub access token</label>
          <input id="aToken" type="password" value="${esc(s.token || '')}" placeholder="github_pat_…" required />
          <span class="hint">A fine-grained token with <b>Contents: Read and write</b> on the website repository.</span></div>`}
        <div class="field"><label for="aPass">${confirmNew ? 'Passphrase' : 'Bookings passphrase'}</label>
          <input id="aPass" type="password" value="${confirmNew ? esc(app.passphrase || '') : ''}" required minlength="8" autocomplete="current-password" />
          ${unlockOnly ? '' : '<span class="hint">Encrypts guest details. Use at least 8 characters — if it is lost, the bookings cannot be recovered.</span>'}</div>
        ${confirmNew ? `<div class="field"><label for="aPass2">Type the passphrase again</label><input id="aPass2" type="password" required /></div>` : ''}
        ${unlockOnly || confirmNew ? '' : `
        <label class="check"><input type="checkbox" id="aRemember" ${s.remember === false ? '' : 'checked'} /> Keep me signed in on this device</label>
        <details class="adv"><summary>Repository settings</summary>
          <div class="grid3">
            <div class="field"><label for="aOwner">Owner</label><input id="aOwner" value="${esc(s.owner)}" /></div>
            <div class="field"><label for="aRepo">Repository</label><input id="aRepo" value="${esc(s.repo)}" /></div>
            <div class="field"><label for="aBranch">Branch</label><input id="aBranch" value="${esc(s.branch)}" /></div>
          </div>
        </details>`}
        <button class="btn btn-primary btn-block" type="submit" id="aSubmit">${icon(confirmNew ? 'check' : 'lock')}${confirmNew ? 'Create & open dashboard' : unlockOnly ? 'Unlock' : 'Connect & sign in'}</button>
        ${unlockOnly || confirmNew ? `<button class="btn btn-ghost btn-block" type="button" id="aReset">Use a different token</button>` : ''}
      </form>
      ${unlockOnly || confirmNew ? '' : `
      <div class="auth-or">or</div>
      <button class="btn btn-ghost btn-block" id="aDemo">${icon('star')}Try the demo (no setup)</button>
      <p class="auth-note">Demo mode keeps sample bookings in this browser only, so you can try everything safely. Switch to live mode later from Settings.</p>`}
    </div>`;

  const form = $('#authForm');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#aSubmit');
    btn.disabled = true;
    btn.innerHTML = icon('refresh') + 'Connecting…';
    const pass = $('#aPass').value;
    if (confirmNew) {
      if (pass !== $('#aPass2').value) { renderAuth('confirm', 'The passphrases do not match.'); return; }
      app.passphrase = pass;
      saveLocalSettings();
      try { await persist('create secure bookings file'); enterShell(); } catch (err) { renderAuth('confirm', err.message); }
      return;
    }
    if (!unlockOnly) {
      app.settings = {
        token: $('#aToken').value.trim(),
        owner: $('#aOwner').value.trim(), repo: $('#aRepo').value.trim(), branch: $('#aBranch').value.trim() || 'main',
        remember: $('#aRemember').checked,
      };
    }
    app.passphrase = pass;
    app.mode = 'github';
    try {
      await loadData();
      if (!app.vaultExists) { renderAuth('confirm'); return; }
      saveLocalSettings();
      enterShell();
    } catch (err) {
      if (err.code === 'passphrase') renderAuth(unlockOnly ? 'unlock' : 'start', err.message);
      else renderAuth(unlockOnly ? 'unlock' : 'start', err.message || 'Could not connect to GitHub.');
    }
  });
  const reset = $('#aReset');
  if (reset) reset.onclick = () => { forgetDevice(); renderAuth('start'); };
  const demo = $('#aDemo');
  if (demo) demo.onclick = enterDemo;
}

function saveLocalSettings() {
  const { token, owner, repo, branch, remember } = app.settings;
  lsSet(LS.mode, 'github');
  lsSet(LS.settings, remember
    ? { token, owner, repo, branch, remember, passphrase: app.passphrase }
    : { owner, repo, branch, remember });
}
function forgetDevice() {
  const s = lsGet(LS.settings, {});
  lsSet(LS.settings, { owner: s.owner, repo: s.repo, branch: s.branch });
  lsDel(LS.mode);
  app.settings = {}; app.passphrase = null; app.mode = null; app.bookings = [];
}

async function enterDemo() {
  app.mode = 'demo';
  lsSet(LS.mode, 'demo');
  if (!lsGet(LS.demoBookings)) lsSet(LS.demoBookings, demoBookings());
  await loadData();
  enterShell();
  toast('Demo mode — sample bookings, saved in this browser only.');
}

function enterShell() {
  $('#auth').classList.add('hidden');
  $('#shell').classList.remove('hidden');
  if (app.mode === 'demo') setSync('demo', 'Demo mode · this browser only');
  render();
}

/* ---------- Navigation ---------- */
const NAV = [
  ['dashboard', 'home', 'Dashboard'],
  ['calendar', 'calendar', 'Calendar'],
  ['bookings', 'history', 'Bookings'],
  ['settings', 'settings', 'Settings'],
];
function renderNav() {
  const pending = pendingCount();
  const badge = id => id === 'bookings' && pending ? `<span class="nav-count" title="${pending} pending">${pending}</span>` : '';
  $('#sideNav').innerHTML = NAV.slice(0, 3).map(([id, ic, label]) => `<button class="${app.view === id ? 'on' : ''}" data-view="${id}">${icon(ic)}${label}${badge(id)}</button>`).join('')
    + `<button class="cta" data-new>${icon('plus')}New booking</button>`
    + NAV.slice(3).map(([id, ic, label]) => `<button class="${app.view === id ? 'on' : ''}" data-view="${id}">${icon(ic)}${label}</button>`).join('');
  $('#bottomNav').innerHTML = [NAV[0], NAV[1], null, NAV[2], NAV[3]].map(n => n
    ? `<button class="${app.view === n[0] ? 'on' : ''}" data-view="${n[0]}">${icon(n[1])}${n[2]}${badge(n[0])}</button>`
    : `<button class="add" data-new aria-label="New booking"><span class="plus">${icon('plus')}</span>New</button>`).join('');
  $('#viewSite').innerHTML = icon('home') + 'View website';
  $('#signOutSide').innerHTML = icon('logout') + (app.mode === 'demo' ? 'Leave demo' : 'Sign out');
}
function go(view) {
  app.view = view;
  render();
  window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const v = e.target.closest('[data-view]');
  if (v) return go(v.dataset.view);
  if (e.target.closest('[data-new]')) return openForm(null);
  const bk = e.target.closest('[data-booking]');
  if (bk) return openDetail(bk.dataset.booking);
});

function render() {
  if ($('#shell').classList.contains('hidden')) return;
  renderNav();
  const views = { dashboard: renderDashboard, calendar: renderCalendar, bookings: renderBookings, settings: renderSettings };
  $('#view').innerHTML = (app.mode === 'demo' ? `<div class="demo-banner">${icon('info')}<span><b>Demo mode.</b> Sample bookings saved in this browser only — the public website shows them only in this browser too.</span><button class="btn btn-sm btn-ghost" data-view="settings">Go live</button></div>` : '')
    + views[app.view]();
  if (app.view === 'calendar') afterCalendar();
  if (app.view === 'bookings') afterBookings();
  if (app.view === 'settings') afterSettings();
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const all = app.bookings.map(enrich);
  const active = all.filter(b => b.status !== 'cancelled');
  const pending = all.filter(b => b.status === 'pending').sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const guests = active.filter(b => b.type !== 'block' && b.status !== 'pending' && b.status !== 'expired');
  const inHouse = guests.filter(b => b.status === 'in-house').sort((a, b) => a.checkout.localeCompare(b.checkout));
  const in7 = addDays(TODAY, 7);
  const arrivals = guests.filter(b => b.checkin >= TODAY && b.checkin <= in7).sort((a, b) => a.checkin.localeCompare(b.checkin));
  const upcoming = guests.filter(b => b.status === 'upcoming').sort((a, b) => a.checkin.localeCompare(b.checkin)).slice(0, 6);
  const arriveToday = guests.filter(b => b.checkin === TODAY);
  const departToday = guests.filter(b => b.checkout === TODAY);

  // Occupancy & revenue for the current month
  const mStart = toISO(new Date(now.getFullYear(), now.getMonth(), 1));
  const mEnd = toISO(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const daysInMonth = nightsBetween(mStart, mEnd);
  let nightsBooked = 0;
  for (const b of guests) {
    const s = b.checkin > mStart ? b.checkin : mStart, e = b.checkout < mEnd ? b.checkout : mEnd;
    if (s < e) nightsBooked += nightsBetween(s, e);
  }
  const occupancy = Math.round((nightsBooked / (STAYS.length * daysInMonth)) * 100);
  const revenue = guests.filter(b => b.checkin >= mStart && b.checkin < mEnd).reduce((t, b) => t + (Number(b.total) || 0), 0);
  const occupiedTonight = new Set(active.filter(b => b.checkin <= TODAY && b.checkout > TODAY).map(b => b.stayId));
  const freeTonight = STAYS.filter(s => !occupiedTonight.has(s.id));

  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const row = (b, when) => `<li data-booking="${b.id}"><img src="${thumb(b.stayId)}" alt="" />
      <div class="who"><strong>${esc(guestLabel(b))}</strong><span>${esc(b.stay.name)}</span></div>
      <div class="when">${when}</div></li>`;

  return `
    <div class="page-head"><div><h1>${greet}, ${esc(SITE.contactName)}</h1><p>${fmtDate(TODAY)} · ${STAYS.length} properties</p></div>
      <div class="page-actions"><button class="btn btn-sun" data-new>${icon('plus')}New booking</button></div></div>
    <div class="stats">
      <div class="panel stat ${pending.length ? 'attn' : ''}" data-view-pending style="cursor:pointer"><span class="label">${icon('hourglass')}Pending requests</span><strong>${pending.length}</strong><small>${pending.length ? 'dates on hold · awaiting payment' : 'nothing waiting'}</small></div>
      <div class="panel stat"><span class="label">${icon('home')}Staying now</span><strong>${inHouse.length}</strong><small>${inHouse.reduce((t, b) => t + (+b.adults || 0) + (+b.children || 0), 0)} guests · ${departToday.length} leaving today</small></div>
      <div class="panel stat"><span class="label">${icon('calendar')}Arrivals · 7 days</span><strong>${arrivals.length}</strong><small>${arriveToday.length} arriving today</small></div>
      <div class="panel stat"><span class="label">${icon('grid')}Occupancy · ${MONTHS[now.getMonth()]}</span><strong>${occupancy}%</strong><small>${nightsBooked} of ${STAYS.length * daysInMonth} nights</small></div>
      <div class="panel stat"><span class="label">${icon('star')}Bookings value · ${MONTHS[now.getMonth()].slice(0, 3)}</span><strong>${money(revenue)}</strong><small>by check-in date</small></div>
    </div>
    <div class="dash-grid">
      <div class="dash-col">
        ${pending.length ? `<div class="panel panel-attn"><div class="panel-head"><h2>${icon('hourglass')} Pending requests · ${pending.length}</h2><button class="link" data-view-pending>View all</button></div>
          <ul class="mini-list">${pending.map(b => {
            const overdue = hoursSince(b.createdAt) > BUSINESS.holdHours;
            return row(b, `<strong>${fmtRange(b.checkin, b.checkout)}</strong><span class="${overdue ? 'overdue' : ''}">${overdue ? `Hold over ${BUSINESS.holdHours}h — follow up` : b.invoiceNo ? 'Invoice sent · awaiting payment' : 'Send invoice'}</span>`);
          }).join('')}</ul>
        </div>` : ''}
        <div class="panel"><div class="panel-head"><h2>Staying now</h2><button class="link" data-view="calendar">Open calendar</button></div>
          ${inHouse.length ? `<ul class="mini-list">${inHouse.map(b => row(b, `<strong>Out ${fmtDate(b.checkout, false)}</strong>${b.nights} nights`)).join('')}</ul>` : '<div class="empty">No guests in house tonight.</div>'}
        </div>
        <div class="panel"><div class="panel-head"><h2>Upcoming arrivals</h2><button class="link" data-view="bookings">All bookings</button></div>
          ${upcoming.length ? `<ul class="mini-list">${upcoming.map(b => row(b, `<strong>${fmtDate(b.checkin, false)}</strong>${b.nights} nights`)).join('')}</ul>` : '<div class="empty">No upcoming bookings yet.</div>'}
        </div>
      </div>
      <div class="dash-col">
        <div class="panel"><div class="panel-head"><h2>Today</h2><span style="font-size:.8rem;color:var(--muted)">${fmtDate(TODAY)}</span></div>
          ${arriveToday.length || departToday.length ? `<ul class="mini-list">
            ${arriveToday.map(b => row(b, `<strong style="color:var(--ok)">Arriving</strong>${DEFAULT_RULES.checkIn}`)).join('')}
            ${departToday.map(b => row(b, `<strong style="color:var(--sun-dark)">Leaving</strong>${DEFAULT_RULES.checkOut}`)).join('')}
          </ul>` : '<div class="empty">No arrivals or departures today.</div>'}
        </div>
        <div class="panel"><div class="panel-head"><h2>Free tonight · ${freeTonight.length}</h2></div>
          <div class="free-list">${freeTonight.map(s => `<span data-quick="${s.id}" title="Book ${esc(s.name)} from tonight">${esc(s.name)}</span>`).join('') || '<span style="background:var(--danger-bg);color:var(--danger)">Fully booked tonight</span>'}</div>
        </div>
      </div>
    </div>`;
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-view-pending]')) { app.list.tab = 'pending'; return go('bookings'); }
  const q = e.target.closest('[data-quick]');
  if (q) openForm(null, { stayId: q.dataset.quick, checkin: TODAY, checkout: addDays(TODAY, 2) });
});

/* ---------- Calendar planner ---------- */
function renderCalendar() {
  const { y, m } = app.month;
  const n = new Date(y, m + 1, 0).getDate();
  const mStart = toISO(new Date(y, m, 1)), mEnd = toISO(new Date(y, m + 1, 1));
  const days = Array.from({ length: n }, (_, i) => toISO(new Date(y, m, i + 1)));
  const isWe = iso => [0, 6].includes(parseISO(iso).getDay());
  const active = app.bookings.map(enrich).filter(b => b.status !== 'cancelled' && b.checkin < mEnd && b.checkout > mStart);

  const rows = STAYS.map(s => {
    const cells = days.map((d, i) => `<div class="pl-cell ${isWe(d) ? 'we' : ''} ${d === TODAY ? 'today' : ''}" style="grid-column:${i + 1}" data-cell="${s.id}|${d}" title="${esc(s.name)} · ${fmtDate(d)}"></div>`).join('');
    const bars = active.filter(b => b.stayId === s.id).map(b => {
      const from = b.checkin > mStart ? b.checkin : mStart;
      const to = b.checkout < mEnd ? b.checkout : mEnd;
      const c1 = parseISO(from).getDate();
      const c2 = to === mEnd ? n + 1 : parseISO(to).getDate();
      const cls = [b.type === 'block' ? 'block' : b.status, b.checkin < mStart && 'cont-l', b.checkout > mEnd && 'cont-r'].filter(Boolean).join(' ');
      return `<div class="pl-bar ${cls}" style="grid-column:${c1} / ${c2}" data-booking="${b.id}" title="${esc(guestLabel(b))} · ${fmtRange(b.checkin, b.checkout)}">
        <strong>${b.status === 'pending' ? 'On hold · ' : ''}${esc(guestLabel(b))}</strong><span>${b.nights}n ·${fmtDate(b.checkin, false).slice(4)} – ${fmtDate(b.checkout, false).slice(4)}</span></div>`;
    }).join('');
    return `<div class="pl-name"><img src="${thumb(s.id)}" alt="" /><span>${esc(s.name)}</span></div><div class="pl-row">${cells}${bars}</div>`;
  }).join('');

  return `
    <div class="page-head"><div><h1>Calendar</h1><p>Every property at a glance — click an empty day to book it, or a booking to see the guest.</p></div>
      <div class="planner-tools">
        <button class="icon-btn" data-month="-1" aria-label="Previous month">${icon('left')}</button>
        <strong>${MONTHS[m]} ${y}</strong>
        <button class="icon-btn" data-month="1" aria-label="Next month">${icon('right')}</button>
        <button class="btn btn-ghost btn-sm" data-month="0">Today</button>
      </div></div>
    <div class="panel planner" id="planner" style="--n:${n}">
      <div class="pl-table">
        <div class="pl-corner">Property</div>
        <div class="pl-days">${days.map(d => `<div class="pl-day ${isWe(d) ? 'we' : ''} ${d === TODAY ? 'today' : ''}">${DAYS[parseISO(d).getDay()].slice(0, 2)}<b>${parseISO(d).getDate()}</b></div>`).join('')}</div>
        ${rows}
      </div>
    </div>
    <div class="legend">
      <span><i style="background:#fbefdc;border:1.5px dashed #c98a3c"></i>Pending payment (on hold)</span><span><i style="background:#3c6e9b"></i>Upcoming</span><span><i style="background:var(--bush)"></i>Staying now</span>
      <span><i style="background:#a39a8c"></i>Completed (dates released)</span><span><i style="background:repeating-linear-gradient(-45deg,#c98a3c 0 3px,#b97b30 3px 6px)"></i>Blocked</span>
    </div>`;
}
function afterCalendar() {
  const pl = $('#planner');
  const { y, m } = app.month;
  if (y === now.getFullYear() && m === now.getMonth()) {
    const day = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--day')) || 40;
    pl.scrollLeft = Math.max(0, (now.getDate() - 4) * day);
  }
  pl.onclick = e => {
    const c = e.target.closest('[data-cell]');
    if (c && !e.target.closest('[data-booking]')) {
      const [stayId, d] = c.dataset.cell.split('|');
      openForm(null, { stayId, checkin: d, checkout: addDays(d, 2) });
    }
  };
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-month]');
  if (!b) return;
  const dir = Number(b.dataset.month);
  if (dir === 0) app.month = { y: now.getFullYear(), m: now.getMonth() };
  else {
    let { y, m } = app.month;
    m += dir;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    app.month = { y, m };
  }
  render();
});

/* ---------- Bookings list ---------- */
const TABS = [['pending', 'Pending'], ['upcoming', 'Upcoming'], ['in-house', 'Staying now'], ['completed', 'History'], ['cancelled', 'Cancelled'], ['all', 'All']];
/* History also holds requests that expired without payment */
const inTab = (status, tab) => tab === 'all' || status === tab || (tab === 'completed' && status === 'expired');
function filteredBookings() {
  const { tab, q, stay } = app.list;
  const needle = q.trim().toLowerCase();
  let list = app.bookings.map(enrich).filter(b =>
    inTab(b.status, tab) &&
    (!stay || b.stayId === stay) &&
    (!needle || [b.name, b.phone, b.email, b.stay.name, b.notes, b.idNumber].join(' ').toLowerCase().includes(needle)));
  const asc = tab === 'upcoming' || tab === 'in-house' || tab === 'pending';
  list.sort((a, b) => asc ? a.checkin.localeCompare(b.checkin) : b.checkin.localeCompare(a.checkin));
  return list;
}
function renderBookings() {
  const statuses = app.bookings.map(b => bookingStatus(b, TODAY));
  const counts = Object.fromEntries(TABS.map(([id]) => [id, statuses.filter(s => inTab(s, id)).length]));
  return `
    <div class="page-head"><div><h1>Bookings</h1><p>Who is booked where, and full guest history.</p></div>
      <div class="page-actions"><button class="btn btn-ghost" id="csvBtn">${icon('download')}Export CSV</button><button class="btn btn-sun" data-new>${icon('plus')}New booking</button></div></div>
    <div class="panel">
      <div class="list-tools" style="padding-bottom:10px">
        <div class="tabs">${TABS.map(([id, l]) => `<button class="${app.list.tab === id ? 'on' : ''}" data-tab="${id}">${l}<span class="n">${counts[id] || 0}</span></button>`).join('')}</div>
      </div>
      <div class="list-tools">
        <label class="search">${icon('search')}<input id="listQ" type="search" placeholder="Search guest, phone, email or property" value="${esc(app.list.q)}" /></label>
        <select id="listStay"><option value="">All properties</option>${STAYS.map(s => `<option value="${s.id}" ${app.list.stay === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      </div>
      <div id="listBody"></div>
    </div>`;
}
function renderListBody() {
  const list = filteredBookings();
  const total = list.filter(b => b.type !== 'block' && b.status !== 'cancelled').reduce((t, b) => t + (Number(b.total) || 0), 0);
  $('#listBody').innerHTML = list.length ? `
    <table class="btable">
      <thead><tr><th>Dates</th><th>Property</th><th>Guest</th><th>Party</th><th class="num">Amount</th><th>Status</th></tr></thead>
      <tbody>${list.map(b => `
        <tr data-booking="${b.id}">
          <td class="c-dates"><strong>${fmtRange(b.checkin, b.checkout)}</strong><span class="sub">${b.nights} night${b.nights === 1 ? '' : 's'}</span></td>
          <td class="c-prop"><div class="prop"><img src="${thumb(b.stayId)}" alt="" /><span>${esc(b.stay.name)}</span></div></td>
          <td class="c-guest"><strong>${esc(guestLabel(b))}</strong><span class="sub">${esc(b.phone || '')}</span></td>
          <td class="c-guests">${b.type === 'block' ? '—' : `${b.adults || 0} adult${b.adults == 1 ? '' : 's'}${+b.children ? `, ${b.children} child${b.children == 1 ? '' : 'ren'}` : ''}`}</td>
          <td class="num">${b.type === 'block' ? '' : `<strong>${money(b.total)}</strong><span class="sub">${payLabel(b)}</span>`}</td>
          <td>${statusBadge(b)}</td>
        </tr>`).join('')}</tbody>
    </table>
    <div class="list-foot"><span>${list.length} booking${list.length === 1 ? '' : 's'}</span><span>Total value ${money(total)}</span></div>`
    : `<div class="empty">${app.list.q || app.list.stay ? 'No bookings match your search.' : 'Nothing here yet.'}</div>`;
}
function afterBookings() {
  renderListBody();
  $('#view').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { app.list.tab = b.dataset.tab; render(); });
  $('#listQ').oninput = e => { app.list.q = e.target.value; renderListBody(); };
  $('#listStay').onchange = e => { app.list.stay = e.target.value; renderListBody(); };
  $('#csvBtn').onclick = () => exportCSV(filteredBookings());
}

/* ---------- Booking detail ---------- */
function openDrawer(html) {
  const d = $('#drawer');
  d.innerHTML = html;
  d.classList.add('open');
  $('#scrim').classList.add('open');
  document.body.classList.add('locked');
}
function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#scrim').classList.remove('open');
  document.body.classList.remove('locked');
}
$('#scrim').onclick = closeDrawer;
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || $('#confirmRoot').innerHTML) return;
  if ($('#invoiceRoot').innerHTML) $('#invoiceRoot').innerHTML = '';
  else closeDrawer();
});

function openDetail(id) {
  const raw = app.bookings.find(x => x.id === id);
  if (!raw) return;
  const b = enrich(raw);
  const guest = b.type !== 'block';
  const dl = rows => `<dl class="dl">${rows.filter(r => r[1] !== '' && r[1] != null).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  openDrawer(`
    <div class="drawer-head"><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button><h2>${guest ? 'Booking' : 'Blocked dates'}</h2>${statusBadge(b)}</div>
    <div class="drawer-body">
      <div class="bd-hero"><img src="${stayImg(b.stayId, 1)}" alt="" /><div><strong>${esc(b.stay.name)}</strong>${esc(guestLabel(b))}</div></div>
      <div class="bd-dates">
        <div><small>Check-in</small><strong>${fmtDate(b.checkin)}</strong></div>
        <div class="nights">${icon('right')}${b.nights} night${b.nights === 1 ? '' : 's'}</div>
        <div><small>Check-out</small><strong>${fmtDate(b.checkout)}</strong></div>
      </div>
      ${b.status === 'pending' ? (hoursSince(b.createdAt) > BUSINESS.holdHours
        ? `<div class="alert warn" style="margin:-6px 0 18px">${icon('hourglass')}<span><b>The ${BUSINESS.holdHours}-hour hold has passed.</b> Follow up with the guest, then confirm the payment or decline to release the dates.</span></div>`
        : `<div class="alert warn" style="margin:-6px 0 18px">${icon('hourglass')}<span><b>Awaiting payment</b> — these dates show as on hold on the website. ${b.invoiceNo ? `Invoice ${esc(b.invoiceNo)} issued.` : 'Send the invoice next.'} Confirm once the money is in the account.</span></div>`) : ''}
      ${b.status === 'expired' ? `<div class="alert bad" style="margin:-6px 0 18px">${icon('hourglass')}<span>This request was never confirmed and its dates have passed.</span></div>` : ''}
      ${b.status === 'completed' ? `<div class="alert good" style="margin:-6px 0 18px">${icon('check')}<span>Stay completed — these dates were released automatically after check-out.</span></div>` : ''}
      ${b.status === 'cancelled' ? `<div class="alert bad" style="margin:-6px 0 18px">${icon('ban')}<span>${b.declined ? 'Request declined' : 'Cancelled'}${b.cancelledAt ? ' on ' + fmtDate(b.cancelledAt.slice(0, 10)) : ''} — the dates are open for new bookings.</span></div>` : ''}
      ${guest ? `
      <div class="fsec"><h3>${icon('users')}Guest</h3>
        ${dl([
          ['Name', `<strong>${esc(b.name)}</strong>`],
          ['Phone', b.phone ? esc(b.phone) : ''],
          ['Email', b.email ? esc(b.email) : ''],
          ['ID / passport', esc(b.idNumber || '')],
          ['Address', esc(b.address || '')],
          ['Vehicle', esc(b.vehicle || '')],
          ['Party', `${b.adults || 0} adult${b.adults == 1 ? '' : 's'}, ${b.children || 0} child${b.children == 1 ? '' : 'ren'}`],
        ])}
        <div class="contact-row">
          ${b.phone ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${waHref(b.phone, `Hi ${b.name.split(' ')[0]}, this is ${SITE.contactName} from Kruger Marloth Bookings regarding your stay at ${b.stay.name} (${fmtRange(b.checkin, b.checkout)}).`)}">${icon('whatsapp')}WhatsApp</a>
          <a class="btn btn-ghost btn-sm" href="${telHref(b.phone)}">${icon('phone')}Call</a>` : ''}
          ${b.email ? `<a class="btn btn-ghost btn-sm" href="mailto:${esc(b.email)}">${icon('mail')}Email</a>` : ''}
        </div>
        ${b.phone && b.payment !== 'paid' && ['pending', 'upcoming', 'in-house'].includes(b.status) ? `
        <div class="contact-row"><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${waHref(b.phone, paymentMessage(b))}">${icon('money')}WhatsApp payment details</a></div>` : ''}
      </div>
      <div class="fsec"><h3>${icon('star')}Payment</h3>
        ${dl([
          ['Invoice no.', esc(b.invoiceNo || '')],
          ['Total', `<strong>${money(b.total)}</strong>`],
          ['Deposit received', money(b.deposit)],
          ['Balance due', money(Math.max(0, (Number(b.total) || 0) - (Number(b.deposit) || 0)))],
          ['Status', payLabel(b)],
          ['Booked via', esc(b.source || '')],
        ])}
      </div>` : ''}
      ${b.notes ? `<div class="fsec"><h3>${icon('file')}${guest ? 'Notes' : 'Reason'}</h3><p style="font-size:.9rem;white-space:pre-wrap">${esc(b.notes)}</p></div>` : ''}
      <div class="fsec"><h3>${icon('history')}History</h3>
        <ul class="log">${(b.log || []).slice().reverse().map(l => `<li><span>${fmtDate(l.at.slice(0, 10))} ${l.at.slice(11, 16)} — ${esc(l.text)}</span></li>`).join('') || '<li>No history recorded.</li>'}</ul>
      </div>
    </div>
    <div class="drawer-foot">
      ${b.status === 'cancelled'
        ? `<button class="btn btn-ghost" data-act="restore">${icon('refresh')}Restore</button><span class="spacer"></span><button class="btn btn-danger" data-act="delete">${icon('trash')}Delete permanently</button>`
        : b.status === 'pending'
        ? `<button class="btn btn-primary" data-act="confirm">${icon('check')}Confirm payment</button>
           <button class="btn btn-ghost" data-act="invoice">${icon('invoice')}Invoice</button>
           <button class="btn btn-ghost" data-act="edit" aria-label="Edit">${icon('edit')}</button>
           <span class="spacer"></span>
           <button class="btn btn-danger" data-act="decline">${icon('ban')}Decline</button>`
        : `<button class="btn btn-primary" data-act="edit">${icon('edit')}Edit</button>
           ${guest ? `<button class="btn btn-ghost" data-act="invoice">${icon('invoice')}Invoice</button>` : ''}
           <span class="spacer"></span>
           ${b.status === 'completed' || b.status === 'expired' ? `<button class="btn btn-danger" data-act="delete">${icon('trash')}Delete</button>`
             : `<button class="btn btn-danger" data-act="cancel">${icon('ban')}${guest ? 'Cancel booking' : 'Remove block'}</button>`}`}
    </div>`);

  $('#drawer').onclick = async e => {
    if (e.target.closest('[data-close]')) return closeDrawer();
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'edit') return openForm(raw);
    if (a === 'invoice') return openInvoice(raw);
    if (a === 'confirm') {
      const total = Number(b.total) || b.stay.price * b.nights;
      const suggested = Number(b.deposit) || Math.round(total * BUSINESS.depositPercent / 100);
      const res = await confirmDialog({
        title: 'Confirm payment received',
        text: `${esc(b.name)} · ${esc(b.stay.name)} · ${fmtRange(b.checkin, b.checkout)}. Only confirm once the money shows in the bank account.`,
        body: `<div class="grid2" style="margin-bottom:18px">
            <div class="field"><label for="cpKind">Payment</label><select id="cpKind"><option value="deposit">Deposit</option><option value="paid">Paid in full</option></select></div>
            <div class="field"><label for="cpAmt">Amount received (R)</label><input id="cpAmt" type="number" min="0" step="10" value="${suggested}" /></div>
          </div>`,
        ok: 'Confirm & book dates',
        collect: root => {
          const kind = root.querySelector('#cpKind').value;
          const amt = kind === 'paid' ? total : Number(root.querySelector('#cpAmt').value);
          if (!(amt > 0)) { root.querySelector('#cpAmt').focus(); return false; }
          return { kind, amt };
        },
      });
      if (!res) return;
      const saved = await commit(() => {
        Object.assign(raw, { status: 'confirmed', payment: res.kind, deposit: res.amt, total: raw.total || total, confirmedAt: new Date().toISOString() });
        (raw.log = raw.log || []).push({ at: raw.confirmedAt, text: `Payment confirmed — ${money(res.amt)} received (${res.kind === 'paid' ? 'paid in full' : 'deposit'}). Dates booked.` });
      }, `confirm ${b.stay.name} ${b.checkin}`, `Confirmed — ${b.stay.name} is booked for ${fmtRange(b.checkin, b.checkout)}.`);
      if (saved) openDetail(id);
    }
    if (a === 'cancel' || a === 'decline') {
      const decline = a === 'decline';
      const paid = Number(b.deposit) || 0;
      const res = await confirmDialog({
        title: decline ? 'Decline this request?' : guest ? 'Cancel this booking?' : 'Remove this block?',
        text: `${esc(guestLabel(b))} · ${esc(b.stay.name)} · ${fmtRange(b.checkin, b.checkout)}.<br><br>The dates are released immediately and the ${decline ? 'request' : 'booking'} stays in history.`,
        body: guest ? refundCheckHtml(paid) : '',
        ok: decline ? 'Decline request' : guest ? 'Cancel booking' : 'Remove block', danger: true,
        collect: guest ? refundCollect(paid) : null,
      });
      if (!res) return;
      const saved = await commit(() => {
        raw.cancelled = true; raw.cancelledAt = new Date().toISOString();
        if (decline) raw.declined = true;
        const refund = res.refund ? ` ${res.refund}.` : '';
        (raw.log = raw.log || []).push({ at: raw.cancelledAt, text: (decline ? 'Request declined — dates released.' : guest ? 'Booking cancelled — dates released.' : 'Block removed — dates released.') + refund });
      }, `${decline ? 'decline' : 'cancel'} ${b.stay.name} ${b.checkin}`, decline ? 'Request declined — the dates are open again.' : 'Cancelled — the dates are open again.');
      if (saved) openDetail(id);
    }
    if (a === 'restore') {
      const clash = findConflict(raw.stayId, raw.checkin, raw.checkout, raw.id);
      if (clash) { toast(`Can't restore — ${guestLabel(clash)} is now booked on some of these dates.`, true, 6000); return; }
      const saved = await commit(() => {
        raw.cancelled = false; delete raw.cancelledAt; delete raw.declined;
        (raw.log = raw.log || []).push({ at: new Date().toISOString(), text: 'Booking restored' });
      }, `restore ${b.stay.name} ${b.checkin}`, 'Booking restored.');
      if (saved) openDetail(id);
    }
    if (a === 'delete') {
      const ok = await confirmDialog({ title: 'Delete permanently?', text: 'This removes the booking and its history completely. To keep a record, cancel it instead.', ok: 'Delete', danger: true });
      if (!ok) return;
      if (await commit(() => { app.bookings = app.bookings.filter(x => x.id !== id); }, `delete ${b.stay.name} ${b.checkin}`, 'Booking deleted.')) closeDrawer();
    }
  };
}

/* ---------- Refund reminder ----------
   Declining or cancelling never moves money. If anything was paid, the
   refund has to be done by hand (EFT), so the owner must tick it off. */
function refundCheckHtml(paid) {
  return `${paid > 0 ? `<div class="alert warn" style="margin:-6px 0 12px">${icon('money')}<span><b>${money(paid)} was recorded as received.</b> Refund whatever is due under the cancellation policy by EFT — the dashboard doesn't send money back.</span></div>` : ''}
    <label class="check" style="margin-bottom:18px"><input type="checkbox" id="rfOk" />
      <span>${paid > 0 ? 'The refund is paid, or no refund is due under the cancellation policy' : 'I’ve checked that no payment was received from the guest'}</span></label>`;
}
function refundCollect(paid) {
  return root => {
    const box = root.querySelector('#rfOk');
    if (!box.checked) { box.closest('label').classList.add('need'); return false; }
    return { refund: paid > 0 ? `Refund checked (${money(paid)} had been received)` : 'No payment had been received' };
  };
}

/* ---------- Payment details & invoice ---------- */
function bookingAmounts(b) {
  const nights = nightsBetween(b.checkin, b.checkout);
  const stay = stayById(b.stayId);
  const total = Number(b.total) || (stay ? stay.price * nights : 0);
  const received = b.payment === 'paid' ? total : Number(b.deposit) || 0;
  const deposit = Math.round(total * BUSINESS.depositPercent / 100);
  return { nights, total, received, deposit, balance: Math.max(0, total - received), stay };
}
function paymentMessage(b) {
  const { total, received, deposit, balance, stay } = bookingAmounts(b);
  const ref = b.invoiceNo || b.name;
  const due = received > 0 ? `Balance due: ${money(balance)} by ${fmtDate(addDays(b.checkin, -BUSINESS.balanceDaysBefore))}` : `Deposit to secure the booking: ${money(deposit)} (${BUSINESS.depositPercent}%) within ${BUSINESS.holdHours} hours`;
  const k = BUSINESS.bank;
  return [
    `Hi ${b.name.split(' ')[0]}, thank you for booking *${stay.name}* for ${fmtRange(b.checkin, b.checkout)}.`, '',
    `Total: ${money(total)}`, due, '',
    '*Banking details*', `Bank: ${k.bank}`, `Account name: ${k.accountName}`, `Account no: ${k.accountNumber}`, `Branch code: ${k.branchCode}`, `Reference: ${ref}`, '',
    'Please send proof of payment to this number. Your dates are held until then.', `— ${SITE.contactName}, ${SITE.name}`,
  ].join('\n');
}

/* Shown in an in-page viewer (pop-ups are often blocked on phones).
   Placeholder business/bank details are highlighted on the invoice itself. */
async function openInvoice(raw) {
  if (!raw.invoiceNo) {
    const no = nextInvoiceNo();
    const ok = await commit(() => {
      raw.invoiceNo = no; raw.invoicedAt = new Date().toISOString();
      (raw.log = raw.log || []).push({ at: raw.invoicedAt, text: `Invoice ${no} issued` });
    }, `invoice ${no}`);
    if (!ok) return;
    openDetail(raw.id);
  }
  const root = $('#invoiceRoot');
  root.innerHTML = `<div class="inv-view" role="dialog" aria-modal="true" aria-label="Invoice ${esc(raw.invoiceNo)}">
    <div class="inv-bar"><strong>${icon('invoice')}Invoice ${esc(raw.invoiceNo)}</strong>
      <button class="btn btn-ghost btn-sm" data-inv="close">Close</button>
      <button class="btn btn-primary btn-sm" data-inv="print">${icon('printer')}Print / Save as PDF</button></div>
    <iframe id="invFrame" title="Invoice"></iframe></div>`;
  $('#invFrame').srcdoc = invoiceHtml(raw);
  root.onclick = e => {
    const b = e.target.closest('[data-inv]');
    if (!b) return;
    if (b.dataset.inv === 'print') $('#invFrame').contentWindow.print();
    else root.innerHTML = '';
  };
}

function invoiceHtml(b) {
  const { nights, total, received, deposit, balance, stay } = bookingAmounts(b);
  const k = BUSINESS.bank;
  const issued = (b.invoicedAt || new Date().toISOString()).slice(0, 10);
  const status = b.payment === 'paid' ? 'Paid in full' : received > 0 ? 'Deposit received' : 'Awaiting payment';
  const logo = new URL('logo.jpg', location.href).href;
  const ph = v => /\[[^\]]+\]/.test(v) ? `<span class="ph">${esc(v)}</span>` : esc(v);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${esc(b.invoiceNo)} — ${esc(b.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,system-ui,sans-serif;color:#26221d;background:#ece7df;font-size:13px;line-height:1.5}
.page{max-width:820px;margin:24px auto;background:#fff;padding:44px 48px;box-shadow:0 10px 40px rgba(0,0,0,.12)}
.bar{max-width:820px;margin:16px auto 0;display:flex;gap:10px;justify-content:flex-end}
.bar button{font:600 14px Inter,sans-serif;padding:10px 18px;border-radius:10px;border:none;cursor:pointer;background:#3b5d3a;color:#fff}
.bar button.ghost{background:#fff;color:#26221d;border:1px solid #ddd5c8}
.warn{max-width:820px;margin:12px auto 0;background:#fbefdc;color:#8a5a1e;padding:10px 14px;border-radius:10px;font-size:13px}
header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #3b5d3a}
header img{height:84px}
.biz{font-size:12px;color:#5d564c}.biz strong{display:block;font-size:15px;color:#26221d}
.title{text-align:right}
.title h1{font-family:'Playfair Display',serif;font-size:30px;color:#2a4429;letter-spacing:.02em}
.status{display:inline-block;margin-top:6px;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:${b.payment === 'paid' ? '#e3f1e5;color:#2f7a3d' : received > 0 ? '#e3edf7;color:#2c5d8a' : '#fbefdc;color:#a86f2b'}}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:26px 0}
.meta h4{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8a8175;margin-bottom:6px}
.meta p{font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:6px}
th{text-align:left;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8a8175;padding:10px 8px;border-bottom:1px solid #e7e1d7;background:#faf7f2}
td{padding:12px 8px;border-bottom:1px solid #f0ebe3;vertical-align:top}
.r{text-align:right;white-space:nowrap}
.totals{margin-left:auto;width:300px;margin-top:14px}
.totals div{display:flex;justify-content:space-between;padding:6px 8px}
.totals .grand{border-top:2px solid #26221d;margin-top:4px;padding-top:10px;font-weight:700;font-size:15px}
.totals .due{background:#2a4429;color:#fff;border-radius:8px;font-weight:700;font-size:15px;padding:10px 12px;margin-top:8px}
.boxes{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:30px}
.box{border:1px solid #e7e1d7;border-radius:10px;padding:16px}
.box h4{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#a86f2b;margin-bottom:10px}
.kv{display:grid;grid-template-columns:110px 1fr;gap:4px 10px}
.kv span:nth-child(odd){color:#8a8175}
.terms{margin-top:26px;font-size:11.5px;color:#5d564c;display:grid;gap:5px}
footer{margin-top:30px;padding-top:16px;border-top:1px solid #e7e1d7;text-align:center;font-size:11px;color:#8a8175}
.ph{background:#fff3cd;color:#8a5a1e;padding:0 3px;border-radius:3px}
@media print{body{background:#fff}.page{box-shadow:none;margin:0;padding:24px 28px;max-width:none}.bar,.warn{display:none}.ph{background:none}}
@media (max-width:640px){.page{padding:24px 18px;margin:0}.meta,.boxes{grid-template-columns:1fr}header{flex-direction:column}.title{text-align:left}.totals{width:100%}}
</style></head><body>
${businessPlaceholders() ? '<div class="warn">Placeholder business or banking details are highlighted — do not send this invoice until they are filled in.</div>' : ''}
<div class="page">
  <header>
    <div style="display:flex;gap:16px;align-items:center"><img src="${logo}" alt="">
      <div class="biz"><strong>${esc(BUSINESS.legalName)}</strong>${ph(BUSINESS.address)}<br>${esc(SITE.phone)}${SITE.email ? ' · ' + esc(SITE.email) : ''}
        ${BUSINESS.regNumber ? `<br>Reg. no. ${esc(BUSINESS.regNumber)}` : ''}${BUSINESS.vatNumber ? `<br>VAT no. ${esc(BUSINESS.vatNumber)}` : ''}</div></div>
    <div class="title"><h1>${BUSINESS.vatNumber ? 'Tax Invoice' : 'Invoice'}</h1><div><b>${esc(b.invoiceNo)}</b></div><span class="status">${status}</span></div>
  </header>
  <div class="meta">
    <div><h4>Billed to</h4><p><b>${esc(b.name)}</b><br>${esc(b.phone || '')}${b.email ? '<br>' + esc(b.email) : ''}${b.address ? '<br>' + esc(b.address) : ''}</p></div>
    <div><h4>Stay</h4><p><b>${esc(stay.name)}</b><br>Marloth Park<br>${b.adults || 0} adult${b.adults == 1 ? '' : 's'}${+b.children ? `, ${b.children} child${b.children == 1 ? '' : 'ren'}` : ''}</p></div>
    <div><h4>Dates</h4><p>Issued: ${fmtDate(issued)}<br>Check-in: ${fmtDate(b.checkin)}, from ${DEFAULT_RULES.checkIn}<br>Check-out: ${fmtDate(b.checkout)}, by ${DEFAULT_RULES.checkOut}</p></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th class="r">Nights</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
    <tbody><tr><td><b>Accommodation — ${esc(stay.name)}</b><br><span style="color:#8a8175">${fmtRange(b.checkin, b.checkout)} · self-catering</span></td>
      <td class="r">${nights}</td><td class="r">${money(nights ? total / nights : total)}</td><td class="r">${money(total)}</td></tr></tbody>
  </table>
  <div class="totals">
    <div class="grand"><span>Total</span><span>${money(total)}</span></div>
    ${received > 0 ? `<div><span>Less: received</span><span>− ${money(received)}</span></div>` : `<div><span>Deposit required (${BUSINESS.depositPercent}%)</span><span>${money(deposit)}</span></div>`}
    <div class="due"><span>${received > 0 ? 'Balance due' : 'Deposit due now'}</span><span style="float:right">${money(received > 0 ? balance : deposit)}</span></div>
  </div>
  <div class="boxes">
    <div class="box"><h4>Banking details</h4><div class="kv">
      <span>Bank</span><span>${ph(k.bank)}</span><span>Account name</span><span>${ph(k.accountName)}</span>
      <span>Account no.</span><span>${ph(k.accountNumber)}</span><span>Branch code</span><span>${ph(k.branchCode)}</span>
      <span>Account type</span><span>${ph(k.accountType)}</span><span>Reference</span><span><b>${esc(b.invoiceNo)}</b></span></div></div>
    <div class="box"><h4>Payment terms</h4><div class="kv">
      <span>Deposit</span><span>${money(deposit)} (${BUSINESS.depositPercent}%) within ${BUSINESS.holdHours} hours</span>
      <span>Balance</span><span>${money(total - deposit)} by ${fmtDate(addDays(b.checkin, -BUSINESS.balanceDaysBefore))}</span>
      <span>Proof of payment</span><span>WhatsApp ${esc(SITE.phone)}</span></div></div>
  </div>
  <div class="terms">
    <div>• Your dates are held for ${BUSINESS.holdHours} hours. The booking is confirmed once the deposit reflects in our account.</div>
    <div>• Cancellations: ${ph(BUSINESS.cancellationPolicy)}</div>
    <div>• Your personal information is used only to manage this booking, in line with POPIA and our privacy notice.</div>
  </div>
  <footer>Thank you for choosing ${esc(SITE.name)} — we look forward to welcoming you to Marloth Park.</footer>
</div></body></html>`;
}

/* ---------- New / edit booking ---------- */
function findConflict(stayId, checkin, checkout, ignoreId) {
  return app.bookings.find(b => b.id !== ignoreId && b.stayId === stayId && !b.cancelled && rangesOverlap(checkin, checkout, b.checkin, b.checkout));
}

function openForm(existing, preset = {}) {
  const b = existing ? { ...existing } : {
    stayId: preset.stayId || STAYS[0].id, type: 'guest', status: 'pending', checkin: preset.checkin || TODAY, checkout: preset.checkout || addDays(TODAY, 2),
    adults: 2, children: 0, payment: 'unpaid', source: SOURCES[0], total: '', deposit: '',
  };
  const opt = (v, cur, label = v) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
  openDrawer(`
    <div class="drawer-head"><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button><h2>${existing ? 'Edit booking' : 'New booking'}</h2></div>
    <form class="drawer-body" id="bkForm" novalidate>
      <div class="fsec"><h3>${icon('home')}Stay</h3>
        <div class="field"><label for="fStay">Property</label><select id="fStay">${STAYS.map(s => opt(s.id, b.stayId, s.name)).join('')}</select></div>
        <div class="field" style="margin-top:12px"><span class="label">Type</span>
          <div class="seg" id="fType"><button type="button" data-type="guest" class="${b.type !== 'block' ? 'on' : ''}">Guest booking</button><button type="button" data-type="block" class="${b.type === 'block' ? 'on' : ''}">Block dates</button></div></div>
        <div class="field guest-only" style="margin-top:12px"><span class="label">Status</span>
          <div class="seg" id="fStatus"><button type="button" data-status="pending" class="${b.status === 'pending' ? 'on' : ''}">Pending — awaiting payment</button><button type="button" data-status="confirmed" class="${b.status !== 'pending' ? 'on' : ''}">Confirmed</button></div>
          <span class="hint">Pending dates show as “on hold” on the website until you confirm payment.</span></div>
        <div class="grid2" style="margin-top:12px">
          <div class="field"><label for="fIn">Check-in</label><input type="date" id="fIn" value="${b.checkin}" required /></div>
          <div class="field"><label for="fOut">Check-out</label><input type="date" id="fOut" value="${b.checkout}" required /></div>
        </div>
        <div id="fAvail"></div>
      </div>
      <div class="fsec guest-only"><h3>${icon('users')}Guest details</h3>
        <div class="field"><label for="fName">Full name *</label><input id="fName" value="${esc(b.name || '')}" autocomplete="off" /></div>
        <div class="grid2" style="margin-top:12px">
          <div class="field"><label for="fPhone">Phone / WhatsApp *</label><input id="fPhone" type="tel" value="${esc(b.phone || '')}" /></div>
          <div class="field"><label for="fEmail">Email</label><input id="fEmail" type="email" value="${esc(b.email || '')}" /></div>
        </div>
        <div class="grid2" style="margin-top:12px">
          <div class="field"><label for="fId">ID / passport no.</label><input id="fId" value="${esc(b.idNumber || '')}" /></div>
          <div class="field"><label for="fVehicle">Vehicle & registration</label><input id="fVehicle" value="${esc(b.vehicle || '')}" placeholder="For the Marloth gate" /></div>
        </div>
        <div class="field" style="margin-top:12px"><label for="fAddress">Home town / address</label><input id="fAddress" value="${esc(b.address || '')}" /></div>
        <div class="grid2" style="margin-top:12px">
          <div class="field"><label for="fAdults">Adults</label><input id="fAdults" type="number" min="0" max="30" value="${b.adults ?? 2}" /></div>
          <div class="field"><label for="fKids">Children</label><input id="fKids" type="number" min="0" max="30" value="${b.children ?? 0}" /></div>
        </div>
      </div>
      <div class="fsec guest-only"><h3>${icon('star')}Payment</h3>
        <div class="grid2">
          <div class="field"><label for="fTotal">Total amount (R)</label><input id="fTotal" type="number" min="0" step="10" value="${b.total ?? ''}" /><span class="hint" id="fSuggest"></span></div>
          <div class="field"><label for="fDeposit">Deposit received (R)</label><input id="fDeposit" type="number" min="0" step="10" value="${b.deposit ?? ''}" /></div>
        </div>
        <div class="grid2" style="margin-top:12px">
          <div class="field"><label for="fPay">Payment status</label><select id="fPay">${opt('unpaid', b.payment, 'Not paid')}${opt('deposit', b.payment, 'Deposit paid')}${opt('paid', b.payment, 'Paid in full')}</select></div>
          <div class="field"><label for="fSource">Booked via</label><select id="fSource">${SOURCES.map(s => opt(s, b.source)).join('')}</select></div>
        </div>
      </div>
      <div class="fsec"><h3>${icon('file')}<span id="fNotesLabel">Notes</span></h3>
        <div class="field"><textarea id="fNotes" aria-labelledby="fNotesLabel" placeholder="Arrival time, special requests, reason for blocking…">${esc(b.notes || '')}</textarea></div>
      </div>
    </form>
    <div class="drawer-foot">
      <button class="btn btn-ghost" data-close>Cancel</button><span class="spacer"></span>
      <button class="btn btn-primary" id="fSave">${icon('check')}${existing ? 'Save changes' : 'Save booking'}</button>
    </div>`);

  const form = $('#bkForm');
  let type = b.type === 'block' ? 'block' : 'guest';
  let status = b.status === 'pending' ? 'pending' : 'confirmed';
  const setType = t => {
    type = t;
    $('#fType').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.type === t));
    form.querySelectorAll('.guest-only').forEach(x => x.classList.toggle('hidden', t === 'block'));
    $('#fNotesLabel').textContent = t === 'block' ? 'Reason (e.g. owner use, maintenance)' : 'Notes';
  };
  setType(type);

  const check = () => {
    const stayId = $('#fStay').value, ci = $('#fIn').value, co = $('#fOut').value;
    const s = stayById(stayId);
    const nights = nightsBetween(ci, co);
    let html = `<div class="stay-strip"><img src="${thumb(stayId)}" alt="" /><div><strong>${esc(s.name)}</strong><span>Sleeps ${s.sleeps} · ${money(s.price)}/night${nights ? ` · ${nights} night${nights === 1 ? '' : 's'}` : ''}</span></div></div>`;
    let ok = true;
    if (!ci || !co || co <= ci) { html += `<div class="alert bad">${icon('info')}<span>Check-out must be after check-in.</span></div>`; ok = false; }
    else {
      const clash = findConflict(stayId, ci, co, existing && existing.id);
      if (clash) {
        html += `<div class="alert bad">${icon('ban')}<span><b>Already booked:</b> ${esc(guestLabel(clash))}, ${fmtRange(clash.checkin, clash.checkout)}. Choose other dates or another property.</span></div>`;
        ok = false;
      } else html += `<div class="alert good">${icon('check')}<span>Available — ${fmtRange(ci, co)} is free.</span></div>`;
    }
    $('#fAvail').innerHTML = html;
    const sug = nights > 0 ? s.price * nights : 0;
    $('#fSuggest').innerHTML = sug ? `Standard rate: <a href="#" id="fUseSug" style="color:var(--sun-dark);font-weight:600">${money(sug)}</a> (${nights} × ${money(s.price)})` : '';
    const use = $('#fUseSug');
    if (use) use.onclick = e => { e.preventDefault(); $('#fTotal').value = sug; };
    $('#fSave').disabled = !ok;
    return ok;
  };
  ['fStay', 'fIn', 'fOut'].forEach(id => $('#' + id).addEventListener('input', () => {
    if (id === 'fIn' && $('#fIn').value && $('#fOut').value <= $('#fIn').value) $('#fOut').value = addDays($('#fIn').value, 2);
    check();
  }));
  check();

  const save = async () => {
    if (!check()) return;
    const name = $('#fName').value.trim(), phone = $('#fPhone').value.trim();
    if (type === 'guest' && (!name || !phone)) { toast('Please add the guest’s name and phone number.', true); (name ? $('#fPhone') : $('#fName')).focus(); return; }
    const fields = {
      stayId: $('#fStay').value, type, status: type === 'block' ? 'confirmed' : status, checkin: $('#fIn').value, checkout: $('#fOut').value, notes: $('#fNotes').value.trim(),
      ...(type === 'guest' ? {
        name, phone, email: $('#fEmail').value.trim(), idNumber: $('#fId').value.trim(), vehicle: $('#fVehicle').value.trim(), address: $('#fAddress').value.trim(),
        adults: Number($('#fAdults').value) || 0, children: Number($('#fKids').value) || 0,
        total: Number($('#fTotal').value) || 0, deposit: Number($('#fDeposit').value) || 0, payment: $('#fPay').value, source: $('#fSource').value,
      } : { name: '', phone: '', email: '', total: 0, deposit: 0, payment: 'unpaid', adults: 0, children: 0 }),
    };
    const stamp = new Date().toISOString();
    const stayName = stayById(fields.stayId).name;
    $('#fSave').disabled = true;
    $('#fSave').innerHTML = icon('refresh') + 'Saving…';
    let id = existing && existing.id;
    const ok = await commit(() => {
      if (existing) {
        const target = app.bookings.find(x => x.id === existing.id);
        const changes = [];
        if (target.checkin !== fields.checkin || target.checkout !== fields.checkout) changes.push(`dates ${fmtRange(target.checkin, target.checkout)} → ${fmtRange(fields.checkin, fields.checkout)}`);
        if (target.stayId !== fields.stayId) changes.push(`moved to ${stayName}`);
        if (target.payment !== fields.payment && type === 'guest') changes.push(`payment: ${fields.payment}`);
        if ((target.status || 'confirmed') !== fields.status) changes.push(fields.status === 'pending' ? 'set to pending (on hold)' : 'confirmed');
        Object.assign(target, fields, { updatedAt: stamp });
        (target.log = target.log || []).push({ at: stamp, text: 'Edited' + (changes.length ? ' — ' + changes.join('; ') : '') });
      } else {
        id = uid();
        const pend = fields.status === 'pending';
        app.bookings.push({ id, ...fields, cancelled: false, createdAt: stamp, log: [{ at: stamp, text: type === 'block' ? 'Dates blocked' : pend ? 'Request received — dates on hold' : 'Booking created' }] });
      }
    }, `${existing ? 'update' : type === 'block' ? 'block' : 'add'} ${stayName} ${fields.checkin}–${fields.checkout}`,
    existing ? 'Changes saved.' : type === 'block' ? 'Dates blocked.' : fields.status === 'pending'
      ? `On hold — ${stayName}, ${fmtRange(fields.checkin, fields.checkout)}. Send the invoice next.`
      : `Booked — ${stayName} is now closed for ${fmtRange(fields.checkin, fields.checkout)}.`);
    if (ok) openDetail(id);
    else { $('#fSave').disabled = false; $('#fSave').innerHTML = icon('check') + 'Save'; }
  };

  $('#drawer').onclick = e => {
    if (e.target.closest('[data-close]')) return closeDrawer();
    const t = e.target.closest('[data-type]');
    if (t) setType(t.dataset.type);
    const st = e.target.closest('[data-status]');
    if (st) {
      status = st.dataset.status;
      $('#fStatus').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === st));
    }
    if (e.target.closest('#fSave')) save();
  };
  form.addEventListener('submit', e => { e.preventDefault(); save(); });
  if (!existing && matchMedia('(min-width: 981px)').matches) setTimeout(() => $('#fName').focus(), 300);
}

/* ---------- Settings ---------- */
function renderSettings() {
  const s = app.settings;
  const live = app.mode === 'github';
  return `
    <div class="page-head"><div><h1>Settings</h1><p>Storage, backups and security.</p></div></div>
    <div class="set-grid">
      <div class="panel"><div class="panel-head"><h2>Storage</h2>${live ? '<span class="badge b-in-house">Live · GitHub</span>' : '<span class="badge b-upcoming">Demo</span>'}</div>
        <div class="set-body">
          ${live ? `
            <div class="kv"><span>Repository</span><span>${esc(s.owner)}/${esc(s.repo)}</span><span>Branch</span><span>${esc(s.branch)}</span>
              <span>Guest data</span><span><code>${VAULT_PATH}</code> (encrypted)</span><span>Public dates</span><span><code>${AVAIL_PATH}</code></span></div>
            <p>Bookings are encrypted with your passphrase before they leave this device. The website only receives the booked date ranges — never guest names or contact details.</p>
            <div class="page-actions"><button class="btn btn-ghost" id="sReload">${icon('refresh')}Reload from GitHub</button><button class="btn btn-ghost" id="sPublish">${icon('cloud')}Republish website dates</button></div>`
          : `
            <p>You're in <b>demo mode</b>: bookings are stored in this browser only and the public website shows them only on this device.</p>
            <p>To go live, connect the GitHub repository that hosts the website. Bookings are then saved online, work from any phone or computer, and block dates on the public calendar automatically.</p>
            <div class="page-actions"><button class="btn btn-primary" id="sGoLive">${icon('cloud')}Connect to GitHub</button><button class="btn btn-ghost" id="sResetDemo">${icon('refresh')}Reset demo data</button></div>`}
        </div>
      </div>
      <div class="panel"><div class="panel-head"><h2>Backup</h2></div>
        <div class="set-body">
          <p>Download a copy of all bookings and guest history. Keep it somewhere safe — it contains guests’ personal details.</p>
          <div class="page-actions">
            <button class="btn btn-ghost" id="sExport">${icon('download')}Download backup (.json)</button>
            <button class="btn btn-ghost" id="sCsv">${icon('download')}Export spreadsheet (.csv)</button>
            <label class="btn btn-ghost">${icon('upload')}Restore backup<input type="file" id="sImport" accept="application/json,.json" hidden /></label>
          </div>
        </div>
      </div>
      <div class="panel"><div class="panel-head"><h2>Invoices & banking</h2>${businessPlaceholders() ? '<span class="badge b-pending">Needs details</span>' : '<span class="badge b-in-house">Ready</span>'}</div>
        <div class="set-body">
          <div class="kv"><span>Bank</span><span>${esc(BUSINESS.bank.bank)}</span><span>Account</span><span>${esc(BUSINESS.bank.accountNumber)}</span>
            <span>Deposit</span><span>${BUSINESS.depositPercent}% · dates held ${BUSINESS.holdHours} hours</span><span>Balance due</span><span>${BUSINESS.balanceDaysBefore} days before arrival</span></div>
          <p>${businessPlaceholders() ? 'Placeholder details are shown in [brackets] and highlighted on invoices — don’t send invoices to guests until they are replaced.' : 'Invoices use these details.'} They are edited in <code>assets/js/data.js</code> (BUSINESS).</p>
        </div>
      </div>
      ${live ? `
      <div class="panel"><div class="panel-head"><h2>Change passphrase</h2></div>
        <form class="set-body" id="sPassForm">
          <div class="grid2"><div class="field"><label for="sP1">New passphrase</label><input id="sP1" type="password" minlength="8" required /></div>
          <div class="field"><label for="sP2">Repeat</label><input id="sP2" type="password" minlength="8" required /></div></div>
          <div><button class="btn btn-primary" type="submit">${icon('lock')}Re-encrypt & save</button></div>
        </form>
      </div>` : ''}
      <div class="panel"><div class="panel-head"><h2>Setting up live mode</h2></div>
        <div class="set-body">
          <ol class="steps">
            <li>On GitHub, open <b>Settings → Developer settings → Personal access tokens → Fine-grained tokens</b> and click <b>Generate new token</b>.</li>
            <li>Repository access: <b>Only select repositories</b> → <code>${esc(SITE.repo.owner)}/${esc(SITE.repo.name)}</code>.</li>
            <li>Permissions → Repository → <b>Contents: Read and write</b>. Set an expiry you're happy with.</li>
            <li>Copy the token, then sign in here and choose a strong bookings passphrase.</li>
          </ol>
          <p>Use the same token and passphrase on each phone or computer you manage bookings from.</p>
        </div>
      </div>
    </div>`;
}
function afterSettings() {
  const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
  on('sGoLive', () => renderAuth('start'));
  on('sResetDemo', async () => {
    if (!await confirmDialog({ title: 'Reset demo data?', text: 'All demo bookings in this browser are replaced with the original sample bookings.', ok: 'Reset' })) return;
    app.bookings = demoBookings(); await persist('reset'); render(); toast('Demo data reset.');
  });
  on('sReload', async () => { try { await loadData(); render(); toast('Loaded the latest bookings.'); } catch (e) { toast(e.message, true); setSync('err', 'Not synced'); } });
  on('sPublish', () => commit(() => {}, 'republish availability', 'Website dates republished.'));
  on('sExport', () => download(`kruger-marloth-bookings-${TODAY}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), bookings: app.bookings }, null, 2), 'application/json'));
  on('sCsv', () => exportCSV(app.bookings.map(enrich)));
  const imp = $('#sImport');
  if (imp) imp.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const list = Array.isArray(data) ? data : data.bookings;
      if (!Array.isArray(list) || list.some(b => !b.stayId || !b.checkin || !b.checkout)) throw new Error('bad file');
      if (!await confirmDialog({ title: 'Restore this backup?', text: `${list.length} bookings will replace the ${app.bookings.length} bookings currently saved.`, ok: 'Restore' })) return;
      await commit(() => { app.bookings = list; }, 'restore backup', `Restored ${list.length} bookings.`);
    } catch (err) { toast('That file is not a valid bookings backup.', true); }
    e.target.value = '';
  };
  const pf = $('#sPassForm');
  if (pf) pf.onsubmit = async e => {
    e.preventDefault();
    const p1 = $('#sP1').value, p2 = $('#sP2').value;
    if (p1.length < 8) return toast('Use at least 8 characters.', true);
    if (p1 !== p2) return toast('The passphrases do not match.', true);
    const old = app.passphrase;
    app.passphrase = p1;
    if (await commit(() => {}, 're-encrypt with new passphrase', 'Passphrase changed. Use the new one on your other devices.')) saveLocalSettings();
    else app.passphrase = old;
  };
}

/* ---------- Export ---------- */
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCSV(list) {
  const cols = [['Property', b => b.stay.name], ['Status', statusLabel], ['Invoice', b => b.invoiceNo], ['Check-in', b => b.checkin], ['Check-out', b => b.checkout], ['Nights', b => b.nights],
    ['Guest', b => b.name], ['Phone', b => b.phone], ['Email', b => b.email], ['ID / passport', b => b.idNumber], ['Address', b => b.address], ['Vehicle', b => b.vehicle],
    ['Adults', b => b.adults], ['Children', b => b.children], ['Total', b => b.total], ['Deposit', b => b.deposit], ['Payment', b => b.payment], ['Booked via', b => b.source], ['Notes', b => b.notes]];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(c => cell(c[0])).join(','), ...list.map(b => cols.map(c => cell(c[1](b))).join(','))].join('\r\n');
  download(`kruger-marloth-bookings-${TODAY}.csv`, '﻿' + csv, 'text/csv');
}

/* ---------- Sign out ---------- */
$('#signOutSide').onclick = async () => {
  if (app.mode === 'demo') { lsDel(LS.mode); app.mode = null; renderAuth('start'); return; }
  if (!await confirmDialog({ title: 'Sign out on this device?', text: 'Your access token and passphrase are removed from this browser. Bookings stay safely saved on GitHub.', ok: 'Sign out' })) return;
  forgetDevice();
  renderAuth('start');
};

/* ---------- Boot ---------- */
(async function boot() {
  const mode = lsGet(LS.mode);
  const saved = lsGet(LS.settings, {});
  if (mode === 'demo') return enterDemo();
  if (mode === 'github' && saved.token) {
    app.mode = 'github';
    app.settings = { owner: SITE.repo.owner, repo: SITE.repo.name, branch: SITE.repo.branch, ...saved };
    if (!saved.passphrase) return renderAuth('unlock');
    app.passphrase = saved.passphrase;
    $('#auth').classList.add('hidden');
    $('#shell').classList.remove('hidden');
    try { await loadData(); render(); }
    catch (e) { renderAuth(e.code === 'passphrase' ? 'unlock' : 'start', e.message); }
    return;
  }
  renderAuth('start');
})();
