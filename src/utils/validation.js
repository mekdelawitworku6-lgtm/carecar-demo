export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isEmptyish = (v) => typeof v !== 'string' || v.trim() === '';

export function isValidEmail(v) {
  return typeof v === 'string' && EMAIL_RE.test(v.trim());
}

/**
 * Reduces any accepted phone spelling to the bare local subscriber number.
 *
 * Accepts 0980256702, 980256702, 251980256702 and +251980256702, which are all
 * the same number. The leading 0 and the 251 country code are both optional,
 * and any extra zeros after the country code are dropped.
 */
export function normalizeEthPhone(v) {
  if (typeof v !== 'string') return '';
  let t = v.replace(/[\s\-().]/g, '');
  if (t.startsWith('+251')) t = t.slice(4);
  else if (t.startsWith('251')) t = t.slice(3);
  return t.replace(/^0+/, '');
}

export function isValidEthPhone(v) {
  if (typeof v !== 'string') return false;
  return /^9\d{8}$/.test(normalizeEthPhone(v));
}

export function isValidUrl(v) {
  if (typeof v !== 'string') return false;
  try {
    const u = new URL(v.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidLatitude(n) {
  return typeof n === 'number' && isFinite(n) && n >= -90 && n <= 90;
}

export function isValidLongitude(n) {
  return typeof n === 'number' && isFinite(n) && n >= -180 && n <= 180;
}

const SHORT_LINK_HOSTS = ['maps.app.goo.gl', 'goo.gl'];
const isShortMapsHost = (host) =>
  SHORT_LINK_HOSTS.includes(host) || host.endsWith('.goo.gl');
const GOOGLE_HOST_RE = /^(?:www\.|maps\.)?google\.[a-z]{2,3}(?:\.[a-z]{2})?(?:\.[a-z]{2,3})?$/;
const COORD_PAIR_RE = /(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/;
const BANG_RE = /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/g;
const PURE_COORD_SEGMENT_RE = /(?:^|\/)(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:\/|$)/g;

/**
 * Extracts { latitude, longitude } from a Google Maps link or coord string.
 * Supports !3d/!4d, ?q=, @lat,lng, /place/lat,lng, and direct comma-separated pairs.
 */
export function extractCoordinatesFromMapsLink(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  let candidate = value.trim();
  if (!/^https?:\/\//i.test(candidate)) {
    const directMatch = candidate.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (directMatch) {
      const lat = parseFloat(directMatch[1]);
      const lng = parseFloat(directMatch[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { latitude: lat, longitude: lng };
      }
    }
    candidate = `https://${candidate}`;
  }

  let url;
  try {
    url = new URL(candidate);
  } catch {
    const directMatch = candidate.match(/(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
    if (directMatch) {
      const lat = parseFloat(directMatch[1]);
      const lng = parseFloat(directMatch[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { latitude: lat, longitude: lng };
      }
    }
    return null;
  }

  const search = url.search || '';
  const pathname = url.pathname || '';
  const candidates = [];

  const haystack = `${pathname}${search}`;
  const bangPairs = [];
  let bang;
  BANG_RE.lastIndex = 0;
  while ((bang = BANG_RE.exec(haystack)) !== null) {
    bangPairs.push({ lat: bang[1], lng: bang[2] });
  }
  BANG_RE.lastIndex = 0;
  candidates.push(...bangPairs.reverse());

  for (const key of ['q', 'query', 'll', 'center', 'destination', 'daddr', 'coords']) {
    const v = url.searchParams.get(key);
    if (v) candidates.push(v);
  }

  const at = /@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/.exec(pathname);
  if (at) candidates.push({ lat: at[1], lng: at[2] });

  let seg;
  PURE_COORD_SEGMENT_RE.lastIndex = 0;
  while ((seg = PURE_COORD_SEGMENT_RE.exec(pathname)) !== null) {
    candidates.push({ lat: seg[1], lng: seg[2] });
  }
  PURE_COORD_SEGMENT_RE.lastIndex = 0;

  const inRange = (lat, lng) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  for (const c of candidates) {
    if (c == null) continue;
    let lat, lng;
    if (typeof c === 'object') {
      lat = Number(c.lat);
      lng = Number(c.lng);
    } else {
      const m = COORD_PAIR_RE.exec(String(c));
      lat = Number(m?.[1]);
      lng = Number(m?.[2]);
    }
    if (Number.isFinite(lat) && Number.isFinite(lng) && inRange(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}

/**
 * Mirrors the backend `shared/utils/mapsLink.js` rules: returns null when the
 * link is a usable Google Maps link with coordinates, otherwise a message.
 */
export function validateGoogleMapsLink(value) {
  if (typeof value !== 'string' || !value.trim()) return 'Google Maps link is required';

  let candidate = value.trim();
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return 'Enter a valid Google Maps link (https://...)';
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'Google Maps link must start with http:// or https://';
  }

  const host = (url.hostname || '').toLowerCase();
  if (isShortMapsHost(host)) return null; // server expands maps.app.goo.gl links
  if (!GOOGLE_HOST_RE.test(host)) {
    return 'Enter a Google Maps link (google.com/maps)';
  }

  const coords = extractCoordinatesFromMapsLink(value);
  if (coords) return null;

  return 'Could not read a location from that link. Copy it from Google Maps > Share > Copy link.';
}

export function isValidUUID(v) {
  return typeof v === 'string' && UUID_RE.test(v.trim());
}

export function toPositiveNumber(v, { allowZero = false } = {}) {
  const n = Number(v);
  if (!isFinite(n) || (allowZero ? n < 0 : n <= 0)) return null;
  return n;
}

export function toPositiveInt(v, { allowZero = false } = {}) {
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  if (!isFinite(n) || !Number.isInteger(n) || (allowZero ? n < 0 : n <= 0)) return null;
  return n;
}

export function isValidTime(v) {
  return typeof v === 'string' && TIME_RE.test(v.trim());
}

export function timeToMinutes(v) {
  if (!isValidTime(v)) return null;
  const [h, m] = v.trim().split(':').map(Number);
  return h * 60 + m;
}

export function isValidTimeRange(start, end) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return s != null && e != null && e > s;
}

const WORK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function validateWorkingHours(hours) {
  let parsed = hours;
  if (typeof hours === 'string') {
    try {
      parsed = JSON.parse(hours);
    } catch {
      return 'Working hours must be valid JSON';
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return 'Working hours are required';
  }
  for (const day of WORK_DAYS) {
    const entry = parsed[day];
    if (!entry || entry.closed) continue;
    if (!isValidTime(entry.open) || !isValidTime(entry.close)) {
      return `${cap(day)} working hours must be valid HH:mm times`;
    }
    if (timeToMinutes(entry.close) <= timeToMinutes(entry.open)) {
      return `${cap(day)} closing time must be after opening time`;
    }
  }
  return null;
}