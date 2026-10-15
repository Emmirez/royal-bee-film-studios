import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { TalentProfile } from '../../models/TalentProfile.js';
import { User } from '../../models/User.js';
import { nextReference } from '../../models/Counter.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler, created, clientIp } from '../../utils/http.js';
import { hashIp } from '../../utils/crypto.js';
import { validate } from '../../middleware/validate.js';
import { publicFormLimiter, publicUploadLimiter } from '../../middleware/rateLimiters.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { spamReason } from '../../services/spam.service.js';
import { talentTypeLabel } from '../../constants/talent.js';
import { adminLink, emailStaff, emailTalent, talentPhotoUpload, uploadTalentPhoto } from './talent.service.js';
import { applySchema } from './talent.validation.js';

/** Public (no login): "Join our talent roster" application. Mounted at /public/talent. */
const router = Router();
const PHOTO_AUDIENCE = 'royal-bee-talent-photo';

/** Upload one photo; returns a signed token the application form sends back (so only our uploads are accepted). */
router.post(
  '/photos',
  publicUploadLimiter,
  talentPhotoUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Choose a photo to upload');
    const photo = await uploadTalentPhoto(req.file);
    const token = jwt.sign(photo, env.jwtAccessSecret, { expiresIn: '24h', audience: PHOTO_AUDIENCE });
    return created(res, { token, url: photo.url });
  }),
);

router.post(
  '/',
  publicFormLimiter,
  validate(applySchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    if (spamReason({ honeypot: b.website, formStartedAt: b.formStartedAt, text: `${b.bio} ${b.message}` })) {
      logger.info({ reason: 'spam' }, 'Talent application rejected by spam filter');
      return created(res, { received: true, reference: 'RBF-TAL-RECEIVED' });
    }

    // One live application/profile per email address.
    const existing = await TalentProfile.findOne({ email: b.email, status: { $in: ['pending', 'approved'] } }).select('status');
    if (existing) {
      throw ApiError.conflict(
        existing.status === 'pending'
          ? 'We already have an application from this email address — the team will be in touch.'
          : 'You’re already on our talent roster. Sign in to your talent portal to update your profile.',
      );
    }
    if (await User.exists({ email: b.email, accountType: { $ne: 'talent' } })) {
      throw ApiError.conflict('This email is already used for another Royal Bee account. Please apply with a different email.');
    }

    const seen = new Set();
    const photos = (b.photoTokens || [])
      .map((t) => {
        try {
          const { url, publicId, width, height } = jwt.verify(t, env.jwtAccessSecret, { audience: PHOTO_AUDIENCE });
          return { url, publicId, width, height, alt: '' };
        } catch {
          throw ApiError.badRequest('One of your photos expired. Please upload it again.');
        }
      })
      .filter((p) => !seen.has(p.publicId) && seen.add(p.publicId));

    const profile = await TalentProfile.create({
      reference: await nextReference('TAL'),
      status: 'pending',
      firstName: b.firstName,
      lastName: b.lastName,
      email: b.email,
      phone: b.phone,
      stageName: b.stageName,
      talentTypes: b.talentTypes,
      city: b.city,
      country: b.country,
      bio: b.bio,
      languages: b.languages,
      skills: b.skills,
      gender: b.gender,
      playingAgeMin: b.playingAgeMin,
      playingAgeMax: b.playingAgeMax,
      heightCm: b.heightCm,
      showreels: b.showreels,
      photos,
      application: { message: b.message, submittedAt: new Date(), ageConfirmed: true, ipHash: hashIp(clientIp(req)) },
    });

    await emailTalent(profile, 'talentApplicationReceived', { reference: profile.reference }, { force: true });
    await emailStaff('talentApplicationStaffAlert', {
      reference: profile.reference,
      name: `${b.firstName} ${b.lastName}`,
      email: b.email,
      types: b.talentTypes.map(talentTypeLabel).join(', '),
      city: b.city,
      link: adminLink(`/talent/${profile._id}`),
    });
    return created(res, { received: true, reference: profile.reference });
  }),
);

export default router;