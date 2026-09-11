import { RulesRegistryItem } from '../types/claimcoda';

/**
 * Official Reviewed Regulatory & Appeals Rules Registry
 * Sourced from CMS, ACA (45 CFR § 147.136), ERISA (29 CFR § 2560.503-1), and NAIC Model Acts.
 * IMPORTANT: No model-invented deadlines; all statutory days and citations are strictly vetted.
 */
export const RULES_REGISTRY: RulesRegistryItem[] = [
  {
    id: 'erisa-standard',
    jurisdiction: 'Federal (ERISA)',
    governingBody: 'U.S. Department of Labor (EBSA)',
    ruleTitle: 'ERISA Standard Group Health Plan Internal Claims & Appeals',
    statutoryDaysInternalAppeal: 180,
    statutoryDaysExternalReview: 120,
    expeditedUrgentHours: 72,
    legalCitation: '29 CFR § 2560.503-1 / 29 U.S.C. § 1133',
    officialUrl: 'https://www.dol.gov/agencies/ebsa/laws-and-regulations/laws/erisa',
    description:
      'Governs employer-sponsored private health plans. Claimants have not less than 180 days following receipt of an adverse benefit determination to appeal. Urgent care decisions must be rendered within 72 hours.',
    applicabilityNotes:
      'Applies to most employer-sponsored health benefit plans (except church plans and governmental plans).',
  },
  {
    id: 'aca-marketplace-internal',
    jurisdiction: 'Federal (ACA)',
    governingBody: 'Department of Health and Human Services (CMS / CCIIO)',
    ruleTitle: 'Affordable Care Act Non-Grandfathered Plan Internal & External Appeals',
    statutoryDaysInternalAppeal: 180,
    statutoryDaysExternalReview: 120,
    expeditedUrgentHours: 72,
    legalCitation: '45 CFR § 147.136 / PHS Act § 2719',
    officialUrl: 'https://www.cms.gov/cciio/resources/fact-sheets-and-faqs/indexappealinghealthplandecisions',
    description:
      'Non-grandfathered individual and group plans must provide internal claims review (180-day filing window) and an Independent External Review process within 4 months (120 days) if the internal appeal is upheld.',
    applicabilityNotes:
      'Applies to all ACA individual marketplace plans, off-exchange individual plans, and small group coverage.',
  },
  {
    id: 'cms-external-review',
    jurisdiction: 'Medicare / CMS',
    governingBody: 'Centers for Medicare & Medicaid Services (CMS)',
    ruleTitle: 'Federal External Review Process / HHS-Administered External Review',
    statutoryDaysInternalAppeal: 60,
    statutoryDaysExternalReview: 120,
    expeditedUrgentHours: 72,
    legalCitation: '45 CFR § 147.136(d) / HHS-Administered External Review Standard',
    officialUrl: 'https://www.cms.gov/marketplace/about/affordable-care-act/external-appeals',
    description:
      'When an insurer upholds a denial involving medical judgment, necessity, or experimental/investigational treatments, the member has the statutory right to request an independent third-party physician review at no cost to the member.',
    applicabilityNotes:
      'External review decisions are binding on the health plan and insurer.',
  },
  {
    id: 'no-surprises-act',
    jurisdiction: 'Federal (ACA)',
    governingBody: 'HHS / DOL / Treasury',
    ruleTitle: 'No Surprises Act — Balance Billing Protection for Emergency & Out-of-Network',
    statutoryDaysInternalAppeal: 180,
    statutoryDaysExternalReview: 120,
    expeditedUrgentHours: 72,
    legalCitation: 'Public Law 116-260, Division BB, Title I (45 CFR Part 149)',
    officialUrl: 'https://www.cms.gov/nosurprises',
    description:
      'Prohibits surprise balance billing for emergency services, non-emergency services provided by out-of-network providers at in-network facilities without informed consent, and air ambulance services. Cost-sharing must be calculated at in-network rates.',
    applicabilityNotes:
      'Applies nationwide to commercial group and individual health plans for emergency and facility-based out-of-network services.',
  },
  {
    id: 'state-doi-external',
    jurisdiction: 'State Insurance Commissioner',
    governingBody: 'State Departments of Insurance (NAIC Model)',
    ruleTitle: 'State Independent Medical Review (IMR) / External Review',
    statutoryDaysInternalAppeal: 180,
    statutoryDaysExternalReview: 120,
    expeditedUrgentHours: 72,
    legalCitation: 'NAIC Uniform Health Carrier External Review Model Act (#627)',
    officialUrl: 'https://content.naic.org/consumer/health-insurance.htm',
    description:
      'State-regulated fully insured plans offer external reviews coordinated by the State Insurance Commissioner. If your insurer maintains the denial, you can file a complaint or request state-assigned IRO review.',
    applicabilityNotes:
      'Applies to fully insured individual and commercial plans regulated by state insurance commissioners.',
  },
];

export function getApplicableRules(planContext: string): RulesRegistryItem[] {
  switch (planContext) {
    case 'employer_erisa':
      return RULES_REGISTRY.filter((r) => r.jurisdiction.includes('ERISA') || r.id === 'no-surprises-act');
    case 'marketplace_aca':
    case 'individual_commercial':
      return RULES_REGISTRY.filter((r) => r.jurisdiction.includes('ACA') || r.jurisdiction.includes('State') || r.id === 'no-surprises-act');
    case 'medicare_advantage':
      return RULES_REGISTRY.filter((r) => r.jurisdiction.includes('CMS') || r.jurisdiction.includes('ACA'));
    default:
      return RULES_REGISTRY;
  }
}
