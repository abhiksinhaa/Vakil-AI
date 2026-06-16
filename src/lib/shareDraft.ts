export function buildDraftEmailSubject(draftType) {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${draftType || 'Legal Draft'} — ${dateStr}`;
}

export function openEmailDraft({ body, draftType }) {
  const subject = encodeURIComponent(buildDraftEmailSubject(draftType));
  const mailBody = encodeURIComponent(body);
  window.location.href = `mailto:?subject=${subject}&body=${mailBody}`;
}

export function openWhatsAppShare(text) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
