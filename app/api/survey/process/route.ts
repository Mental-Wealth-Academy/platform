import { NextRequest, NextResponse } from 'next/server'
import bluePersona from '@/lib/bluepersonality.json'
import { getCurrentUserFromRequestCookie } from '@/lib/auth'
import type { SurveyAnswers, SurveyDimension } from '@/components/survey/types'
import { scoreViaSurvey } from '@/components/survey/viaScoring'
import { VIA_SURVEY_ID } from '@/components/survey/viaQuestions'
import { scoreBigFiveSurvey } from '@/components/survey/bigFiveScoring'
import { scoreMoralFoundationsSurvey } from '@/components/survey/moralFoundationsScoring'
import { scoreAttachmentSurvey } from '@/components/survey/attachmentScoring'
import { isDbConfigured, sqlQuery } from '@/lib/db'
import { ensureSurveyCertificateMintsSchema } from '@/lib/ensureSurveyCertificateMintsSchema'
import { randomUUID } from 'crypto'

interface ProcessSurveyRequest {
  surveyId: string
  surveyTitle?: string
  answers: SurveyAnswers
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequestCookie()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { surveyId, surveyTitle, answers } = body as ProcessSurveyRequest

    if (!surveyId || !answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: surveyId and answers' },
        { status: 400 }
      )
    }

    if (surveyId === VIA_SURVEY_ID) {
      const viaScore = scoreViaSurvey(answers)

      if (!viaScore.ok) {
        return NextResponse.json(
          { success: false, error: viaScore.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        results: viaScore.results
      })
    }

    const resolvedSurveyTitle = surveyTitle || 'Survey'

    if (surveyId === 'big-five') {
      const scored = scoreBigFiveSurvey(answers)
      if (!scored.ok) {
        return NextResponse.json({ success: false, error: scored.error }, { status: 400 })
      }
      scored.results.analysis = await generateSurveyAnalysis(
        surveyId,
        resolvedSurveyTitle,
        answers,
        scored.results.dimensions,
        scored.results.profileType,
      )
      scored.results.insights = []
      return NextResponse.json({ success: true, results: scored.results })
    }

    if (surveyId === 'moral-foundations') {
      const scored = scoreMoralFoundationsSurvey(answers)
      if (!scored.ok) {
        return NextResponse.json({ success: false, error: scored.error }, { status: 400 })
      }
      scored.results.analysis = await generateSurveyAnalysis(
        surveyId,
        resolvedSurveyTitle,
        answers,
        scored.results.dimensions,
        scored.results.profileType,
      )
      scored.results.insights = []
      return NextResponse.json({ success: true, results: scored.results })
    }

    if (surveyId === 'attachment-style') {
      const scored = scoreAttachmentSurvey(answers)
      if (!scored.ok) {
        return NextResponse.json({ success: false, error: scored.error }, { status: 400 })
      }
      scored.results.analysis = await generateSurveyAnalysis(
        surveyId,
        resolvedSurveyTitle,
        answers,
        scored.results.dimensions,
        scored.results.profileType,
      )
      scored.results.insights = []
      if (!isDbConfigured()) {
        return NextResponse.json({ success: false, error: 'Database not configured.' }, { status: 503 })
      }
      await ensureSurveyCertificateMintsSchema()
      await sqlQuery(
        `INSERT INTO survey_completions (id, user_id, survey_id, profile_type)
         VALUES (:id, :userId, :surveyId, :profileType)
         ON CONFLICT (user_id, survey_id) DO UPDATE SET
           profile_type = EXCLUDED.profile_type,
           completed_at = CURRENT_TIMESTAMP`,
        { id: randomUUID(), userId: user.id, surveyId, profileType: scored.results.profileType },
      )
      return NextResponse.json({
        success: true,
        results: scored.results,
        mintInfo: {
          username: user.username,
          walletAddress: user.walletAddress,
          profileType: scored.results.profileType,
        },
      })
    }

    // Generic fallback for any unrecognised survey id
    const analysis = await generateSurveyAnalysis(surveyId, resolvedSurveyTitle, answers)

    return NextResponse.json({
      success: true,
      results: {
        surveyId,
        surveyTitle: resolvedSurveyTitle,
        personalizedTitle: resolvedSurveyTitle,
        answers,
        analysis,
        insights: [],
        timestamp: new Date().toISOString(),
      },
    })

  } catch (error) {
    console.error('[SURVEY-PROCESS] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process survey.' },
      { status: 500 }
    )
  }
}

async function generateSurveyAnalysis(
  surveyId: string,
  surveyTitle: string,
  answers: Record<number, string>,
  dimensions?: SurveyDimension[],
  profileType?: string,
): Promise<string> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY

  if (!deepseekKey) {
    return generateFallbackAnalysis(dimensions, profileType)
  }

  try {
    const answersText = Object.entries(answers)
      .map(([questionId, answer]) => `Question ${questionId}: ${answer}`)
      .join('\n')

    const dimensionsText = dimensions && dimensions.length > 0
      ? '\nSCORED DIMENSIONS:\n' + dimensions.map((d) => `${d.label}: ${Math.round(d.score)}%`).join('\n') + '\nPROFILE: ' + (profileType ?? '')
      : ''

    const prompt = `${bluePersona.persona.description}

You are Blue, analyzing someone's survey responses through practical behavioral pattern mapping. Your core traits: ${bluePersona.persona.core_traits.join(', ')}. Your tone: ${bluePersona.communication.tone}.

SURVEY: ${surveyTitle}
SURVEY ID: ${surveyId}
${dimensionsText}

ANSWERS:
${answersText}

Analyze these responses as Blue would: direct, observant, and specific. Identify the behavioral pattern revealed by the answers and name one useful next reflection.

Keep the analysis under 500 characters. Avoid mystical language, vague praise, and claims you cannot infer from the answers.

Respond as Blue analyzing these survey responses.`

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: 'You are Blue, an AI research agent who reads survey responses for concrete behavioral patterns. Be direct, specific, and grounded.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.9,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[SURVEY-PROCESS] DeepSeek API error (${res.status}):`, errorText)
      return generateFallbackAnalysis(dimensions, profileType)
    }

    const data: any = await res.json()
    let analysis: string = (data?.choices?.[0]?.message?.content || '').trim()

    if (!analysis) {
      return generateFallbackAnalysis(dimensions, profileType)
    }

    if (analysis.length > 500) {
      analysis = analysis.substring(0, 497) + '...'
    }

    return analysis

  } catch (error) {
    console.error('[SURVEY-PROCESS] Error generating AI analysis:', error)
    return generateFallbackAnalysis(dimensions, profileType)
  }
}

function generateFallbackAnalysis(dimensions?: SurveyDimension[], profileType?: string): string {
  if (dimensions && dimensions.length > 0 && profileType) {
    const top2 = [...dimensions]
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((d) => d.label.toLowerCase())
      .join(' and ')
    return `Your ${profileType} profile shows ${top2} as your strongest dimensions.`
  }
  return 'Your responses were logged. Review the result, then use it to choose one concrete next action.'
}
