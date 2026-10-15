import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/utils/slugify.js';
import { isStrongPassword } from '../src/utils/password.js';
import { encrypt, decrypt, sha256 } from '../src/utils/crypto.js';
import { spamReason } from '../src/services/spam.service.js';
import { sanitizeSnapshot } from '../src/services/audit.service.js';
import { formatReference } from '../src/models/Counter.js';
import { rank } from '../src/modules/public/search.routes.js';
import { esc } from '../src/emails/layout.js';

test('slugify produces clean URL slugs', () => {
  assert.equal(slugify('Feature & Short Film Production'), 'feature-short-film-production');
  assert.equal(slugify('  Café   Noir!! '), 'cafe-noir');
});

test('password policy', () => {
  assert.equal(isStrongPassword('short1'), false);
  assert.equal(isStrongPassword('longpasswordnodigits'), false);
  assert.equal(isStrongPassword('LongEnough123'), true);
});

test('AES-GCM encrypt/decrypt round trip and tamper detection', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const enc = encrypt(secret);
  assert.notEqual(enc, secret);
  assert.equal(decrypt(enc), secret);
  const parts = enc.split('.');
  parts[2] = Buffer.from('tampered').toString('base64url');
  assert.throws(() => decrypt(parts.join('.')));
});

test('sha256 is deterministic', () => {
  assert.equal(sha256('abc'), sha256('abc'));
  assert.notEqual(sha256('abc'), sha256('abd'));
});

test('spam checks', () => {
  const now = 1_000_000;
  assert.equal(spamReason({ honeypot: 'http://spam' }, now), 'honeypot');
  assert.equal(spamReason({ formStartedAt: now - 500 }, now), 'too_fast');
  assert.equal(spamReason({ text: 'http://a http://b http://c http://d http://e' }, now), 'too_many_links');
  assert.equal(spamReason({ formStartedAt: now - 60_000, text: 'A real project brief' }, now), null);
});

test('audit snapshots never contain secrets', () => {
  const out = sanitizeSnapshot({ email: 'a@b.c', passwordHash: 'x', mfa: { secretEncrypted: 'y', enabled: true }, nested: [{ token: 'z', ok: 1 }] });
  assert.deepEqual(out, { email: 'a@b.c', mfa: { enabled: true }, nested: [{ ok: 1 }] });
});

test('reference numbers are zero-padded', () => {
  assert.equal(formatReference('RBF', 'ENQ', 2027, 1), 'RBF-ENQ-2027-0001');
  assert.equal(formatReference('RBF', 'INV', 2027, 12345), 'RBF-INV-2027-12345');
});

test('search ranking prefers title matches', () => {
  assert.ok(rank('Music Videos', 'music') < rank('Corporate Music', 'music'));
  assert.ok(rank('Corporate Music', 'music') < rank('Documentary', 'music'));
});

test('email HTML escaping', () => {
  assert.equal(esc('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
});
