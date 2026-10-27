/* =========================================================
   SHARED HELPERS — used by the public site and the admin
   ========================================================= */

/* ---------- Icons (24×24 stroke icons) ---------- */
const ICON_PATHS = {
  bed: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M2 17h20"/><path d="M8 10V8h3v2M13 10V8h3v2"/>',
  bath: '<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M6 12V5a2 2 0 0 1 3.5-1.3"/><path d="M7 20l-1 2M17 20l1 2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2A6.5 6.5 0 0 1 21.5 20"/>',
  pool: '<path d="M2 18c1.7 0 1.7-1.5 3.3-1.5S7 18 8.7 18s1.7-1.5 3.3-1.5S13.7 18 15.3 18s1.7-1.5 3.4-1.5S20.3 18 22 18"/><path d="M8 14V5a2 2 0 0 1 4 0M16 14V5a2 2 0 0 0-4 0"/><path d="M8 9h8"/>',
  wifi: '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16.1a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
  snow: '<path d="M12 2v20M4.9 6.5l14.2 11M19.1 6.5 4.9 17.5"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2"/>',
  flame: '<path d="M12 22c4 0 7-2.7 7-7 0-4.5-4-7-4.5-11-2 1.5-3 3.5-3 6-1-1-1.5-2-1.5-3.5C7 8.5 5 11.5 5 15c0 4.3 3 7 7 7z"/>',
  tv: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="m8 2 4 4 4-4"/>',
  washer: '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 6h.01M11 6h.01"/>',
  dish: '<path d="M3 11h18M5 11v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/><path d="M8 7V3M12 7V3M16 7V3"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lock: '<rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  paw: '<circle cx="6" cy="10" r="2"/><circle cx="10" cy="5.5" r="2"/><circle cx="14" cy="5.5" r="2"/><circle cx="18" cy="10" r="2"/><path d="M12 12c-3 0-5.5 3.5-5.5 6 0 1.5 1.2 2.5 2.7 2.5 1 0 1.8-.5 2.8-.5s1.8.5 2.8.5c1.5 0 2.7-1 2.7-2.5 0-2.5-2.5-6-5.5-6z"/>',
  river: '<path d="M2 7c2 0 2-1.5 4-1.5S8 7 10 7s2-1.5 4-1.5S16 7 18 7s2-1.5 4-1.5M2 12.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/>',
  car: '<path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><path d="M3 12h18"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/>',
  deck: '<path d="M3 21V9M21 21V9M2 9h20M5 9l2-5h10l2 5"/><path d="M3 15h18M8 15v6M16 15v6"/>',
  shower: '<path d="M4 22V6a4 4 0 0 1 8 0"/><path d="M8 10h8a4 4 0 0 0-8 0z"/><path d="M10 14v1M14 14v1M12 17v1M10 20v1M14 20v1"/>',
  game: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  kids: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M8 11l4-2 4 2M9 22l3-7 3 7"/>',
  bar: '<path d="M8 22h8M12 15v7M5 3h14l-7 12z"/><path d="M7.5 7h9"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/>',
  sofa: '<path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z"/><path d="M5 18v2M19 18v2"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 1 4l-3 3M14 12c4 0 7 1 7 4 0 2-2 3-4 1l-3-3M12 14c0 4-1 7-4 7-2 0-3-2-1-4l3-3M10 12c-4 0-7-1-7-4 0-2 2-3 4-1l3 3"/>',
  safe: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1M12 15v1M8 12h1M15 12h1M3 21v1M21 21v1"/>',
  tree: '<path d="M12 22v-6"/><path d="M5 16h14l-4-5h3l-6-8-6 8h3z"/>',
  star: '<path d="m12 2 3 6.6 7 .8-5.3 4.8 1.5 7L12 17.8 5.8 21.2l1.5-7L2 9.4l7-.8z"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 0-5-5L14 6z" transform="rotate(0)"/><path d="m3 21 6-6"/>',
  camera: '<path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5z"/>',
  utensils: '<path d="M6 2v8a2 2 0 0 0 4 0V2M8 2v20M17 22V2c-2.5 1.5-3.5 4-3.5 7v4h3.5"/>',
  chef: '<path d="M6 13.9A4 4 0 0 1 7.3 6 5 5 0 0 1 16.7 6 4 4 0 0 1 18 13.9V21H6z"/><path d="M6 17h12"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  whatsapp: '<path d="M3 21l1.6-4.6A9 9 0 1 1 8 19.6z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a5 5 0 0 1-2.3-2.3l.8-1-1-2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  pin: '<path d="M12 22s-8-6.5-8-13a8 8 0 0 1 16 0c0 6.5-8 13-8 13z"/><circle cx="12" cy="9" r="3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  images: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
  cloud: '<path d="M17.5 19H7a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 11 4 4 0 0 1 17.5 19z"/>',
};

function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.star}</svg>`;
}

/* ---------- Text & money ---------- */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function money(n) {
  return 'R' + Math.round(Number(n) || 0).toLocaleString('en-ZA').replace(/,/g, ' ');
}
function telHref(phone) {
  const d = String(phone).replace(/\D/g, '');
  return 'tel:' + (d.startsWith('0') ? '+27' + d.slice(1) : '+' + d);
}
function waHref(phone, text = '') {
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('0')) d = '27' + d.slice(1);
  return `https://wa.me/${d}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}

/* ---------- Dates (YYYY-MM-DD strings, local time) ---------- */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function todayISO() { return toISO(new Date()); }
function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return toISO(d); }
function nightsBetween(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((parseISO(b) - parseISO(a)) / 86400000));
}
function fmtDate(s, withYear = true) {
  if (!s) return '';
  const d = parseISO(s);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}${withYear ? ' ' + d.getFullYear() : ''}`;
}
function fmtRange(a, b) {
  const da = parseISO(a), db = parseISO(b);
  const sameYear = da.getFullYear() === db.getFullYear();
  if (sameYear && da.getMonth() === db.getMonth()) return `${da.getDate()} – ${db.getDate()} ${MONTHS[db.getMonth()]} ${db.getFullYear()}`;
  return `${da.getDate()} ${MONTHS[da.getMonth()].slice(0, 3)}${sameYear ? '' : ' ' + da.getFullYear()} – ${db.getDate()} ${MONTHS[db.getMonth()].slice(0, 3)} ${db.getFullYear()}`;
}
/* Nights overlap? Check-out day is free for the next check-in. */
function rangesOverlap(a1, b1, a2, b2) { return a1 < b2 && a2 < b1; }

/* ---------- Bookings & availability ---------- */
/* A booking's status is derived from its dates, so finished stays move to
   history — and their dates are released — automatically. */
function bookingStatus(b, today = todayISO()) {
  if (b.cancelled) return 'cancelled';
  if (b.checkout <= today) return 'completed';
  if (b.checkin <= today) return 'in-house';
  return 'upcoming';
}

/* Public availability: only active, not-yet-finished stays. No guest details. */
function computeAvailability(bookings, today = todayISO()) {
  const ranges = {};
  for (const b of bookings) {
    if (b.cancelled || b.checkout <= today) continue;
    (ranges[b.stayId] = ranges[b.stayId] || []).push([b.checkin, b.checkout]);
  }
  for (const k in ranges) ranges[k].sort((x, y) => x[0].localeCompare(y[0]));
  return { updated: new Date().toISOString(), ranges };
}

function isNightBooked(ranges, date) {
  return (ranges || []).some(([a, b]) => date >= a && date < b);
}
function isRangeFree(ranges, checkin, checkout) {
  return !(ranges || []).some(([a, b]) => rangesOverlap(checkin, checkout, a, b));
}

/* Demo mode keeps bookings in this browser so the system can be tried
   without any setup. The public site shows demo bookings too, but only
   in the same browser where demo mode was switched on. */
const LS = {
  mode: 'kms_mode',              // 'demo' | 'github'
  demoBookings: 'kms_demo_bookings',
  settings: 'kms_settings',
};
function lsGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}
function lsDel(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }

/* Public site: load booked ranges (published file + demo bookings in this browser) */
async function loadAvailability() {
  const today = todayISO();
  let ranges = {};
  try {
    const res = await fetch('data/availability.json?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) ranges = (await res.json()).ranges || {};
  } catch (e) { /* offline or opened from disk — fall through */ }
  if (lsGet(LS.mode) === 'demo') {
    const demo = computeAvailability(lsGet(LS.demoBookings, []), today).ranges;
    for (const k in demo) ranges[k] = (ranges[k] || []).concat(demo[k]);
  }
  for (const k in ranges) ranges[k] = ranges[k].filter(([, b]) => b > today);
  return ranges;
}

function stayById(id) { return STAYS.find(s => s.id === id); }
function stayImg(id, n, thumb = false) {
  return `images/stays/${id}/${thumb ? 'thumb/' : ''}${String(n).padStart(2, '0')}.jpg`;
}
