import { SyntheticSampleDenial } from '../types/claimcoda';

/**
 * Realistic Synthetic Denial Documents & Extraction Fixtures
 * For synthetic testing and demo workflows compliant with the Health-Data Rule.
 */
export const SAMPLE_DENIALS: SyntheticSampleDenial[] = [
  {
    id: 'sample-mri-medical-necessity',
    title: 'Lumbar Spine MRI — Not Medically Necessary',
    category: 'medical_necessity',
    insurerName: 'Aetna Health Care Management',
    claimNumber: 'CLM-88492019-A',
    serviceDate: 'October 14, 2025',
    billedAmount: '$3,850.00',
    deniedAmount: '$3,850.00',
    patientResponsibility: '$3,850.00',
    denialReasonText: 'Denial Code CO-50: These are non-covered services because this is not deemed a medical necessity under Clinical Policy Bulletin #0236.',
    deadlineText: 'You have the right to appeal this decision within 180 calendar days from the date of this notice (Filing Deadline: April 12, 2026).',
    rawDocumentText: `AETNA HEALTH INSURANCE
PO BOX 14079, LEXINGTON, KY 40512
Appeals & Grievance Department | Fax: (860) 907-3100

ADVERSE BENEFIT DETERMINATION / EXPLANATION OF BENEFITS
Date of Notice: October 18, 2025
Member Name: Eleanor Vance
Member ID: W984420194
Group Number: GRP-77401
Patient: Eleanor Vance
Claim Reference: CLM-88492019-A
Provider: Metro Advanced Imaging Center (NPI: 1982049182)
Date of Service: 10/14/2025

CLAIM SUMMARY & ADJUDICATION:
Line 1: CPT 72148 - Magnetic Resonance Imaging (MRI), Lumbar Spine without contrast
Diagnosis Code: M54.50 (Low back pain, unspecified), M51.26 (Intervertebral disc displacement, lumbar region)
Billed Amount: $3,850.00
Allowed Amount: $0.00
Denied Amount: $3,850.00
Patient Responsibility: $3,850.00
Denial Code: CO-50 (Non-covered service: Not medically necessary)

REASON FOR ADVERSE DETERMINATION:
Coverage for CPT 72148 is denied pursuant to Clinical Policy Bulletin (CPB) #0236. The submitted clinical documentation does not establish that the patient completed a minimum of six (6) consecutive weeks of documented conservative physical therapy, nor does it document red flag signs of cauda equina syndrome or progressive neurological deficit prior to advanced neuroimaging.

YOUR STATUTORY APPEAL RIGHTS:
If you disagree with this adverse benefit determination, you have the right to file an internal administrative appeal under ERISA / ACA federal standards.
- Appeal Deadline: Your written appeal must be submitted within 180 calendar days of receiving this notice (no later than April 12, 2026).
- Submission Instructions: Mail your appeal letter and supporting clinical records to:
  Aetna Appeals & Grievance Department
  PO Box 14079, Lexington, KY 40512
  Or fax to: (860) 907-3100
- Expedited Review: If your treating physician certifies that a 30-day delay would seriously jeopardize your life or health, you may request an Expedited 72-Hour Urgent Appeal.`,
    defaultFacts: [
      {
        fieldKey: 'insurer_name',
        label: 'Health Insurer',
        value: 'Aetna Health Care Management',
        sourcePage: 1,
        sourceSpan: 'Header: AETNA HEALTH INSURANCE, PO BOX 14079',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'patient_name',
        label: 'Patient Name',
        value: 'Eleanor Vance',
        sourcePage: 1,
        sourceSpan: 'Member Info: Member Name: Eleanor Vance',
        confidence: 0.98,
        userEdited: false,
      },
      {
        fieldKey: 'policy_number',
        label: 'Member ID',
        value: 'W984420194',
        sourcePage: 1,
        sourceSpan: 'Member ID: W984420194',
        confidence: 0.98,
        userEdited: false,
      },
      {
        fieldKey: 'claim_number',
        label: 'Claim Number',
        value: 'CLM-88492019-A',
        sourcePage: 1,
        sourceSpan: 'Claim Reference: CLM-88492019-A',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'service_date',
        label: 'Date of Service',
        value: '10/14/2025',
        sourcePage: 1,
        sourceSpan: 'Date of Service: 10/14/2025',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'provider_name',
        label: 'Rendering Provider',
        value: 'Metro Advanced Imaging Center',
        sourcePage: 1,
        sourceSpan: 'Provider: Metro Advanced Imaging Center',
        confidence: 0.97,
        userEdited: false,
      },
      {
        fieldKey: 'cpt_codes',
        label: 'Procedure (CPT) Code',
        value: 'CPT 72148 (MRI Lumbar Spine)',
        sourcePage: 1,
        sourceSpan: 'Line 1: CPT 72148 - Magnetic Resonance Imaging',
        confidence: 0.98,
        userEdited: false,
      },
      {
        fieldKey: 'icd_codes',
        label: 'Diagnosis (ICD-10) Code',
        value: 'M54.50, M51.26 (Lumbar disc displacement)',
        sourcePage: 1,
        sourceSpan: 'Diagnosis Code: M54.50, M51.26',
        confidence: 0.96,
        userEdited: false,
      },
      {
        fieldKey: 'billed_amount',
        label: 'Total Billed Amount',
        value: '$3,850.00',
        sourcePage: 1,
        sourceSpan: 'Billed Amount: $3,850.00',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'denied_amount',
        label: 'Denied Amount',
        value: '$3,850.00',
        sourcePage: 1,
        sourceSpan: 'Denied Amount: $3,850.00',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'patient_responsibility',
        label: 'Patient Responsibility',
        value: '$3,850.00',
        sourcePage: 1,
        sourceSpan: 'Patient Responsibility: $3,850.00',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'denial_reason',
        label: 'Stated Denial Reason',
        value: 'Not medically necessary under CPB #0236 (insufficient 6 weeks physical therapy documented)',
        sourcePage: 1,
        sourceSpan: 'REASON FOR ADVERSE DETERMINATION: Coverage for CPT 72148 is denied pursuant to CPB #0236...',
        confidence: 0.95,
        userEdited: false,
      },
      {
        fieldKey: 'appeal_deadline_text',
        label: 'Appeal Deadline',
        value: 'April 12, 2026 (180 days from notice)',
        sourcePage: 1,
        sourceSpan: 'Appeal Deadline: within 180 calendar days... no later than April 12, 2026',
        confidence: 0.97,
        userEdited: false,
      },
      {
        fieldKey: 'submission_address',
        label: 'Appeals Mailing Address',
        value: 'Aetna Appeals & Grievance Dept, PO Box 14079, Lexington, KY 40512',
        sourcePage: 1,
        sourceSpan: 'PO Box 14079, Lexington, KY 40512',
        confidence: 0.98,
        userEdited: false,
      },
      {
        fieldKey: 'submission_fax',
        label: 'Appeals Fax Number',
        value: '(860) 907-3100',
        sourcePage: 1,
        sourceSpan: 'Fax: (860) 907-3100',
        confidence: 0.99,
        userEdited: false,
      },
    ],
    defaultEvidence: [
      {
        label: 'Letter of Medical Necessity (Treating Neurologist/Orthopedist)',
        description: 'Signed letter explaining persistent radiculopathy and justification for MRI.',
        category: 'medical_necessity',
        required: true,
      },
      {
        label: 'Physical Therapy Progress Notes (6+ weeks)',
        description: 'Encounter notes demonstrating completed physical therapy course.',
        category: 'medical_necessity',
        required: true,
      },
      {
        label: 'Clinical Visit Records & Neurological Exam',
        description: 'Clinical chart documenting radiating leg pain, positive straight leg raise test.',
        category: 'medical_necessity',
        required: false,
      },
    ],
  },

  {
    id: 'sample-er-out-of-network',
    title: 'Emergency Room Out-of-Network Balance Bill',
    category: 'out_of_network_emergency',
    insurerName: 'UnitedHealthcare Commercial',
    claimNumber: 'UHC-2025-9938102',
    serviceDate: 'November 03, 2025',
    billedAmount: '$6,420.00',
    deniedAmount: '$5,100.00',
    patientResponsibility: '$5,100.00',
    denialReasonText: 'Denial Code PR-2: The provider is out-of-network. Benefits are paid at the non-participating allowance and balance is member responsibility.',
    deadlineText: 'Appeal must be postmarked within 180 days of this notice.',
    rawDocumentText: `UNITEDHEALTHCARE SERVICES, INC.
Appeals Unit | PO Box 30432, Salt Lake City, UT 84130
Fax: (844) 236-4100

EXPLANATION OF BENEFITS
Statement Date: November 12, 2025
Member: Marcus Chen | Member ID: 948102844 | Group: 0918239
Claim Number: UHC-2025-9938102
Provider: St. Jude Emergency Physicians Group (Out-of-Network)
Facility: St. Jude Regional Hospital (In-Network)
Date of Service: 11/03/2025

Line 1: CPT 99285 - Emergency department visit, high severity / life threatening
Line 2: CPT 70450 - CT Head/Brain without contrast
Total Billed: $6,420.00
Plan Paid: $1,320.00 (Allowed OON benchmark)
Denied / Non-Covered Balance: $5,100.00
Patient Responsibility: $5,100.00
Remark Code: PR-2 (Out-of-network physician balance billing)

EXPLANATION:
Services rendered by St. Jude Emergency Physicians Group are out-of-network. Under your standard commercial plan, out-of-network physician charges are subject to deductible and customary reimbursement limits.

APPEAL RIGHTS & FEDERAL NO SURPRISES ACT NOTICE:
You have 180 days from receipt of this EOB to file a formal appeal. If you received emergency services at an in-network facility, federal law (No Surprises Act) prohibits out-of-network cost-sharing.
Mailing Address: UnitedHealthcare Appeals Unit, PO Box 30432, Salt Lake City, UT 84130. Fax: (844) 236-4100.`,
    defaultFacts: [
      {
        fieldKey: 'insurer_name',
        label: 'Health Insurer',
        value: 'UnitedHealthcare Commercial',
        sourcePage: 1,
        sourceSpan: 'UNITEDHEALTHCARE SERVICES, INC.',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'patient_name',
        label: 'Patient Name',
        value: 'Marcus Chen',
        sourcePage: 1,
        sourceSpan: 'Member: Marcus Chen',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'policy_number',
        label: 'Member ID',
        value: '948102844',
        sourcePage: 1,
        sourceSpan: 'Member ID: 948102844',
        confidence: 0.98,
        userEdited: false,
      },
      {
        fieldKey: 'claim_number',
        label: 'Claim Number',
        value: 'UHC-2025-9938102',
        sourcePage: 1,
        sourceSpan: 'Claim Number: UHC-2025-9938102',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'service_date',
        label: 'Date of Service',
        value: '11/03/2025',
        sourcePage: 1,
        sourceSpan: 'Date of Service: 11/03/2025',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'provider_name',
        label: 'Rendering Provider',
        value: 'St. Jude Emergency Physicians Group',
        sourcePage: 1,
        sourceSpan: 'Provider: St. Jude Emergency Physicians Group',
        confidence: 0.97,
        userEdited: false,
      },
      {
        fieldKey: 'cpt_codes',
        label: 'Procedure Codes',
        value: 'CPT 99285 (ER High Severity), CPT 70450 (CT Head)',
        sourcePage: 1,
        sourceSpan: 'Line 1: CPT 99285, Line 2: CPT 70450',
        confidence: 0.97,
        userEdited: false,
      },
      {
        fieldKey: 'billed_amount',
        label: 'Total Billed',
        value: '$6,420.00',
        sourcePage: 1,
        sourceSpan: 'Total Billed: $6,420.00',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'denied_amount',
        label: 'Balance Denied',
        value: '$5,100.00',
        sourcePage: 1,
        sourceSpan: 'Denied / Non-Covered Balance: $5,100.00',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'patient_responsibility',
        label: 'Patient Responsibility',
        value: '$5,100.00',
        sourcePage: 1,
        sourceSpan: 'Patient Responsibility: $5,100.00',
        confidence: 0.99,
        userEdited: false,
      },
      {
        fieldKey: 'denial_reason',
        label: 'Denial Reason',
        value: 'Out-of-network physician emergency service billed at non-participating rate (PR-2)',
        sourcePage: 1,
        sourceSpan: 'Remark Code: PR-2 (Out-of-network physician balance billing)',
        confidence: 0.96,
        userEdited: false,
      },
      {
        fieldKey: 'appeal_deadline_text',
        label: 'Appeal Deadline',
        value: 'May 11, 2026 (180 days from notice)',
        sourcePage: 1,
        sourceSpan: 'You have 180 days from receipt of this EOB',
        confidence: 0.95,
        userEdited: false,
      },
      {
        fieldKey: 'submission_address',
        label: 'Submission Address',
        value: 'UnitedHealthcare Appeals Unit, PO Box 30432, Salt Lake City, UT 84130',
        sourcePage: 1,
        sourceSpan: 'PO Box 30432, Salt Lake City, UT 84130',
        confidence: 0.98,
        userEdited: false,
      },
      {
        fieldKey: 'submission_fax',
        label: 'Submission Fax',
        value: '(844) 236-4100',
        sourcePage: 1,
        sourceSpan: 'Fax: (844) 236-4100',
        confidence: 0.99,
        userEdited: false,
      },
    ],
    defaultEvidence: [
      {
        label: 'Hospital Emergency Room Triage & Chart Record',
        description: 'Official emergency department records showing acute presentation.',
        category: 'out_of_network_emergency',
        required: true,
      },
      {
        label: 'Proof of In-Network Hospital Facility',
        description: 'Facility bill or hospital admission document showing in-network status.',
        category: 'out_of_network_emergency',
        required: true,
      },
    ],
  },
];
