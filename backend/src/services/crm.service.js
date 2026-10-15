import { Contact } from '../models/Contact.js';

const ACTIVITY_CAP = 200;

/**
 * Create or update the CRM contact for a website submission.
 * Matching is by normalized email so repeat visitors never create duplicates.
 * Existing staff-entered values (name, phone, organization) are only filled when empty.
 */
export async function upsertContactFromSubmission({
  name,
  email,
  phone = '',
  organization = '',
  serviceId = null,
  marketingConsent = false,
  preferredContactMethod,
  source = 'website',
  utm,
  activity,
}) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const now = new Date();
  let contact = await Contact.findOne({ email: normalizedEmail });

  if (!contact) {
    try {
      contact = await Contact.create({
        name,
        email: normalizedEmail,
        phone,
        organization,
        kind: organization ? 'organization' : 'individual',
        source,
        firstSource: source,
        utm,
        preferredContactMethod: preferredContactMethod || 'email',
        servicesOfInterest: serviceId ? [serviceId] : [],
        consent: {
          marketing: Boolean(marketingConsent),
          marketingAt: marketingConsent ? now : undefined,
          privacyAcceptedAt: now,
        },
        activity: activity ? [{ ...activity, at: now }] : [],
        enquiryCount: activity?.type === 'enquiry_submitted' ? 1 : 0,
        lastContactAt: now,
      });
      return { contact, created: true };
    } catch (err) {
      if (err?.code !== 11000) throw err;
      contact = await Contact.findOne({ email: normalizedEmail }); // concurrent insert won the race
    }
  }

  const update = {
    $set: { lastContactAt: now, source, 'consent.privacyAcceptedAt': now },
    $push: activity ? { activity: { $each: [{ ...activity, at: now }], $slice: -ACTIVITY_CAP } } : undefined,
    $inc: activity?.type === 'enquiry_submitted' ? { enquiryCount: 1 } : undefined,
    $addToSet: serviceId ? { servicesOfInterest: serviceId } : undefined,
  };
  if (!contact.phone && phone) update.$set.phone = phone;
  if (!contact.organization && organization) update.$set.organization = organization;
  // Consent is only ever upgraded from a submission; withdrawals go through unsubscribe flows.
  if (marketingConsent && !contact.consent?.marketing) {
    update.$set['consent.marketing'] = true;
    update.$set['consent.marketingAt'] = now;
  }
  Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

  contact = await Contact.findByIdAndUpdate(contact._id, update, { new: true });
  return { contact, created: false };
}
