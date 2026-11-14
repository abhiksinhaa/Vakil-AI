import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        return nextResolve(specifier, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const { calculateDraftAllowance, releaseTrialDraftReservation, reserveTrialDraftAllowance } =
  await import('../src/lib/userAccount.ts');
const {
  FREE_TRIAL_CUTOFF,
  FREE_TRIAL_DAILY_DRAFT_LIMIT,
  FREE_TRIAL_DAYS,
  getFreeTrialStatus,
  getIstDateKey,
  getIstDayRange,
  getExistingPlanDraftLimit,
} = await import('../src/lib/plans.ts');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const route = read('app/api/gemini/route.ts');
const generator = read('src/components/DraftGenerator.tsx');
const dynamicForm = read('src/components/DynamicDocumentForm.tsx');
const pricing = read('src/components/PricingPage.tsx');
const pricingRoute = read('app/pricing/page.tsx');

function fakeSupabase({ profile = {}, drafts = [] } = {}) {
  const state = { ...profile };
  const calls = [];

  return {
    state,
    calls,
    from(table) {
      let filters = [];
      let updateValues = null;
      const query = {
        select() { return this; },
        eq(field, value) { filters.push({ op: 'eq', field, value }); return this; },
        in(field, value) { filters.push({ op: 'in', field, value }); return this; },
        gte(field, value) { filters.push({ op: 'gte', field, value }); return this; },
        lt(field, value) { filters.push({ op: 'lt', field, value }); return this; },
        is(field, value) { filters.push({ op: 'is', field, value }); return this; },
        update(values) { updateValues = values; return this; },
        maybeSingle() {
          if (table !== 'profiles') throw new Error(`Unexpected maybeSingle on ${table}`);
          if (!updateValues) {
            calls.push({ table, operation: 'select' });
            return Promise.resolve({ data: { ...state }, error: null });
          }

          calls.push({ table, operation: 'update', updateValues: { ...updateValues } });
          const matches = filters.every(({ op, field, value }) => {
            const actual = state[field];
            if (op === 'in') return value.includes(actual);
            return actual === value;
          });
          if (!matches) return Promise.resolve({ data: null, error: null });
          Object.assign(state, updateValues);
          return Promise.resolve({ data: { id: state.id }, error: null });
        },
        then(resolve, reject) {
          if (table !== 'drafts') throw new Error(`Unexpected await on ${table}`);
          calls.push({ table, operation: 'count', filters: [...filters] });
          const count = drafts.filter((draft) => filters.every(({ op, field, value }) => {
            const actual = draft[field];
            if (op === 'eq') return actual === value;
            if (op === 'in') return value.includes(actual);
            if (op === 'gte') return actual >= value;
            if (op === 'lt') return actual < value;
            return true;
          })).length;
          return Promise.resolve({ count, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

const cutoffMs = Date.parse(FREE_TRIAL_CUTOFF);
const trialCreatedAt = new Date(cutoffMs + 60 * 60 * 1000).toISOString();
const beforeCutoff = new Date(cutoffMs - 1).toISOString();

test('new user within seven days has an active trial and is allowed under the daily cap', async () => {
  assert.equal(FREE_TRIAL_DAYS, 7);
  const created = Date.parse(trialCreatedAt);
  const now = new Date(created + 2 * 24 * 60 * 60 * 1000);
  const client = fakeSupabase({
    drafts: [
      { user_id: 'mock-user', created_at: getIstDayRange(now).start },
      { user_id: 'mock-user', created_at: new Date(Date.parse(getIstDayRange(now).start) + 1).toISOString() },
    ],
  });
  const allowance = await calculateDraftAllowance({
    plan: 'free',
    created_at: trialCreatedAt,
    drafts_limit: 99,
  }, 'mock-user', client, now);

  assert.equal(getFreeTrialStatus(trialCreatedAt, now).active, true);
  assert.equal(allowance.allowed, true);
  assert.equal(allowance.remaining, 3);
  assert.equal(allowance.limit, FREE_TRIAL_DAILY_DRAFT_LIMIT);
});

test('trial end at and after created_at plus seven days blocks before any Gemini request', async () => {
  const end = Date.parse(trialCreatedAt) + 7 * 24 * 60 * 60 * 1000;
  for (const now of [new Date(end), new Date(end + 1)]) {
    const client = fakeSupabase();
    const allowance = await calculateDraftAllowance({
      plan: 'free',
      created_at: trialCreatedAt,
    }, 'mock-user', client, now);
    assert.equal(allowance.allowed, false);
    assert.equal(allowance.reason, 'trial_ended');
    assert.equal(client.calls.length, 0);
  }

  assert.match(route, /'TRIAL_ENDED'/);
  assert.ok(route.indexOf('if (!allowance.allowed)') < route.indexOf('upstream = await fetch(url'));
});

test('five drafts in the current IST date block; next IST date allows usage again', async () => {
  const now = new Date('2026-11-15T12:00:00.000Z');
  const range = getIstDayRange(now);
  const drafts = Array.from({ length: 5 }, (_, index) => ({
    user_id: 'mock-user',
    created_at: new Date(Date.parse(range.start) + index * 1000).toISOString(),
  }));
  const blocked = await calculateDraftAllowance({
    plan: 'free',
    created_at: trialCreatedAt,
  }, 'mock-user', fakeSupabase({ drafts }), now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'daily_limit');

  const nextIstMidnight = new Date(range.end);
  const resetClient = fakeSupabase({
    profile: { id: 'mock-user', daily_draft_count: 5, last_draft_date: getIstDateKey(now) },
  });
  const resetAllowance = await calculateDraftAllowance({
    plan: 'free',
    created_at: trialCreatedAt,
    daily_draft_count: 5,
    last_draft_date: getIstDateKey(now),
  }, 'mock-user', resetClient, nextIstMidnight);
  assert.equal(resetAllowance.allowed, true);
  assert.equal(resetAllowance.used, 0);

  const nextDayReservation = await reserveTrialDraftAllowance('mock-user', resetClient, nextIstMidnight);
  assert.equal(nextDayReservation.reserved, true);
  assert.equal(resetClient.state.daily_draft_count, 1);
  assert.equal(resetClient.state.last_draft_date, getIstDateKey(nextIstMidnight));
});

test('IST date boundary is 18:30 UTC and differs from UTC midnight', () => {
  assert.equal(getIstDateKey(new Date('2026-11-15T18:29:59.999Z')), '2026-11-15');
  assert.equal(getIstDateKey(new Date('2026-11-15T18:30:00.000Z')), '2026-11-16');
  assert.deepEqual(getIstDayRange(new Date('2026-11-15T18:30:00.000Z')), {
    start: '2026-11-15T18:30:00.000Z',
    end: '2026-11-16T18:30:00.000Z',
  });
});

test('legacy user remains on the pre-cutoff path and the stored limit is not mutated', async () => {
  const profile = { id: 'mock-user', plan: 'free', created_at: beforeCutoff, drafts_limit: 5 };
  const allowance = await calculateDraftAllowance(
    profile,
    'mock-user',
    fakeSupabase({ drafts: [{ user_id: 'mock-user' }, { user_id: 'mock-user' }] }),
    new Date(cutoffMs + 10 * 24 * 60 * 60 * 1000),
  );
  assert.equal(getFreeTrialStatus(profile.created_at, new Date()), null);
  assert.equal(allowance.allowed, true);
  assert.equal(allowance.remaining, 3);
  assert.equal(profile.drafts_limit, 5);
  assert.equal(getExistingPlanDraftLimit('free'), 5);
});

test('legacy free allowance honors a stored limit that differs from the default', async () => {
  const profile = { id: 'mock-user', plan: 'free', created_at: beforeCutoff, drafts_limit: 3 };
  const allowance = await calculateDraftAllowance(
    profile,
    'mock-user',
    fakeSupabase({ drafts: Array.from({ length: 2 }, () => ({ user_id: 'mock-user' })) }),
    new Date(cutoffMs + 10 * 24 * 60 * 60 * 1000),
  );
  assert.equal(allowance.allowed, true);
  assert.equal(allowance.limit, profile.drafts_limit);
  assert.equal(allowance.remaining, 1);
  assert.equal(profile.drafts_limit, 3);
});

test('legacy user at zero receives the free-limit paywall code', async () => {
  const allowance = await calculateDraftAllowance({
    plan: 'free',
    created_at: beforeCutoff,
    drafts_limit: 5,
  }, 'mock-user', fakeSupabase({
    drafts: Array.from({ length: 5 }, () => ({ user_id: 'mock-user' })),
  }));
  assert.equal(allowance.allowed, false);
  assert.equal(allowance.reason, 'plan_limit');
  assert.match(route, /'FREE_LIMIT_REACHED'/);
});

test('active paid plans use legacy plan limits and never enter trial logic', async () => {
  for (const [plan, expectedLimit] of [['basic', 90], ['pro', 175]]) {
    const allowance = await calculateDraftAllowance({
      plan,
      created_at: trialCreatedAt,
    }, 'mock-user', fakeSupabase());
    assert.equal(allowance.allowed, true);
    assert.equal(allowance.limit, expectedLimit);
    assert.equal(allowance.isPro, true);
    assert.equal('trial' in allowance, false);
  }
});

test('active paid plan allowance ignores the trial-only daily counter', async () => {
  const now = new Date('2026-11-15T12:00:00.000Z');
  const allowance = await calculateDraftAllowance({
    plan: 'basic',
    created_at: trialCreatedAt,
    drafts_used: 10,
    daily_draft_count: 100,
    last_draft_date: getIstDateKey(now),
  }, 'mock-user', fakeSupabase(), now);

  assert.equal(allowance.limit, 90);
  assert.equal(allowance.used, 10);
  assert.equal(allowance.remaining, 80);
});

test('trial allowance remains blocked when its reservations remain but draft rows are deleted', async () => {
  const now = new Date('2026-11-15T12:00:00.000Z');
  const allowance = await calculateDraftAllowance({
    plan: 'free',
    created_at: trialCreatedAt,
    daily_draft_count: 5,
    last_draft_date: getIstDateKey(now),
  }, 'mock-user', fakeSupabase(), now);

  assert.equal(allowance.allowed, false);
  assert.equal(allowance.reason, 'daily_limit');
});

test('failed Gemini requests release the reserved profile count', async () => {
  const now = new Date('2026-11-15T12:00:00.000Z');
  const dayKey = getIstDateKey(now);
  const client = fakeSupabase({
    profile: { id: 'mock-user', daily_draft_count: 3, last_draft_date: dayKey },
  });
  await releaseTrialDraftReservation('mock-user', dayKey, client);
  assert.equal(client.state.daily_draft_count, 2);

  const catchBlock = route.slice(route.indexOf('} catch (error: any) {', route.indexOf('upstream = await fetch(url')));
  assert.ok(catchBlock.indexOf('releaseTrialDraftReservation') < catchBlock.indexOf("console.error('Gemini API error:'"));
});

test('deleting draft rows cannot bypass the trial daily cap after server reservations', async () => {
  const now = new Date('2026-11-15T12:00:00.000Z');
  const dayKey = getIstDateKey(now);
  const client = fakeSupabase({
    profile: { id: 'mock-user', daily_draft_count: 5, last_draft_date: dayKey },
    drafts: [],
  });
  const reservation = await reserveTrialDraftAllowance('mock-user', client, now);
  assert.equal(reservation.reserved, false);
  assert.equal(reservation.reason, 'daily_limit');
  assert.equal(client.state.daily_draft_count, 5);
});

test('both generate screens handle entitlement codes with the shared annual-default paywall', () => {
  for (const frontend of [generator, dynamicForm]) {
    assert.match(frontend, /'TRIAL_ENDED'/);
    assert.match(frontend, /'DAILY_LIMIT_REACHED'/);
    assert.match(frontend, /setPaywallOpen\(true\)/);
    assert.match(frontend, /<PricingPage/);
    assert.match(frontend, /checkDraftAllowance\(\)/);
  }
  assert.match(pricingRoute, /import PricingPage from '@\/components\/PricingPage'/);
  assert.match(pricing, /'Unlock Premium to draft more'/);
  assert.match(pricing, /useState<'monthly' \| 'annual'>\('annual'\)/);
});
