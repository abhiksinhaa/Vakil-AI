import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { getActiveFields, validateDynamicDocument } from '../src/lib/legal-documents/engine.ts';
import { getDynamicDocument } from '../src/lib/legal-documents/registry.ts';
import { fetchWithTimeout } from '../src/lib/geminiHttp.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const route = read('app/api/gemini/route.ts');
const page = read('app/documents/[documentKey]/page.tsx');
const migration = read('docs/pending-security-migration/20261027000000_dynamic_document_security.sql');
const form = read('src/components/DynamicDocumentForm.tsx');
const client = read('src/lib/claude.ts');

test('draft rows are restricted to their owner for read, insert, update, and delete', () => {
  assert.match(migration, /ALTER TABLE public\.drafts ENABLE ROW LEVEL SECURITY/);
  for (const action of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    assert.match(migration, new RegExp(`ON public\\.drafts\\s+FOR ${action}[\\s\\S]*?auth\\.uid\\(\\)`));
  }
  assert.match(migration, /WITH CHECK \(user_id = \(SELECT auth\.uid\(\)\)\)/);
});

test('generation API requires verified auth and enforces allowance server-side', () => {
  assert.match(route, /await requireUser\(req\)/);
  assert.match(route, /Authentication required\./);
  assert.match(route, /calculateDraftAllowance\(profile as any, userId, supabaseAdmin\)/);
  assert.match(route, /if \(!allowance\.allowed\)/);
});

test('dynamic document page keeps the existing protected UI boundary', () => {
  assert.match(page, /<Protected>/);
  assert.match(form, /if \(!session\?\.user\?\.id\)/);
});

test('server resolves dynamic document court context and ignores client context', () => {
  assert.match(form, /dynamicDocumentKey: definition\.key/);
  assert.match(client, /dynamicDocumentKey: formData\.dynamicDocumentKey/);
  assert.match(route, /getDynamicDocument\(dynamicDocumentKey\)/);
  assert.match(route, /delete body\.dynamicDocumentContext/);
  assert.match(route, /\(!dynamicDocument \|\| dynamicDocument\.courtFiling\)/);
  assert.match(route, /if \(dynamicDocumentKey && !dynamicDocument\)/);
});

test('library labels available workflows as templates requiring legal review', () => {
  const library = read('src/components/LibraryPage.tsx');
  assert.match(library, /templates available · legal review required/);
  assert.match(library, /Template available · Legal review required/);
  assert.doesNotMatch(library, /'Ready'/);
  assert.match(route, /delete body\.dynamicDocumentContext/);
});

test('rate-limit migration remains pending and generation does not depend on it', () => {
  assert.doesNotMatch(route, /consume_api_rate_limit|GEMINI_REQUEST_LIMIT|GEMINI_RATE_LIMIT_WINDOW_SECONDS/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.api_rate_limits/);
  assert.match(migration, /ON CONFLICT \(user_id, endpoint\) DO UPDATE/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.consume_api_rate_limit[\s\S]*TO service_role/);
  assert.equal(
    fs.existsSync(path.join(root, 'supabase', 'migrations', '20261027000000_dynamic_document_security.sql')),
    false,
  );
});

test('empty submissions are rejected', () => {
  const definition = getDynamicDocument('non-disclosure-agreement');
  const errors = validateDynamicDocument(definition, {});

  assert.ok(errors.length > 0);
});

test('missing required fields are reported by label', () => {
  const definition = getDynamicDocument('non-disclosure-agreement');
  const errors = validateDynamicDocument(definition, {});

  assert.ok(errors.includes('Disclosing party legal details is required.'));
  assert.ok(errors.includes('Permitted purpose for disclosure is required.'));
});

test('invalid date input is rejected', () => {
  const definition = getDynamicDocument('legal-notice');
  const invalidFormat = validateDynamicDocument(definition, {
    sender: 'Synthetic sender',
    recipient: 'Synthetic recipient',
    relationship: 'Synthetic transaction',
    transaction_date: 'not-a-date',
    facts: 'Synthetic facts',
    demand: 'Synthetic demand',
  });
  const invalidCalendarDate = validateDynamicDocument(definition, {
    sender: 'Synthetic sender',
    recipient: 'Synthetic recipient',
    relationship: 'Synthetic transaction',
    transaction_date: '2026-02-31',
    facts: 'Synthetic facts',
    demand: 'Synthetic demand',
  });

  assert.ok(invalidFormat.includes('Relevant transaction date must be a valid date.'));
  assert.ok(invalidCalendarDate.includes('Relevant transaction date must be a valid date.'));
});

test('conditional fields are active only when their controlling answer matches', () => {
  const definition = getDynamicDocument('regular-bail');
  const hiddenFields = getActiveFields(definition, { prior_bail: 'No' });
  const activeFields = getActiveFields(definition, { prior_bail: 'Yes' });
  const detailsField = definition.fields.find((field) => field.id === 'prior_bail_details');

  assert.ok(!hiddenFields.includes(detailsField));
  assert.ok(activeFields.includes(detailsField));
  assert.ok(validateDynamicDocument(definition, { prior_bail: 'No' })
    .every((error) => !error.startsWith(`${detailsField.label} `)));
  assert.ok(validateDynamicDocument(definition, { prior_bail: 'Yes' })
    .includes(`${detailsField.label} is required.`));
});

test('generation fetch failures are surfaced', async () => {
  await assert.rejects(
    fetchWithTimeout('/api/gemini', { method: 'POST' }, 100, async () => {
      throw new Error('simulated AI request failure');
    }),
    /simulated AI request failure/,
  );
});

test('generation timeout aborts and returns an explicit timeout error', async () => {
  const fetcher = (_input, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });

  await assert.rejects(
    fetchWithTimeout('/api/gemini', { method: 'POST' }, 5, fetcher),
    /Draft generation timed out/,
  );
});
