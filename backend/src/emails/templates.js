import { layout, esc } from './layout.js';

/**
 * Each template returns { subject, html, text }.
 * Keep wording factual — emails confirm what happened, never more.
 */
export const templates = {
  staffInvite: ({ firstName, inviterName, link, expiresHours }) => ({
    subject: 'You have been invited to Royal Bee Film Studios',
    html: layout({
      preheader: 'Set up your staff account',
      heading: `Welcome, ${firstName}`,
      bodyHtml: `${esc(inviterName || 'The studio team')} has invited you to the Royal Bee Film Studios workspace. Use the button below to choose your password and activate your account.`,
      button: { label: 'Set up my account', href: link },
      footerNote: `This link expires in ${expiresHours} hours and can be used once. If you weren't expecting this, you can ignore this email.`,
    }),
    text: `Hi ${firstName}, you have been invited to Royal Bee Film Studios. Set up your account: ${link} (expires in ${expiresHours} hours).`,
  }),

  passwordReset: ({ firstName, link, expiresMinutes }) => ({
    subject: 'Reset your Royal Bee password',
    html: layout({
      preheader: 'Password reset requested',
      heading: 'Reset your password',
      bodyHtml: `Hi ${esc(firstName)}, we received a request to reset your password.`,
      button: { label: 'Choose a new password', href: link },
      footerNote: `This link expires in ${expiresMinutes} minutes and can be used once. If you didn't request it, you can ignore this email — your password won't change.`,
    }),
    text: `Reset your password: ${link} (expires in ${expiresMinutes} minutes).`,
  }),

  passwordChanged: ({ firstName }) => ({
    subject: 'Your Royal Bee password was changed',
    html: layout({
      heading: 'Password changed',
      bodyHtml: `Hi ${esc(firstName)}, the password on your account was just changed and other sessions were signed out. If this wasn't you, contact your studio administrator immediately.`,
    }),
    text: 'Your password was changed. If this was not you, contact your administrator immediately.',
  }),

  mfaChanged: ({ firstName, enabled }) => ({
    subject: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
    html: layout({
      heading: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'}`,
      bodyHtml: `Hi ${esc(firstName)}, two-factor authentication was ${enabled ? 'turned on' : 'turned off'} for your account. If this wasn't you, contact your studio administrator immediately.`,
    }),
    text: `Two-factor authentication was ${enabled ? 'enabled' : 'disabled'} on your account.`,
  }),

    mfaRecoveryConfirm: ({ firstName, link, expiresMinutes, waitHours }) => ({
    subject: 'Confirm your two-factor recovery request',
    html: layout({
      preheader: 'Lost your authenticator? Confirm the recovery request.',
      heading: 'Recover access to your account',
      bodyHtml: `Hi ${esc(firstName)}, someone (hopefully you) signed in with your password and said they lost their authenticator app and recovery codes.<br><br>Confirm below to start recovery. For your security, two-factor will only be removed after a <strong>${waitHours}-hour waiting period</strong>, during which you and the studio's Super Admins can cancel it.`,
      button: { label: 'Confirm recovery request', href: link },
      footerNote: `This link expires in ${expiresMinutes} minutes. If you didn't request this, ignore this email and change your password.`,
    }),
    text: `Confirm your two-factor recovery request: ${link} (expires in ${expiresMinutes} minutes).`,
  }),

  mfaRecoveryStarted: ({ firstName, releaseAt, cancelLink, waitHours }) => ({
    subject: 'Two-factor recovery started — cancel if this wasn’t you',
    html: layout({
      preheader: `Two-factor will be removed in ${waitHours} hours unless cancelled.`,
      heading: 'Two-factor recovery started',
      bodyHtml: `Hi ${esc(firstName)}, a request to remove two-factor authentication from your account was confirmed.<br><br>After <strong>${esc(new Date(releaseAt).toUTCString())}</strong> you can sign in with just your password, and you'll be asked to set up two-factor again.<br><br><strong>If this wasn't you, cancel it now and change your password.</strong>`,
      button: { label: 'Cancel this recovery', href: cancelLink },
      footerNote: 'Signing in successfully with your authenticator code also cancels the recovery automatically.',
    }),
    text: `Two-factor recovery started. Cancel if this wasn't you: ${cancelLink}`,
  }),

  mfaRecoveryAdminAlert: ({ name, email, releaseAt, cancelLink, waitHours }) => ({
    subject: `Security alert: two-factor recovery for ${name}`,
    html: layout({
      preheader: `${name} started a two-factor recovery.`,
      heading: 'Two-factor recovery in progress',
      bodyHtml: `<strong>${esc(name)}</strong> (${esc(email)}) started a recovery to remove two-factor authentication from their account. It completes after <strong>${waitHours} hours</strong> (${esc(new Date(releaseAt).toUTCString())}).<br><br>If you don't think this is genuine, cancel it and contact them.`,
      button: { label: 'Cancel this recovery', href: cancelLink },
    }),
    text: `${name} (${email}) started a two-factor recovery. Cancel: ${cancelLink}`,
  }),

  mfaRecoveryCancelled: ({ firstName }) => ({
    subject: 'Two-factor recovery cancelled',
    html: layout({
      heading: 'Recovery cancelled',
      bodyHtml: `Hi ${esc(firstName)}, the request to remove two-factor authentication from your account was cancelled. Your two-factor settings haven't changed.`,
    }),
    text: 'The two-factor recovery request on your account was cancelled.',
  }),

  enquiryReceived: ({ name, reference, serviceTitle }) => ({
    subject: `We received your enquiry (${reference})`,
    html: layout({
      preheader: `Reference ${reference}`,
      heading: `Thank you, ${name}`,
      bodyHtml: `We've received your project enquiry${serviceTitle ? ` for <strong>${esc(serviceTitle)}</strong>` : ''}. Your reference number is <strong>${esc(reference)}</strong>.<br><br>A member of our team will review the details and get back to you. Submitting an enquiry doesn't create a booking or contract.`,
    }),
    text: `Thank you, ${name}. We received your enquiry. Reference: ${reference}.`,
  }),

  enquiryStaffAlert: ({ reference, name, email, serviceTitle, budget, adminLink }) => ({
    subject: `New enquiry ${reference}${serviceTitle ? ` — ${serviceTitle}` : ''}`,
    html: layout({
      heading: 'New project enquiry',
      bodyHtml: `<strong>${esc(reference)}</strong><br>From: ${esc(name)} (${esc(email)})<br>Service: ${esc(serviceTitle || 'Not specified')}<br>Budget: ${esc(budget || 'Not specified')}`,
      button: adminLink ? { label: 'Open in dashboard', href: adminLink } : undefined,
    }),
    text: `New enquiry ${reference} from ${name} (${email}). Service: ${serviceTitle || '-'}.`,
  }),

    partnershipReceived: ({ name, reference, typeTitle }) => ({
    subject: `We received your partnership proposal (${reference})`,
    html: layout({
      preheader: `Reference ${reference}`,
      heading: `Thank you, ${name}`,
      bodyHtml: `Thank you for your interest in partnering with Royal Bee Film Studios${typeTitle ? ` (<strong>${esc(typeTitle)}</strong>)` : ''}. Your reference number is <strong>${esc(reference)}</strong>.<br><br>Our team reviews every proposal and will be in touch soon.`,
    }),
    text: `Thank you, ${name}. We received your partnership proposal. Reference: ${reference}.`,
  }),

  partnershipStaffAlert: ({ reference, name, email, organization, typeTitle, adminLink }) => ({
    subject: `New partnership proposal ${reference}${typeTitle ? ` — ${typeTitle}` : ''}`,
    html: layout({
      heading: 'New partnership proposal',
      bodyHtml: `<strong>${esc(reference)}</strong><br>From: ${esc(name)} (${esc(email)})<br>Company: ${esc(organization || 'Not specified')}<br>Type: ${esc(typeTitle || 'Not specified')}`,
      button: adminLink ? { label: 'Open in dashboard', href: adminLink } : undefined,
    }),
    text: `New partnership proposal ${reference} from ${name} (${email}). Type: ${typeTitle || '-'}.`,
  }),

  enquiryResumeLink: ({ link, expiresDays }) => ({
    subject: 'Continue your Royal Bee project enquiry',
    html: layout({
      heading: 'Pick up where you left off',
      bodyHtml: 'Your enquiry draft has been saved. Use the button below to continue — you will be asked to confirm your email address.',
      button: { label: 'Continue my enquiry', href: link },
      footerNote: `This link expires in ${expiresDays} days.`,
    }),
    text: `Continue your enquiry: ${link} (expires in ${expiresDays} days).`,
  }),

  contactReceived: ({ name }) => ({
    subject: 'We received your message',
    html: layout({
      heading: `Thanks for reaching out, ${name}`,
      bodyHtml: "We've received your message and a member of the team will reply soon.",
    }),
    text: `Thanks ${name}, we received your message.`,
  }),

  contactStaffAlert: ({ name, email, subject, message }) => ({
    subject: `New contact message: ${subject || 'General'}`,
    html: layout({
      heading: 'New contact message',
      bodyHtml: `From: ${esc(name)} (${esc(email)})<br>Subject: ${esc(subject || '-')}<br><br>${esc(message).replace(/\n/g, '<br>')}`,
    }),
    text: `New contact message from ${name} (${email}): ${message}`,
  }),

  /* ───────── Client portal (Stage 4) ───────── */

  clientInvite: ({ firstName, inviterName, link, expiresHours }) => ({
    subject: 'Your Royal Bee client portal is ready',
    html: layout({
      preheader: 'Follow your project, review work and message the team',
      heading: `Welcome, ${esc(firstName)}`,
      bodyHtml: `${esc(inviterName || 'The studio team')} has set up a client portal account for you at Royal Bee Film Studios. In the portal you can follow your project's progress, review and approve work, and message the team directly.<br><br>Use the button below to choose your password.`,
      button: { label: 'Set up my portal account', href: link },
      footerNote: `This link expires in ${expiresHours} hours and can be used once. If you weren't expecting this, you can ignore this email.`,
    }),
    text: `Hi ${firstName}, your Royal Bee client portal is ready. Set your password: ${link} (expires in ${expiresHours} hours).`,
  }),

  projectCreated: ({ firstName, projectTitle, stageLabel, link }) => ({
    subject: `Your project is set up: ${projectTitle}`,
    html: layout({
      preheader: 'Follow progress in your client portal',
      heading: `Hi ${esc(firstName)}, your project is ready`,
      bodyHtml: `We've set up <strong>${esc(projectTitle)}</strong> in your client portal. It's currently at <strong>${esc(stageLabel)}</strong>. You'll get an email whenever there's an update or something to review.`,
      button: { label: 'Open my project', href: link },
    }),
    text: `Hi ${firstName}, your project "${projectTitle}" is set up (stage: ${stageLabel}). Open it: ${link}`,
  }),

  projectStageChanged: ({ firstName, projectTitle, stageLabel, link }) => ({
    subject: `${projectTitle} has moved to ${stageLabel}`,
    html: layout({
      preheader: `Now in ${stageLabel}`,
      heading: 'Your project has moved forward',
      bodyHtml: `Hi ${esc(firstName)}, <strong>${esc(projectTitle)}</strong> is now in <strong>${esc(stageLabel)}</strong>.`,
      button: { label: 'View progress', href: link },
    }),
    text: `Hi ${firstName}, "${projectTitle}" is now in ${stageLabel}. View: ${link}`,
  }),

  projectUpdate: ({ firstName, projectTitle, body, authorName, link }) => ({
    subject: `New update on ${projectTitle}`,
    html: layout({
      preheader: `${authorName || 'The studio'} posted an update`,
      heading: 'New update from the studio',
      bodyHtml: `Hi ${esc(firstName)}, ${esc(authorName || 'the team')} posted an update on <strong>${esc(projectTitle)}</strong>:<br><br><div style="border-left:3px solid #b8964f;padding:4px 0 4px 14px;color:#3d3a35">${esc(body).replace(/\n/g, '<br>')}</div>`,
      button: { label: 'Reply in the portal', href: link },
    }),
    text: `${authorName || 'The studio'} posted on "${projectTitle}": ${body}\n\nReply: ${link}`,
  }),

  deliverableReady: ({ firstName, projectTitle, deliverableTitle, version, link }) => ({
    subject: `Ready for your review: ${deliverableTitle}`,
    html: layout({
      preheader: `${projectTitle} — version ${version}`,
      heading: 'Something is ready for your review',
      bodyHtml: `Hi ${esc(firstName)}, <strong>${esc(deliverableTitle)}</strong>${version > 1 ? ` (version ${version})` : ''} for <strong>${esc(projectTitle)}</strong> is ready. Take a look and either approve it or tell us what you'd like changed.`,
      button: { label: 'Review now', href: link },
    }),
    text: `Hi ${firstName}, "${deliverableTitle}" (v${version}) for "${projectTitle}" is ready for review: ${link}`,
  }),

  clientMessageAlert: ({ clientName, projectTitle, reference, body, link }) => ({
    subject: `Client message: ${projectTitle} (${reference})`,
    html: layout({
      heading: 'New message from a client',
      bodyHtml: `<strong>${esc(clientName)}</strong> wrote on <strong>${esc(projectTitle)}</strong> (${esc(reference)}):<br><br><div style="border-left:3px solid #b8964f;padding:4px 0 4px 14px;color:#3d3a35">${esc(body).replace(/\n/g, '<br>')}</div>`,
      button: { label: 'Open project', href: link },
    }),
    text: `${clientName} wrote on "${projectTitle}" (${reference}): ${body}\n\n${link}`,
  }),

  clientDecisionAlert: ({ clientName, projectTitle, reference, deliverableTitle, version, approved, comment, link }) => ({
    subject: `${approved ? 'Approved' : 'Changes requested'}: ${deliverableTitle} (${reference})`,
    html: layout({
      heading: approved ? 'A client approved a deliverable' : 'A client requested changes',
      bodyHtml: `<strong>${esc(clientName)}</strong> ${approved ? 'approved' : 'requested changes to'} <strong>${esc(deliverableTitle)}</strong> (version ${version}) on <strong>${esc(projectTitle)}</strong>.${comment ? `<br><br><div style="border-left:3px solid #b8964f;padding:4px 0 4px 14px;color:#3d3a35">${esc(comment).replace(/\n/g, '<br>')}</div>` : ''}`,
      button: { label: 'Open project', href: link },
    }),
    text: `${clientName} ${approved ? 'approved' : 'requested changes to'} "${deliverableTitle}" v${version} on "${projectTitle}" (${reference}).${comment ? ` Comment: ${comment}` : ''}\n\n${link}`,
  }),

  /* ───────── Invoices & quotes (Stage 4B) ───────── */

  invoiceSent: ({ firstName, reference, title, total, balance, dueDate, link, bankHtml, portalReady, resend }) => ({
    subject: `${resend ? 'Reminder: ' : ''}Invoice ${reference} from Royal Bee Film Studios`,
    html: layout({
      preheader: `${balance} due by ${dueDate}`,
      heading: resend ? 'A reminder about your invoice' : 'Your invoice is ready',
      bodyHtml: `Hi ${esc(firstName)}, ${resend ? 'this is a friendly reminder about' : 'here is'} invoice <strong>${esc(reference)}</strong>${title ? ` for <strong>${esc(title)}</strong>` : ''}.<br><br>Total: <strong>${esc(total)}</strong><br>Balance due: <strong>${esc(balance)}</strong><br>Due by: <strong>${esc(dueDate)}</strong>${bankHtml ? `<br><br>Please pay by bank transfer and use <strong>${esc(reference)}</strong> as the payment reference:<br><br>${bankHtml}` : ''}`,
      button: { label: 'View & download invoice', href: link },
      footerNote: portalReady ? 'You can view and download all your invoices in your client portal.' : 'To open the link, first set up your client portal account using the invitation email we sent you.',
    }),
    text: `Hi ${firstName}, invoice ${reference}${title ? ` (${title})` : ''}: total ${total}, balance due ${balance} by ${dueDate}. Use ${reference} as your payment reference. View: ${link}`,
  }),

  quoteSent: ({ firstName, reference, title, total, dueDate, link, portalReady, resend }) => ({
    subject: `${resend ? 'Reminder: ' : ''}Quote ${reference} from Royal Bee Film Studios`,
    html: layout({
      preheader: `${total} · valid until ${dueDate}`,
      heading: resend ? 'A reminder about your quote' : 'Your quote is ready',
      bodyHtml: `Hi ${esc(firstName)}, here is quote <strong>${esc(reference)}</strong>${title ? ` for <strong>${esc(title)}</strong>` : ''}.<br><br>Total: <strong>${esc(total)}</strong><br>Valid until: <strong>${esc(dueDate)}</strong><br><br>Open it in your portal to accept it or let us know what you'd like changed.`,
      button: { label: 'Review quote', href: link },
      footerNote: portalReady ? '' : 'To open the link, first set up your client portal account using the invitation email we sent you.',
    }),
    text: `Hi ${firstName}, quote ${reference}${title ? ` (${title})` : ''}: ${total}, valid until ${dueDate}. Review: ${link}`,
  }),

  paymentReceipt: ({ firstName, reference, amount, receiptNumber, paymentDate, balance, fullyPaid, link }) => ({
    subject: `Payment received — ${reference}`,
    html: layout({
      preheader: `Receipt ${receiptNumber}`,
      heading: 'Thank you — payment received',
      bodyHtml: `Hi ${esc(firstName)}, we've received your payment of <strong>${esc(amount)}</strong> on ${esc(paymentDate)} for invoice <strong>${esc(reference)}</strong>.<br><br>Receipt number: <strong>${esc(receiptNumber)}</strong><br>${fullyPaid ? '<strong>This invoice is now fully paid.</strong>' : `Balance remaining: <strong>${esc(balance)}</strong>`}`,
      button: { label: 'View invoice', href: link },
    }),
    text: `Hi ${firstName}, we received ${amount} on ${paymentDate} for invoice ${reference}. Receipt ${receiptNumber}. ${fullyPaid ? 'The invoice is now fully paid.' : `Balance remaining: ${balance}.`} ${link}`,
  }),

  quoteDecisionAlert: ({ clientName, reference, title, total, accepted, comment, link }) => ({
    subject: `Quote ${accepted ? 'accepted' : 'declined'}: ${reference}`,
    html: layout({
      heading: accepted ? 'A client accepted a quote' : 'A client declined a quote',
      bodyHtml: `<strong>${esc(clientName)}</strong> ${accepted ? 'accepted' : 'declined'} quote <strong>${esc(reference)}</strong>${title ? ` (${esc(title)})` : ''} for <strong>${esc(total)}</strong>.${comment ? `<br><br><div style="border-left:3px solid #b8964f;padding:4px 0 4px 14px;color:#3d3a35">${esc(comment).replace(/\n/g, '<br>')}</div>` : ''}${accepted ? '<br><br>Open it to turn it into an invoice.' : ''}`,
      button: { label: 'Open quote', href: link },
    }),
    text: `${clientName} ${accepted ? 'accepted' : 'declined'} quote ${reference} (${total}).${comment ? ` Comment: ${comment}` : ''} ${link}`,
  }),

  /* ───────── Talent portal (Stage 4C) ───────── */

  talentApplicationReceived: ({ firstName, reference }) => ({
    subject: 'We received your talent application',
    html: layout({
      preheader: `Reference ${reference}`,
      heading: `Thanks for applying, ${esc(firstName)}`,
      bodyHtml: `We've received your application to join the Royal Bee Film Studios talent roster (reference <strong>${esc(reference)}</strong>).<br><br>Our team reviews every application. If it's a fit, you'll get an email inviting you to set up your talent portal, where you can see casting calls and manage bookings.`,
    }),
    text: `Thanks ${firstName}, we received your talent application (${reference}). We'll email you if it's a fit.`,
  }),

  talentApplicationStaffAlert: ({ reference, name, email, types, city, link }) => ({
    subject: `New talent application: ${name} (${reference})`,
    html: layout({
      heading: 'New talent application',
      bodyHtml: `<strong>${esc(name)}</strong> (${esc(email)}) applied to join the roster.<br>Type: ${esc(types)}<br>City: ${esc(city)}`,
      button: { label: 'Review application', href: link },
    }),
    text: `New talent application from ${name} (${email}) — ${types}, ${city}. ${link}`,
  }),

  talentInvite: ({ firstName, link, expiresHours }) => ({
    subject: 'Welcome to the Royal Bee talent roster',
    html: layout({
      preheader: 'Set up your talent portal',
      heading: `You're in, ${esc(firstName)}!`,
      bodyHtml: 'Your application was approved and you are now on the Royal Bee Film Studios talent roster.<br><br>Set your password to open your talent portal. There you can complete your profile, apply to casting calls, confirm bookings and message the team.',
      button: { label: 'Set up my talent portal', href: link },
      footerNote: `This link expires in ${expiresHours} hours and can be used once.`,
    }),
    text: `Hi ${firstName}, you're on the Royal Bee talent roster. Set up your portal: ${link} (expires in ${expiresHours} hours).`,
  }),

  talentApplicationDeclined: ({ firstName }) => ({
    subject: 'Your Royal Bee talent application',
    html: layout({
      heading: `Thank you, ${esc(firstName)}`,
      bodyHtml: "Thank you for applying to the Royal Bee Film Studios talent roster. We aren't able to add you to the roster at the moment, but we really appreciate your interest and wish you every success. You're welcome to apply again in the future.",
    }),
    text: `Hi ${firstName}, thank you for applying to the Royal Bee talent roster. We can't add you at the moment, but you're welcome to apply again in the future.`,
  }),

  castingCallAlert: ({ firstName, title, location, shootDates, applyBy, link }) => ({
    subject: `New casting call: ${title}`,
    html: layout({
      preheader: applyBy ? `Apply by ${applyBy}` : 'Open now',
      heading: 'A new casting call is open',
      bodyHtml: `Hi ${esc(firstName)}, we're casting for <strong>${esc(title)}</strong>.${location ? `<br>Location: ${esc(location)}` : ''}${shootDates ? `<br>Dates: ${esc(shootDates)}` : ''}${applyBy ? `<br>Apply by: <strong>${esc(applyBy)}</strong>` : ''}`,
      button: { label: 'View & apply', href: link },
    }),
    text: `Hi ${firstName}, new casting call: ${title}. ${applyBy ? `Apply by ${applyBy}. ` : ''}${link}`,
  }),

  castingApplicationStaffAlert: ({ name, title, note, link }) => ({
    subject: `Casting application: ${name} — ${title}`,
    html: layout({
      heading: 'New casting application',
      bodyHtml: `<strong>${esc(name)}</strong> applied to <strong>${esc(title)}</strong>.${note ? `<br><br><div style="border-left:3px solid #b8964f;padding:4px 0 4px 14px;color:#3d3a35">${esc(note).replace(/\n/g, '<br>')}</div>` : ''}`,
      button: { label: 'Review applicants', href: link },
    }),
    text: `${name} applied to ${title}. ${link}`,
  }),

  castingShortlisted: ({ firstName, title, link }) => ({
    subject: `You've been shortlisted: ${title}`,
    html: layout({
      heading: "Good news — you're shortlisted",
      bodyHtml: `Hi ${esc(firstName)}, you've been shortlisted for <strong>${esc(title)}</strong>. The team will be in touch with next steps.`,
      button: { label: 'View casting', href: link },
    }),
    text: `Hi ${firstName}, you've been shortlisted for ${title}. ${link}`,
  }),

  castingNotSelected: ({ firstName, title }) => ({
    subject: `Update on ${title}`,
    html: layout({
      heading: `Thank you, ${esc(firstName)}`,
      bodyHtml: `Thank you for applying for <strong>${esc(title)}</strong>. On this occasion we've gone with other talent, but we'd love to see you apply for future casting calls.`,
    }),
    text: `Hi ${firstName}, thank you for applying for ${title}. We've gone with other talent this time — please keep applying.`,
  }),

  bookingOffered: ({ firstName, role, reference, dates, callTime, location, link }) => ({
    subject: `Booking offer: ${role}`,
    html: layout({
      preheader: dates,
      heading: 'You have a booking offer',
      bodyHtml: `Hi ${esc(firstName)}, we'd like to book you for <strong>${esc(role)}</strong> (${esc(reference)}).<br><br>Dates: <strong>${esc(dates)}</strong>${callTime ? `<br>Call time: ${esc(callTime)}` : ''}${location ? `<br>Location: ${esc(location)}` : ''}<br><br>Please confirm or decline in your talent portal.`,
      button: { label: 'Confirm or decline', href: link },
    }),
    text: `Hi ${firstName}, booking offer for ${role} (${reference}) on ${dates}. Confirm or decline: ${link}`,
  }),

  bookingUpdated: ({ firstName, role, reference, dates, callTime, location, link }) => ({
    subject: `Booking updated: ${role}`,
    html: layout({
      heading: 'Your booking details changed',
      bodyHtml: `Hi ${esc(firstName)}, the details for <strong>${esc(role)}</strong> (${esc(reference)}) have been updated.<br><br>Dates: <strong>${esc(dates)}</strong>${callTime ? `<br>Call time: ${esc(callTime)}` : ''}${location ? `<br>Location: ${esc(location)}` : ''}`,
      button: { label: 'View booking', href: link },
    }),
    text: `Hi ${firstName}, booking ${reference} (${role}) was updated: ${dates}. ${link}`,
  }),

  bookingCancelled: ({ firstName, role, reference, reason, link }) => ({
    subject: `Booking cancelled: ${role}`,
    html: layout({
      heading: 'A booking was cancelled',
      bodyHtml: `Hi ${esc(firstName)}, unfortunately the booking for <strong>${esc(role)}</strong> (${esc(reference)}) has been cancelled.${reason ? `<br><br>Reason: ${esc(reason)}` : ''}<br><br>We're sorry for the change and hope to work with you soon.`,
      button: { label: 'View booking', href: link },
    }),
    text: `Hi ${firstName}, booking ${reference} (${role}) was cancelled. ${reason || ''} ${link}`,
  }),

  bookingResponseAlert: ({ name, role, reference, confirmed, reason, link }) => ({
    subject: `Booking ${confirmed ? 'confirmed' : 'declined'}: ${name} — ${role}`,
    html: layout({
      heading: confirmed ? 'Talent confirmed a booking' : 'Talent declined a booking',
      bodyHtml: `<strong>${esc(name)}</strong> ${confirmed ? 'confirmed' : 'declined'} <strong>${esc(role)}</strong> (${esc(reference)}).${reason ? `<br><br>Reason: ${esc(reason)}` : ''}`,
      button: { label: 'Open booking', href: link },
    }),
    text: `${name} ${confirmed ? 'confirmed' : 'declined'} ${role} (${reference}). ${reason || ''} ${link}`,
  }),

  bookingMessageToTalent: ({ firstName, role, body, authorName, link }) => ({
    subject: `New message about ${role}`,
    html: layout({
      heading: 'New message from the studio',
      bodyHtml: `Hi ${esc(firstName)}, ${esc(authorName || 'the team')} wrote about <strong>${esc(role)}</strong>:<br><br><div style="border-left:3px solid #b8964f;padding:4px 0 4px 14px;color:#3d3a35">${esc(body).replace(/\n/g, '<br>')}</div>`,
      button: { label: 'Reply in your portal', href: link },
    }),
    text: `${authorName || 'The studio'} wrote about ${role}: ${body}\n\nReply: ${link}`,
  }),

  bookingMessageAlert: ({ name, role, reference, body, link }) => ({
    subject: `Talent message: ${name} — ${role}`,
    html: layout({
      heading: 'New message from talent',
      bodyHtml: `<strong>${esc(name)}</strong> wrote about <strong>${esc(role)}</strong> (${esc(reference)}):<br><br><div style="border-left:3px solid #b8964f;padding:4px 0 4px 14px;color:#3d3a35">${esc(body).replace(/\n/g, '<br>')}</div>`,
      button: { label: 'Open booking', href: link },
    }),
    text: `${name} wrote about ${role} (${reference}): ${body}\n\n${link}`,
  }),

  talentDocumentShared: ({ firstName, title, link }) => ({
    subject: 'The studio shared a document with you',
    html: layout({
      heading: 'New document in your portal',
      bodyHtml: `Hi ${esc(firstName)}, the studio shared <strong>${esc(title)}</strong> with you. You can download it from your talent portal.`,
      button: { label: 'Open documents', href: link },
    }),
    text: `Hi ${firstName}, the studio shared "${title}" with you: ${link}`,
  }),

  talentDocumentAlert: ({ name, title, link }) => ({
    subject: `Document uploaded by ${name}`,
    html: layout({
      heading: 'Talent uploaded a document',
      bodyHtml: `<strong>${esc(name)}</strong> uploaded <strong>${esc(title)}</strong>.`,
      button: { label: 'Open profile', href: link },
    }),
    text: `${name} uploaded "${title}". ${link}`,
  }),
};
