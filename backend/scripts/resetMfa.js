/**
 * Emergency: turn off two-factor authentication for a staff account that has lost
 * both its authenticator app and its recovery codes.
 *
 * Only someone with access to the server and its .env (database) can run this —
 * that's what keeps it safe. Usage:
 *   npm run reset-mfa -- you@studio.com
 *
 * The person signs in with their password and (for Super Admins) is asked to set up
 * two-factor again straight away. All their existing sessions are signed out.
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import '../src/models/Role.js';
import { User } from '../src/models/User.js';
import { AuditEvent } from '../src/models/AuditEvent.js';
import { revokeAllSessions } from '../src/services/token.service.js';

async function main() {
  const email = (process.argv.slice(2).find((a) => a.includes('@')) || '').trim().toLowerCase();
  if (!email) throw new Error('Provide the account email, e.g.  npm run reset-mfa -- you@studio.com');

  await connectDatabase();

  const user = await User.findOne({ email, accountType: 'staff' }).populate('role');
  if (!user) throw new Error(`No staff account found for ${email}.`);
  if (!user.mfa?.enabled) {
    console.log(`\n• Two-factor is already off for ${email}. Nothing to do.\n`);
    await mongoose.disconnect();
    return;
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: { 'mfa.enabled': false, 'mfa.recoveryCodeHashes': [] },
      $unset: { 'mfa.secretEncrypted': '', 'mfa.pendingSecretEncrypted': '', 'mfa.enabledAt': '' },
      $inc: { tokenVersion: 1 },
    },
  );
  await revokeAllSessions(user._id, 'mfa_reset');
  await AuditEvent.create({
    actor: null,
    actorEmail: 'server console',
    action: 'auth.mfa_reset_by_console',
    entityType: 'User',
    entityId: String(user._id),
    summary: `Two-factor reset from the server console for ${email}`,
    severity: 'critical',
  });

  console.log(`\n✓ Two-factor turned off for ${email} (${user.role?.name || 'staff'}).`);
  console.log('  All their sessions were signed out.');
  if (user.role?.requiresMfa) console.log('  After signing in with their password they will be asked to set up two-factor again.');
  console.log('');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(`\n✗ ${err.message}\n`);
  await mongoose.disconnect();
  process.exit(1);
});