export const formatDate = (value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', opts);
};

export const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const timeAgo = (value) => {
  if (!value) return '';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, s] of units) {
    if (Math.abs(seconds) >= s) return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.round(seconds / s), unit);
  }
  return 'just now';
};

export const formatMoney = (amount, currency = 'NGN') => {
  if (amount === null || amount === undefined || amount === '') return '';
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
};

export const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};

export const titleCase = (s = '') => s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const cx = (...classes) => classes.filter(Boolean).join(' ');
