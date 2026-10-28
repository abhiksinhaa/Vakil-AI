import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registrySource = fs.readFileSync(
  path.join(root, 'src', 'lib', 'legal-documents', 'registry.ts'),
  'utf8',
);
const catalogueSource = fs.readFileSync(
  path.join(root, 'src', 'data', 'legalDocumentLibrary.ts'),
  'utf8',
);
const libraryPageSource = fs.readFileSync(
  path.join(root, 'src', 'components', 'LibraryPage.tsx'),
  'utf8',
);
const formSource = fs.readFileSync(
  path.join(root, 'src', 'components', 'DynamicDocumentForm.tsx'),
  'utf8',
);
const draftTypeSelectorSource = fs.readFileSync(
  path.join(root, 'src', 'components', 'DraftTypeSelector.tsx'),
  'utf8',
);
const draftGeneratorSource = fs.readFileSync(
  path.join(root, 'src', 'components', 'DraftGenerator.tsx'),
  'utf8',
);

function extractTopLevelBlocks(source, sectionStart, sectionEnd, firstProperty) {
  const start = source.indexOf(sectionStart);
  const end = sectionEnd ? source.indexOf(sectionEnd, start) : source.length;
  assert.ok(start >= 0 && end > start, `Could not find section ${sectionStart}.`);
  const lines = source.slice(start, end).split(/\r?\n/);
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^  \{$/.test(lines[index]) || !new RegExp(`^    ${firstProperty}:`).test(lines[index + 1] ?? '')) {
      continue;
    }
    const block = [];
    while (index < lines.length) {
      block.push(lines[index]);
      if (/^  \},$/.test(lines[index])) break;
      index += 1;
    }
    blocks.push(block.join('\n'));
  }
  return blocks;
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

function readStringArray(block, key) {
  const match = block.match(new RegExp(`^\\s{4}${key}: \\[([^\\]]*)\\]`, 'm'));
  return match ? [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]) : [];
}

const definitions = extractTopLevelBlocks(registrySource, 'export const DYNAMIC_DOCUMENTS', 'export function normalizeDocumentName', 'key');
const catalog = extractTopLevelBlocks(catalogueSource, 'export const LEGAL_DOCUMENT_CATALOG', 'export const LEGAL_DOCUMENT_NEEDS_REVIEW', 'id');
const catalogueNames = new Set();
for (const record of catalog) {
  const name = record.match(/^\s{4}name: "([^"]+)"/m)?.[1];
  if (name) catalogueNames.add(normalize(name));
  for (const alias of JSON.parse(record.match(/^\s{4}aliases: (\[[^\n]*\])/m)?.[1] ?? '[]')) {
    catalogueNames.add(normalize(alias));
  }
}

test('dynamic registry defines the approved 100 distinct document workflows', () => {
  const keys = definitions.map((block) => block.match(/^\s{4}key: '([^']+)'/m)?.[1]);
  assert.equal(definitions.length, 100);
  assert.ok(keys.every(Boolean));
  assert.equal(new Set(keys).size, 100);
});

test('approved next batch adds the exact 50 catalogue slugs', () => {
  const keys = new Set(definitions.map((block) => block.match(/^\s{4}key: '([^']+)'/m)?.[1]));
  const approvedKeys = [
    'minutes-of-general-meeting', 'notice-of-board-meeting', 'notice-of-general-meeting',
    'corporate-indemnity', 'corporate-guarantee', 'commercial-settlement-agreement',
    'asset-purchase-agreement', 'business-transfer-agreement', 'contract-amendment',
    'contract-renewal', 'contract-termination', 'business-dispute-notice',
    'gst-registration-related-representations', 'income-tax-rectification-applications',
    'income-tax-appeal-related-documents', 'tax-demand-representations',
    'tax-refund-representations', 'tds-related-representations', 'regulatory-representations',
    'licence-applications', 'renewal-applications', 'compliance-declarations',
    'regulatory-show-cause-notice-replies', 'public-grievance-applications',
    'administrative-appeal-documents', 'copyright-infringement-notice',
    'copyright-licence-agreement', 'ip-ownership-declaration', 'source-code-escrow-agreement',
    'technology-transfer-agreement', 'website-terms-and-conditions', 'cybercrime-complaint',
    'takedown-request', 'platform-grievance', 'domain-dispute-correspondence',
    'ip-assignment-agreement', 'technology-consultancy-agreement', 'appointment-letter',
    'probation-letter', 'salary-revision-letter', 'warning-letter', 'show-cause-notice',
    'domestic-enquiry-notice', 'full-and-final-settlement-statement',
    'unpaid-salary-demand-notice', 'partnership-deed', 'software-development-agreement',
    'promissory-note', 'sale-deed', 'lease-deed',
  ];

  assert.equal(approvedKeys.length, 50);
  for (const key of approvedKeys) assert.ok(keys.has(key), `Missing approved workflow ${key}.`);
});

test('each workflow has document-specific fields, structure, and generation instructions', () => {
  for (const block of definitions) {
    const name = block.match(/^\s{4}name: '([^']+)'/m)?.[1] ?? 'Unknown document';
    const fieldCount = [...block.matchAll(/\bf\('/g)].length;
    const sections = block.match(/^\s{4}templateSections: \[([^\]]*)\]/m)?.[1] ?? '';

    assert.ok(fieldCount >= 4, `${name} needs at least four document-specific fields.`);
    assert.ok([...sections.matchAll(/'[^']+'/g)].length >= 5, `${name} needs a structured template.`);
    assert.match(block, /^\s{4}geminiInstructions: '[^']+/m, `${name} is missing generation instructions.`);
  }
});

test('each dynamic workflow maps to a main catalogue record or catalogue alias', () => {
  const missing = [];
  for (const block of definitions) {
    const name = block.match(/^\s{4}name: '([^']+)'/m)?.[1];
    const aliases = readStringArray(block, 'catalogueNames');
    if (![name, ...aliases].some((candidate) => catalogueNames.has(normalize(candidate)))) {
      missing.push(name);
    }
  }
  assert.deepEqual(missing, [], `Dynamic workflows without a catalogue entry: ${missing.join(', ')}`);
});

test('generate selector adds catalogue-backed dynamic workflows without replacing existing types', () => {
  assert.match(draftTypeSelectorSource, /import \{ MATTERS, MATTER_SUBTYPES, DRAFT_TYPES \}/);
  assert.match(draftTypeSelectorSource, /LEGAL_DOCUMENT_CATALOG/);
  assert.match(draftTypeSelectorSource, /LEGAL_DOCUMENT_CATEGORIES/);
  assert.match(draftTypeSelectorSource, /DYNAMIC_DOCUMENTS/);
  assert.match(draftTypeSelectorSource, /existingDropdownNames\.has/);
  assert.match(draftTypeSelectorSource, /subcategory: catalogueRecord\.subcategory/);
  assert.match(draftTypeSelectorSource, /MATTERS\.map/);
  assert.match(draftTypeSelectorSource, /dynamicOption\.document\.templateSections/);
  assert.match(draftGeneratorSource, /router\.push\(`\/documents\/\$\{data\.dynamicDocumentKey\}`\)/);
});

test('dynamic form uses the shared validation, entitlement, generation, and save paths', () => {
  assert.match(formSource, /validateDynamicDocument\(definition, values\)/);
  assert.match(formSource, /checkDraftAllowance\(\)/);
  assert.match(formSource, /generateLegalDraft\(/);
  assert.match(formSource, /saveDraft\(/);
  assert.match(formSource, /trackUsage: true/);
  assert.match(libraryPageSource, /href=\{`\/documents\/\$\{dynamicDocument\.key\}`\}/);
});
