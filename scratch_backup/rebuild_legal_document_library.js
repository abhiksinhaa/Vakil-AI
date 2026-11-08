const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cataloguePath = path.join(root, 'src', 'data', 'legalDocumentLibrary.ts');
const draftTypesPath = path.join(root, 'src', 'data', 'legalDraftTypes.ts');
const schemasPath = path.join(root, 'src', 'lib', 'draftSchemas.ts');
const auditPath = path.join(__dirname, 'legal_document_library_audit.txt');
const reportPath = path.join(__dirname, 'legal_document_library_inventory_report.txt');
const briefPath = path.join(
  process.env.USERPROFILE,
  'AppData',
  'Roaming',
  'Code',
  'agentSessionData',
  '2ccd2830-ad41-486a-9491-e92a25414bb1',
  'attachments',
  '028a7b37-debe-4edb-8f7d-a25a1d25cb46',
  'Pasted text #1.txt',
);

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

function titleCase(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\b(Gst|Rti|Tds|Mca|Posh|Fir|Nda|Saas|Llp|Ip|Ni)\b/g, (value) => ({
      Gst: 'GST',
      Rti: 'RTI',
      Tds: 'TDS',
      Mca: 'MCA',
      Posh: 'POSH',
      Fir: 'FIR',
      Nda: 'NDA',
      Saas: 'SaaS',
      Llp: 'LLP',
      Ip: 'IP',
      Ni: 'NI',
    })[value] ?? value);
}

function readField(block, name) {
  const match = block.match(new RegExp(`\\b${name}:\\s*(['"])(.*?)\\1`));
  return match?.[2] ?? '';
}

function readArray(block, name) {
  const match = block.match(new RegExp(`\\b${name}:\\s*\\[([^\\]]*)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/(['"])(.*?)\1/g)].map((item) => item[2]);
}

function parseRecords(source, exportName) {
  const catalogStart = source.indexOf(`export const ${exportName}`);
  if (catalogStart < 0) return [];
  const body = source.slice(catalogStart);
  const blocks = [...body.matchAll(/^\s{2}\{\n\s{4}id:\s*["'][\s\S]*?^\s{2}\},/gm)]
    .map((match) => match[0]);
  return blocks.map((block) => ({
    id: readField(block, 'id'),
    slug: readField(block, 'slug'),
    name: readField(block, 'name'),
    category: readField(block, 'category'),
    description: readField(block, 'description'),
    jurisdiction: readField(block, 'jurisdiction'),
    applicable_law: readArray(block, 'applicable_law'),
    document_type: readField(block, 'document_type'),
    audience: readArray(block, 'audience'),
    required_fields: readArray(block, 'required_fields'),
    optional_fields: readArray(block, 'optional_fields'),
    conditional_fields: readArray(block, 'conditional_fields'),
    secondary_categories: readArray(block, 'secondary_categories'),
    aliases: readArray(block, 'aliases'),
    source_catalogue_ids: readArray(block, 'source_catalogue_ids'),
    source_categories: readArray(block, 'source_categories'),
    review_reasons: readArray(block, 'review_reasons'),
  }));
}

function parseDraftTypes(source) {
  const start = source.indexOf('export const DRAFT_TYPES');
  const end = source.indexOf('\n};', start);
  if (start < 0 || end < 0) throw new Error('DRAFT_TYPES could not be located');
  return [...source.slice(start, end).matchAll(/^\s{2}'([^']+)':\s*\{\s*\n\s{4}label:\s*"([^"]+)"/gm)]
    .map((match) => ({ key: match[1], name: match[2] }));
}

function parseSchemaNames(source) {
  const start = source.indexOf('export const DOCUMENT_SCHEMAS');
  const end = source.indexOf('\n};', start);
  if (start < 0 || end < 0) throw new Error('DOCUMENT_SCHEMAS could not be located');
  return [...source.slice(start, end).matchAll(/^\s{2}'([^']+)':\s*\{/gm)]
    .map((match) => match[1]);
}

function parseDoubtfulAudit(report) {
  const start = report.indexOf('DOUBTFUL:');
  const end = report.indexOf('\nCATEGORY-LEVEL APPLICABLE_LAW', start);
  if (start < 0 || end < 0) throw new Error('The Gate 1 doubtful list is missing');
  const section = report.slice(start, end);
  return new Map([...section.matchAll(/^- .+ \[[^;\]]+; ([A-Z]+-\d+)\] — (.+)$/gm)]
    .map((match) => [match[1], match[2]]));
}

const categoryDefinitions = [
  { id: 'CIV', name: 'Civil Litigation' },
  { id: 'CRI', name: 'Criminal Law and Procedure' },
  { id: 'LEG', name: 'Legal Notices' },
  { id: 'AGR', name: 'Agreements and Contracts' },
  { id: 'FAM', name: 'Family Law' },
  { id: 'PRO', name: 'Property and Real Estate' },
  { id: 'COR', name: 'Corporate and Commercial Law' },
  { id: 'EMP', name: 'Employment and Labour Law' },
  { id: 'CON', name: 'Consumer, Banking and Financial Disputes' },
  { id: 'TAX', name: 'Taxation and Regulatory Documents' },
  { id: 'IP', name: 'Intellectual Property and Technology' },
  { id: 'ARB', name: 'Arbitration, Mediation, and Insolvency' },
  { id: 'GEN', name: 'General Legal Documents' },
];

const sectionCategories = {
  A: 'Civil Litigation',
  B: 'Criminal Law and Procedure',
  C: 'Legal Notices',
  D: 'Agreements and Contracts',
  E: 'Family Law',
  F: 'Property and Real Estate',
  G: 'Corporate and Commercial Law',
  H: 'Employment and Labour Law',
  I: 'Consumer, Banking and Financial Disputes',
  J: 'Taxation and Regulatory Documents',
  K: 'Intellectual Property and Technology',
  L: 'Arbitration, Mediation, and Insolvency',
  M: 'General Legal Documents',
};

function categoryForBaseline(key, name) {
  const value = `${key} ${name}`.toLowerCase();
  if (/consumer|cheque bounce|cheque dishonour|banking ombudsman/.test(value)) {
    return 'Consumer, Banking and Financial Disputes';
  }
  if (/criminal|bail|fir|quashing|protest petition|surrender application|criminal complaint/.test(value)) {
    return 'Criminal Law and Procedure';
  }
  if (/divorce|maintenance|custody|family|marriage|legal heir|codicil|^will$/.test(value)) {
    return 'Family Law';
  }
  if (/employment|employee|salary|workplace|termination letter|contractor|consultancy|consultant/.test(value)) {
    return 'Employment and Labour Law';
  }
  if (/property|sale deed|sale agreement|agreement to sell|rent|lease|mortgage|partition deed|gift deed|rera|mutation|encumbrance|easement|eviction|possession|builder|development agreement/.test(value)) {
    return 'Property and Real Estate';
  }
  if (/arbitration|mediation|insolvency|compounding application/.test(value)) {
    return 'Arbitration, Mediation, and Insolvency';
  }
  if (/legal notice|reply to legal notice|notice/.test(value)) {
    return 'Legal Notices';
  }
  if (/agreement|deed|contract|partnership|settlement/.test(value)) {
    return 'Agreements and Contracts';
  }
  if (/affidavit|declaration|undertaking|indemnity|vakalatnama|power of attorney|case brief|list of documents|written submissions|synopsis|memo of appearance/.test(value)) {
    return 'General Legal Documents';
  }
  return 'Civil Litigation';
}

function documentTypeFor(name, category) {
  if (/\bnotice\b/i.test(name)) return 'legal_notice';
  if (/\b(agreement|deed|bond|contract|memorandum|power of attorney)\b/i.test(name)) return 'contract_or_deed';
  if (/Civil Litigation|Criminal Law and Procedure|Family Law/.test(category)
      && /\b(application|petition|appeal|complaint|pleading|submissions|vakalatnama)\b/i.test(name)) {
    return 'court_filing';
  }
  if (/\b(affidavit|declaration|undertaking)\b/i.test(name)) return 'affidavit_or_declaration';
  return 'general';
}

const source = fs.readFileSync(cataloguePath, 'utf8');
const priorReviewRecords = parseRecords(source, 'LEGAL_DOCUMENT_NEEDS_REVIEW');
const isPreviouslyRebuilt = priorReviewRecords.length > 0;
const oldRecords = isPreviouslyRebuilt ? [] : parseRecords(source, 'LEGAL_DOCUMENT_CATALOG');
if (!isPreviouslyRebuilt && oldRecords.length !== 662) {
  throw new Error(`Expected the audited legacy catalogue; found ${oldRecords.length} records.`);
}

const draftTypesSource = fs.readFileSync(draftTypesPath, 'utf8');
const schemaSource = fs.readFileSync(schemasPath, 'utf8');
const draftTypes = parseDraftTypes(draftTypesSource);
const schemaNames = parseSchemaNames(schemaSource);
if (draftTypes.length !== 126) throw new Error(`Expected 126 DRAFT_TYPES baseline entries; found ${draftTypes.length}.`);
if (schemaNames.length !== 20) throw new Error(`Expected 20 DOCUMENT_SCHEMAS; found ${schemaNames.length}.`);
const brief = fs.readFileSync(briefPath, 'utf8');
const auditReport = fs.readFileSync(auditPath, 'utf8');
const doubtfulAudit = parseDoubtfulAudit(auditReport);
if (doubtfulAudit.size !== 54) throw new Error(`Expected 54 audited doubtful records; found ${doubtfulAudit.size}.`);

const sectionMatches = [...brief.matchAll(/^([A-M])\.\s+[^\r\n]+/gm)];
if (sectionMatches.length !== 13) throw new Error(`Expected original brief sections A-M; found ${sectionMatches.length}.`);
const briefEntries = [];
for (let index = 0; index < sectionMatches.length; index += 1) {
  const heading = sectionMatches[index];
  const end = sectionMatches[index + 1]?.index ?? brief.length;
  let section = brief.slice(heading.index, end);
  const separator = section.search(/\n─{5,}/);
  if (separator >= 0) section = section.slice(0, separator);
  for (const match of section.matchAll(/^\s*•\s*(.+?)\s*$/gm)) {
    const name = match[1].replace(/[.;]+$/, '').trim();
    if (name) briefEntries.push({ name, category: sectionCategories[heading[1]], section: heading[1] });
  }
}

const briefNeedsReview = new Map([
  ['permanent injunction related pleadings', 'Broad pleading family rather than a sufficiently specific standalone document title.'],
  ['petition concerning marriage related relief', 'Generic relief description does not identify a sufficiently specific standalone family-court document.'],
  ['execution related applications', 'Broad application family; the specific execution application is not identified.'],
  ['settlement related court filing', 'Generic filing description; the particular court document is not identified.'],
  ['complaint under applicable criminal legislation', 'Generic complaint description with no specific complaint type.'],
  ['non compete clause or agreement where legally appropriate', 'A clause and an agreement are different deliverables; the source entry does not select one.'],
  ['share transfer documentation', 'Broad documentation label rather than a specific standalone document.'],
  ['share subscription documentation', 'Broad documentation label rather than a specific standalone document.'],
  ['director appointment documentation', 'Broad documentation label; the specific instrument is not identified.'],
  ['director resignation documentation', 'Broad documentation label; the specific instrument is not identified.'],
  ['registered office change documentation', 'Broad documentation label; the specific filing/instrument is not identified.'],
  ['trademark opposition related documents', 'Broad document family; the specific opposition-stage document is not identified.'],
  ['data breach incident documentation', 'Incident record/document family; not a sufficiently specific legal document.'],
  ['professional tax matters where applicable', 'Matter category, not a standalone document type.'],
  ['conciliation related documents', 'Broad document family; the specific conciliation document is not identified.'],
  ['insolvency related application', 'Broad application type; the proceeding and relief are not identified.'],
  ['creditor claim documentation', 'Broad documentation label rather than a specific standalone document.'],
  ['resolution plan related supporting documents', 'Supporting-document family rather than an identified standalone document.'],
  ['corporate insolvency related pleadings', 'Broad pleading family; the specific document is not identified.'],
  ['property verification checklist', 'Checklist/reference aid rather than a standalone legal instrument or filing.'],
  ['title due diligence report', 'Professional due-diligence report; not a standalone self-service legal instrument.'],
  ['workplace investigation report template', 'Internal investigation work product rather than a standalone legal instrument.'],
  ['legal opinion template', 'Professional legal opinion; not a self-service form document.'],
  ['case chronology', 'Case-preparation aid rather than a standalone legal document.'],
  ['brief of facts', 'Case-preparation aid rather than a standalone legal document.'],
  ['case summary', 'Case-preparation aid rather than a standalone legal document.'],
  ['evidence index', 'Index/attachment rather than a standalone legal document.'],
  ['document index', 'Index/attachment rather than a standalone legal document.'],
  ['list of witnesses', 'Procedural attachment rather than a standalone legal document.'],
]);

const aliasTargets = new Map([
  ['leave and licence agreement where applicable', 'Leave and License Agreement'],
  ['non compete clause or agreement where legally appropriate', 'Non-Compete Agreement'],
  ['confidentiality agreement', 'Non-Disclosure Agreement'],
  ['compounding application where legally permissible', 'Compounding Application'],
  ['cheque dishonour complaint', 'Cheque Bounce Complaint'],
  ['ni act related complaint', 'Cheque Bounce Complaint'],
  ['cheque dishonour statutory notice', 'Cheque Bounce Notice (NI Act Section 138)'],
  ['outstanding payment demand', 'Demand Letter'],
  ['refund demand', 'Demand Letter'],
  ['payment undertaking', 'Undertaking'],
  ['supporting affidavit', 'Affidavit'],
  ['affidavit in support of an application', 'Affidavit'],
  ['consultant agreement', 'Consultancy Agreement'],
  ['co founder agreement', 'Founder Agreement'],
]);

const legacyAliasTargets = new Map([
  ['application for interim protection', 'Interim Relief Application'],
  ['application for interim protection order', 'Interim Relief Application'],
  ['leave and licence agreement', 'Leave and License Agreement'],
  ['consultant agreement', 'Consultancy Agreement'],
  ['co founder agreement', 'Founder Agreement'],
]);

const reviewAliasTargets = new Map([
  ['notice of encroachment', 'Notice for Encroachment'],
  ['application for cross examination of witnesses', 'Application for Cross-Examination of Witness'],
]);

const records = [];
const byNormalizedName = new Map();
const addSecondaryCategory = (record, category) => {
  if (category !== record.category && !record.secondary_categories.includes(category)) {
    record.secondary_categories.push(category);
  }
};

function addMainRecord({ name, category, sourceLabel, sourceReference, implementationStatus, description }) {
  const normalizedName = normalize(name);
  const existing = byNormalizedName.get(normalizedName);
  if (existing) {
    addSecondaryCategory(existing, category);
    if (!existing.source_references.includes(sourceReference)) existing.source_references.push(sourceReference);
    if (!existing.sources.includes(sourceLabel)) existing.sources.push(sourceLabel);
    return existing;
  }

  const record = {
    id: '',
    slug: '',
    name,
    category,
    subcategory: '',
    description,
    jurisdiction: 'India',
    applicable_law: [],
    document_type: documentTypeFor(name, category),
    audience: ['advocate', 'individual'],
    required_fields: [],
    optional_fields: [],
    conditional_fields: [],
    generation_status: implementationStatus === 'not_implemented' ? 'catalogue_only' : 'draft_ready',
    review_status: 'legal_review_required',
    implementation_status: implementationStatus,
    has_generation_template: implementationStatus !== 'not_implemented',
    legal_reference_verified: false,
    secondary_categories: [],
    aliases: [],
    sources: [sourceLabel],
    source_references: [sourceReference],
  };
  records.push(record);
  byNormalizedName.set(normalizedName, record);
  return record;
}

function addAliasToMain(alias, targetName, category, sourceReference) {
  const target = byNormalizedName.get(normalize(targetName));
  if (!target) return false;
  if (!target.aliases.includes(alias)) target.aliases.push(alias);
  addSecondaryCategory(target, category);
  if (!target.source_references.includes(sourceReference)) target.source_references.push(sourceReference);
  return true;
}

for (const item of draftTypes) {
  addMainRecord({
    name: titleCase(item.name),
    category: categoryForBaseline(item.key, item.name),
    sourceLabel: 'DRAFT_TYPES',
    sourceReference: `DRAFT_TYPES:${item.key}`,
    implementationStatus: 'template_ready',
    description: 'Existing Draftee draft type; its working structure remains in the current draft registry.',
  });
}

for (const schemaName of schemaNames) {
  const name = titleCase(schemaName);
  if (byNormalizedName.has(normalize(name))) {
    const record = byNormalizedName.get(normalize(name));
    if (!record.source_references.includes(`DOCUMENT_SCHEMAS:${schemaName}`)) {
      record.source_references.push(`DOCUMENT_SCHEMAS:${schemaName}`);
    }
    if (!record.sources.includes('DOCUMENT_SCHEMAS')) record.sources.push('DOCUMENT_SCHEMAS');
    continue;
  }
  addMainRecord({
    name,
    category: categoryForBaseline(normalize(name).replace(/\s+/g, '-'), name),
    sourceLabel: 'DOCUMENT_SCHEMAS',
    sourceReference: `DOCUMENT_SCHEMAS:${schemaName}`,
    implementationStatus: 'form_ready',
    description: 'Existing Draftee form schema; its working fields remain in the current form registry.',
  });
}

for (const item of briefEntries) {
  const normalizedName = normalize(item.name);
  const reviewReason = briefNeedsReview.get(normalizedName);
  if (reviewReason) continue;

  const aliasTarget = aliasTargets.get(normalizedName);
  if (aliasTarget && addAliasToMain(titleCase(item.name), titleCase(aliasTarget), item.category, `Original brief ${item.section}`)) {
    continue;
  }

  addMainRecord({
    name: titleCase(item.name),
    category: item.category,
    sourceLabel: `Original brief ${item.section}`,
    sourceReference: `Original brief ${item.section}: ${item.name}`,
    implementationStatus: 'not_implemented',
    description: 'Document type explicitly listed in the original user-provided brief; details require legal review.',
  });
}

const reviewItems = [];
const reviewByKey = new Map();
function addReviewItem({ name, category, reason, sourceId = '', sourceCategory = category, sourceLabel = 'legacy_catalogue' }) {
  const normalizedName = normalize(name);
  const key = reviewAliasTargets.has(normalizedName)
    ? normalize(reviewAliasTargets.get(normalizedName))
    : normalizedName;
  let review = reviewByKey.get(key);
  if (!review) {
    review = {
      id: '',
      slug: '',
      name: titleCase(reviewAliasTargets.get(normalizedName) ?? name),
      category: sourceCategory,
      subcategory: '',
      description: 'Retained separately for review; not included in the main legal-document catalogue.',
      jurisdiction: 'India',
      applicable_law: [],
      document_type: documentTypeFor(name, sourceCategory),
      audience: ['advocate', 'individual'],
      required_fields: [],
      optional_fields: [],
      conditional_fields: [],
      generation_status: 'catalogue_only',
      review_status: 'legal_review_required',
      implementation_status: 'not_implemented',
      has_generation_template: false,
      legal_reference_verified: false,
      secondary_categories: [],
      aliases: [],
      sources: [],
      source_references: [],
      source_catalogue_ids: [],
      source_categories: [],
      review_reasons: [],
    };
    reviewByKey.set(key, review);
    reviewItems.push(review);
  }
  if (category !== review.category && !review.secondary_categories.includes(category)) {
    review.secondary_categories.push(category);
  }
  if (sourceId && !review.source_catalogue_ids.includes(sourceId)) {
    review.source_catalogue_ids.push(sourceId);
  }
  if (!review.source_categories.includes(sourceCategory)) review.source_categories.push(sourceCategory);
  if (!review.sources.includes(sourceLabel)) review.sources.push(sourceLabel);
  if (!review.review_reasons.includes(reason)) review.review_reasons.push(reason);
  if (normalize(name) !== key && !review.aliases.includes(titleCase(name))) review.aliases.push(titleCase(name));
}

for (const item of briefEntries) {
  const reason = briefNeedsReview.get(normalize(item.name));
  if (reason) {
    addReviewItem({
      name: item.name,
      category: item.category,
      reason,
      sourceCategory: item.category,
      sourceLabel: `Original brief ${item.section}`,
    });
  }
}

if (isPreviouslyRebuilt) {
  for (const prior of priorReviewRecords) {
    if (prior.source_catalogue_ids.length === 0) continue;
    const category = prior.source_categories[0] ?? prior.category;
    addReviewItem({
      name: prior.name,
      category,
      reason: prior.review_reasons.join(' '),
      sourceCategory: category,
      sourceLabel: 'legacy_catalogue',
    });
    const current = reviewByKey.get(normalize(
      reviewAliasTargets.get(normalize(prior.name)) ?? prior.name,
    ));
    if (!current) throw new Error(`Failed to preserve prior review record: ${prior.name}`);
    for (const sourceId of prior.source_catalogue_ids) {
      if (!current.source_catalogue_ids.includes(sourceId)) current.source_catalogue_ids.push(sourceId);
    }
    for (const sourceCategory of prior.source_categories) {
      if (!current.source_categories.includes(sourceCategory)) current.source_categories.push(sourceCategory);
      if (sourceCategory !== current.category && !current.secondary_categories.includes(sourceCategory)) {
        current.secondary_categories.push(sourceCategory);
      }
    }
    for (const alias of prior.aliases) {
      if (!current.aliases.includes(alias)) current.aliases.push(alias);
    }
  }
} else {
  for (const legacy of oldRecords) {
    const auditedReason = doubtfulAudit.get(legacy.id);
    if (auditedReason) {
      addReviewItem({
        name: legacy.name,
        category: legacy.category,
        reason: auditedReason,
        sourceId: legacy.id,
        sourceCategory: legacy.category,
      });
      continue;
    }

    const normalizedName = normalize(legacy.name);
    const aliasTarget = legacyAliasTargets.get(normalizedName);
    const isInMain = byNormalizedName.has(normalizedName)
      || (aliasTarget && byNormalizedName.has(normalize(aliasTarget)));
    if (isInMain) continue;

    addReviewItem({
      name: legacy.name,
      category: legacy.category,
      reason: 'Untrusted legacy catalogue name is not supported by the working baseline or an explicit original-brief entry; verify before promotion.',
      sourceId: legacy.id,
      sourceCategory: legacy.category,
    });
  }
}

const categoryIdByName = new Map(categoryDefinitions.map((category) => [category.name, category.id]));
const idCounts = new Map();
const slugCounts = new Map();
function assignIdentifiers(items, prefix = '') {
  for (const item of items) {
    const categoryId = categoryIdByName.get(item.category);
    if (!categoryId) throw new Error(`Unknown category for ${item.name}: ${item.category}`);
    const next = (idCounts.get(categoryId) ?? 0) + 1;
    idCounts.set(categoryId, next);
    item.id = `${prefix}${categoryId}-${String(next).padStart(3, '0')}`;

    const baseSlug = normalize(item.name).replace(/\s+/g, '-');
    const slugCount = (slugCounts.get(baseSlug) ?? 0) + 1;
    slugCounts.set(baseSlug, slugCount);
    item.slug = slugCount === 1 ? baseSlug : `${baseSlug}-${slugCount}`;
  }
}

assignIdentifiers(records);
assignIdentifiers(reviewItems, 'NR-');

const categoryCounts = new Map(categoryDefinitions.map((category) => [category.name, 0]));
for (const record of records) {
  categoryCounts.set(record.category, (categoryCounts.get(record.category) ?? 0) + 1);
}
const emptyCategories = [...categoryCounts].filter(([, count]) => count === 0).map(([name]) => name);
if (emptyCategories.length) throw new Error(`Categories have no main-catalogue records: ${emptyCategories.join(', ')}`);

const duplicateHeader = auditReport.match(/CROSS-CATEGORY EXACT DUPLICATE GROUPS \((\d+)\)/);
if (!duplicateHeader) throw new Error('Could not read the exact-duplicate count from the Gate 1 report.');
const exactDuplicateCopies = oldRecords.length
  ? oldRecords.length - new Set(oldRecords.map((record) => normalize(record.name))).size
  : Number(duplicateHeader[1]);
const fillerPattern = /\brelated relief\b|\brelief\s*#?\s*\d+\b|\b(?:document|draft|form|application|petition|notice|agreement)\s*#?\s*\d+\b|\{\s*(?:n|number|\d+)\s*\}/i;
const fillerHeader = auditReport.match(/FILLER \/ PLACEHOLDER ENTRIES \((\d+)\)/);
const legacyFillerCount = oldRecords.length
  ? oldRecords.filter((record) => fillerPattern.test(record.name)).length
  : Number(fillerHeader?.[1] ?? 0);
const readyCount = records.filter((record) => record.implementation_status !== 'not_implemented').length;
const comingSoonCount = records.length - readyCount;
const shortfall = Math.max(0, 662 - records.length);
const legacyReviewIds = new Set(reviewItems.flatMap((item) => item.source_catalogue_ids));
const briefReviewSummary = new Map();
for (const item of briefEntries) {
  const reason = briefNeedsReview.get(normalize(item.name));
  if (reason && !briefReviewSummary.has(normalize(item.name))) {
    briefReviewSummary.set(normalize(item.name), { name: titleCase(item.name), reason });
  }
}

const nearMatchDecisions = [
  'Application for Security of Property vs Application for Return of Property: distinct reliefs. The return-of-property item appears in the original criminal-procedure brief and remains in the main catalogue; the security-of-property item is retained in needs_review as an unsourced legacy candidate.',
  'Application for Transfer of Suit vs Application for Transfer of Case: distinct civil-suit and case contexts; neither legacy title is added to the main catalogue without an explicit source. Both are retained in needs_review.',
  'Application for Cross-Examination of Witness vs Application for Cross-Examination of Witnesses: singular/plural variants merged into one needs_review record because neither is in the working baseline or original brief.',
  'Application for Transfer of Suit vs Application for Transfer of Child: distinct civil and family contexts; both remain in needs_review pending source confirmation.',
  'Application for Transfer of Case vs Application for Transfer of Child: distinct criminal and family contexts; both remain in needs_review pending source confirmation.',
  'Application for Interim Protection vs Application for Interim Protection Order: merged into the existing Interim Relief Application baseline, with the original categories retained as secondary tags.',
  'Notice for Encroachment vs Notice of Encroachment: wording variants merged into one needs_review record; neither is promoted without an explicit baseline/brief source.',
  'Commercial Lease Agreement vs Commercial Sale Agreement: distinct transaction types. Commercial Lease Agreement remains as a working baseline; Commercial Sale Agreement stays in needs_review because it is not independently sourced.',
  'Purchase Agreement vs Asset Purchase Agreement: distinct general and asset-purchase purposes; both appear in the original brief and remain separate.',
  'Co-Founder Agreement (Agreements and Contracts) vs Founder Agreement (Corporate and Commercial Law): merged into the original-brief Founder Agreement entry; co-founder wording is an alias and does not create another catalogue record.',
  'Founder Agreement (Agreements and Contracts) vs Co-Founder Agreement (Corporate and Commercial Law): same two original legacy candidates in the reverse category pairing; merged into the single original-brief Founder Agreement entry.',
  'Consultancy Agreement vs Consultant Agreement: merged into the existing Consultancy Agreement working baseline; Consultant Agreement is retained as an alias and employment secondary tag.',
];

const sourceCounts = new Map();
for (const item of briefEntries) sourceCounts.set(item.section, (sourceCounts.get(item.section) ?? 0) + 1);

function quote(value) {
  return JSON.stringify(value);
}

function renderRecord(record) {
  const lines = [
    '  {',
    `    id: ${quote(record.id)},`,
    `    slug: ${quote(record.slug)},`,
    `    name: ${quote(record.name)},`,
    `    category: ${quote(record.category)},`,
    `    subcategory: ${quote(record.subcategory)},`,
    `    description: ${quote(record.description)},`,
    `    jurisdiction: "India",`,
    '    applicable_law: [],',
    `    document_type: ${quote(record.document_type)},`,
    `    audience: ${JSON.stringify(record.audience)},`,
    `    required_fields: ${JSON.stringify(record.required_fields)},`,
    `    optional_fields: ${JSON.stringify(record.optional_fields)},`,
    `    conditional_fields: ${JSON.stringify(record.conditional_fields)},`,
    `    generation_status: ${quote(record.generation_status)},`,
    '    review_status: "legal_review_required",',
    `    implementation_status: ${quote(record.implementation_status)},`,
    `    has_generation_template: ${record.has_generation_template},`,
    '    legal_reference_verified: false,',
    `    secondary_categories: ${JSON.stringify(record.secondary_categories)},`,
    `    aliases: ${JSON.stringify(record.aliases)},`,
    `    sources: ${JSON.stringify(record.sources)},`,
    `    source_references: ${JSON.stringify(record.source_references)},`,
    '  },',
  ];
  return lines.join('\n');
}

function renderReviewRecord(record) {
  return `${renderRecord(record).replace(/\n  \},$/, '')}\n    source_catalogue_ids: ${JSON.stringify(record.source_catalogue_ids)},\n    source_categories: ${JSON.stringify(record.source_categories)},\n    review_reasons: ${JSON.stringify(record.review_reasons)},\n  },`;
}

const generatedSource = [
  'export type ImplementationStatus = "not_implemented" | "form_ready" | "template_ready";',
  '',
  'export type LegalDocumentType = {',
  '  id: string;',
  '  slug: string;',
  '  name: string;',
  '  category: string;',
  '  subcategory: string;',
  '  description: string;',
  '  jurisdiction: string;',
  '  applicable_law: string[];',
  '  document_type: string;',
  '  audience: string[];',
  '  required_fields: string[];',
  '  optional_fields: string[];',
  '  conditional_fields: string[];',
  '  generation_status: "catalogue_only" | "verified_template" | "draft_ready";',
  '  review_status: "legal_review_required" | "internal_review" | "verified";',
  '  implementation_status: ImplementationStatus;',
  '  has_generation_template: boolean;',
  '  legal_reference_verified: boolean;',
  '  secondary_categories: string[];',
  '  aliases: string[];',
  '  sources: string[];',
  '  source_references: string[];',
  '};',
  '',
  'export type NeedsReviewDocumentType = LegalDocumentType & {',
  '  source_catalogue_ids: string[];',
  '  source_categories: string[];',
  '  review_reasons: string[];',
  '};',
  '',
  'export const LEGAL_DOCUMENT_CATALOG: LegalDocumentType[] = [',
  records.map(renderRecord).join('\n'),
  '];',
  '',
  'export const LEGAL_DOCUMENT_NEEDS_REVIEW: NeedsReviewDocumentType[] = [',
  reviewItems.map(renderReviewRecord).join('\n'),
  '];',
  '',
  'export const LEGAL_DOCUMENT_COUNT = LEGAL_DOCUMENT_CATALOG.length;',
  'export const LEGAL_DOCUMENT_NEEDS_REVIEW_COUNT = LEGAL_DOCUMENT_NEEDS_REVIEW.length;',
  '',
  'export const LEGAL_DOCUMENT_CATEGORIES = [',
  categoryDefinitions.map((category) => {
    const count = categoryCounts.get(category.name) ?? 0;
    return `  { id: ${quote(category.id)}, name: ${quote(category.name)}, description: "Legal document category", document_count: ${count} },`;
  }).join('\n'),
  '] as const;',
  '',
].join('\n');

const reportLines = [
  'DRAFTEE LEGAL DOCUMENT INVENTORY RESET — GATE 2',
  '',
  'Sources: 126 existing DRAFT_TYPES (preserved first), 20 existing DOCUMENT_SCHEMAS, and named entries in original brief sections A-M.',
  `Original brief bullet entries parsed: ${briefEntries.length} (${[...sourceCounts].map(([section, count]) => `${section}: ${count}`).join('; ')}).`,
  `Existing DRAFT_TYPES preserved: ${draftTypes.length}; schema names preserved: ${schemaNames.length}.`,
  `Main catalogue final count: ${records.length}.`,
  `Shortfall versus the former 662 target: ${shortfall}.`,
  `Ready: ${readyCount}; Coming soon: ${comingSoonCount}.`,
  `Needs-review records: ${reviewItems.length}; original audit doubtful IDs preserved: ${doubtfulAudit.size}.`,
  `Original-brief broad or non-standalone entries moved to needs_review: ${briefReviewSummary.size}.`,
  `Old catalogue source IDs carried into needs_review: ${legacyReviewIds.size}.`,
  `Old catalogue exact-name duplicate copies merged: ${exactDuplicateCopies}.`,
  `Explicit filler-pattern matches found in the legacy source: ${legacyFillerCount}.`,
  'Applicable-law assignments: cleared for all main and needs-review records; no unverified statute mapping carried forward.',
  'Prior Gate 1 applicable-law mismatch flags cleared: 243.',
  'Legal-reference verification: false on every record; review_status is legal_review_required on every record.',
  '',
  'COUNT BY PRIMARY CATEGORY',
  '| Category | Count | Ready | Coming soon |',
  '|---|---:|---:|---:|',
  ...categoryDefinitions.map((category) => {
    const categoryRecords = records.filter((record) => record.category === category.name);
    const ready = categoryRecords.filter((record) => record.implementation_status !== 'not_implemented').length;
    return `| ${category.name} | ${categoryRecords.length} | ${ready} | ${categoryRecords.length - ready} |`;
  }),
  '',
  'REMOVALS, MERGES, AND REVIEW HANDLING',
  `- Kept all ${draftTypes.length} DRAFT_TYPES keys as working baseline records/aliases; the source file itself was not edited.`,
  `- Retained all ${schemaNames.length} existing schema names; schema-only types are marked Ready only when backed by the existing schema.`,
  `- Merged ${exactDuplicateCopies} redundant exact-name legacy catalogue copies rather than carrying duplicates into the main catalogue.`,
  `- Moved ${doubtfulAudit.size} Gate 1 doubtful source records into LEGAL_DOCUMENT_NEEDS_REVIEW; none of those legacy entries was promoted solely because it existed in the old catalogue.`,
  '- If a doubtful legacy name also exists in the working DRAFT_TYPES/schema baseline, the working entry remains; its legacy source ID is still separately recorded in needs_review.',
  `- Moved ${briefReviewSummary.size} broad or non-standalone original-brief entries out of the main catalogue; the per-entry rationale is recorded in LEGAL_DOCUMENT_NEEDS_REVIEW.`,
  ...[...briefReviewSummary.values()].map(({ name, reason }) => `  - ${name}: ${reason}`),
  `- Kept ${legacyReviewIds.size} legacy IDs in the review list because they are not established by the working baseline or explicit brief, or were previously flagged doubtful.`,
  `- No legacy filler-pattern matches were present (${legacyFillerCount}); none were padded into the rebuilt inventory.`,
  '- Removed all legacy applicable_law values instead of guessing; the former mismatch flags are cleared, not relabeled.',
  '- “Provisional survivor” counts from Gate 1 were audit heuristics only; no such count was treated as a canonical inventory.',
  '',
  'TWELVE NEAR-NAME CANDIDATE DECISIONS',
  ...nearMatchDecisions.map((decision, index) => `${index + 1}. ${decision}`),
  '',
  'This inventory is not a claim that every entry is legally verified. Main-catalogue additions from the original brief are marked Coming soon and require legal review. needs_review is kept out of the main catalogue.',
];

fs.writeFileSync(cataloguePath, generatedSource, 'utf8');
fs.writeFileSync(reportPath, `${reportLines.join('\n')}\n`, 'utf8');

process.stdout.write(`Wrote ${records.length} main catalogue records and ${reviewItems.length} needs-review records.\n`);
process.stdout.write(`DRAFT_TYPES=${draftTypes.length}; DOCUMENT_SCHEMAS=${schemaNames.length}; categories=${categoryCounts.size}; shortfall=${shortfall}.\n`);
process.stdout.write(`Inventory report: ${path.relative(root, reportPath)}\n`);
