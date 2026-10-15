import { env, integrations } from '../config/env.js';
import { EmailLog } from '../models/EmailLog.js';
import { templates } from '../emails/templates.js';
import { logger } from '../utils/logger.js';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Send a transactional email through Brevo.
 * - When Brevo isn't configured the email is logged with status
 *   "skipped_not_configured" — we never pretend it was sent.
 * - `idempotencyKey` prevents duplicate sends on retries.
 * Returns { sent: boolean, status, logId }.
 */
export async function sendEmail({ to, template, data = {}, idempotencyKey, relatedType = '', relatedId = '' }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) return { sent: false, status: 'no_recipients' };

  const build = templates[template];
  if (!build) throw new Error(`Unknown email template: ${template}`);
  const { subject, html, text } = build(data);

  let log;
  try {
    log = await EmailLog.create({
      to: recipients,
      template,
      subject,
      idempotencyKey,
      relatedType,
      relatedId: relatedId ? String(relatedId) : '',
    });
  } catch (err) {
    if (err?.code === 11000 && idempotencyKey) {
      const existing = await EmailLog.findOne({ idempotencyKey });
      return { sent: existing?.status === 'sent', status: 'duplicate', logId: existing?._id };
    }
    throw err;
  }

  if (!integrations.brevoConfigured()) {
    log.status = 'skipped_not_configured';
    await log.save();
    logger.warn({ template, to: recipients }, 'Brevo not configured — email not sent');
    if (!env.isProduction) logger.info({ subject, text }, 'Email preview (dev)');
    return { sent: false, status: log.status, logId: log._id };
  }

  log.attempts += 1;
  try {
    const response = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': env.brevo.apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: env.brevo.fromAddress, name: env.brevo.fromName },
        to: recipients.map((email) => ({ email })),
        subject,
        htmlContent: html,
        textContent: text,
        tags: [template],
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.message || `Brevo responded ${response.status}`);
    log.status = 'sent';
    log.providerMessageId = body?.messageId || '';
    await log.save();
    return { sent: true, status: 'sent', logId: log._id };
  } catch (err) {
    log.status = 'failed';
    log.error = String(err.message).slice(0, 500);
    await log.save();
    logger.error({ err, template }, 'Email send failed');
    return { sent: false, status: 'failed', logId: log._id };
  }
}

/** Fire-and-forget wrapper for non-critical notifications. */
export function sendEmailInBackground(args) {
  sendEmail(args).catch((err) => logger.error({ err, template: args.template }, 'Background email failed'));
}

/** Integration check used by the admin integrations page. */
export async function testBrevoConnection() {
  if (!integrations.brevoConfigured()) return { ok: false, status: 'not_configured' };
  try {
    const res = await fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': env.brevo.apiKey } });
    return { ok: res.ok, status: res.ok ? 'connected' : `error_${res.status}` };
  } catch (err) {
    return { ok: false, status: 'unreachable', error: err.message };
  }
}
