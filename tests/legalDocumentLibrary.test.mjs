import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogueSource = fs.readFileSync(
  path.join(root, 'src', 'data', 'legalDocumentLibrary.ts'),
  'utf8',
);
const libraryPageSource = fs.readFileSync(
  path.join(root, 'src', 'components', 'LibraryPage.tsx'),
  'utf8',
);
const draftTypesSource = fs.readFileSync(
  path.join(root, 'src', 'data', 'legalDraftTypes.ts'),
  'utf8',
);
const schemasSource = fs.readFileSync(
  path.join(root, 'src', 'lib', 'draftSchemas.ts'),
  'utf8',
);
const auditReport = fs.readFileSync(
  path.join(root, 'scratch', 'legal_document_library_audit.txt'),
  'utf8',
);
const catalogStart = catalogueSource.indexOf('export const LEGAL_DOCUMENT_CATALOG');
const reviewStart = catalogueSource.indexOf('export const LEGAL_DOCUMENT_NEEDS_REVIEW');
const countStart = catalogueSource.indexOf('export const LEGAL_DOCUMENT_COUNT');
assert.ok(catalogStart >= 0 && reviewStart > catalogStart, 'Main and review catalogues must be exported.');
assert.ok(countStart > reviewStart, 'Catalogue counts must follow the review catalogue.');
const catalogText = catalogueSource.slice(catalogStart, reviewStart);
const records = [...catalogText.matchAll(/^  \{\n([\s\S]*?)^  \},$/gm)].map((match) => match[1]);
const reviewText = catalogueSource.slice(reviewStart, countStart);
const reviewRecords = [...reviewText.matchAll(/^  \{\n([\s\S]*?)^  \},$/gm)].map((match) => match[1]);

function field(record, name) {
  const match = record.match(new RegExp(`^\\s{4}${name}:\\s*(.+),$`, 'm'));
  return match?.[1] ?? '';
}

function stringField(record, name) {
  const value = field(record, name);
  return value.startsWith('"') ? JSON.parse(value) : value;
}

function normalize(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const categories = [
  'Civil Litigation',
  'Criminal Law and Procedure',
  'Legal Notices',
  'Agreements and Contracts',
  'Family Law',
  'Property and Real Estate',
  'Corporate and Commercial Law',
  'Employment and Labour Law',
  'Consumer, Banking and Financial Disputes',
  'Taxation and Regulatory Documents',
  'Intellectual Property and Technology',
  'Arbitration, Mediation, and Insolvency',
  'General Legal Documents',
];

test('main catalogue has unique ids, slugs, and normalized names', () => {
  assert.ok(records.length > 0, 'Main catalogue must contain records.');
  const ids = records.map((record) => stringField(record, 'id'));
  const slugs = records.map((record) => stringField(record, 'slug'));
  const names = records.map((record) => normalize(stringField(record, 'name')));

  assert.equal(new Set(ids).size, ids.length, 'Duplicate catalogue ids found.');
  assert.equal(new Set(slugs).size, slugs.length, 'Duplicate catalogue slugs found.');
  assert.equal(new Set(names).size, names.length, 'Duplicate normalized catalogue names found.');
});

test('main catalogue has no filler or placeholder names', () => {
  const fillerPatterns = [
    /\brelated relief\b/i,
    /\b(?:document|draft|form|application|petition|notice|agreement)\s*#?\s*\d+\b/i,
    /\{\s*(?:n|number|\d+)\s*\}/i,
    /^application for (?:x|other relief|miscellaneous relief)$/i,
  ];

  for (const record of records) {
    const name = stringField(record, 'name');
    assert.ok(
      !fillerPatterns.some((pattern) => pattern.test(name)),
      `Filler/placeholder name found: ${name}`,
    );
  }
});

test('all 13 primary categories have at least one main-catalogue record', () => {
  const present = new Set(records.map((record) => stringField(record, 'category')));
  for (const category of categories) {
    assert.ok(present.has(category), `No main-catalogue record for ${category}.`);
  }
});

test('records carry no unverified laws or generic required-field placeholders', () => {
  for (const record of records) {
    assert.equal(field(record, 'applicable_law'), '[]', `${stringField(record, 'name')} has an unverified law mapping.`);
    assert.equal(field(record, 'legal_reference_verified'), 'false');
    assert.equal(stringField(record, 'review_status'), 'legal_review_required');
    assert.notEqual(field(record, 'required_fields'), '["party_details","matter_summary"]');
  }
});

test('all existing draft types and form schemas are represented', () => {
  const draftStart = draftTypesSource.indexOf('export const DRAFT_TYPES');
  const draftEnd = draftTypesSource.indexOf('\n};', draftStart);
  const schemaStart = schemasSource.indexOf('export const DOCUMENT_SCHEMAS');
  const schemaEnd = schemasSource.indexOf('\n};', schemaStart);
  const draftKeys = [...draftTypesSource.slice(draftStart, draftEnd).matchAll(/^\s{2}'([^']+)':\s*\{/gm)]
    .map((match) => match[1]);
  const schemaNames = [...schemasSource.slice(schemaStart, schemaEnd).matchAll(/^\s{2}'([^']+)':\s*\{/gm)]
    .map((match) => match[1]);
  const sourceReferences = records.flatMap((record) => JSON.parse(field(record, 'source_references')));

  assert.equal(draftKeys.length, 126);
  assert.equal(schemaNames.length, 20);
  for (const key of draftKeys) {
    assert.ok(sourceReferences.includes(`DRAFT_TYPES:${key}`), `Missing DRAFT_TYPES entry ${key}.`);
  }
  for (const name of schemaNames) {
    assert.ok(sourceReferences.includes(`DOCUMENT_SCHEMAS:${name}`), `Missing DOCUMENT_SCHEMAS entry ${name}.`);
  }
});

test('all audited doubtful legacy IDs remain in needs_review', () => {
  const doubtfulSection = auditReport.slice(
    auditReport.indexOf('DOUBTFUL:'),
    auditReport.indexOf('\nCATEGORY-LEVEL APPLICABLE_LAW'),
  );
  const doubtfulIds = [...doubtfulSection.matchAll(/^- .+ \[[^;\]]+; ([A-Z]+-\d+)\] — .+$/gm)]
    .map((match) => match[1]);
  const reviewIds = new Set(
    reviewRecords.flatMap((record) => JSON.parse(field(record, 'source_catalogue_ids'))),
  );

  assert.equal(doubtfulIds.length, 54);
  for (const id of doubtfulIds) assert.ok(reviewIds.has(id), `Doubtful legacy ID ${id} is not in needs_review.`);
});

test('library UI uses the real inventory count and review-aware template status', () => {
  assert.doesNotMatch(libraryPageSource, /\b662\b/, 'UI must not expose the former target count.');
  assert.match(libraryPageSource, /LEGAL_DOCUMENT_CATALOG\.length/);
  assert.match(libraryPageSource, /'Coming soon'/);
  assert.match(libraryPageSource, /templates available · legal review required/);
  assert.match(libraryPageSource, /Template available · Legal review required/);
});
