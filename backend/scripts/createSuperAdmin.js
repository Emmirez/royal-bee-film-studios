/**
 * Create the first Super Admin (there is no public staff sign-up).
 * Uses SEED_ADMIN_* from .env, or flags:
 *   npm run create-admin -- --email you@studio.com --password "LongPassword123" --first Ada --last Obi
 * The Super Admin must set up two-factor authentication on first sign-in.
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import { DEFAULT_ROLES } from '../src/constants/permissions.js';
import { Role } from '../src/models/Role.js';
import { User } from '../src/models/User.js';
import { hashPassword, isStrongPassword, PASSWORD_RULES } from '../src/utils/password.js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = (arg('email') || process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = arg('password') || process.env.SEED_ADMIN_PASSWORD || '';
  const firstName = arg('first') || process.env.SEED_ADMIN_FIRST_NAME || 'Studio';
  const lastName = arg('last') || process.env.SEED_ADMIN_LAST_NAME || 'Admin';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Provide a valid email (--email or SEED_ADMIN_EMAIL).');
  if (!isStrongPassword(password)) throw new Error(PASSWORD_RULES);

  await connectDatabase();

  let role = await Role.findOne({ key: 'super_admin' });
  if (!role) role = await Role.create(DEFAULT_ROLES.find((r) => r.key === 'super_admin'));

  if (await User.exists({ email })) throw new Error(`A user with ${email} already exists.`);

  await User.create({
    firstName,
    lastName,
    email,
    jobTitle: 'Super Admin',
    accountType: 'staff',
    role: role._id,
    status: 'active',
    passwordHash: await hashPassword(password),
    passwordChangedAt: new Date(),
  });

  console.log(`\n✓ Super Admin created: ${email}`);
  console.log('  Sign in at /login — you will be asked to set up two-factor authentication.\n');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(`\n✗ ${err.message}\n`);
  await mongoose.disconnect();
  process.exit(1);
});
