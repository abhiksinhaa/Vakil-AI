import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FREE_TRIAL_CUTOFF,
  getIstDateKey,
  getFreeTrialStatus,
  getIstDayRange,
} from '../src/lib/plans.ts';

test('trial eligibility starts at the configured cutoff and ends exactly seven days after signup', () => {
  const cutoff = Date.parse(FREE_TRIAL_CUTOFF);
  assert.equal(getFreeTrialStatus(new Date(cutoff - 1).toISOString()), null);

  const createdAt = new Date(cutoff + 30 * 60 * 1000);
  const trialEnd = createdAt.getTime() + 7 * 24 * 60 * 60 * 1000;

  assert.equal(getFreeTrialStatus(createdAt.toISOString(), createdAt)?.daysLeft, 7);
  assert.equal(getFreeTrialStatus(createdAt.toISOString(), new Date(trialEnd - 1))?.active, true);
  assert.equal(getFreeTrialStatus(createdAt.toISOString(), new Date(trialEnd))?.active, false);
});

test('IST daily windows roll over at midnight IST', () => {
  assert.equal(getIstDateKey(new Date('2026-03-01T18:29:59.999Z')), '2026-03-01');
  assert.equal(getIstDateKey(new Date('2026-03-01T18:30:00.000Z')), '2026-03-02');
  assert.deepEqual(getIstDayRange(new Date('2026-03-01T18:29:59.999Z')), {
    start: '2026-02-28T18:30:00.000Z',
    end: '2026-03-01T18:30:00.000Z',
  });
  assert.deepEqual(getIstDayRange(new Date('2026-03-01T18:30:00.000Z')), {
    start: '2026-03-01T18:30:00.000Z',
    end: '2026-03-02T18:30:00.000Z',
  });
});
