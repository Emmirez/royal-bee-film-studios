import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

// These tests run without a database: they verify routing, guards and error shapes.
const app = createApp();

test('protected staff routes reject requests without a token', async () => {
  for (const path of ['/api/v1/cms/services', '/api/v1/users', '/api/v1/enquiries', '/api/v1/admin/audit', '/api/v1/media']) {
    const res = await request(app).get(path);
    assert.equal(res.status, 401, path);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  }
});

test('invalid bearer tokens are rejected', async () => {
  const res = await request(app).get('/api/v1/cms/services').set('Authorization', 'Bearer not-a-real-token');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'INVALID_TOKEN');
});

test('unknown routes return a consistent 404', async () => {
  const res = await request(app).get('/api/v1/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('validation errors return 422 with field details', async () => {
  const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.ok(res.body.error.details.some((d) => d.path === 'email'));
});

test('enquiry form requires privacy consent', async () => {
  const res = await request(app)
    .post('/api/v1/public/enquiries')
    .send({ name: 'Ada', email: 'ada@example.com', description: 'A long enough project description here.' });
  assert.equal(res.status, 422);
  assert.ok(res.body.error.details.some((d) => d.path === 'privacyAccepted'));
});

test('malformed JSON is handled cleanly', async () => {
  const res = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"bad json');
  assert.equal(res.status, 400);
});

test('health reports degraded without a database', async () => {
  const res = await request(app).get('/api/v1/health');
  assert.equal(res.status, 503);
  assert.equal(res.body.data.status, 'degraded');
});

test('security headers are set and x-powered-by is hidden', async () => {
  const res = await request(app).get('/api/v1/health');
  assert.equal(res.headers['x-powered-by'], undefined);
  assert.ok(res.headers['x-content-type-options']);
  assert.equal(res.headers['cache-control'], 'no-store');
});
