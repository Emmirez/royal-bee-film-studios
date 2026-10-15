import { env } from '../config/env.js';

/** Escape user-supplied text for safe inclusion in HTML emails. */
export const esc = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isPublicHttps = (url) => /^https:\/\//i.test(url) && !/localhost|127\.0\.0\.1/i.test(url);

/**
 * Logo for the email header. Email apps can't load images from localhost, so we use:
 * 1. EMAIL_LOGO_URL from .env (any public https image), otherwise
 * 2. the backend's own copy: <SERVER_URL>/email-assets/logo.png (backend/public/email/logo.png), once live, otherwise
 * 3. <website>/logo.png once the website is live, otherwise
 * 4. no image — the text wordmark still shows.
 */
function emailLogoUrl() {
  if (env.brevo.logoUrl) return env.brevo.logoUrl;
  const server = (env.serverUrl || '').replace(/\/+$/, '');
  if (isPublicHttps(server)) return `${server}/email-assets/logo.png`;
  const site = (env.clientUrls[0] || '').replace(/\/+$/, '');
  if (isPublicHttps(site)) return `${site}/logo.png`;
  return '';
}

function header() {
  const logo = emailLogoUrl();
  const site = (env.clientUrls[0] || '').replace(/\/+$/, '');
  const img = logo
    ? `<td style="padding-right:14px;vertical-align:middle"><img src="${esc(logo)}" width="46" height="46" alt="Royal Bee Film Studios" style="display:block;width:46px;height:46px;border:0;outline:none"></td>`
    : '';
  const wordmark = `<td style="vertical-align:middle">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1;font-weight:bold;color:#faf8f4;letter-spacing:.01em">Royal <span style="color:#c9a961;font-style:italic">Bee</span></div>
<div style="padding-top:6px;font-family:Helvetica,Arial,sans-serif;font-size:9px;line-height:1;font-weight:bold;letter-spacing:.38em;text-transform:uppercase;color:#c9a961">&mdash; Film Studios &mdash;</div>
</td>`;
  const inner = `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${img}${wordmark}</tr></table>`;
  const linked = /^https?:\/\//i.test(site) ? `<a href="${esc(site)}" style="text-decoration:none">${inner}</a>` : inner;
  return `<tr><td style="background:#1c1b19;padding:24px 32px;border-bottom:3px solid #b8964f">${linked}</td></tr>`;
}

/** Branded, table-based email layout (off-white, charcoal, subtle gold). */
export function layout({ preheader = '', heading, bodyHtml, button, footerNote = '' }) {
  const btn = button
    ? `<tr><td style="padding:8px 0 24px"><a href="${esc(button.href)}" style="display:inline-block;background:#1c1b19;color:#faf8f4;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:999px;border:1px solid #b8964f">${esc(button.label)}</a></td></tr>`
    : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#f6f3ee;font-family:Helvetica,Arial,sans-serif;color:#1c1b19">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #ebe5da">
${header()}
<tr><td style="padding:32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-family:Georgia,serif;font-size:24px;line-height:1.3;padding-bottom:16px">${esc(heading)}</td></tr>
<tr><td style="font-size:15px;line-height:1.65;color:#3d3a35;padding-bottom:16px">${bodyHtml}</td></tr>
${btn}
${footerNote ? `<tr><td style="font-size:13px;line-height:1.5;color:#7a746a">${footerNote}</td></tr>` : ''}
</table></td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #ebe5da;font-size:12px;color:#9a9286">Royal Bee Film Studios · This is an automated message.</td></tr>
</table></td></tr></table></body></html>`;
}
