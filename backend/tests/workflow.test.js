import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTransition, editPolicy } from '../src/services/workflow.service.js';
import { isPubliclyVisible } from '../src/constants/content.js';
import { DEFAULT_ROLES } from '../src/constants/permissions.js';

const role = (key) => DEFAULT_ROLES.find((r) => r.key === key);
const manager = role('manager');
const editor = role('content_editor');

test('full workflow: draft → review → approved → published', () => {
  const opts = { role: manager, approvalIsRequired: true };
  assert.equal(resolveTransition({ ...opts, action: 'submit', currentStatus: 'draft' }), 'in_review');
  assert.equal(resolveTransition({ ...opts, action: 'approve', currentStatus: 'in_review' }), 'approved');
  assert.equal(resolveTransition({ ...opts, action: 'publish', currentStatus: 'approved' }), 'published');
});

test('publishing an unapproved draft is blocked when approval is required', () => {
  assert.throws(
    () => resolveTransition({ action: 'publish', currentStatus: 'draft', role: manager, approvalIsRequired: true }),
    (err) => err.statusCode === 409,
  );
});

test('publishing from draft is allowed when approval is switched off', () => {
  assert.equal(resolveTransition({ action: 'publish', currentStatus: 'draft', role: manager, approvalIsRequired: false }), 'published');
});

test('editors cannot approve their own content', () => {
  assert.throws(
    () => resolveTransition({ action: 'approve', currentStatus: 'in_review', role: editor, approvalIsRequired: true }),
    (err) => err.statusCode === 403,
  );
});

test('editing approved content sends it back to draft', () => {
  assert.deepEqual(editPolicy({ status: 'approved', role: editor, approvalIsRequired: true }), { resetToDraft: true, liveEdit: false });
});

test('editors cannot edit live content; publishers can', () => {
  assert.throws(() => editPolicy({ status: 'published', role: editor, approvalIsRequired: true }), (e) => e.statusCode === 403);
  assert.equal(editPolicy({ status: 'published', role: manager, approvalIsRequired: true }).liveEdit, true);
});

test('public visibility respects status, schedule and expiry', () => {
  const now = new Date('2026-06-01T12:00:00Z');
  assert.equal(isPubliclyVisible({ status: 'published' }, now), true);
  assert.equal(isPubliclyVisible({ status: 'approved' }, now), false);
  assert.equal(isPubliclyVisible({ status: 'published', publishAt: '2026-07-01' }, now), false);
  assert.equal(isPubliclyVisible({ status: 'published', expireAt: '2026-05-01' }, now), false);
  assert.equal(isPubliclyVisible({ status: 'published', publishAt: '2026-05-01', expireAt: '2026-07-01' }, now), true);
});
