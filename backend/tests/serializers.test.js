import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serviceDetail, productionDetail, founderPublic, stripInternal } from '../src/modules/public/public.serializers.js';

test('hidden prices and unapproved testimonials never reach the public site', () => {
  const out = serviceDetail({
    _id: '1',
    title: 'Commercials',
    slug: 'commercials',
    startingPrice: { amount: 500000, currency: 'NGN', visible: false },
    packages: [
      { _id: 'a', name: 'Hidden', price: 100, priceVisible: false },
      { _id: 'b', name: 'Shown', price: 200, currency: 'NGN', priceVisible: true },
    ],
    addOns: [{ _id: 'c', name: 'Drone', price: 50, priceVisible: false }],
    testimonials: [
      { quote: 'Approved', author: 'A', approved: true },
      { quote: 'Not approved', author: 'B', approved: false },
    ],
    enquiryQuestions: [{ key: 'x' }],
  });
  assert.equal(out.startingPrice, null);
  assert.equal(out.packages[0].price, null);
  assert.equal(out.packages[1].price, 200);
  assert.equal(out.addOns[0].price, null);
  assert.equal(out.testimonials.length, 1);
  assert.equal(out.enquiryQuestions, undefined);
});

test('client names only appear with permission', () => {
  const base = { _id: '1', title: 'T', slug: 't', clientName: 'Acme Ltd' };
  assert.equal(productionDetail({ ...base, showClientName: false }).client, null);
  assert.equal(productionDetail({ ...base, showClientName: true }).client, 'Acme Ltd');
});

test('only verified founder achievements are public', () => {
  const out = founderPublic({
    name: 'F',
    achievements: [
      { title: 'Verified award', verified: true, evidenceUrl: 'internal' },
      { title: 'Unverified claim', verified: false },
    ],
  });
  assert.deepEqual(out.achievements.map((a) => a.title), ['Verified award']);
  assert.equal(out.achievements[0].evidenceUrl, undefined);
});

test('internal workflow fields are stripped', () => {
  const out = stripInternal({ title: 'x', reviewHistory: [1], createdBy: 'u', status: 'published' });
  assert.deepEqual(out, { title: 'x' });
});
