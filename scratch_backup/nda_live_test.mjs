export const requestTimeoutMs = 90_000;

export const ndaTest = {
  document: 'Non-Disclosure Agreement',
  fictional: true,
  fields: {
    disclosing_party: 'Aarav Fictional, sole proprietor, 14 Sample Lane, Pune, Maharashtra 411001 (fictional)',
    receiving_party: 'Meera Example, director of Example Labs Private Limited, 22 Demo Road, Pune, Maharashtra 411002 (fictional)',
    purpose: 'Evaluate a possible software pilot. Neither party is required to proceed with a transaction.',
    information: 'Non-public product requirements, demonstration access, and written price estimates shared for evaluating the pilot. Exclude information already public, independently developed without use of disclosed information, or lawfully received from another source.',
    term: 'Effective 28 October 2026; agreement term 12 months. Confidentiality obligations continue for 3 years after each disclosure.',
    permitted_people: 'Employees and professional advisers who need the information for the evaluation and are subject to confidentiality duties. Each party is responsible for its permitted representatives.',
    return_destroy: 'Within 15 days after a written request, return or securely delete confidential information, except one archival copy retained only where required for legal or compliance records.',
    exceptions: 'If disclosure is legally compelled, give advance notice where legally permitted and reasonably cooperate with a request for confidential treatment.',
    jurisdiction: 'Pune, Maharashtra courts, subject to advocate verification.',
    jurisdiction_optional: 'Pune, Maharashtra',
    language: 'English',
  },
};

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log(JSON.stringify({ requestTimeoutMs, ...ndaTest }, null, 2));
}
