const TIME_ZONE = 'Africa/Lagos';

const relativeFormatter = new Intl.RelativeTimeFormat('en-NG', { numeric: 'auto' });

export function timeAgo(iso, nowMs = Date.now()) {
  if (!iso) return 'No reports yet';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'Time unavailable';
  const seconds = Math.max(0, Math.round((nowMs - then) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainder = minutes % 60;
    if (hours === 1) return remainder >= 5 ? `1 hr ${remainder} min ago` : '1 hr ago';
    return `${hours} hrs ago`;
  }
  return relativeFormatter.format(-Math.floor(hours / 24), 'day');
}

export function absoluteTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date) + ' WAT';
}

export function shortTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export const STATUS = {
  ON: {
    label: 'ON',
    headline: 'Electricity is reported ON here.',
    short: 'Reported ON',
    tone: 'on',
    icon: 'bolt',
    copy: 'Recent community reports say power is available in this neighbourhood.',
  },
  OFF: {
    label: 'OFF',
    headline: 'Electricity is reported OFF here.',
    short: 'Reported OFF',
    tone: 'off',
    icon: 'boltOff',
    copy: 'Recent community reports say power is not available in this neighbourhood.',
  },
  UNKNOWN: {
    label: 'Unknown',
    headline: 'No recent reports yet.',
    short: 'Not reported',
    tone: 'unknown',
    icon: 'help',
    copy: 'Nobody nearby has shared an update in the last two hours. This does not mean electricity is off.',
  },
  CONFLICTED: {
    label: 'Conflicted',
    headline: 'Recent reports disagree.',
    short: 'Mixed reports',
    tone: 'conflicted',
    icon: 'scale',
    copy: 'People nearby are reporting different things. Check the latest updates before you rely on this.',
  },
};

export const FRESHNESS = {
  FRESH: { label: 'Fresh', tone: 'fresh', copy: 'Reported in the last 30 minutes' },
  AGING: { label: 'Aging', tone: 'aging', copy: 'Reported 31–120 minutes ago' },
  STALE: { label: 'Stale', tone: 'stale', copy: 'Older than 120 minutes' },
};

export function statusMeta(status) {
  return STATUS[status] || STATUS.UNKNOWN;
}

export function freshnessMeta(freshness) {
  return freshness ? FRESHNESS[freshness] : null;
}

export function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function areaParam(slug) {
  return slug ? `?area=${encodeURIComponent(slug)}` : '';
}
