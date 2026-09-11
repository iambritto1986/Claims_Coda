import { DenialCategory, EvidenceItem } from '../types/claimcoda';

export interface DenialStrategyConfig {
  category: DenialCategory;
  title: string;
  badgeLabel: string;
  summary: string;
  coreLegalBasis: string;
  recommendedEvidence: Array<{
    label: string;
    description: string;
    required: boolean;
  }>;
  keyArguments: string[];
}

export const DENIAL_STRATEGIES: Record<DenialCategory, DenialStrategyConfig> = {
  medical_necessity: {
    category: 'medical_necessity',
    title: 'Medical Necessity Denial',
    badgeLabel: 'Not Medically Necessary',
    summary:
      'The payer claims the diagnostic test, procedure, or treatment does not meet their clinical guideline thresholds (e.g., Milliman Care Guidelines or InterQual) or conservative therapy requirements.',
    coreLegalBasis:
      'Under 29 CFR § 2560.503-1(g)(1)(v)(A) and 45 CFR § 147.136, the plan must provide the specific clinical criteria or guideline used to deny the claim and afford a full, independent physician review.',
    recommendedEvidence: [
      {
        label: 'Letter of Medical Necessity (LMN)',
        description: 'Detailed signed letter from your treating physician explaining diagnosis, failed conservative therapies, and specific clinical rationale.',
        required: true,
      },
      {
        label: 'Relevant Clinical Visit Notes & Physical Exam',
        description: 'Physician encounter notes documenting symptoms, duration, examination findings, and diagnostic progression.',
        required: true,
      },
      {
        label: 'Prior Diagnostic Reports (X-ray, Labs, EMG)',
        description: 'Objective test results establishing baseline pathology or prerequisite criteria.',
        required: false,
      },
      {
        label: 'Peer-Reviewed Clinical Guidelines / Literature',
        description: 'Relevant medical society consensus statements (e.g., AAOS, ACR, NCCN guidelines) supporting the standard of care.',
        required: false,
      },
    ],
    keyArguments: [
      'The treating physician has evaluated the patient in person and determined the treatment is clinically necessary and standard of care.',
      'The patient has already satisfied prerequisite clinical conservative treatments without resolution.',
      'The plan criteria fail to accommodate individualized clinical nuances and prevailing medical society standards.',
    ],
  },

  prior_auth_missing: {
    category: 'prior_auth_missing',
    title: 'Missing or Denied Prior Authorization',
    badgeLabel: 'No Prior Auth on File',
    summary:
      'The insurer denied coverage because pre-certification was not obtained prior to the service, or the pre-auth expired / had a discrepancy.',
    coreLegalBasis:
      'Retroactive authorization is recognized when emergency or urgent circumstances prevented prior submission, or when administrative miscommunication occurred between provider and network.',
    recommendedEvidence: [
      {
        label: 'Retroactive Prior Authorization Request Form',
        description: 'Official payer prior-authorization request filled out by provider office.',
        required: true,
      },
      {
        label: 'Physician Clinical Chart Notes & Urgency Documentation',
        description: 'Documentation showing medical urgency or acute symptom presentation requiring timely intervention.',
        required: true,
      },
      {
        label: 'Scheduling & In-Network Verification Call Log',
        description: 'Notes, timestamps, or confirmations showing good-faith attempt to verify benefits prior to service.',
        required: false,
      },
    ],
    keyArguments: [
      'The service was medically urgent and delay would have caused significant risk to the member’s health.',
      'The clinical merits of the procedure satisfy all standard plan coverage criteria despite procedural timing.',
      'The plan has discretionary authority to perform retroactive medical necessity review under equitable ERISA principles.',
    ],
  },

  out_of_network_emergency: {
    category: 'out_of_network_emergency',
    title: 'Out-of-Network / Surprise Balance Billing',
    badgeLabel: 'Out-of-Network Denial',
    summary:
      'The claim was denied or processed at out-of-network coinsurance because the facility or treating clinician was not contracted with the insurer.',
    coreLegalBasis:
      'The Federal No Surprises Act (P.L. 116-260; 45 CFR Part 149) strictly prohibits out-of-network cost sharing and balance billing for emergency medical conditions and non-emergency services at in-network facilities where patient consent was not given.',
    recommendedEvidence: [
      {
        label: 'Emergency Department Admission / Triage Record',
        description: 'Hospital emergency room intake records documenting acute onset of symptoms and triage severity.',
        required: true,
      },
      {
        label: 'In-Network Facility Admission Form',
        description: 'Proof that the primary facility was an in-network provider.',
        required: true,
      },
      {
        label: 'Itemized Hospital & Physician Billing Statements',
        description: 'Detailed statement showing CPT codes and facility vs. professional fee splits.',
        required: false,
      },
    ],
    keyArguments: [
      'Under the No Surprises Act, emergency medical conditions must be covered without prior authorization and at in-network cost-sharing levels.',
      'The patient presented to the nearest accessible facility under the prudent layperson emergency standard.',
      'Balance billing beyond in-network cost-sharing is federally prohibited.',
    ],
  },

  coding_billing_error: {
    category: 'coding_billing_error',
    title: 'Coding, Bundling, or Billing Discrepancy',
    badgeLabel: 'Billing / Code Mismatch',
    summary:
      'The claim was rejected due to an unbundled CPT code, missing modifier (e.g. modifier -25 or -59), non-specific ICD-10 code, or duplicate claim flag.',
    coreLegalBasis:
      'HIPAA standard transaction rules and CMS billing conventions mandate proper adjudication of corrected claims and modifier application upon submission of clinical chart notes.',
    recommendedEvidence: [
      {
        label: 'Corrected CMS-1500 / UB-04 Claim Form',
        description: 'Resubmitted billing form from provider with appropriate modifiers or corrected ICD-10 diagnosis codes.',
        required: true,
      },
      {
        label: 'Operative Report or Procedure Note',
        description: 'Complete clinician notes detailing distinct, separate procedural services performed.',
        required: true,
      },
      {
        label: 'Provider Billing Office Statement / Attestation',
        description: 'Clarification letter from medical billing specialist explaining proper modifier applicability.',
        required: false,
      },
    ],
    keyArguments: [
      'The medical record substantiates that the services rendered were distinct, separate, and appropriately documented.',
      'The denial represents an automated administrative cross-walk error rather than a substantive coverage exclusion.',
      'The enclosed corrected claim form and procedure notes satisfy all billing manual criteria.',
    ],
  },

  timely_filing: {
    category: 'timely_filing',
    title: 'Timely Filing Denial',
    badgeLabel: 'Filing Window Exceeded',
    summary:
      'The payer rejected the claim claiming it was submitted past the contractual filing deadline (e.g. 90, 180, or 365 days).',
    coreLegalBasis:
      'Extenuating circumstances, initial electronic clearinghouse transmission proofs (EDI 837 transaction reports), and coordination-of-benefits delays toll the filing limitation.',
    recommendedEvidence: [
      {
        label: 'EDI Clearinghouse Electronic Transmission Confirmation',
        description: 'Electronic acceptance report or batch confirmation timestamp demonstrating initial timely submission.',
        required: true,
      },
      {
        label: 'Coordination of Benefits (COB) Primary EOB',
        description: 'Explanation of benefits from primary payer demonstrating downstream secondary timing.',
        required: false,
      },
      {
        label: 'Extenuating Circumstances Narrative / Proof',
        description: 'Hospitalization record, system outage log, or payer misdirection documentation.',
        required: false,
      },
    ],
    keyArguments: [
      'Proof of timely initial electronic submission is demonstrated by clearinghouse transaction reports.',
      'Delays arose directly from coordination of benefits adjudication or payer misdirection.',
      'Equitable tolling principles apply under ERISA and state insurance prompt-pay regulations.',
    ],
  },

  experimental_investigational: {
    category: 'experimental_investigational',
    title: 'Experimental or Investigational Treatment Denial',
    badgeLabel: 'Deemed Experimental',
    summary:
      'The insurer deemed the treatment, drug, or medical device unproven, experimental, or off-label.',
    coreLegalBasis:
      'Under ACA external review rules (45 CFR § 147.136), adverse benefit determinations based on experimental/investigational grounds are explicitly eligible for binding Independent Review Organization (IRO) evaluation.',
    recommendedEvidence: [
      {
        label: 'FDA Approval Documentation / Compendia Listing',
        description: 'FDA package insert, NCCN compendium listing, or USP-DI compendia inclusion.',
        required: true,
      },
      {
        label: 'Peer-Reviewed Clinical Studies & Meta-Analyses',
        description: '3-5 peer-reviewed medical journal publications from reputable indexed journals (e.g. NEJM, JAMA, Lancet) demonstrating efficacy.',
        required: true,
      },
      {
        label: 'Physician Clinical Narrative of Refractory Condition',
        description: 'Physician notes detailing why standard conventional therapies were contraindicated or ineffective.',
        required: true,
      },
    ],
    keyArguments: [
      'The therapy is supported by substantial peer-reviewed medical literature and professional society guidelines.',
      'The treatment represents recognized standard of care for refractory cases.',
      'The claimant exercises the statutory right to request independent clinical external review.',
    ],
  },

  step_therapy_formulary: {
    category: 'step_therapy_formulary',
    title: 'Step Therapy & Formulary Exception Denial',
    badgeLabel: 'Formulary / Step Therapy',
    summary:
      'The insurer refused to cover a prescribed brand medication until lower-cost generic alternatives are tried and failed.',
    coreLegalBasis:
      'State step-therapy override laws and ACA formulary exception processes require plans to grant expedited exceptions when standard formulary drugs are clinically contraindicated or have previously caused adverse reactions.',
    recommendedEvidence: [
      {
        label: 'Prescribing Physician Formulary Exception Request',
        description: 'Physician statement specifying contraindication or allergy to step-therapy alternatives.',
        required: true,
      },
      {
        label: 'Historical Pharmacy Dispense & Tolerance Records',
        description: 'Prescription history demonstrating prior adverse reactions or clinical failure with Tier 1/2 formulary drugs.',
        required: true,
      },
    ],
    keyArguments: [
      'The mandated formulary alternative is clinically contraindicated and poses significant medical risk to the patient.',
      'The patient has already demonstrated intolerance or documented treatment failure with prerequisite agents.',
      'Continuity of care is essential to maintain patient stability.',
    ],
  },

  non_covered_benefit: {
    category: 'non_covered_benefit',
    title: 'Non-Covered Plan Benefit / Specific Exclusion',
    badgeLabel: 'Plan Exclusion',
    summary:
      'The insurer asserts the service is an excluded category in the Summary Plan Description (SPD).',
    coreLegalBasis:
      'Plan exclusions must be clear, unambiguous, and compliant with federal parity mandates (Mental Health Parity and Addiction Equity Act / ACA Essential Health Benefits).',
    recommendedEvidence: [
      {
        label: 'Summary Plan Description (SPD) / Evidence of Coverage (EOC) Excerpt',
        description: 'The specific section of the benefit booklet outlining definitions and exceptions.',
        required: true,
      },
      {
        label: 'Physician Letter on Medical Indication vs. Cosmetic/Excluded Classification',
        description: 'Physician documentation distinguishing the medically necessary restorative indication from general exclusion categories.',
        required: true,
      },
    ],
    keyArguments: [
      'The service was performed for restorative, reconstructive, or essential medical indications rather than elective purposes.',
      'The plan exclusion is ambiguous and must be construed in favor of coverage under established doctrine.',
      'The denial violates federal benefit parity standards.',
    ],
  },

  other: {
    category: 'other',
    title: 'General Health Insurance Claim Denial',
    badgeLabel: 'General Denial',
    summary:
      'General denial of benefits requiring comprehensive factual review and full administrative appeal.',
    coreLegalBasis:
      'Under ERISA § 503 and ACA Section 2719, participants have the right to a full and fair review of any adverse claim determination.',
    recommendedEvidence: [
      {
        label: 'Full Explanation of Benefits (EOB) / Denial Letter',
        description: 'Complete copy of the denial notice received from the insurer.',
        required: true,
      },
      {
        label: 'Treating Physician Clinical Records',
        description: 'Medical chart notes relating to the date of service.',
        required: true,
      },
    ],
    keyArguments: [
      'The claim satisfies all standard terms of the member’s benefit plan.',
      'The medical records fully substantiate the appropriateness of the billed care.',
    ],
  },
};

export function getStrategyForCategory(category: DenialCategory): DenialStrategyConfig {
  return DENIAL_STRATEGIES[category] || DENIAL_STRATEGIES.other;
}

export function generateDefaultEvidenceList(category: DenialCategory): EvidenceItem[] {
  const strategy = getStrategyForCategory(category);
  return strategy.recommendedEvidence.map((item, index) => ({
    id: `ev-${category}-${index + 1}`,
    label: item.label,
    description: item.description,
    category,
    required: item.required,
    attached: false,
  }));
}
