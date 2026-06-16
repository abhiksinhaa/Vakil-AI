/**
 * Strip common markdown formatting from AI-generated legal draft text.
 * Keeps numbered clauses (e.g. "1. Whereas") intact.
 */
export function stripMarkdown(text) {
  let s = String(text ?? '');

  // Fenced code blocks — keep inner content
  s = s.replace(/```[^\n]*\n?([\s\S]*?)```/g, '$1');

  // Inline code
  s = s.replace(/`([^`]+)`/g, '$1');

  // Bold / italic (paired, then stray markers)
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/\*([^*\n]+)\*/g, '$1');
  s = s.replace(/_([^_\n]+)_/g, '$1');
  s = s.replace(/\*\*/g, '');
  s = s.replace(/__/g, '');
  s = s.replace(/\*/g, '');

  // Strikethrough
  s = s.replace(/~~([^~]+)~~/g, '$1');

  // Links and images
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // ATX headings
  s = s.replace(/^#{1,6}\s+/gm, '');

  // Blockquote prefix
  s = s.replace(/^>\s?/gm, '');

  // Horizontal rules
  s = s.replace(/^[-*_]{3,}\s*$/gm, '');

  // Markdown bullet lines only (-, *, +) — not numbered legal paragraphs
  s = s.replace(/^(\s*)[-*+]\s+/gm, '$1');

  return s;
}
