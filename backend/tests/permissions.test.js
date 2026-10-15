import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roleHasPermission, roleHasAll, roleHasAny, DEFAULT_ROLES, ALL_PERMISSIONS, PERMISSIONS as P } from '../src/constants/permissions.js';

const role = (key) => DEFAULT_ROLES.find((r) => r.key === key);

test('super admin has every permission', () => {
  for (const p of ALL_PERMISSIONS) assert.equal(roleHasPermission(role('super_admin'), p), true);
});

test('content editor can edit but not approve or publish', () => {
  const editor = role('content_editor');
  assert.equal(roleHasPermission(editor, P.CMS_EDIT), true);
  assert.equal(roleHasPermission(editor, P.CMS_APPROVE), false);
  assert.equal(roleHasPermission(editor, P.CMS_PUBLISH), false);
  assert.equal(roleHasPermission(editor, P.USERS_MANAGE), false);
});

test('client and talent roles have no staff permissions', () => {
  for (const key of ['client', 'talent']) {
    assert.equal(roleHasAny(role(key), ALL_PERMISSIONS), false);
  }
});

test('roleHasAll requires every permission', () => {
  const manager = role('manager');
  assert.equal(roleHasAll(manager, [P.CMS_EDIT, P.CMS_PUBLISH]), true);
  assert.equal(roleHasAll(manager, [P.CMS_EDIT, P.ROLES_MANAGE]), false);
});

test('missing role never grants access', () => {
  assert.equal(roleHasPermission(null, P.CMS_VIEW), false);
  assert.equal(roleHasPermission({ permissions: undefined }, P.CMS_VIEW), false);
});
