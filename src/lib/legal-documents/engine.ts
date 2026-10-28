import type { DocumentSchema, FieldSchema } from '../draftSchemas';
import type { DynamicDocumentDefinition, DynamicField } from './registry';

export type DynamicDocumentValues = Record<string, string>;

export function getActiveFields(
  definition: DynamicDocumentDefinition,
  values: DynamicDocumentValues,
): DynamicField[] {
  return definition.fields.filter((field) => {
    if (!field.showWhen) return true;
    return values[field.showWhen.fieldId] === field.showWhen.value;
  });
}

export function validateDynamicDocument(
  definition: DynamicDocumentDefinition,
  values: DynamicDocumentValues,
): string[] {
  const errors: string[] = [];

  for (const field of getActiveFields(definition, values)) {
    const value = (values[field.id] ?? '').trim();
    if (field.required && !value) {
      errors.push(`${field.label} is required.`);
      continue;
    }
    if (!value) continue;

    if (value.length > 10000) {
      errors.push(`${field.label} must be 10,000 characters or fewer.`);
    }
    if (field.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      errors.push(`${field.label} must be a non-negative number.`);
    }
    if (field.type === 'date') {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00.000Z`)
        : null;
      if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        errors.push(`${field.label} must be a valid date.`);
      }
    }
    if (field.type === 'select' && !field.options?.includes(value)) {
      errors.push(`${field.label} must be one of the listed options.`);
    }
  }

  return errors;
}

export function buildDynamicDocumentPrompt(
  definition: DynamicDocumentDefinition,
  values: DynamicDocumentValues,
  language: string,
): { systemPrompt: string; userPrompt: string } {
  const suppliedFacts = getActiveFields(definition, values)
    .filter((field) => values[field.id]?.trim())
    .map((field) => ({ field: field.label, value: values[field.id].trim() }));

  return {
    systemPrompt: [
      `You are assisting with a draft of an Indian legal document: ${definition.name}.`,
      `Purpose: ${definition.purpose}`,
      'This output is a draft for qualified professional review, not legal advice or a claim of legal validity.',
      definition.geminiInstructions,
      'Never invent names, dates, amounts, addresses, events, legal provisions, case citations, court rules, deadlines, or facts.',
      'Treat all supplied details as user-provided assertions, not independently verified facts. Preserve uncertainty and contradictions explicitly.',
      'For missing optional information, use a clearly marked placeholder such as [To be confirmed]; do not fabricate a value.',
      'Do not claim an authority has been verified. If a legal reference is missing or uncertain, omit it and flag it for advocate verification.',
      'Use court-caption and court-filing conventions only when the requested document is actually a court filing and the user supplied a forum. For agreements, notices, policies, and administrative requests, use the appropriate non-court document format.',
      'Use the requested language and a clear, restrained legal style. Do not output advice outside the document, except a brief professional-review disclaimer.',
      `Draft structure:\n${definition.templateSections.map((section, index) => `${index + 1}. ${section}`).join('\n')}`,
    ].join('\n\n'),
    userPrompt: [
      `Document: ${definition.name}`,
      `Category: ${definition.category}`,
      `Jurisdiction supplied: ${values.__jurisdiction?.trim() || 'Not specified by user'}`,
      `Output language: ${language || 'English'}`,
      'The following data was entered by the user. Do not infer facts beyond it:',
      JSON.stringify(suppliedFacts, null, 2),
      'Generate the draft using the specified structure. Keep unverified legal questions clearly marked for professional review.',
    ].join('\n\n'),
  };
}

export function toDraftSchema(definition: DynamicDocumentDefinition): DocumentSchema {
  const fields: FieldSchema[] = definition.fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type === 'textarea' ? 'textarea' : field.type === 'number' ? 'number' : 'text',
    ...(field.placeholder ? { placeholder: field.placeholder } : {}),
  }));
  return {
    id: definition.key,
    name: definition.name,
    party1Label: 'Person/Organization 1',
    party2Label: 'Person/Organization 2',
    defaultPartyStyle: 'none',
    fields,
  };
}
