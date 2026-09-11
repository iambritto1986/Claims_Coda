/**
 * ClaimCoda — Core Types & Schemas
 * Standardized data models for denial extraction, provenance, evidence tracking,
 * grounded appeal drafting, and official rules registry.
 */

export type PlanContextType =
  | 'marketplace_aca'
  | 'employer_erisa'
  | 'medicare_advantage'
  | 'medicaid'
  | 'individual_commercial'
  | 'not_sure';

export type DenialCategory =
  | 'medical_necessity'
  | 'prior_auth_missing'
  | 'out_of_network_emergency'
  | 'coding_billing_error'
  | 'timely_filing'
  | 'experimental_investigational'
  | 'step_therapy_formulary'
  | 'non_covered_benefit'
  | 'other';

export type CaseStatus =
  | 'draft'
  | 'reviewing_facts'
  | 'gathering_evidence'
  | 'drafting_appeal'
  | 'packet_ready'
  | 'submitted'
  | 'upheld'
  | 'reversed'
  | 'partially_reversed'
  | 'archived';

export interface ExtractedFact {
  id: string;
  fieldKey:
    | 'denial_reason'
    | 'denial_category'
    | 'service_date'
    | 'claim_number'
    | 'policy_number'
    | 'group_number'
    | 'billed_amount'
    | 'denied_amount'
    | 'patient_responsibility'
    | 'insurer_name'
    | 'patient_name'
    | 'provider_name'
    | 'cpt_codes'
    | 'icd_codes'
    | 'appeal_deadline_text'
    | 'submission_address'
    | 'submission_fax'
    | 'prior_auth_number';
  label: string;
  value: string;
  sourcePage: number | string;
  sourceSpan: string;
  confidence: number; // 0.0 to 1.0
  confirmed: boolean;
  userEdited?: boolean;
  originalValue?: string;
  notes?: string;
}

export interface EvidenceItem {
  id: string;
  label: string;
  description: string;
  category: DenialCategory;
  required: boolean;
  attached: boolean;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  userNotes?: string;
}

export interface AppealSectionContent {
  statementOfAppeal: string;
  factualBackground: string;
  clinicalAndLegalGrounds: string;
  evidenceSummary: string;
  regulatoryCitations: string;
  formalRemediesAndDemand: string;
}

export interface ReconciliationCheckItem {
  field: string;
  expected: string;
  foundInDraft: boolean;
  matchSnippet?: string;
  warning?: string;
}

export interface AppealDraft {
  version: number;
  title: string;
  senderInfo: {
    fullName: string;
    memberId: string;
    groupNumber: string;
    address: string;
    phone: string;
    email: string;
  };
  payerInfo: {
    payerName: string;
    department: string;
    address: string;
    fax: string;
  };
  claimSummary: {
    claimNumber: string;
    serviceDate: string;
    providerName: string;
    billedAmount: string;
    deniedAmount: string;
    procedureCodes: string;
    diagnosisCodes: string;
  };
  sections: AppealSectionContent;
  fullLetterText: string;
  reconciliation: {
    passed: boolean;
    checks: ReconciliationCheckItem[];
    warnings: string[];
  };
  promptVersion: string;
  modelUsed: string;
  generatedAt: string;
  userApprovedAt?: string;
}

export interface CaseRecord {
  id: string;
  ownerId: string;
  title: string;
  status: CaseStatus;
  planContext: PlanContextType;
  denialCategory: DenialCategory;
  insurerName: string;
  claimNumber: string;
  serviceDate: string;
  deniedAmount: string;
  verifiedDeadline: string | null; // ISO string or null (never hallucinated)
  statutoryDeadlineDays?: number;
  documentName?: string;
  documentText?: string;
  extractedFacts: ExtractedFact[];
  evidenceItems: EvidenceItem[];
  appealDraft?: AppealDraft;
  createdAt: string;
  updatedAt: string;
}

export interface RulesRegistryItem {
  id: string;
  jurisdiction: 'Federal (ACA)' | 'Federal (ERISA)' | 'Medicare / CMS' | 'State Insurance Commissioner';
  governingBody: string;
  ruleTitle: string;
  statutoryDaysInternalAppeal: number;
  statutoryDaysExternalReview: number;
  expeditedUrgentHours: number;
  legalCitation: string;
  officialUrl: string;
  description: string;
  applicabilityNotes: string;
}

export interface SyntheticSampleDenial {
  id: string;
  title: string;
  category: DenialCategory;
  insurerName: string;
  claimNumber: string;
  serviceDate: string;
  billedAmount: string;
  deniedAmount: string;
  patientResponsibility: string;
  denialReasonText: string;
  deadlineText: string;
  rawDocumentText: string;
  defaultFacts: Omit<ExtractedFact, 'id' | 'confirmed'>[];
  defaultEvidence: Omit<EvidenceItem, 'id' | 'attached'>[];
}
