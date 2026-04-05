// Credit Builder - Type Definitions

export interface CreditScoreEntry {
  bureau: 'equifax' | 'experian' | 'transunion';
  score: number;
  date?: string;
}

export interface CreditAccount {
  name: string;
  type: 'revolving' | 'installment' | 'mortgage' | 'collection' | 'other';
  balance: number;
  limit: number | null;
  status: 'current' | 'late' | 'collection' | 'charged_off' | 'closed';
  monthsLate?: number;
  openedDate?: string;
}

export interface CreditInquiry {
  creditor: string;
  date: string;
  type: 'hard' | 'soft';
}

export interface DerogatoryItem {
  type: 'late_payment' | 'collection' | 'charge_off' | 'bankruptcy' | 'judgment' | 'tax_lien' | 'repossession' | 'foreclosure';
  creditor: string;
  amount?: number;
  date?: string;
  description?: string;
}

export interface CreditData {
  scores: CreditScoreEntry[];
  accounts: CreditAccount[];
  inquiries: CreditInquiry[];
  derogatory: DerogatoryItem[];
  totalDebt?: number;
  totalCreditLimit?: number;
  oldestAccountAge?: number; // months
  monthlyIncome?: number;
}

export type CreditStep = 'intake' | 'audit' | 'disputes' | 'tracking' | 'business';

export interface AuditFactor {
  category: 'payment_history' | 'amounts_owed' | 'credit_age' | 'credit_mix' | 'new_credit';
  weight: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number; // 0-100
  findings: string[];
  recommendations: string[];
  estimatedGain: number; // estimated points recoverable
}

export interface DisputeRecommendation {
  disputeType: DisputeTypeId;
  targetEntity: string;
  reason: string;
  estimatedGain: number;
  priority: number; // 1 = highest
  successProbability: number; // 0-1
}

export interface AuditResult {
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  currentScoreAvg: number;
  estimatedScoreAfterFixes: number;
  factors: AuditFactor[];
  disputeRecommendations: DisputeRecommendation[];
  prioritizedActions: string[];
  summary: string;
}

export interface CreditProfile {
  id: string;
  userId: string;
  currentStep: CreditStep;
  creditData: CreditData;
  auditResult: AuditResult | null;
  createdAt: string;
  updatedAt: string;
}

// All 19 dispute letter types
export type DisputeTypeId =
  | 'basic_bureau'
  | '609_verification'
  | '611_reinvestigation'
  | 'method_of_verification'
  | 'identity_theft'
  | 'debt_validation'
  | 'cease_and_desist'
  | 'pay_for_delete'
  | 'goodwill_removal'
  | 'direct_creditor'
  | 'charge_off_removal'
  | 'unauthorized_inquiry'
  | 'hipaa_medical'
  | 'statute_of_limitations'
  | 'intent_to_sue'
  | 'arbitration_election'
  | 'billing_error_fcba'
  | 'breach_of_contract'
  | 'formal_demand';

export type DisputeStatus = 'draft' | 'sent' | 'pending_response' | 'resolved_positive' | 'resolved_negative' | 'escalated';

export interface CreditDispute {
  id: string;
  userId: string;
  profileId: string;
  disputeType: DisputeTypeId;
  targetBureau: string | null;
  targetEntity: string | null;
  accountRef: string | null;
  letterContent: string;
  status: DisputeStatus;
  sentAt: string | null;
  responseDue: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BusinessPhaseId = 'foundation' | 'establish' | 'vendor_tradelines' | 'revolving_credit' | 'term_loans';

export interface BusinessPhaseData {
  [key: string]: boolean | string | string[];
}

export interface BusinessCreditProgress {
  id: string;
  userId: string;
  currentPhase: BusinessPhaseId;
  phaseData: BusinessPhaseData;
  createdAt: string;
  updatedAt: string;
}
