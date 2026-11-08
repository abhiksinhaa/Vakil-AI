const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cataloguePath = path.join(root, 'src', 'data', 'legalDocumentLibrary.ts');
const draftTypesPath = path.join(root, 'src', 'data', 'legalDraftTypes.ts');
const schemasPath = path.join(root, 'src', 'lib', 'draftSchemas.ts');
const reportPath = path.join(__dirname, 'legal_document_library_audit.txt');
const reportLines = [];
console.log = (...args) => reportLines.push(args.join(' '));

const catalogueSource = fs.readFileSync(cataloguePath, 'utf8');
const draftTypesSource = fs.readFileSync(draftTypesPath, 'utf8');
const schemasSource = fs.readFileSync(schemasPath, 'utf8');

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

function field(block, name) {
  const match = block.match(new RegExp(`\\b${name}:\\s*(['"])(.*?)\\1`));
  return match?.[2] ?? '';
}

function stringArray(block, name) {
  const match = block.match(new RegExp(`\\b${name}:\\s*\\[([^\\]]*)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/(['"])(.*?)\1/g)].map((item) => item[2]);
}

const catalogStart = catalogueSource.indexOf('export const LEGAL_DOCUMENT_CATALOG');
const catalogSourceBody = catalogueSource.slice(catalogStart);
const recordBlocks = [...catalogSourceBody.matchAll(/^\s{2}\{\n\s{4}id: '[\s\S]*?^\s{2}\},/gm)]
  .map((match) => match[0]);
const categorySourceStart = catalogueSource.indexOf('export const LEGAL_DOCUMENT_CATEGORIES');
const categorySourceEnd = catalogueSource.indexOf('] as const;', categorySourceStart);
const categoryNames = [...catalogueSource
  .slice(categorySourceStart, categorySourceEnd)
  .matchAll(/\{ id: '[^']+', name: '([^']+)'/g)]
  .map((match) => match[1]);

const records = recordBlocks.map((block, index) => ({
  index,
  id: field(block, 'id'),
  slug: field(block, 'slug'),
  name: field(block, 'name'),
  category: field(block, 'category'),
  applicableLaw: stringArray(block, 'applicable_law'),
  requiredFields: stringArray(block, 'required_fields'),
  generationStatus: field(block, 'generation_status'),
  implementationStatus: field(block, 'implementation_status'),
  hasGenerationTemplate: /\bhas_generation_template:\s*true\b/.test(block),
  legalReferenceVerified: /\blegal_reference_verified:\s*true\b/.test(block),
  normalizedName: normalize(field(block, 'name')),
}));

const uniqueCount = (items) => new Set(items).size;
const countValues = (items) => [...items.reduce((counts, value) => {
  counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}, new Map())];
const duplicatesByValue = (items) => {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1);
};

function tokenSimilarity(left, right) {
  const a = new Set(left.split(' '));
  const b = new Set(right.split(' '));
  const common = [...a].filter((token) => b.has(token)).length;
  return common / (a.size + b.size - common);
}

function editSimilarity(left, right) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }
  return 1 - row[right.length] / Math.max(left.length, right.length);
}

function bigramSimilarity(left, right) {
  const bigrams = (value) => {
    const padded = ` ${value} `;
    return new Set(Array.from({ length: Math.max(0, padded.length - 1) }, (_, index) => padded.slice(index, index + 2)));
  };
  const a = bigrams(left);
  const b = bigrams(right);
  const common = [...a].filter((gram) => b.has(gram)).length;
  return common / (a.size + b.size - common);
}

function isFiller(name) {
  return /\brelated relief\b|\brelief\s*#?\s*\d+\b|\b(?:document|draft|form|application|petition|notice|agreement)\s*#?\s*\d+\b|\{\s*(?:n|number|\d+)\s*\}/i.test(name)
    || /^application for .{0,80}\b(?:related relief|miscellaneous relief|other relief)\b/i.test(name);
}

const legalBasisTerms = /\b(bail|appeal|revision|review|execution|injunction|stay|condonation|restoration|amendment|caveat|contempt|eviction|mutation|rera|consumer|cheque|dishonou?r|fir|criminal|civil|divorce|maintenance|custody|marriage|succession|probate|tax|gst|income tax|arbitration|insolvency|company|winding up|registration|passport|information|rti|affidavit|decree|recovery|rent|wage|salary|employment|labour|property|land|permit|licence|license|complaint|petition|application under|application seeking|application for (leave|exemption|interim|anticipatory|regular|default|further|release|return|discharge|quashing|compounding|surrender|transfer|setting aside|setting-aside|summoning|appointment of commissioner|appointment of receiver|inspection of documents|additional evidence|withdrawal of suit|withdrawal of vakalatnama|local inspection|certification of copies|adjournment|extension of time|production|witnesses|attachment|garnishee|precept|cost|framing of issues|judgment on admission|cross[- ]examination|preservation of evidence|discovery|direction|receiver|recall of warrant|summoning additional accused|chargesheet|case records|closure report|expunging remarks|remission of sentence|suspension of sentence|production of accused|case diary|modification of sentence|writ of habeas corpus|habeas corpus|fair investigation|fresh investigation|investigation|early hearing|search and seizure|directions to police))\b/i;
function doubtfulReason(name) {
  if (/\b(checklist|due diligence report|case brief|case summary|legal research|legal opinion|guide|manual|handbook|directory|tracker|worksheet|calculator|template pack)\b/i.test(name)) {
    return 'Looks like a checklist, report, reference aid, or internal work product rather than an executed legal instrument or filing.';
  }
  if (/\b(clause|clauses|provision|provisions|schedule|annexure|index|list of dates|list of documents|synopsis)\b/i.test(name)) {
    return 'Looks like a component or attachment to another document, not a standalone document.';
  }
  if (/^application for /i.test(name) && !legalBasisTerms.test(name)) {
    return 'Broad or underspecified application title; no specific statute, procedural form, or identifiable relief is clear from the title alone.';
  }
  if (/\b(policy|framework|protocol|plan|register|record|certificate|form)\b/i.test(name)
      && !/\b(application form|registration form|notice form)\b/i.test(name)) {
    return 'May be an operational/policy record rather than a standalone legal drafting document; verify intended use.';
  }
  return '';
}

const duplicateGroups = [];
const nearMatchGroups = [];
const exactNameGroups = new Map();
for (const record of records) {
  if (!record.normalizedName) continue;
  const group = exactNameGroups.get(record.normalizedName) ?? [];
  group.push(record);
  exactNameGroups.set(record.normalizedName, group);
}
for (const group of exactNameGroups.values()) {
  if (new Set(group.map((record) => record.category)).size > 1) {
    duplicateGroups.push({ kind: 'exact', records: group });
  }
}

const candidatePairs = new Set();
const candidateBuckets = new Map();
for (const record of records) {
  const words = record.normalizedName.split(' ');
  for (const key of [`lead:${words[0]}`, `tail:${words.at(-1)}`]) {
    const bucket = candidateBuckets.get(key) ?? [];
    for (const other of bucket) {
      if (record.category === other.category) continue;
      const first = Math.min(record.index, other.index);
      const second = Math.max(record.index, other.index);
      candidatePairs.add(`${first}:${second}`);
    }
    bucket.push(record);
    candidateBuckets.set(key, bucket);
  }
}

for (const pair of candidatePairs) {
  const [leftIndex, rightIndex] = pair.split(':').map(Number);
  const left = records[leftIndex];
  const right = records[rightIndex];
  if (left.normalizedName === right.normalizedName) continue;
  const tokens = tokenSimilarity(left.normalizedName, right.normalizedName);
  if (tokens < 0.3) continue;
  const bigrams = bigramSimilarity(left.normalizedName, right.normalizedName);
  const edit = editSimilarity(left.normalizedName, right.normalizedName);
  if (tokens >= 0.8 || edit >= 0.86 || (bigrams >= 0.85 && tokens >= 0.3)) {
    nearMatchGroups.push({ records: [left, right], tokens, bigrams, edit });
  }
}

const duplicateAdjacency = new Map();
for (const group of duplicateGroups) {
  for (const record of group.records) {
    const neighbors = duplicateAdjacency.get(record.index) ?? new Set();
    for (const other of group.records) {
      if (other.index !== record.index) neighbors.add(other.index);
    }
    duplicateAdjacency.set(record.index, neighbors);
  }
}
const duplicateExtras = new Set();
const visitedDuplicateIndexes = new Set();
for (const index of duplicateAdjacency.keys()) {
  if (visitedDuplicateIndexes.has(index)) continue;
  const component = [];
  const queue = [index];
  visitedDuplicateIndexes.add(index);
  while (queue.length) {
    const current = queue.pop();
    component.push(current);
    for (const neighbor of duplicateAdjacency.get(current) ?? []) {
      if (visitedDuplicateIndexes.has(neighbor)) continue;
      visitedDuplicateIndexes.add(neighbor);
      queue.push(neighbor);
    }
  }
  component.sort((a, b) => a - b);
  component.slice(1).forEach((duplicateIndex) => duplicateExtras.add(duplicateIndex));
}

const fillerRecords = records.filter((record) => isFiller(record.name));
const doubtfulRecords = records
  .map((record) => ({ ...record, reason: doubtfulReason(record.name) }))
  .filter((record) => record.reason);

const fillerIndexes = new Set(fillerRecords.map((record) => record.index));
const doubtfulIndexes = new Set(doubtfulRecords.map((record) => record.index));

const categoryRows = categoryNames.map((category) => {
  const inCategory = records.filter((record) => record.category === category);
  const fillerCount = inCategory.filter((record) => fillerIndexes.has(record.index)).length;
  const doubtfulCount = inCategory.filter((record) => doubtfulIndexes.has(record.index) && !fillerIndexes.has(record.index)).length;
  const duplicateCount = inCategory.filter((record) => duplicateExtras.has(record.index) && !fillerIndexes.has(record.index)).length;
  const excluded = new Set([
    ...inCategory.filter((record) => fillerIndexes.has(record.index)).map((record) => record.index),
    ...inCategory.filter((record) => duplicateExtras.has(record.index)).map((record) => record.index),
    ...inCategory.filter((record) => doubtfulIndexes.has(record.index)).map((record) => record.index),
  ]);
  return {
    category,
    raw: inCategory.length,
    duplicates: duplicateCount,
    filler: fillerCount,
    doubtful: doubtfulCount,
    survivors: inCategory.length - excluded.size,
  };
});

function parseDraftTypes(source) {
  const start = source.indexOf('export const DRAFT_TYPES');
  const end = source.indexOf('\n};', start);
  const body = source.slice(start, end);
  return [...body.matchAll(/^\s{2}'([^']+)':\s*\{\s*\n\s{4}label:\s*"([^"]+)"/gm)]
    .map((match) => ({ key: match[1], name: match[2], source: 'DRAFT_TYPES' }));
}

function parseSchemaNames(source) {
  const start = source.indexOf('export const DOCUMENT_SCHEMAS');
  const end = source.indexOf('\n};', start);
  const body = source.slice(start, end);
  return [...body.matchAll(/^\s{2}'([^']+)':\s*\{/gm)]
    .map((match) => ({ key: match[1], name: match[1], source: 'DOCUMENT_SCHEMAS' }));
}

const templates = [...parseDraftTypes(draftTypesSource), ...parseSchemaNames(schemasSource)];
const templateRows = templates.map((template) => {
  const normalized = normalize(template.name);
  const exact = records.find((record) => record.normalizedName === normalized);
  const close = exact ? null : records
    .map((record) => ({ record, score: bigramSimilarity(normalized, record.normalizedName) }))
    .sort((a, b) => b.score - a.score)[0];
  return { ...template, exact, close: close && close.score >= 0.5 ? close : null };
});

const lawsByCategory = new Map();
for (const record of records) {
  const laws = lawsByCategory.get(record.category) ?? new Map();
  for (const law of record.applicableLaw) laws.set(law, (laws.get(law) ?? 0) + 1);
  lawsByCategory.set(record.category, laws);
}

const mismatches = [];
for (const record of records) {
  for (const law of record.applicableLaw) {
    let reason = '';
    if (/indian evidence act/i.test(law) && /\b(notice|agreement|deed|affidavit|policy|letter)\b/i.test(record.name)) {
      reason = 'Evidence Act appears category-pasted on a non-evidence-specific document.';
    } else if (/hindu marriage act/i.test(law) && !/\b(divorce|marriage|matrimonial|restitution|judicial separation)\b/i.test(record.name)) {
      reason = 'Hindu Marriage Act appears on a title not facially specific to Hindu matrimonial relief.';
    } else if (/^contract act, 1872$/i.test(law)) {
      reason = 'Act title appears abbreviated; verify the official Act name and whether it applies to this document.';
    } else if (/^posh act, 2013$/i.test(law)) {
      reason = 'Act title is an acronym; verify and use the official Act name and document-specific relevance.';
    } else if (/gst act,?\s*2017/i.test(law)) {
      reason = 'Act name may be imprecise; verify against the official title “Central Goods and Services Tax Act, 2017” or the applicable State Act.';
    } else if (lawsByCategory.get(record.category)?.size > 3) {
      reason = 'Category contains a broad multi-Act mapping; verify this document-specific assignment.';
    }
    if (reason) mismatches.push({ record, law, reason });
  }
}

const idDuplicates = duplicatesByValue(records.map((record) => record.id));
const slugDuplicates = duplicatesByValue(records.map((record) => record.slug));
const normalizedNameDuplicates = duplicatesByValue(records.map((record) => record.normalizedName));
const defaultRequired = records.filter((record) =>
  record.requiredFields.length === 2
  && record.requiredFields[0] === 'party_details'
  && record.requiredFields[1] === 'matter_summary',
);

console.log('LEGAL DOCUMENT CATALOGUE AUDIT (read-only; generated catalogue treated as untrusted)');
console.log(`Source: ${path.relative(root, cataloguePath)}`);
console.log(`Records: ${records.length}`);
console.log(`Unique ids: ${uniqueCount(records.map((record) => record.id))}`);
console.log(`Unique slugs: ${uniqueCount(records.map((record) => record.slug))}`);
console.log(`Unique normalized names: ${uniqueCount(records.map((record) => record.normalizedName))}`);
console.log(`Duplicate ids: ${idDuplicates.map(([value, count]) => `${value} (${count})`).join('; ') || 'none'}`);
console.log(`Duplicate slugs: ${slugDuplicates.map(([value, count]) => `${value} (${count})`).join('; ') || 'none'}`);
console.log(`Duplicate normalized names: ${normalizedNameDuplicates.map(([value, count]) => `${value} (${count})`).join('; ') || 'none'}`);
console.log(`generation_status counts: ${countValues(records.map((record) => record.generationStatus)).map(([value, count]) => `${value} (${count})`).join('; ')}`);
console.log(`implementation_status counts: ${countValues(records.map((record) => record.implementationStatus)).map(([value, count]) => `${value} (${count})`).join('; ')}`);
console.log(`Records with has_generation_template=true: ${records.filter((record) => record.hasGenerationTemplate).length}`);
console.log(`Records with legal_reference_verified=true: ${records.filter((record) => record.legalReferenceVerified).length}`);
console.log(`Default placeholder required_fields ["party_details","matter_summary"]: ${defaultRequired.length}`);

console.log('\nCATEGORY AUDIT TABLE (duplicates counts redundant exact-name copies after retaining the first record in each cross-category group; near-name candidates are listed separately and not automatically removed; survivors exclude exact duplicates, filler, and doubtful records):');
console.log('| Category | Raw count | Duplicates | Filler | Doubtful | Survivors |');
console.log('|---|---:|---:|---:|---:|---:|');
for (const row of categoryRows) {
  console.log(`| ${row.category} | ${row.raw} | ${row.duplicates} | ${row.filler} | ${row.doubtful} | ${row.survivors} |`);
}

console.log(`\nCROSS-CATEGORY EXACT DUPLICATE GROUPS (${duplicateGroups.length}):`);
for (const group of duplicateGroups) {
  console.log(`- ${group.kind}${group.tokens ? ` (token=${group.tokens.toFixed(2)}${group.bigrams ? `, bigram=${group.bigrams.toFixed(2)}` : ''})` : ''}: ${group.records.map((record) => `${record.name} [${record.category}; ${record.id}]`).join(' <> ')}`);
}

console.log(`\nCROSS-CATEGORY NEAR-NAME CANDIDATES (${nearMatchGroups.length}; heuristic candidates only, not counted as duplicates):`);
for (const group of nearMatchGroups) {
  console.log(`- ${group.records.map((record) => `${record.name} [${record.category}; ${record.id}]`).join(' <> ')} (edit=${group.edit.toFixed(2)}, token=${group.tokens.toFixed(2)}, bigram=${group.bigrams.toFixed(2)})`);
}

console.log(`\nFILLER / PLACEHOLDER ENTRIES (${fillerRecords.length}):`);
for (const record of fillerRecords) console.log(`- ${record.name} [${record.category}; ${record.id}]`);

console.log(`\nDOUBTFUL: POSSIBLY NOT A STANDALONE LEGAL DOCUMENT (${doubtfulRecords.length}; heuristic flags for review, not deletion):`);
for (const record of doubtfulRecords) console.log(`- ${record.name} [${record.category}; ${record.id}] — ${record.reason}`);

console.log('\nCATEGORY-LEVEL APPLICABLE_LAW ASSIGNMENTS (law: number of records assigned):');
for (const category of categoryNames) {
  const laws = lawsByCategory.get(category) ?? new Map();
  console.log(`- ${category}: ${[...laws].map(([law, count]) => `${law} (${count})`).join('; ') || '(none)'}`);
}
console.log('Category-wide mapping note: where each law count equals the category raw count, the same Act was assigned to every entry in that category; this is a blanket mapping, not document-level verification.');
console.log(`\nAPPLICABLE_LAW MISMATCH FLAGS (${mismatches.length}; heuristic, review required):`);
for (const item of mismatches) {
  console.log(`- ${item.record.name} [${item.record.category}; ${item.record.id}] — ${item.law}: ${item.reason}`);
}

console.log('\nWORKING TEMPLATE MAP (exact catalogue match, then nearest lexical match where bigram similarity >= 0.50; nearest is not a verified equivalence):');
for (const source of ['DRAFT_TYPES', 'DOCUMENT_SCHEMAS']) {
  const sourceRows = templateRows.filter((item) => item.source === source);
  const exactCount = sourceRows.filter((item) => item.exact).length;
  const closeCount = sourceRows.filter((item) => !item.exact && item.close).length;
  console.log(`- ${source}: ${sourceRows.length} entries; ${exactCount} exact matches, ${closeCount} close-but-unconfirmed matches, ${sourceRows.length - exactCount - closeCount} no close match.`);
}
for (const item of templateRows) {
  const mapped = item.exact
    ? `exact: ${item.exact.name} [${item.exact.category}; ${item.exact.id}]`
    : item.close
      ? `closest only (${item.close.score.toFixed(2)}, not asserted equivalent): ${item.close.record.name} [${item.close.record.category}; ${item.close.record.id}]`
      : 'no catalogue match';
  console.log(`- ${item.source}: ${item.name} [${item.key}] — ${mapped}`);
}

console.log('\nBASELINE WORKING TYPES (all existing DRAFT_TYPES entries and DOCUMENT_SCHEMAS are preserved; schema-backed types are the implemented forms):');
for (const item of templates.filter((template) => template.source === 'DRAFT_TYPES' || template.source === 'DOCUMENT_SCHEMAS')) {
  console.log(`- ${item.source}: ${item.name}${item.source === 'DRAFT_TYPES' ? ` [${item.key}]` : ''}`);
}

fs.writeFileSync(reportPath, `${reportLines.join('\n')}\n`, 'utf8');
process.stdout.write(`Wrote read-only audit report to ${path.relative(root, reportPath)}\n`);
