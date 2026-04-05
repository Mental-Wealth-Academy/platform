// Credit Builder - Domain Knowledge Constants
// FICO scoring model, dispute types, business credit phases, bureau addresses

import type { DisputeTypeId, BusinessPhaseId } from '@/types/credit-builder';

// ── FICO Scoring Factors ──────────────────────────────────────────────

export interface FicoFactor {
  id: string;
  label: string;
  weight: number;
  description: string;
  scoringGuide: string;
}

export const FICO_FACTORS: FicoFactor[] = [
  {
    id: 'payment_history',
    label: 'Payment History',
    weight: 0.35,
    description: 'Whether you pay on time. Late payments, collections, charge-offs, bankruptcies.',
    scoringGuide: 'No lates = A. 1-2 old lates = B. Recent lates or collections = D/F.',
  },
  {
    id: 'amounts_owed',
    label: 'Amounts Owed',
    weight: 0.30,
    description: 'How much of your available credit you use. Lower utilization = higher score.',
    scoringGuide: 'Under 10% = A. 10-29% = B. 30-49% = C. 50-74% = D. 75%+ = F.',
  },
  {
    id: 'credit_age',
    label: 'Length of Credit History',
    weight: 0.15,
    description: 'Average age of your accounts. Older is better.',
    scoringGuide: '7+ years avg = A. 4-6 = B. 2-3 = C. Under 2 = D.',
  },
  {
    id: 'credit_mix',
    label: 'Credit Mix',
    weight: 0.10,
    description: 'Variety of account types: credit cards, installment loans, mortgage.',
    scoringGuide: '3+ types = A. 2 types = B. 1 type = C. None = F.',
  },
  {
    id: 'new_credit',
    label: 'New Credit',
    weight: 0.10,
    description: 'Recent hard inquiries and newly opened accounts.',
    scoringGuide: '0-1 inquiries in 2 years = A. 2-3 = B. 4-5 = C. 6+ = D/F.',
  },
];

// ── Credit Score Ranges ───────────────────────────────────────────────

export const CREDIT_SCORE_RANGES = {
  poor:      { min: 300, max: 579, label: 'Poor', color: '#E8556D' },
  fair:      { min: 580, max: 669, label: 'Fair', color: '#F5A623' },
  good:      { min: 670, max: 739, label: 'Good', color: '#74C465' },
  veryGood:  { min: 740, max: 799, label: 'Very Good', color: '#5168FF' },
  excellent: { min: 800, max: 850, label: 'Excellent', color: '#9724A6' },
} as const;

export function getScoreRange(score: number) {
  if (score >= 800) return CREDIT_SCORE_RANGES.excellent;
  if (score >= 740) return CREDIT_SCORE_RANGES.veryGood;
  if (score >= 670) return CREDIT_SCORE_RANGES.good;
  if (score >= 580) return CREDIT_SCORE_RANGES.fair;
  return CREDIT_SCORE_RANGES.poor;
}

// ── 19 Dispute Letter Types ───────────────────────────────────────────

export interface DisputeTypeInfo {
  id: DisputeTypeId;
  label: string;
  legalAuthority: string;
  description: string;
  bestFor: string;
  escalatesTo: DisputeTypeId | null;
}

export const DISPUTE_TYPES: DisputeTypeInfo[] = [
  {
    id: 'basic_bureau',
    label: 'Basic Bureau Dispute',
    legalAuthority: 'FCRA Section 611',
    description: 'Standard dispute to a credit bureau requesting investigation of inaccurate items.',
    bestFor: 'General inaccuracies, wrong balances, accounts that aren\'t yours',
    escalatesTo: '611_reinvestigation',
  },
  {
    id: '609_verification',
    label: '609 Verification Letter',
    legalAuthority: 'FCRA Section 609',
    description: 'Request the bureau to verify the source and method of reporting for an item.',
    bestFor: 'Items you suspect were never properly verified by the bureau',
    escalatesTo: 'method_of_verification',
  },
  {
    id: '611_reinvestigation',
    label: '611 Reinvestigation Demand',
    legalAuthority: 'FCRA Section 611(a)',
    description: 'Demand a reinvestigation after a previous dispute was rejected.',
    bestFor: 'Follow-up when your first dispute was denied without proper investigation',
    escalatesTo: 'intent_to_sue',
  },
  {
    id: 'method_of_verification',
    label: 'Method of Verification Request',
    legalAuthority: 'FCRA Section 611(a)(7)',
    description: 'Demand the bureau disclose exactly how they verified a disputed item.',
    bestFor: 'When bureau claims they verified but won\'t explain how',
    escalatesTo: 'intent_to_sue',
  },
  {
    id: 'identity_theft',
    label: 'Identity Theft Affidavit',
    legalAuthority: 'FCRA Section 605B',
    description: 'Report fraudulent accounts opened through identity theft with an FTC affidavit.',
    bestFor: 'Accounts opened by someone who stole your identity',
    escalatesTo: null,
  },
  {
    id: 'debt_validation',
    label: 'Debt Validation Letter',
    legalAuthority: 'FDCPA Section 809(b)',
    description: 'Require a debt collector to prove the debt is valid and they have the right to collect.',
    bestFor: 'Collection accounts, especially from third-party collectors',
    escalatesTo: 'cease_and_desist',
  },
  {
    id: 'cease_and_desist',
    label: 'Cease and Desist Notice',
    legalAuthority: 'FDCPA Section 805(c)',
    description: 'Legally demand a collector stop all contact. They must comply.',
    bestFor: 'Harassing collectors, disputed debts you don\'t owe',
    escalatesTo: 'intent_to_sue',
  },
  {
    id: 'pay_for_delete',
    label: 'Pay for Delete Negotiation',
    legalAuthority: 'Contractual agreement',
    description: 'Offer to pay a debt in exchange for complete removal from your credit report.',
    bestFor: 'Small collections you can afford to pay, if they agree to delete',
    escalatesTo: null,
  },
  {
    id: 'goodwill_removal',
    label: 'Goodwill Removal Request',
    legalAuthority: 'No legal requirement (voluntary)',
    description: 'Appeal to a creditor\'s goodwill to remove a late payment from your report.',
    bestFor: 'One-time late payments on accounts that are otherwise in good standing',
    escalatesTo: null,
  },
  {
    id: 'direct_creditor',
    label: 'Direct Creditor Dispute',
    legalAuthority: 'FCRA Section 623',
    description: 'Dispute directly with the creditor (furnisher) instead of the bureau.',
    bestFor: 'When bureau disputes fail -- go straight to the source',
    escalatesTo: 'breach_of_contract',
  },
  {
    id: 'charge_off_removal',
    label: 'Charge-Off Removal Letter',
    legalAuthority: 'FCRA Section 623(a)(2)',
    description: 'Dispute an invalid charge-off or negotiate removal after payment.',
    bestFor: 'Charge-offs that are inaccurate, duplicated, or past statute of limitations',
    escalatesTo: 'intent_to_sue',
  },
  {
    id: 'unauthorized_inquiry',
    label: 'Unauthorized Inquiry Removal',
    legalAuthority: 'FCRA Section 604',
    description: 'Remove hard inquiries made without your written authorization.',
    bestFor: 'Inquiries you didn\'t authorize -- each removal can add 5-10 points',
    escalatesTo: 'formal_demand',
  },
  {
    id: 'hipaa_medical',
    label: 'HIPAA Medical Debt Dispute',
    legalAuthority: 'HIPAA + FCRA Section 605(a)(6)',
    description: 'Dispute medical collections -- collectors often violate HIPAA by sharing medical details.',
    bestFor: 'Medical debt in collections, especially if details were shared improperly',
    escalatesTo: 'intent_to_sue',
  },
  {
    id: 'statute_of_limitations',
    label: 'Statute of Limitations Defense',
    legalAuthority: 'State SOL laws + FDCPA',
    description: 'Assert that a debt is past the statute of limitations and legally unenforceable.',
    bestFor: 'Old debts (typically 3-6 years depending on state) still appearing on reports',
    escalatesTo: 'formal_demand',
  },
  {
    id: 'intent_to_sue',
    label: 'Intent to Sue Notice',
    legalAuthority: 'FCRA Section 616/617',
    description: 'Formal notice that you intend to file suit for FCRA violations. Often triggers settlement.',
    bestFor: 'When all other disputes have failed and you have documented violations',
    escalatesTo: 'arbitration_election',
  },
  {
    id: 'arbitration_election',
    label: 'Arbitration Election',
    legalAuthority: 'FCRA + creditor agreement terms',
    description: 'Elect binding arbitration per the creditor\'s own terms of service.',
    bestFor: 'Escalation path when creditor ignores disputes -- arbitration costs them money',
    escalatesTo: null,
  },
  {
    id: 'billing_error_fcba',
    label: 'Billing Error (FCBA)',
    legalAuthority: 'Fair Credit Billing Act (FCBA)',
    description: 'Dispute billing errors on credit card statements. Creditor must respond in 30 days.',
    bestFor: 'Unauthorized charges, duplicate charges, wrong amounts on credit cards',
    escalatesTo: 'direct_creditor',
  },
  {
    id: 'breach_of_contract',
    label: 'Breach of Contract Notice',
    legalAuthority: 'State contract law + UCC',
    description: 'Notify a creditor they breached their agreement terms (e.g., changed terms, misapplied payments).',
    bestFor: 'When a creditor violated the terms of your original agreement',
    escalatesTo: 'intent_to_sue',
  },
  {
    id: 'formal_demand',
    label: 'Formal Demand Letter',
    legalAuthority: 'FCRA/FDCPA/State law',
    description: 'Comprehensive demand letter citing all applicable violations and requesting remediation.',
    bestFor: 'Final pre-litigation step combining all documented violations',
    escalatesTo: 'intent_to_sue',
  },
];

export function getDisputeType(id: DisputeTypeId): DisputeTypeInfo | undefined {
  return DISPUTE_TYPES.find(d => d.id === id);
}

// ── Business Credit Phases ────────────────────────────────────────────

export interface BusinessPhaseChecklist {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export interface BusinessPhaseInfo {
  id: BusinessPhaseId;
  label: string;
  description: string;
  checklist: BusinessPhaseChecklist[];
}

export const BUSINESS_CREDIT_PHASES: BusinessPhaseInfo[] = [
  {
    id: 'foundation',
    label: 'Foundation',
    description: 'Set up your legal business entity and basic infrastructure.',
    checklist: [
      { id: 'entity_formed', label: 'Form LLC or Corporation', description: 'Register your business entity with your state.', required: true },
      { id: 'ein_obtained', label: 'Get an EIN from IRS', description: 'Apply for a free Employer Identification Number at irs.gov.', required: true },
      { id: 'business_bank', label: 'Open Business Bank Account', description: 'Separate personal and business finances with a dedicated account.', required: true },
      { id: 'business_phone', label: 'Get a Business Phone Number', description: 'Dedicated business line listed under your business name.', required: false },
      { id: 'business_address', label: 'Business Address', description: 'Physical address or registered agent address for filings.', required: true },
    ],
  },
  {
    id: 'establish',
    label: 'Establish Credit Identity',
    description: 'Register with business credit bureaus and build your profile.',
    checklist: [
      { id: 'duns_number', label: 'Get DUNS Number (Dun & Bradstreet)', description: 'Free registration at dnb.com. Required for most business credit.', required: true },
      { id: 'experian_biz', label: 'Register with Experian Business', description: 'Claim your Experian business credit profile.', required: true },
      { id: 'equifax_biz', label: 'Register with Equifax Business', description: 'Claim your Equifax Small Business profile.', required: false },
      { id: 'business_website', label: 'Professional Website + Email', description: 'Domain-based email (you@yourbusiness.com) adds credibility.', required: false },
    ],
  },
  {
    id: 'vendor_tradelines',
    label: 'Vendor Trade Lines',
    description: 'Open Net-30 accounts with vendors that report to business bureaus.',
    checklist: [
      { id: 'vendor_1', label: 'First Vendor Account (e.g., Uline, Quill)', description: 'Start with vendors known to approve new businesses.', required: true },
      { id: 'vendor_2', label: 'Second Vendor Account', description: 'Add a second Net-30 vendor for more trade lines.', required: true },
      { id: 'vendor_3', label: 'Third Vendor Account', description: 'Three reporting trade lines is the minimum for most business credit cards.', required: true },
      { id: 'vendor_on_time', label: 'Pay All Vendors On Time for 60+ Days', description: 'Consistent on-time payments build your PAYDEX score.', required: true },
    ],
  },
  {
    id: 'revolving_credit',
    label: 'Business Credit Cards',
    description: 'Graduate to revolving business credit lines.',
    checklist: [
      { id: 'secured_card', label: 'Secured Business Credit Card', description: 'Start with a secured card if needed -- builds history fast.', required: false },
      { id: 'store_card', label: 'Business Store Card', description: 'Retail cards (Staples, Home Depot) are easier to get approved.', required: false },
      { id: 'unsecured_card', label: 'Unsecured Business Credit Card', description: 'Graduate to unsecured cards once you have 3+ trade lines.', required: true },
      { id: 'no_pg_card', label: 'No Personal Guarantee Card', description: 'Cards like Brex or Ramp that don\'t require a personal guarantee.', required: false },
    ],
  },
  {
    id: 'term_loans',
    label: 'Business Loans',
    description: 'Access term financing and lines of credit for growth.',
    checklist: [
      { id: 'loc', label: 'Business Line of Credit', description: 'Flexible revolving credit for working capital.', required: false },
      { id: 'sba_micro', label: 'SBA Microloan (up to $50K)', description: 'Government-backed small business loans with favorable terms.', required: false },
      { id: 'term_loan', label: 'Business Term Loan', description: 'Fixed-term financing for larger investments.', required: false },
      { id: 'equipment_finance', label: 'Equipment Financing', description: 'Asset-backed loans for business equipment and tools.', required: false },
    ],
  },
];

// ── Credit Bureau Addresses ───────────────────────────────────────────

export const BUREAU_INFO = {
  equifax: {
    name: 'Equifax',
    disputeAddress: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256',
    phone: '1-800-685-1111',
    website: 'equifax.com',
  },
  experian: {
    name: 'Experian',
    disputeAddress: 'Experian\nP.O. Box 4500\nAllen, TX 75013',
    phone: '1-888-397-3742',
    website: 'experian.com',
  },
  transunion: {
    name: 'TransUnion',
    disputeAddress: 'TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000',
    phone: '1-800-916-8800',
    website: 'transunion.com',
  },
} as const;

// ── Step Definitions (user-facing) ────────────────────────────────────

export const CREDIT_STEPS = [
  { id: 'intake' as const, label: 'Enter Your Info', number: 1, description: 'Tell us about your current credit situation' },
  { id: 'audit' as const, label: 'Credit Audit', number: 2, description: 'AI-powered analysis of your credit profile' },
  { id: 'disputes' as const, label: 'Dispute Center', number: 3, description: 'Generate and track dispute letters' },
  { id: 'tracking' as const, label: 'Track Progress', number: 4, description: 'Monitor your disputes and score changes' },
  { id: 'business' as const, label: 'Business Credit', number: 5, description: 'Build credit for your business' },
];
