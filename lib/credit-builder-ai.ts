// Credit Builder - AI Integration
// Uses Eliza Cloud (primary) with Claude fallback for credit analysis

import { elizaAPI } from './eliza-api';
import { FICO_FACTORS, DISPUTE_TYPES } from './credit-builder-domain';
import type { CreditData, AuditResult, DisputeTypeId } from '@/types/credit-builder';

const CREDIT_SYSTEM_PROMPT = `You are a credit repair expert and FICO scoring analyst. You provide accurate, actionable credit analysis based on the FICO scoring model.

FICO Score Factors:
${FICO_FACTORS.map(f => `- ${f.label} (${f.weight * 100}%): ${f.scoringGuide}`).join('\n')}

Available Dispute Types:
${DISPUTE_TYPES.map(d => `- ${d.id}: ${d.label} (${d.legalAuthority}) - Best for: ${d.bestFor}`).join('\n')}

Rules:
- Always respond with valid JSON matching the requested schema
- Be conservative with estimated score gains (realistic, not inflated)
- Prioritize actions by impact-per-effort ratio
- Cite specific legal authorities when recommending disputes
- Never provide legal advice -- frame as educational information`;

/**
 * Call AI with Eliza primary, Claude fallback
 */
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  // Try Eliza Cloud first
  try {
    const result = await elizaAPI.chat({
      messages: [
        { role: 'system', parts: [{ type: 'text', text: systemPrompt }] },
        { role: 'user', parts: [{ type: 'text', text: userPrompt }] },
      ],
    });
    if (result && result.trim()) return result;
  } catch (err) {
    console.warn('[CreditBuilder AI] Eliza failed, trying Claude fallback:', (err as Error).message);
  }

  // Claude fallback
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    throw new Error('No AI service available (Eliza failed, no ANTHROPIC_API_KEY)');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('Empty response from Claude');
  return content;
}

/**
 * Extract JSON from AI response (handles markdown code blocks)
 */
function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  // Try to find raw JSON
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) return text.slice(jsonStart, jsonEnd + 1);
  return text;
}

/**
 * Analyze a user's credit profile and generate an audit
 */
export async function analyzeCreditProfile(creditData: CreditData): Promise<AuditResult> {
  const scores = creditData.scores.map(s => s.score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const userPrompt = `Analyze this credit profile and return a JSON audit result.

Credit Data:
- Scores: ${creditData.scores.map(s => `${s.bureau}: ${s.score}`).join(', ') || 'Not provided'}
- Average Score: ${avgScore}
- Number of Accounts: ${creditData.accounts.length}
- Account Types: ${[...new Set(creditData.accounts.map(a => a.type))].join(', ') || 'None'}
- Accounts with Late Status: ${creditData.accounts.filter(a => a.status === 'late').length}
- Collections: ${creditData.accounts.filter(a => a.status === 'collection').length}
- Charge-offs: ${creditData.accounts.filter(a => a.status === 'charged_off').length}
- Total Debt: $${creditData.totalDebt ?? 'Unknown'}
- Total Credit Limit: $${creditData.totalCreditLimit ?? 'Unknown'}
- Utilization: ${creditData.totalCreditLimit && creditData.totalDebt ? Math.round((creditData.totalDebt / creditData.totalCreditLimit) * 100) : 'Unknown'}%
- Hard Inquiries (last 2 years): ${creditData.inquiries.filter(i => i.type === 'hard').length}
- Oldest Account Age: ${creditData.oldestAccountAge ? Math.round(creditData.oldestAccountAge / 12) + ' years' : 'Unknown'}
- Derogatory Items: ${creditData.derogatory.length}
${creditData.derogatory.map(d => `  - ${d.type}: ${d.creditor} ${d.amount ? '$' + d.amount : ''} ${d.date || ''}`).join('\n')}

Return ONLY valid JSON in this exact schema:
{
  "overallGrade": "A" | "B" | "C" | "D" | "F",
  "currentScoreAvg": number,
  "estimatedScoreAfterFixes": number,
  "factors": [
    {
      "category": "payment_history" | "amounts_owed" | "credit_age" | "credit_mix" | "new_credit",
      "weight": number (0-1),
      "grade": "A" | "B" | "C" | "D" | "F",
      "score": number (0-100),
      "findings": ["string"],
      "recommendations": ["string"],
      "estimatedGain": number
    }
  ],
  "disputeRecommendations": [
    {
      "disputeType": "one of the 19 dispute type IDs",
      "targetEntity": "creditor or bureau name",
      "reason": "why this dispute",
      "estimatedGain": number,
      "priority": number (1=highest),
      "successProbability": number (0-1)
    }
  ],
  "prioritizedActions": ["string - action items in priority order"],
  "summary": "2-3 sentence summary of the credit situation and path forward"
}`;

  const raw = await callAI(CREDIT_SYSTEM_PROMPT, userPrompt);
  const jsonStr = extractJSON(raw);

  try {
    const result = JSON.parse(jsonStr) as AuditResult;
    // Ensure currentScoreAvg is set
    if (!result.currentScoreAvg && avgScore > 0) {
      result.currentScoreAvg = avgScore;
    }
    return result;
  } catch {
    // Return a basic fallback audit if AI parsing fails
    return buildFallbackAudit(creditData, avgScore);
  }
}

/**
 * Generate a dispute letter using AI
 */
export async function generateDisputeLetter(params: {
  disputeType: DisputeTypeId;
  targetBureau?: string;
  targetEntity?: string;
  accountRef?: string;
  itemDetails?: string;
  userName: string;
  userAddress?: string;
}): Promise<string> {
  const disputeInfo = DISPUTE_TYPES.find(d => d.id === params.disputeType);
  if (!disputeInfo) throw new Error(`Unknown dispute type: ${params.disputeType}`);

  const letterPrompt = `Generate a professional credit dispute letter.

Letter Type: ${disputeInfo.label}
Legal Authority: ${disputeInfo.legalAuthority}
Purpose: ${disputeInfo.description}

Details:
- From: ${params.userName}${params.userAddress ? '\n- Address: ' + params.userAddress : ''}
- To: ${params.targetEntity || params.targetBureau || 'Credit Bureau'}
- Account Reference: ${params.accountRef || 'See details below'}
- Item Details: ${params.itemDetails || 'Inaccurate item on credit report'}

Requirements:
- Professional, formal tone
- Cite the specific legal authority (${disputeInfo.legalAuthority})
- Include clear demand for action
- Set 30-day response deadline per FCRA requirements
- Include statement about right to sue if not resolved
- Format as a proper business letter with today's date
- Do NOT include any placeholder text like [YOUR NAME] -- use the actual name provided

Return the complete letter text only, no JSON wrapping.`;

  const systemPrompt = 'You are a consumer credit rights attorney drafting dispute letters. Write legally accurate, professionally formatted letters that cite specific statutes and demand specific actions. Never use placeholder text.';

  return callAI(systemPrompt, letterPrompt);
}

/**
 * Get AI suggestions for next actions based on current state
 */
export async function suggestNextActions(params: {
  creditData: CreditData;
  auditResult: AuditResult | null;
  disputeCount: number;
  resolvedCount: number;
}): Promise<string[]> {
  if (!params.auditResult) {
    return ['Complete your credit profile intake to get started', 'Enter your credit scores from all three bureaus', 'List any negative items on your credit report'];
  }

  const prompt = `Based on this credit profile, suggest 3-5 specific next actions.

Current Score: ${params.auditResult.currentScoreAvg}
Grade: ${params.auditResult.overallGrade}
Active Disputes: ${params.disputeCount}
Resolved: ${params.resolvedCount}
Top Issue: ${params.auditResult.factors.sort((a, b) => b.estimatedGain - a.estimatedGain)[0]?.category || 'unknown'}

Return a JSON array of strings, each a specific actionable step. Example: ["Send a 609 verification letter to Equifax for the Capital One collection", "Pay down Chase Visa to under 30% utilization"]`;

  try {
    const raw = await callAI(CREDIT_SYSTEM_PROMPT, prompt);
    const jsonStr = extractJSON(raw);
    return JSON.parse(jsonStr);
  } catch {
    return params.auditResult.prioritizedActions.slice(0, 5);
  }
}

/**
 * Fallback audit when AI fails
 */
function buildFallbackAudit(data: CreditData, avgScore: number): AuditResult {
  const scores = data.scores.map(s => s.score);
  const avg = avgScore || (scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 600);

  const utilization = data.totalCreditLimit && data.totalDebt
    ? Math.round((data.totalDebt / data.totalCreditLimit) * 100)
    : 50;

  const lateAccounts = data.accounts.filter(a => a.status === 'late' || a.status === 'collection' || a.status === 'charged_off').length;
  const hardInquiries = data.inquiries.filter(i => i.type === 'hard').length;
  const accountTypes = new Set(data.accounts.map(a => a.type)).size;
  const oldestAge = data.oldestAccountAge || 24;

  const gradeFromScore = (s: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (s >= 80) return 'A';
    if (s >= 65) return 'B';
    if (s >= 50) return 'C';
    if (s >= 35) return 'D';
    return 'F';
  };

  const paymentScore = lateAccounts === 0 ? 90 : lateAccounts <= 2 ? 60 : 30;
  const utilizationScore = utilization < 10 ? 95 : utilization < 30 ? 75 : utilization < 50 ? 50 : 25;
  const ageScore = oldestAge > 84 ? 90 : oldestAge > 48 ? 70 : oldestAge > 24 ? 50 : 30;
  const mixScore = accountTypes >= 3 ? 85 : accountTypes === 2 ? 65 : 40;
  const inquiryScore = hardInquiries <= 1 ? 90 : hardInquiries <= 3 ? 70 : hardInquiries <= 5 ? 45 : 20;

  const overallNum = paymentScore * 0.35 + utilizationScore * 0.30 + ageScore * 0.15 + mixScore * 0.10 + inquiryScore * 0.10;

  return {
    overallGrade: gradeFromScore(overallNum),
    currentScoreAvg: avg,
    estimatedScoreAfterFixes: Math.min(850, avg + data.derogatory.length * 15 + (utilization > 30 ? 20 : 0)),
    factors: [
      { category: 'payment_history', weight: 0.35, grade: gradeFromScore(paymentScore), score: paymentScore, findings: lateAccounts > 0 ? [`${lateAccounts} accounts with negative marks`] : ['All payments on time'], recommendations: lateAccounts > 0 ? ['Dispute inaccurate negative items', 'Send goodwill letters for one-time late payments'] : ['Keep up the good work'], estimatedGain: lateAccounts * 15 },
      { category: 'amounts_owed', weight: 0.30, grade: gradeFromScore(utilizationScore), score: utilizationScore, findings: [`Utilization at approximately ${utilization}%`], recommendations: utilization > 30 ? ['Pay down balances to under 30%', 'Request credit limit increases'] : ['Utilization is healthy'], estimatedGain: utilization > 30 ? 20 : 0 },
      { category: 'credit_age', weight: 0.15, grade: gradeFromScore(ageScore), score: ageScore, findings: [`Oldest account approximately ${Math.round(oldestAge / 12)} years`], recommendations: oldestAge < 48 ? ['Keep old accounts open', 'Avoid closing your oldest cards'] : ['Good credit history length'], estimatedGain: 0 },
      { category: 'credit_mix', weight: 0.10, grade: gradeFromScore(mixScore), score: mixScore, findings: [`${accountTypes} account type(s)`], recommendations: accountTypes < 3 ? ['Consider diversifying account types'] : ['Good credit mix'], estimatedGain: 0 },
      { category: 'new_credit', weight: 0.10, grade: gradeFromScore(inquiryScore), score: inquiryScore, findings: [`${hardInquiries} hard inquiries`], recommendations: hardInquiries > 3 ? ['Dispute unauthorized inquiries', 'Wait before applying for new credit'] : ['Inquiry level is manageable'], estimatedGain: Math.max(0, (hardInquiries - 2) * 5) },
    ],
    disputeRecommendations: data.derogatory.map((d, i) => ({
      disputeType: d.type === 'collection' ? 'debt_validation' as DisputeTypeId : 'basic_bureau' as DisputeTypeId,
      targetEntity: d.creditor,
      reason: `${d.type} from ${d.creditor}`,
      estimatedGain: 15,
      priority: i + 1,
      successProbability: 0.4,
    })),
    prioritizedActions: [
      ...(lateAccounts > 0 ? ['Dispute negative items on your credit report'] : []),
      ...(utilization > 30 ? ['Pay down credit card balances to under 30% utilization'] : []),
      ...(hardInquiries > 3 ? ['Dispute unauthorized hard inquiries'] : []),
      'Review your credit reports from all three bureaus for errors',
      'Set up autopay on all accounts to prevent future late payments',
    ],
    summary: `Your average credit score is ${avg}. ${lateAccounts > 0 ? `You have ${lateAccounts} accounts with negative marks that could be disputed. ` : ''}${utilization > 30 ? `Your utilization is high at ${utilization}%. ` : ''}Focus on the highest-impact items first.`,
  };
}
