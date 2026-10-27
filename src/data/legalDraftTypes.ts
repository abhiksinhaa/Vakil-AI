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
  civil: ['plaint', 'written-statement', 'legal-notice', 'reply-legal-notice', 'general-affidavit', 'name-change-affidavit', 'date-of-birth-affidavit', 'address-proof-affidavit', 'single-status-affidavit', 'marriage-affidavit', 'lost-document-affidavit', 'declaration', 'undertaking', 'indemnity-bond', 'legal-heir-declaration', 'family-settlement-agreement', 'relinquishment-deed', 'general-power-of-attorney', 'special-power-of-attorney', 'codicil', 'trust-deed', 'civil-appeal', 'special-leave-petition', 'transfer-petition', 'interlocutory-application', 'miscellaneous-application', 'interim-relief-application', 'stay-application', 'injunction-application', 'caveat-petition', 'contempt-petition', 'condonation-of-delay', 'restoration-application', 'amendment-of-pleadings', 'evidence-affidavit', 'list-of-documents', 'written-submissions', 'synopsis-and-list-of-dates', 'memo-of-appearance', 'legal-case-brief', 'vakalatnama', 'power-of-attorney', 'writ-petition', 'appeal', 'revision', 'review-petition', 'execution-petition'],
  criminal: ['bail-application', 'anticipatory-bail', 'regular-bail', 'default-bail-application', 'interim-bail-application', 'bail-cancellation-application', 'discharge-application', 'quashing-petition', 'protest-petition', 'application-for-further-investigation', 'private-complaint-before-magistrate', 'zero-fir-complaint', 'criminal-appeal', 'criminal-revision-petition', 'compounding-application', 'surrender-application', 'return-of-seized-property', 'release-of-vehicle', 'exemption-from-personal-appearance', 'criminal-miscellaneous-petition', 'defamation-complaint', 'cheque-bounce-complaint', 'reply-to-criminal-complaint', 'criminal-legal-notice', 'fir-complaint', 'criminal-complaint', 'vakalatnama', 'power-of-attorney', 'affidavit', 'appeal', 'revision', 'review-petition'],
  family: ['divorce-petition', 'maintenance-petition', 'child-custody-petition', 'family-settlement-agreement', 'legal-heir-declaration', 'relinquishment-deed', 'general-power-of-attorney', 'special-power-of-attorney', 'trust-deed', 'affidavit', 'vakalatnama', 'power-of-attorney'],
  consumer: ['consumer-complaint', 'affidavit', 'legal-notice', 'reply-legal-notice', 'vakalatnama'],
  property: ['sale-agreement', 'sale-deed', 'agreement-to-sell', 'lease-deed', 'rent-agreement', 'commercial-lease-agreement', 'leave-and-license-agreement', 'rent-agreement-renewal', 'eviction-notice', 'notice-for-non-payment-of-rent', 'property-possession-letter', 'possession-handover-agreement', 'property-exchange-deed', 'mortgage-deed', 'release-deed', 'partition-deed', 'partnership-deed', 'gift-deed', 'builder-buyer-agreement', 'construction-agreement', 'development-agreement', 'joint-development-agreement', 'real-estate-brokerage-agreement', 'property-management-agreement', 'title-verification-checklist', 'property-due-diligence-report', 'mou-for-property', 'rera-complaint', 'rera-appeal', 'mutation-application', 'land-record-correction-application', 'encumbrance-declaration', 'boundary-dispute-complaint', 'easement-agreement', 'will', 'relinquishment-deed', 'general-power-of-attorney', 'special-power-of-attorney', 'power-of-attorney', 'affidavit'],
  employment: ['legal-notice', 'reply-legal-notice', 'employment-agreement', 'independent-contractor-agreement', 'service-agreement', 'consultancy-agreement', 'termination-letter', 'settlement-agreement', 'non-disclosure-agreement', 'non-compete-agreement', 'non-solicitation-agreement', 'employee-termination-notice', 'affidavit', 'written-statement', 'vakalatnama'],
  arbitration: ['legal-notice', 'reply-legal-notice', 'arbitration-notice', 'arbitration-clauses', 'arbitration-agreement', 'affidavit', 'vakalatnama', 'power-of-attorney', 'written-statement'],
};

export const DRAFT_TYPES: Record<string, { label: string; party1Label: string; party2Label?: string; structure: string[] }> = {
  'plaint': {
    label: "Plaint",
    party1Label: "Plaintiff",
    party2Label: "Defendant",
    structure: ["Court name & district", "Civil Suit No. & year", "Plaintiff particulars (name, parentage, age, occupation, address)", "Defendant particulars", "Jurisdiction", "Facts of the case", "Cause of action", "Limitation", "Valuation for court fee", "Court fee paid", "Prayer clause", "Verification", "List of documents", "Annexures"]
  },
  'written-statement': {
    label: "Written Statement",
    party1Label: "Defendant",
    party2Label: "Plaintiff",
    structure: ["Court name & district", "Civil Suit No.", "Plaintiff & Defendant particulars", "Admissions/denials of plaint averments", "Preliminary objections", "Reply to allegations", "Additional facts", "Set-off / counter claim (if any)", "Reliefs sought by defendant", "Prayer", "Verification", "List of documents", "Annexures"]
  },
  'legal-notice': {
    label: "Legal Notice",
    party1Label: "Sender",
    party2Label: "Recipient",
    structure: ["Date", "From (sender/advocate) details", "To (recipient) details", "Particulars of client", "Particulars of recipient", "Facts of the case", "Cause of action", "Demand", "Time for compliance", "Consequences of non-compliance", "Signature block", "List of documents (if any)", "Copy to (if any)"]
  },
  'reply-legal-notice': {
    label: "Reply to Legal Notice",
    party1Label: "Sender",
    party2Label: "Recipient",
    structure: ["Date", "From/To details", "Reference to original notice date", "Particulars of client", "Reply to allegations/facts", "Denials", "Client's stand", "Without prejudice clause", "Reservation of rights", "No admission clause", "Costs", "Signature block", "List of documents", "Copy to"]
  },
  'affidavit': {
    label: "Affidavit",
    party1Label: "Deponent",
    structure: ["Court name & district (if for court use)", "Deponent particulars (name, parentage, age, occupation, address)", "Numbered factual statements on oath", "Verification clause", "Place & date", "Attestation block (Oath Commissioner / Notary / Executive Magistrate)"]
  },
  'general-affidavit': {
    label: "General Affidavit",
    party1Label: "Deponent",
    structure: ["Deponent particulars", "Purpose and subject of the affidavit", "Facts to be affirmed", "Supporting records if any", "Verification", "Place and date", "Attestation by notary / oath commissioner"]
  },
  'name-change-affidavit': {
    label: "Name Change Affidavit",
    party1Label: "Deponent",
    structure: ["Full current name and old name", "Date and place of birth", "Reason for change of name", "Previous records and identity proofs", "Declaration of no conflicting facts", "Verification", "Place and date", "Attestation block"]
  },
  'date-of-birth-affidavit': {
    label: "Date of Birth Affidavit",
    party1Label: "Deponent",
    structure: ["Deponent particulars", "Date of birth as per records", "Grounds for declaration", "Supporting documents", "Declaration of accuracy", "Verification", "Place and date", "Attestation block"]
  },
  'address-proof-affidavit': {
    label: "Address Proof Affidavit",
    party1Label: "Deponent",
    structure: ["Deponent particulars", "Current address and period of residence", "Supporting documents", "Declaration of truth of address", "Verification", "Place and date", "Attestation block"]
  },
  'single-status-affidavit': {
    label: "Single Status Affidavit",
    party1Label: "Deponent",
    structure: ["Deponent particulars", "Marriage status declaration", "Birth / personal details", "Declaration of being unmarried", "Verification", "Place and date", "Attestation block", "Supporting identity documents"]
  },
  'marriage-affidavit': {
    label: "Marriage Affidavit",
    party1Label: "Deponent",
    structure: ["Parties' particulars", "Date and place of marriage", "Details of marriage registration or ceremony", "Declaration of marital status", "Verification", "Place and date", "Attestation block"]
  },
  'lost-document-affidavit': {
    label: "Lost Document Affidavit",
    party1Label: "Deponent",
    structure: ["Document lost", "Description of document", "Date, place and circumstances of loss", "Steps taken to trace it", "Declaration of non-possession", "Verification", "Place and date", "Attestation block"]
  },
  'declaration': {
    label: "Declaration",
    party1Label: "Declarant",
    structure: ["Name and address of declarant", "Purpose and subject of declaration", "Facts declared", "Statement of truth", "Documents relied on", "Verification", "Place and date", "Signature"]
  },
  'undertaking': {
    label: "Undertaking",
    party1Label: "Undertaker",
    structure: ["Name and address of undertaker", "Purpose of undertaking", "Specific undertaking and commitments", "Relevant facts", "Time period and compliance obligations", "Consequences of default", "Verification", "Signature and date"]
  },
  'indemnity-bond': {
    label: "Indemnity Bond",
    party1Label: "Principal Obligor",
    party2Label: "Indemnified Party",
    structure: ["Parties' particulars", "Purpose of indemnity", "Obligation and indemnity amount", "Trigger events", "Indemnification mechanism", "Limitations and exclusions", "Execution and witnessing", "Signatures"]
  },
  'legal-heir-declaration': {
    label: "Legal Heir Declaration",
    party1Label: "Declarant",
    party2Label: "Deceased Person",
    structure: ["Details of deceased", "Declarant relationship to deceased", "Family particulars and legal heirs", "Declaration of succession details", "Supporting documents", "Verification", "Signature and witnesses"]
  },
  'family-settlement-agreement': {
    label: "Family Settlement Agreement",
    party1Label: "Party 1",
    party2Label: "Party 2",
    structure: ["Date and place", "Parties' details", "Background of family dispute", "Terms of settlement", "Assets/disputes covered", "Mutual releases", "Non-disclosure and confidentiality", "Execution and witnesses"]
  },
  'relinquishment-deed': {
    label: "Relinquishment Deed",
    party1Label: "Relinquishing Party",
    party2Label: "Other Legal Heir/Party",
    structure: ["Date and parties' details", "Description of property or right", "Relationship between parties", "Declaration of relinquishment", "Consideration or no consideration", "Acceptance by other party", "Registration requirements", "Witnesses and signatures"]
  },
  'general-power-of-attorney': {
    label: "General Power of Attorney",
    party1Label: "Principal",
    party2Label: "Attorney Holder",
    structure: ["Principal particulars", "Attorney particulars", "Scope of general authority", "Specific powers and acts covered", "Duration and revocation", "Restrictions", "Witnesses", "Attestation and execution"]
  },
  'special-power-of-attorney': {
    label: "Special Power of Attorney",
    party1Label: "Principal",
    party2Label: "Attorney Holder",
    structure: ["Principal particulars", "Attorney particulars", "Specific transaction or act authorised", "Property or matter details", "Scope and limitations of authority", "Duration and revocation", "Witnesses", "Attestation and execution"]
  },
  'codicil': {
    label: "Codicil",
    party1Label: "Testator",
    party2Label: "Witness",
    structure: ["Testator particulars", "Existing will reference", "Amendments or additions made", "Intention to alter will", "Executor and beneficiaries", "Signature and date", "Witnesses", "Attestation"]
  },
  'trust-deed': {
    label: "Trust Deed",
    party1Label: "Settlor",
    party2Label: "Trustee",
    structure: ["Settlor and trustee particulars", "Trust name and objects", "Trust property details", "Beneficiaries", "Powers and duties of trustees", "Administration and accounts", "Revocation or amendment provisions", "Execution and witnesses"]
  },
  'vakalatnama': {
    label: "Vakalatnama",
    party1Label: "Client",
    party2Label: "Advocate",
    structure: ["Court name, district, case title & case no.", "Client particulars", "Advocate name & address", "Numbered authorization clauses (file, appear, sign, compromise, etc.)", "Client signature", "Acceptance by advocate", "Witnesses (2)", "Identification by advocate"]
  },
  'power-of-attorney': {
    label: "Power of Attorney",
    party1Label: "Principal",
    party2Label: "Attorney",
    structure: ["Principal particulars", "Attorney particulars", "Numbered clauses of authority granted", "Ratification clause", "Witnesses (2)", "Signature of principal", "Verification"]
  },
  'sale-agreement': {
    label: "Sale Agreement",
    party1Label: "Seller",
    party2Label: "Buyer",
    structure: ["Date", "Seller particulars", "Buyer particulars", "Description of property", "Sale/transfer clause", "Consideration price", "Payment terms (advance + balance)", "Possession date", "Documents/registration obligations", "Declaration & warranty of title", "Jurisdiction/miscellaneous", "Signatures & witnesses"]
  },
  'rent-agreement': {
    label: "Rent Agreement",
    party1Label: "Landlord",
    party2Label: "Tenant",
    structure: ["Date", "Landlord & Tenant particulars", "Property description", "Monthly rent & due date", "Security deposit", "Duration / lock-in period", "Maintenance responsibilities", "Termination / notice period", "Restrictions (subletting, alterations)", "Signatures & witnesses"]
  },
  'partnership-deed': {
    label: "Partnership Deed",
    party1Label: "Partner 1",
    party2Label: "Partner 2",
    structure: ["Date", "Partners' particulars", "Firm name & nature of business", "Capital contribution ratio", "Profit/loss sharing ratio", "Partners' duties & authority", "Duration of partnership", "Bank account operation", "Admission/retirement/dissolution clauses", "Dispute resolution", "Signatures & witnesses"]
  },
  'gift-deed': {
    label: "Gift Deed",
    party1Label: "Donor",
    party2Label: "Donee",
    structure: ["Date", "Donor & Donee particulars", "Relationship between parties", "Description of gifted property", "Declaration of free will / no consideration", "Possession handover clause", "Acceptance by donee", "Registration clause", "Signatures & witnesses"]
  },
  'sale-deed': {
    label: "Sale Deed",
    party1Label: "Seller",
    party2Label: "Buyer",
    structure: ["Date and place", "Parties' particulars", "Description of property", "Consideration amount", "Payment schedule", "Title and ownership declaration", "Registration and stamp duty", "Possession and transfer clause", "Witnesses and signatures"]
  },
  'agreement-to-sell': {
    label: "Agreement to Sell",
    party1Label: "Seller",
    party2Label: "Buyer",
    structure: ["Date and place", "Parties' details", "Property description", "Consideration and schedule", "Payment milestones", "Conditions precedent", "Timeline for completion", "Default and remedies", "Signatures"]
  },
  'lease-deed': {
    label: "Lease Deed",
    party1Label: "Lessor",
    party2Label: "Lessee",
    structure: ["Date and parties", "Property description", "Lease term", "Rent and escalation", "Security deposit", "Maintenance and taxes", "Termination and renewal", "Use restrictions", "Signatures"]
  },
  'commercial-lease-agreement': {
    label: "Commercial Lease Agreement",
    party1Label: "Landlord",
    party2Label: "Tenant",
    structure: ["Property details", "Business use", "Lease term", "Rent and CAM charges", "Security deposit", "Maintenance obligations", "Termination and renewal", "Default and remedies", "Signatures"]
  },
  'leave-and-license-agreement': {
    label: "Leave and License Agreement",
    party1Label: "Licensor",
    party2Label: "Licensee",
    structure: ["Parties and property details", "License term", "License fee and deposit", "Permitted use", "Maintenance and utilities", "Termination notice", "Restrictions", "Signatures"]
  },
  'rent-agreement-renewal': {
    label: "Rent Agreement Renewal",
    party1Label: "Landlord",
    party2Label: "Tenant",
    structure: ["Existing agreement reference", "Renewal term", "Rent revision", "Security deposit", "Maintenance obligations", "Renewal conditions", "Signatures"]
  },
  'eviction-notice': {
    label: "Eviction Notice",
    party1Label: "Landlord",
    party2Label: "Tenant",
    structure: ["Date", "Property details", "Lease details", "Grounds of eviction", "Notice period and compliance", "Demand to vacate", "Legal consequences", "Signature"]
  },
  'notice-for-non-payment-of-rent': {
    label: "Notice for Non-Payment of Rent",
    party1Label: "Landlord",
    party2Label: "Tenant",
    structure: ["Date", "Property and lease details", "Outstanding rent summary", "Demand and due date", "Legal consequences", "Receipt and compliance", "Signature"]
  },
  'property-possession-letter': {
    label: "Property Possession Letter",
    party1Label: "Seller",
    party2Label: "Buyer",
    structure: ["Date", "Property details", "Transfer and possession date", "Declarations of possession", "Title and encumbrance status", "Delivery formalities", "Signatures"]
  },
  'possession-handover-agreement': {
    label: "Possession Handover Agreement",
    party1Label: "Transferor",
    party2Label: "Transferee",
    structure: ["Parties and property details", "Possession date", "Mode of handover", "Condition of property", "Defects and obligations", "Signatures and witnesses"]
  },
  'property-exchange-deed': {
    label: "Property Exchange Deed",
    party1Label: "Party 1",
    party2Label: "Party 2",
    structure: ["Parties' details", "Description of exchanged properties", "Valuation and adjustment", "Mutual rights and obligations", "Title declaration", "Registration requirements", "Signatures"]
  },
  'mortgage-deed': {
    label: "Mortgage Deed",
    party1Label: "Mortgagor",
    party2Label: "Mortgagee",
    structure: ["Parties' details", "Property details", "Security offered", "Loan amount and interest", "Rights and obligations", "Default and enforcement", "Registration and witnesses"]
  },
  'release-deed': {
    label: "Release Deed",
    party1Label: "Releasor",
    party2Label: "Releasee",
    structure: ["Parties' details", "Property or right details", "Nature of release", "Consideration if any", "Declaration of no liabilities", "Registration and witnesses"]
  },
  'partition-deed': {
    label: "Partition Deed",
    party1Label: "Co-owner 1",
    party2Label: "Co-owner 2",
    structure: ["Description of property", "Schedule of shares", "Assets and liabilities", "Mutual partition terms", "Possession and title transfer", "Registration and signatures", "Witnesses"]
  },
  'builder-buyer-agreement': {
    label: "Builder-Buyer Agreement",
    party1Label: "Builder",
    party2Label: "Buyer",
    structure: ["Project and unit details", "Payment schedule", "Construction milestones", "Amenities and specifications", "Possession date", "Defect liability", "Refund and cancellation", "Signatures"]
  },
  'construction-agreement': {
    label: "Construction Agreement",
    party1Label: "Owner",
    party2Label: "Contractor",
    structure: ["Project description", "Scope of work", "Timeline and milestones", "Cost and payment terms", "Materials and supervision", "Changes in scope", "Defects and completion", "Signatures"]
  },
  'development-agreement': {
    label: "Development Agreement",
    party1Label: "Landowner",
    party2Label: "Developer",
    structure: ["Property details", "Development rights", "Project cost and revenue sharing", "Timeline", "Approval and permissions", "Construction obligations", "Dispute resolution", "Signatures"]
  },
  'joint-development-agreement': {
    label: "Joint Development Agreement",
    party1Label: "Owner",
    party2Label: "Developer",
    structure: ["Property and parties", "Share of landowner and developer", "Development rights and cost", "Construction schedule", "Revenue sharing", "Approvals and timeline", "Termination and disputes", "Signatures"]
  },
  'real-estate-brokerage-agreement': {
    label: "Real Estate Brokerage Agreement",
    party1Label: "Client / Owner",
    party2Label: "Broker",
    structure: ["Property details", "Scope of brokerage", "Commission and fees", "Term and exclusivity", "Marketing obligations", "Rights and duties", "Terminations and disputes", "Signatures"]
  },
  'property-management-agreement': {
    label: "Property Management Agreement",
    party1Label: "Owner",
    party2Label: "Manager",
    structure: ["Property details", "Management scope", "Fees and expenses", "Maintenance responsibilities", "Tenant/occupancy management", "Reporting obligations", "Term and termination", "Signatures"]
  },
  'title-verification-checklist': {
    label: "Title Verification Checklist",
    party1Label: "Owner / Seller",
    party2Label: "Verifier / Buyer",
    structure: ["Property description", "Chain of title", "Documents reviewed", "Encumbrances and liens", "Revenue records", "Mutations and approvals", "Verification summary", "Recommendation"]
  },
  'property-due-diligence-report': {
    label: "Property Due Diligence Report",
    party1Label: "Property Owner",
    party2Label: "Buyer / Investor",
    structure: ["Property summary", "Title and ownership review", "Litigation and encumbrances", "Approvals and permissions", "Financial and tax checks", "Risk analysis", "Conclusion and recommendation"]
  },
  'mou-for-property': {
    label: "Memorandum of Understanding for Property",
    party1Label: "Party 1",
    party2Label: "Party 2",
    structure: ["Parties and property details", "Purpose of MoU", "Terms of negotiation", "Deposit or exclusivity", "Timeline and approvals", "No binding final transfer", "Signatures"]
  },
  'rera-complaint': {
    label: "RERA Complaint",
    party1Label: "Complainant",
    party2Label: "Developer / Promoter",
    structure: ["Project and registration details", "Complaint summary", "Facts and violations", "Relief sought", "Supportive documents", "Prayer", "Verification"]
  },
  'rera-appeal': {
    label: "RERA Appeal",
    party1Label: "Appellant",
    party2Label: "Respondent",
    structure: ["Authority and order details", "Facts and issues", "Grounds of appeal", "Relief sought", "Verification"]
  },
  'mutation-application': {
    label: "Mutation Application",
    party1Label: "Applicant",
    party2Label: "Revenue Authority",
    structure: ["Property details", "Previous owner details", "Reason for mutation", "Documents accompanying", "Declaration of ownership", "Prayer", "Verification"]
  },
  'land-record-correction-application': {
    label: "Land Record Correction Application",
    party1Label: "Applicant",
    party2Label: "Revenue Authority",
    structure: ["Property and record details", "Correction sought", "Details of error", "Supporting records", "Prayer", "Verification"]
  },
  'encumbrance-declaration': {
    label: "Encumbrance Declaration",
    party1Label: "Declarant",
    party2Label: "Party to Transaction",
    structure: ["Property details", "Declaration of encumbrances", "Outstanding liabilities", "Documents reviewed", "Verification", "Signature"]
  },
  'boundary-dispute-complaint': {
    label: "Boundary Dispute Complaint",
    party1Label: "Complainant",
    party2Label: "Opposite Party",
    structure: ["Property details", "Boundary issue description", "Survey and map details", "Facts and damages", "Relief sought", "Verification"]
  },
  'easement-agreement': {
    label: "Easement Agreement",
    party1Label: "Dominant Owner",
    party2Label: "Servient Owner",
    structure: ["Property details", "Nature of easement", "Terms and conditions", "Rights and obligations", "Compensation or consideration", "Duration and extinguishment", "Signatures"]
  },
  'will': {
    label: "Will",
    party1Label: "Testator",
    party2Label: "Beneficiary",
    structure: ["Testator particulars", "Declaration of sound mind & free will", "Revocation of previous wills", "Details of assets/property", "Beneficiaries & distribution", "Executor appointment", "Signature & date", "Attesting witnesses (2)"]
  },
  'consumer-complaint': {
    label: "Consumer Complaint",
    party1Label: "Complainant",
    party2Label: "Opposite Party",
    structure: ["Consumer forum name & jurisdiction", "Complainant particulars", "Opposite party particulars", "Facts of purchase/service", "Deficiency in service / defect in goods", "Cause of action", "Relief sought (refund/compensation/replacement)", "Valuation & court fee", "Verification", "List of documents"]
  },
  'employment-agreement': {
    label: "Employment Agreement",
    party1Label: "Employer",
    party2Label: "Employee",
    structure: ["Date and parties", "Designation and duties", "Compensation and benefits", "Work location and hours", "Probation and performance", "Confidentiality and IP", "Leave and termination", "Dispute resolution and governing law", "Signatures"]
  },
  'independent-contractor-agreement': {
    label: "Independent Contractor Agreement",
    party1Label: "Company",
    party2Label: "Contractor",
    structure: ["Scope of work", "Fees and payment terms", "Term and deliverables", "Confidentiality and IP", "Independent relationship", "Termination", "Liability and indemnity", "Governing law", "Signatures"]
  },
  'service-agreement': {
    label: "Service Agreement",
    party1Label: "Client",
    party2Label: "Service Provider",
    structure: ["Scope of services", "Term and performance standards", "Fees and milestones", "Support and SLAs", "Confidentiality", "Termination and remedies", "Dispute resolution", "Signatures"]
  },
  'consultancy-agreement': {
    label: "Consultancy Agreement",
    party1Label: "Client",
    party2Label: "Consultant",
    structure: ["Scope of consultancy", "Fees and expenses", "Term and deliverables", "Confidentiality and non-use", "Intellectual property", "Termination", "Governing law", "Signatures"]
  },
  'termination-letter': {
    label: "Termination Letter",
    party1Label: "Employer",
    party2Label: "Employee",
    structure: ["Employee details", "Employment details", "Reason for termination", "Effective date", "Pay and benefits", "Return of property and confidentiality obligations", "Final settlement", "Signature"]
  },
  'settlement-agreement': {
    label: "Settlement Agreement",
    party1Label: "Party 1",
    party2Label: "Party 2",
    structure: ["Background and dispute", "Settlement terms", "Payment or obligations", "Mutual releases", "Confidentiality", "No admission", "Execution and witnesses"]
  },
  'non-disclosure-agreement': {
    label: "Non-Disclosure Agreement",
    party1Label: "Disclosing Party",
    party2Label: "Receiving Party",
    structure: ["Purpose and confidential information", "Obligations of confidentiality", "Exclusions and permitted disclosures", "Term of confidentiality", "Remedies for breach", "Signatures"]
  },
  'non-compete-agreement': {
    label: "Non-Compete Agreement",
    party1Label: "Employer",
    party2Label: "Employee / Contractor",
    structure: ["Purpose", "Restricted activities", "Territory and duration", "Reasonableness and lawful limitations", "Consideration", "Remedies for breach", "Signatures"]
  },
  'non-solicitation-agreement': {
    label: "Non-Solicitation Agreement",
    party1Label: "Employer",
    party2Label: "Employee / Contractor",
    structure: ["Purpose", "Restricted solicitation", "Clients, staff and vendors", "Duration and territory", "Consideration", "Remedies", "Signatures"]
  },
  'employee-termination-notice': {
    label: "Employee Termination Notice",
    party1Label: "Employer",
    party2Label: "Employee",
    structure: ["Employment details", "Termination reason", "Effective date", "Settlement and dues", "Return of property", "Final obligations", "Signature"]
  },
  'arbitration-notice': {
    label: "Arbitration Notice",
    party1Label: "Claimant",
    party2Label: "Respondent",
    structure: ["Dispute summary", "Contract or arbitration clause", "Request for arbitration", "Seat and venue", "Nomination and timeline", "Prayer", "Signature"]
  },
  'arbitration-agreement': {
    label: "Arbitration Agreement",
    party1Label: "Party 1",
    party2Label: "Party 2",
    structure: ["Dispute subject", "Arbitration clause", "Seat and venue", "Number of arbitrators", "Procedure and language", "Costs and law", "Signatures"]
  },
  'arbitration-clauses': {
    label: "Arbitration Clauses",
    party1Label: "Party 1",
    party2Label: "Party 2",
    structure: ["Contract context", "Arbitration trigger", "Seat and venue", "Choice of law", "Procedure and language", "Confidentiality", "Costs and enforcement"]
  },
  'writ-petition': {
    label: "Writ Petition",
    party1Label: "Petitioner",
    party2Label: "Respondent",
    structure: ["High Court name", "Petitioner & Respondent particulars", "Nature of writ sought", "Facts giving rise to the petition", "Grounds for relief", "Prayer", "Verification / supporting affidavit"]
  },
  'civil-appeal': {
    label: "Civil Appeal",
    party1Label: "Appellant",
    party2Label: "Respondent",
    structure: ["Court name and jurisdiction", "Appeal no. & impugned judgment details", "Appellant and Respondent particulars", "Grounds of appeal", "Facts and legal submissions", "Prayer for relief", "Condonation of delay (if applicable)", "Verification"]
  },
  'special-leave-petition': {
    label: "Special Leave Petition",
    party1Label: "Petitioner",
    party2Label: "Respondent",
    structure: ["Supreme Court details", "Case title and impugned order details", "Petitioner & Respondent particulars", "Questions of law involved", "Grounds for special leave", "Prayer", "Verification"]
  },
  'transfer-petition': {
    label: "Transfer Petition",
    party1Label: "Petitioner",
    party2Label: "Respondent",
    structure: ["Forum and case details", "Parties' particulars", "Reasons for transfer", "Convenience and fairness grounds", "Prayer for transfer", "Verification", "Supporting documents"]
  },
  'interlocutory-application': {
    label: "Interlocutory Application",
    party1Label: "Applicant",
    party2Label: "Respondent",
    structure: ["Case title and number", "Court details", "Applicant & Respondent particulars", "Relief sought on an interim basis", "Grounds in brief", "Supporting facts", "Prayer", "Verification"]
  },
  'miscellaneous-application': {
    label: "Miscellaneous Application",
    party1Label: "Applicant",
    party2Label: "Respondent",
    structure: ["Case title and number", "Applicant and Respondent particulars", "Purpose of application", "Facts and submissions", "Relief sought", "Prayer", "Verification"]
  },
  'interim-relief-application': {
    label: "Interim Relief Application",
    party1Label: "Applicant",
    party2Label: "Respondent",
    structure: ["Case details", "Applicant and Respondent particulars", "Nature of interim relief sought", "Urgency and irreparable harm", "Facts and grounds", "Balance of convenience", "Prayer", "Verification"]
  },
  'stay-application': {
    label: "Stay Application",
    party1Label: "Applicant",
    party2Label: "Respondent",
    structure: ["Case details", "Order or proceeding sought to be stayed", "Grounds for stay", "Balance of convenience and irreparable injury", "Prayer for stay", "Verification"]
  },
  'injunction-application': {
    label: "Injunction Application",
    party1Label: "Applicant",
    party2Label: "Respondent",
    structure: ["Case details", "Facts showing threatened injury", "Legal ground for injunction", "Balance of convenience", "Prayer for injunction", "Verification", "List of documents"]
  },
  'caveat-petition': {
    label: "Caveat Petition",
    party1Label: "Caveator",
    party2Label: "Other Party",
    structure: ["Court name", "Caveator particulars", "Details of anticipated filing", "Grounds for caveat", "Prayer to be heard before orders", "Verification"]
  },
  'contempt-petition': {
    label: "Contempt Petition",
    party1Label: "Petitioner",
    party2Label: "Respondent",
    structure: ["Court name and case details", "Contempt alleged", "Order or undertaking disobeyed", "Nature and date of non-compliance", "Grounds", "Prayer for action", "Verification"]
  },
  'condonation-of-delay': {
    label: "Application for Condonation of Delay",
    party1Label: "Applicant",
    party2Label: "Respondent",
    structure: ["Case title and number", "Reason for delay", "Day-to-day chronology", "Sufficient cause explanation", "Prayer for condonation", "Verification"]
  },
  'restoration-application': {
    label: "Application for Restoration",
    party1Label: "Applicant",
    party2Label: "Respondent",
    structure: ["Case details", "Order of dismissal or default", "Grounds for restoration", "Reason for non-appearance", "Prayer", "Verification"]
  },
  'amendment-of-pleadings': {
    label: "Application for Amendment of Pleadings",
    party1Label: "Applicant",
    party2Label: "Respondent",
    structure: ["Case title and number", "Existing pleading sought to be amended", "Specific amendments sought", "Reasons for amendment", "No prejudice to opposite party", "Prayer", "Verification"]
  },
  'evidence-affidavit': {
    label: "Evidence Affidavit",
    party1Label: "Deponent",
    structure: ["Case details", "Deponent particulars", "Facts to be proved", "Exhibits and documents relied on", "Verification", "Attestation by oath commissioner/notary"]
  },
  'list-of-documents': {
    label: "List of Documents",
    party1Label: "Party",
    party2Label: "Other Party",
    structure: ["Case title and number", "Document details", "Date of each document", "Mode of proof", "Indexing and annexure number", "Verification"]
  },
  'written-submissions': {
    label: "Written Submissions",
    party1Label: "Party",
    party2Label: "Opposing Party",
    structure: ["Case details", "Issues for determination", "Summary of submissions", "Legal arguments", "Relief sought", "Prayer"]
  },
  'synopsis-and-list-of-dates': {
    label: "Synopsis and List of Dates",
    party1Label: "Applicant",
    party2Label: "Respondent",
    structure: ["Case title and number", "Issues involved", "Chronology of dates", "Relevant facts by date", "Legal relevance of events", "Prayer"]
  },
  'memo-of-appearance': {
    label: "Memo of Appearance",
    party1Label: "Advocate",
    party2Label: "Client",
    structure: ["Court name and case details", "Advocate details", "Client details", "Authority to appear", "Acceptance of appearance", "Signature and date"]
  },
  'legal-case-brief': {
    label: "Legal Case Brief",
    party1Label: "Client",
    party2Label: "Matter",
    structure: ["Case title and court", "Issue involved", "Facts summary", "Evidence and documents", "Legal propositions", "Arguments", "Relief sought"]
  },
  'criminal-appeal': {
    label: "Criminal Appeal",
    party1Label: "Appellant",
    party2Label: "Respondent/State",
    structure: ["Court name and jurisdiction", "Impugned judgment or order details", "Appellant and Respondent particulars", "Grounds of criminal appeal", "Facts and legal grounds", "Prayer", "Verification"]
  },
  'criminal-revision-petition': {
    label: "Criminal Revision Petition",
    party1Label: "Petitioner",
    party2Label: "Respondent/State",
    structure: ["Court name", "Impugned order details", "Petitioner & Respondent particulars", "Grounds for revision", "Legal error or illegality", "Prayer", "Verification"]
  },
  'default-bail-application': {
    label: "Default Bail Application",
    party1Label: "Accused",
    party2Label: "State",
    structure: ["Court name", "FIR, sections and date of arrest", "Accused particulars", "Investigation status", "Default bail grounds", "Prayer for release", "Verification"]
  },
  'interim-bail-application': {
    label: "Interim Bail Application",
    party1Label: "Accused",
    party2Label: "State",
    structure: ["Court details", "Accused particulars", "FIR and arrest details", "Grounds for interim bail", "Medical / family / urgent reasons", "Prayer", "Verification"]
  },
  'bail-cancellation-application': {
    label: "Bail Cancellation Application",
    party1Label: "Applicant",
    party2Label: "Accused",
    structure: ["Court details", "Case and bail order details", "Grounds of cancellation", "Misuse or violation", "Prayer", "Verification"]
  },
  'discharge-application': {
    label: "Discharge Application",
    party1Label: "Accused",
    party2Label: "State",
    structure: ["Court name", "Case title and sections", "Accused particulars", "Grounds for discharge", "Material facts and legal grounds", "Prayer", "Verification"]
  },
  'quashing-petition': {
    label: "Quashing Petition",
    party1Label: "Petitioner",
    party2Label: "Respondent",
    structure: ["Court details", "Case title and FIR details", "Petitioner particulars", "Grounds for quashing", "Legal arguments", "Prayer", "Verification"]
  },
  'protest-petition': {
    label: "Protest Petition",
    party1Label: "Complainant",
    party2Label: "Accused",
    structure: ["Court name", "Complaint and incident details", "Facts and acts complained of", "Prayer for investigation or action", "Verification"]
  },
  'application-for-further-investigation': {
    label: "Application for Further Investigation",
    party1Label: "Applicant",
    party2Label: "Respondent",
    structure: ["Case details", "Facts requiring further investigation", "Material gaps", "Prayer", "Verification"]
  },
  'private-complaint-before-magistrate': {
    label: "Private Complaint before Magistrate",
    party1Label: "Complainant",
    party2Label: "Accused",
    structure: ["Magistrate details", "Complainant and accused particulars", "Facts and offences alleged", "Documentary evidence", "Prayer for cognizance", "Verification"]
  },
  'zero-fir-complaint': {
    label: "Zero FIR Complaint",
    party1Label: "Complainant",
    party2Label: "Accused",
    structure: ["Police station and jurisdiction", "Complainant particulars", "Date, time and place of incident", "Narration of facts", "Offences alleged", "Request for registration and investigation", "Signature"]
  },
  'compounding-application': {
    label: "Compounding Application",
    party1Label: "Applicant",
    party2Label: "Opposite Party",
    structure: ["Case details", "Offence and parties", "Terms of compromise", "Mutual consent and conditions", "Prayer", "Verification"]
  },
  'surrender-application': {
    label: "Surrender Application",
    party1Label: "Applicant",
    party2Label: "State",
    structure: ["Case and court details", "Accused particulars", "Grounds for surrender", "Dates and circumstances", "Prayer for acceptance of surrender", "Verification"]
  },
  'return-of-seized-property': {
    label: "Application for Return of Seized Property",
    party1Label: "Applicant",
    party2Label: "State",
    structure: ["Case details", "Property description and seizure details", "Grounds for return", "Legal entitlement", "Prayer", "Verification"]
  },
  'release-of-vehicle': {
    label: "Application for Release of Vehicle",
    party1Label: "Applicant",
    party2Label: "State",
    structure: ["Vehicle details", "Seizure details", "Ownership details", "Grounds for release", "Prayer", "Verification"]
  },
  'exemption-from-personal-appearance': {
    label: "Application for Exemption from Personal Appearance",
    party1Label: "Applicant",
    party2Label: "Court/State",
    structure: ["Case details", "Applicant particulars", "Grounds for exemption", "Medical or practical reasons", "Prayer", "Verification"]
  },
  'criminal-miscellaneous-petition': {
    label: "Criminal Miscellaneous Petition",
    party1Label: "Petitioner",
    party2Label: "Respondent/State",
    structure: ["Court details", "Petitioner particulars", "Relief sought", "Facts giving rise to the petition", "Grounds of prayer", "Verification"]
  },
  'defamation-complaint': {
    label: "Defamation Complaint",
    party1Label: "Complainant",
    party2Label: "Accused",
    structure: ["Court name", "Complainant and accused particulars", "Statement / publication details", "Harm caused", "Prayer for relief", "Verification"]
  },
  'cheque-bounce-complaint': {
    label: "Cheque Bounce Complaint",
    party1Label: "Complainant",
    party2Label: "Accused",
    structure: ["Court name", "Cheque details", "Date of issue and dishonour", "Cause of action under NI Act", "Demand and legal notice", "Prayer for relief", "Verification"]
  },
  'reply-to-criminal-complaint': {
    label: "Reply to Criminal Complaint",
    party1Label: "Accused",
    party2Label: "Complainant",
    structure: ["Case details", "Reply to allegations", "Denials and explanation", "Legal submissions", "Prayer", "Verification"]
  },
  'criminal-legal-notice': {
    label: "Criminal Legal Notice",
    party1Label: "Sender",
    party2Label: "Recipient",
    structure: ["Date", "Sender and recipient details", "Facts and offence details", "Demand and legal consequences", "Time to comply", "Signature block"]
  },
  'bail-application': {
    label: "Bail Application",
    party1Label: "Accused",
    party2Label: "State",
    structure: ["Court name", "FIR No., police station & sections invoked", "Accused particulars", "Facts of arrest/custody", "Grounds for bail", "Prayer for bail with conditions", "Verification"]
  },
  'anticipatory-bail': {
    label: "Anticipatory Bail",
    party1Label: "Applicant",
    party2Label: "State",
    structure: ["Court name (Sessions/High Court)", "Applicant particulars", "FIR No. / apprehended offence details", "Grounds for apprehension of arrest", "Grounds for anticipatory bail", "Prayer", "Verification"]
  },
  'regular-bail': {
    label: "Regular Bail",
    party1Label: "Accused",
    party2Label: "State",
    structure: ["Court name", "FIR No., police station & sections", "Accused particulars", "Date of arrest & custody status", "Grounds for bail", "Prayer with proposed conditions", "Verification"]
  },
  'fir-complaint': {
    label: "FIR Complaint",
    party1Label: "Complainant",
    party2Label: "Accused",
    structure: ["To: Station House Officer / Police Station", "Complainant particulars", "Date, time & place of incident", "Narration of the offence", "Applicable sections (if known)", "Request for registration of FIR", "Signature"]
  },
  'criminal-complaint': {
    label: "Criminal Complaint",
    party1Label: "Complainant",
    party2Label: "Accused",
    structure: ["Court name (Magistrate)", "Complainant & accused particulars", "Facts constituting the offence", "Applicable sections of law", "List of witnesses", "Prayer for cognizance & process", "Verification"]
  },
  'appeal': {
    label: "Appeal",
    party1Label: "Appellant",
    party2Label: "Respondent",
    structure: ["Appellate court name", "Appeal no. & order/judgment appealed against (court, date)", "Appellant & Respondent particulars", "Grounds of appeal", "Prayer", "Condonation of delay (if applicable)", "Verification"]
  },
  'revision': {
    label: "Revision",
    party1Label: "Petitioner",
    party2Label: "Respondent",
    structure: ["Revisional court name", "Impugned order details (court, date)", "Petitioner & Respondent particulars", "Grounds of revision (illegality/irregularity)", "Prayer", "Verification"]
  },
  'review-petition': {
    label: "Review Petition",
    party1Label: "Petitioner",
    party2Label: "Respondent",
    structure: ["Court name", "Original judgment/order details (date, case no.)", "Petitioner & Respondent particulars", "Grounds for review (error apparent / new evidence)", "Prayer", "Verification"]
  },
  'execution-petition': {
    label: "Execution Petition",
    party1Label: "Decree Holder",
    party2Label: "Judgment Debtor",
    structure: ["Executing court name", "Decree details (date, case no.)", "Decree-holder & judgment-debtor particulars", "Mode of execution sought", "Amount due / relief to be executed", "Prayer", "Verification"]
  },
  'divorce-petition': {
    label: "Divorce Petition",
    party1Label: "Petitioner",
    party2Label: "Respondent",
    structure: ["Family Court name", "Petitioner & Respondent particulars", "Marriage details (date, place)", "Grounds for divorce", "Facts supporting the grounds", "Prayer for dissolution", "Verification"]
  },
  'maintenance-petition': {
    label: "Maintenance Petition",
    party1Label: "Petitioner",
    party2Label: "Respondent",
    structure: ["Court name (Family Court/Magistrate)", "Petitioner & Respondent particulars", "Relationship / marriage / dependency details", "Income details of both parties", "Grounds for maintenance", "Amount claimed", "Prayer", "Verification"]
  },
  'child-custody-petition': {
    label: "Child Custody Petition",
    party1Label: "Petitioner",
    party2Label: "Respondent",
    structure: ["Court name", "Petitioner & Respondent particulars", "Child(ren)'s particulars (name, age, DOB)", "Present custody status", "Grounds for custody (child's welfare)", "Visitation rights sought", "Prayer", "Verification"]
  }
};
