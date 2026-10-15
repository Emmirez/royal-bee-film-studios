/**
 * Lightweight spam checks for public forms. No third-party CAPTCHA is required:
 *  - honeypot field ("website") must be empty
 *  - the form must have been open for at least a few seconds
 *  - messages stuffed with links are rejected
 * Rate limiting is applied separately at the route level.
 */
export const MIN_FILL_MS = 3000;
export const MAX_LINKS = 4;

export function spamReason({ honeypot, formStartedAt, text = '' }, now = Date.now()) {
  if (honeypot && String(honeypot).trim() !== '') return 'honeypot';
  if (formStartedAt) {
    const started = Number(formStartedAt);
    if (Number.isFinite(started) && now - started < MIN_FILL_MS) return 'too_fast';
  }
  const links = (String(text).match(/https?:\/\//gi) || []).length;
  if (links > MAX_LINKS) return 'too_many_links';
  return null;
}
