export const MATTERS = [
  { id: 'civil', label: 'Civil Matters' },
  { id: 'criminal', label: 'Criminal Matters' },
  { id: 'family', label: 'Family Disputes' },
  { id: 'consumer', label: 'Consumer Cases' },
  { id: 'property', label: 'Property Matters' },
  { id: 'employment', label: 'Employment Disputes' },
  { id: 'arbitration', label: 'Arbitration' },
];

export const MATTER_SUBTYPES: Record<string, string[]> = {
  civil: ['plaint', 'written-statement', 'legal-notice', 'reply-legal-notice', 'affidavit', 'vakalatnama', 'power-of-attorney', 'writ-petition', 'appeal', 'revision', 'review-petition', 'execution-petition'],
  criminal: ['bail-application', 'anticipatory-bail', 'regular-bail', 'fir-complaint', 'criminal-complaint', 'vakalatnama', 'power-of-attorney', 'affidavit', 'appeal', 'revision', 'review-petition'],
  family: ['divorce-petition', 'maintenance-petition', 'child-custody-petition', 'affidavit', 'vakalatnama', 'power-of-attorney'],
  consumer: ['consumer-complaint', 'affidavit', 'legal-notice', 'reply-legal-notice', 'vakalatnama'],
  property: ['sale-agreement', 'rent-agreement', 'partnership-deed', 'gift-deed', 'will', 'power-of-attorney', 'affidavit'],
  employment: ['legal-notice', 'reply-legal-notice', 'affidavit', 'written-statement', 'vakalatnama'],
  arbitration: ['legal-notice', 'reply-legal-notice', 'affidavit', 'vakalatnama', 'power-of-attorney', 'written-statement'],
};

export const DRAFT_TYPES: Record<string, { label: string; structure: string[] }> = {
  'plaint': {
    label: "Plaint",
    structure: ["Court name & district", "Civil Suit No. & year", "Plaintiff particulars (name, parentage, age, occupation, address)", "Defendant particulars", "Jurisdiction", "Facts of the case", "Cause of action", "Limitation", "Valuation for court fee", "Court fee paid", "Prayer clause", "Verification", "List of documents", "Annexures"]
  },
  'written-statement': {
    label: "Written Statement",
    structure: ["Court name & district", "Civil Suit No.", "Plaintiff & Defendant particulars", "Admissions/denials of plaint averments", "Preliminary objections", "Reply to allegations", "Additional facts", "Set-off / counter claim (if any)", "Reliefs sought by defendant", "Prayer", "Verification", "List of documents", "Annexures"]
  },
  'legal-notice': {
    label: "Legal Notice",
    structure: ["Date", "From (sender/advocate) details", "To (recipient) details", "Particulars of client", "Particulars of recipient", "Facts of the case", "Cause of action", "Demand", "Time for compliance", "Consequences of non-compliance", "Signature block", "List of documents (if any)", "Copy to (if any)"]
  },
  'reply-legal-notice': {
    label: "Reply to Legal Notice",
    structure: ["Date", "From/To details", "Reference to original notice date", "Particulars of client", "Reply to allegations/facts", "Denials", "Client's stand", "Without prejudice clause", "Reservation of rights", "No admission clause", "Costs", "Signature block", "List of documents", "Copy to"]
  },
  'affidavit': {
    label: "Affidavit",
    structure: ["Court name & district (if for court use)", "Deponent particulars (name, parentage, age, occupation, address)", "Numbered factual statements on oath", "Verification clause", "Place & date", "Attestation block (Oath Commissioner / Notary / Executive Magistrate)"]
  },
  'vakalatnama': {
    label: "Vakalatnama",
    structure: ["Court name, district, case title & case no.", "Client particulars", "Advocate name & address", "Numbered authorization clauses (file, appear, sign, compromise, etc.)", "Client signature", "Acceptance by advocate", "Witnesses (2)", "Identification by advocate"]
  },
  'power-of-attorney': {
    label: "Power of Attorney",
    structure: ["Principal particulars", "Attorney particulars", "Numbered clauses of authority granted", "Ratification clause", "Witnesses (2)", "Signature of principal", "Verification"]
  },
  'sale-agreement': {
    label: "Sale Agreement",
    structure: ["Date", "Seller particulars", "Buyer particulars", "Description of property", "Sale/transfer clause", "Consideration price", "Payment terms (advance + balance)", "Possession date", "Documents/registration obligations", "Declaration & warranty of title", "Jurisdiction/miscellaneous", "Signatures & witnesses"]
  },
  'rent-agreement': {
    label: "Rent Agreement",
    structure: ["Date", "Landlord & Tenant particulars", "Property description", "Monthly rent & due date", "Security deposit", "Duration / lock-in period", "Maintenance responsibilities", "Termination / notice period", "Restrictions (subletting, alterations)", "Signatures & witnesses"]
  },
  'partnership-deed': {
    label: "Partnership Deed",
    structure: ["Date", "Partners' particulars", "Firm name & nature of business", "Capital contribution ratio", "Profit/loss sharing ratio", "Partners' duties & authority", "Duration of partnership", "Bank account operation", "Admission/retirement/dissolution clauses", "Dispute resolution", "Signatures & witnesses"]
  },
  'gift-deed': {
    label: "Gift Deed",
    structure: ["Date", "Donor & Donee particulars", "Relationship between parties", "Description of gifted property", "Declaration of free will / no consideration", "Possession handover clause", "Acceptance by donee", "Registration clause", "Signatures & witnesses"]
  },
  'will': {
    label: "Will",
    structure: ["Testator particulars", "Declaration of sound mind & free will", "Revocation of previous wills", "Details of assets/property", "Beneficiaries & distribution", "Executor appointment", "Signature & date", "Attesting witnesses (2)"]
  },
  'consumer-complaint': {
    label: "Consumer Complaint",
    structure: ["Consumer forum name & jurisdiction", "Complainant particulars", "Opposite party particulars", "Facts of purchase/service", "Deficiency in service / defect in goods", "Cause of action", "Relief sought (refund/compensation/replacement)", "Valuation & court fee", "Verification", "List of documents"]
  },
  'writ-petition': {
    label: "Writ Petition",
    structure: ["High Court name", "Petitioner & Respondent particulars", "Nature of writ sought", "Facts giving rise to the petition", "Grounds for relief", "Prayer", "Verification / supporting affidavit"]
  },
  'bail-application': {
    label: "Bail Application",
    structure: ["Court name", "FIR No., police station & sections invoked", "Accused particulars", "Facts of arrest/custody", "Grounds for bail", "Prayer for bail with conditions", "Verification"]
  },
  'anticipatory-bail': {
    label: "Anticipatory Bail",
    structure: ["Court name (Sessions/High Court)", "Applicant particulars", "FIR No. / apprehended offence details", "Grounds for apprehension of arrest", "Grounds for anticipatory bail", "Prayer", "Verification"]
  },
  'regular-bail': {
    label: "Regular Bail",
    structure: ["Court name", "FIR No., police station & sections", "Accused particulars", "Date of arrest & custody status", "Grounds for bail", "Prayer with proposed conditions", "Verification"]
  },
  'fir-complaint': {
    label: "FIR Complaint",
    structure: ["To: Station House Officer / Police Station", "Complainant particulars", "Date, time & place of incident", "Narration of the offence", "Applicable sections (if known)", "Request for registration of FIR", "Signature"]
  },
  'criminal-complaint': {
    label: "Criminal Complaint",
    structure: ["Court name (Magistrate)", "Complainant & accused particulars", "Facts constituting the offence", "Applicable sections of law", "List of witnesses", "Prayer for cognizance & process", "Verification"]
  },
  'appeal': {
    label: "Appeal",
    structure: ["Appellate court name", "Appeal no. & order/judgment appealed against (court, date)", "Appellant & Respondent particulars", "Grounds of appeal", "Prayer", "Condonation of delay (if applicable)", "Verification"]
  },
  'revision': {
    label: "Revision",
    structure: ["Revisional court name", "Impugned order details (court, date)", "Petitioner & Respondent particulars", "Grounds of revision (illegality/irregularity)", "Prayer", "Verification"]
  },
  'review-petition': {
    label: "Review Petition",
    structure: ["Court name", "Original judgment/order details (date, case no.)", "Petitioner & Respondent particulars", "Grounds for review (error apparent / new evidence)", "Prayer", "Verification"]
  },
  'execution-petition': {
    label: "Execution Petition",
    structure: ["Executing court name", "Decree details (date, case no.)", "Decree-holder & judgment-debtor particulars", "Mode of execution sought", "Amount due / relief to be executed", "Prayer", "Verification"]
  },
  'divorce-petition': {
    label: "Divorce Petition",
    structure: ["Family Court name", "Petitioner & Respondent particulars", "Marriage details (date, place)", "Grounds for divorce", "Facts supporting the grounds", "Prayer for dissolution", "Verification"]
  },
  'maintenance-petition': {
    label: "Maintenance Petition",
    structure: ["Court name (Family Court/Magistrate)", "Petitioner & Respondent particulars", "Relationship / marriage / dependency details", "Income details of both parties", "Grounds for maintenance", "Amount claimed", "Prayer", "Verification"]
  },
  'child-custody-petition': {
    label: "Child Custody Petition",
    structure: ["Court name", "Petitioner & Respondent particulars", "Child(ren)'s particulars (name, age, DOB)", "Present custody status", "Grounds for custody (child's welfare)", "Visitation rights sought", "Prayer", "Verification"]
  }
};
