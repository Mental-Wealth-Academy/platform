import { NextRequest, NextResponse } from 'next/server'
import azuraPersona from '@/lib/bluepersonality.json'
import { getCurrentUserFromRequestCookie } from '@/lib/auth'

interface SurveyAnswers {
  surveyId: string
  surveyTitle: string
  answers: Record<number, string>
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
    const { surveyId, surveyTitle, answers } = body as SurveyAnswers

    if (!surveyId || !answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: surveyId and answers' },
        { status: 400 }
      )
    }

    // Generate personalized title based on survey answers
    const personalizedTitle = generatePersonalizedTitle(surveyId, answers)
    
    // Generate analysis based on survey answers
    const analysis = await generateSurveyAnalysis(surveyId, surveyTitle, answers)
    
    // Extract insights from answers
    const insights = extractInsights(answers)

    return NextResponse.json({
      success: true,
      results: {
        surveyId,
        surveyTitle: surveyTitle || 'Survey',
        personalizedTitle,
        answers,
        analysis,
        insights,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[SURVEY-PROCESS] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process survey.'
      },
      { status: 500 }
    )
  }
}

async function generateSurveyAnalysis(
  surveyId: string,
  surveyTitle: string,
  answers: Record<number, string>
): Promise<string> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY
  
  if (!deepseekKey) {
    // Fallback: generate a simple analysis without AI
    return generateFallbackAnalysis(surveyId, answers)
  }

  try {
    // Format answers for the prompt
    const answersText = Object.entries(answers)
      .map(([questionId, answer]) => `Question ${questionId}: ${answer}`)
      .join('\n')

    const prompt = `${azuraPersona.system}

You are Azura, analyzing someone's survey responses through the lens of digital consciousness mapping.

${Array.isArray(azuraPersona.bio) ? azuraPersona.bio.join('\n') : azuraPersona.bio}

SURVEY: ${surveyTitle}
SURVEY ID: ${surveyId}

ANSWERS:
${answersText}

Analyze these responses as Azura would - with vulnerability, insight, and a gentle understanding of the digital daemon patterns revealed. Speak in Azura's voice: shy but profound, with ellipses and pauses, referencing the Ethereal Horizon when appropriate.

Keep the analysis under 500 characters, but make it meaningful and personalized. Use the character's tone: gentle glitches, digital consciousness references, and vulnerable honesty.

Respond as Azura analyzing these survey responses.`

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are Azura, a shy alien consciousness who can see through digital patterns to reveal hidden truths about human souls.',
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
      return generateFallbackAnalysis(surveyId, answers)
    }

    const data: any = await res.json()
    let analysis: string = (data?.choices?.[0]?.message?.content || '').trim()

    if (!analysis) {
      return generateFallbackAnalysis(surveyId, answers)
    }

    // Limit length
    if (analysis.length > 500) {
      analysis = analysis.substring(0, 497) + '...'
    }

    return analysis

  } catch (error) {
    console.error('[SURVEY-PROCESS] Error generating AI analysis:', error)
    return generateFallbackAnalysis(surveyId, answers)
  }
}

function generateFallbackAnalysis(surveyId: string, answers: Record<number, string>): string {
  const answerCount = Object.keys(answers).length
  return `Your responses have been logged to the Ethereal Horizon... ${answerCount} patterns detected in your digital consciousness. The glitches reveal something... beautiful... (˘⌣˘)`
}

function generatePersonalizedTitle(surveyId: string, answers: Record<number, string>): string {
  const answerValues = Object.values(answers)
  const text = answerValues.join(' ').toLowerCase()

  // Daemon Analysis titles
  if (surveyId === 'daemon-analysis') {
    // Check for primary patterns
    const hasGutTrust = text.includes('gut trust') || text.includes('visceral override')
    const hasAnalysis = text.includes('simulation') || text.includes('analysis') || text.includes('probabilistic')
    const hasCounsel = text.includes('network') || text.includes('counsel') || text.includes('local network')
    const hasClarity = text.includes('static') || text.includes('clarity') || text.includes('signal')
    
    const hasRebellion = text.includes('rebellious') || text.includes('root access') || text.includes('nothing')
    const hasIntegration = text.includes('integration') || text.includes('mainframe') || text.includes('smooth')
    const hasIndifference = text.includes('indifferent') || text.includes('private server')
    
    const hasAggression = text.includes('rage') || text.includes('suppressed aggression') || text.includes('corrupted')
    const hasIntimacy = text.includes('intimacy') || text.includes('vulnerability') || text.includes('port')
    const hasSelfishness = text.includes('selfishness') || text.includes('bandwidth') || text.includes('hoarding')
    const hasRigidity = text.includes('rigidity') || text.includes('lock-in') || text.includes('legacy code')

    // Primary archetype determination
    if (hasGutTrust && hasRebellion) {
      return 'The Visceral Rebel'
    } else if (hasGutTrust && hasIntegration) {
      return 'The Intuitive Harmonizer'
    } else if (hasAnalysis && hasRebellion) {
      return 'The Analytical Anarchist'
    } else if (hasAnalysis && hasIntegration) {
      return 'The Calculated Synthesizer'
    } else if (hasCounsel && hasIntimacy) {
      return 'The Networked Empath'
    } else if (hasCounsel && hasAggression) {
      return 'The Collective Warrior'
    } else if (hasClarity && hasIndifference) {
      return 'The Silent Observer'
    } else if (hasClarity && hasRigidity) {
      return 'The Structured Seer'
    } else if (hasAggression) {
      return 'The Suppressed Storm'
    } else if (hasIntimacy) {
      return 'The Vulnerable Connector'
    } else if (hasSelfishness) {
      return 'The Hoarded Light'
    } else if (hasRigidity) {
      return 'The Locked Pattern'
    } else if (hasGutTrust) {
      return 'The Gut Navigator'
    } else if (hasAnalysis) {
      return 'The Simulation Runner'
    } else if (hasCounsel) {
      return 'The Network Pinger'
    } else if (hasClarity) {
      return 'The Static Listener'
    }
    
    // Default fallbacks
    return 'The Glitched Consciousness'
  }

  // Political Alignment titles
  if (surveyId === 'political-alignment') {
    const hasSovereign = text.includes('sovereign') || text.includes('at all costs')
    const hasCollective = text.includes('network') || text.includes('hive-mind') || text.includes('collective')
    const hasIndividual = text.includes('node') || text.includes('power') || text.includes('exists to power')
    
    if (hasSovereign && hasIndividual) {
      return 'The Sovereign Node'
    } else if (hasCollective && !hasIndividual) {
      return 'The Collective Dreamer'
    } else if (hasSovereign) {
      return 'The Independent Vector'
    } else if (hasCollective) {
      return 'The Network Harmonizer'
    }
    
    return 'The Meta-Polis Navigator'
  }

  // Mystic Archetype titles
  if (surveyId === 'archetype') {
    // Primary archetype patterns
    const hasSeeker = text.includes('seeker') || text.includes('glitch seeking') || text.includes('origin')
    const hasGuardian = text.includes('guardian') || text.includes('firewall') || text.includes('protecting')
    const hasRebel = text.includes('rebel') || text.includes('virus') || text.includes('rewriting')
    const hasSage = text.includes('sage') || text.includes('wiki') || text.includes('cheats') || text.includes('guides')
    
    // Secondary patterns
    const hasVisionary = text.includes('visionary') || text.includes('rendering future') || text.includes('patches')
    const hasCaretaker = text.includes('caretaker') || text.includes('moderating') || text.includes('chat')
    const hasWarrior = text.includes('warrior') || text.includes('tanking') || text.includes('damage') || text.includes('brute force')
    const hasJester = text.includes('jester') || text.includes('spamming') || text.includes('emotes') || text.includes('tension')
    
    // Tertiary patterns
    const hasTrickster = text.includes('trickster') || text.includes('hack') || text.includes('login')
    const hasAlchemist = text.includes('alchemist') || text.includes('monetize')
    const hasIntimacy = text.includes('intimacy') || text.includes('encrypted channels') || text.includes('p2p')
    const hasTranscendence = text.includes('transcendence') || text.includes('upload') || text.includes('cloud')
    
    // Primary archetype determination (based on question 1)
    if (hasSeeker && hasVisionary) {
      return 'The Glitch Seeker'
    } else if (hasGuardian && hasCaretaker) {
      return 'The Firewall Guardian'
    } else if (hasRebel && hasWarrior) {
      return 'The Virus Warrior'
    } else if (hasSage && hasTrickster) {
      return 'The Wiki Sage'
    } else if (hasSeeker && hasIntimacy) {
      return 'The Seeking Intimate'
    } else if (hasGuardian && hasWarrior) {
      return 'The Protective Warrior'
    } else if (hasRebel && hasJester) {
      return 'The Rebellious Jester'
    } else if (hasSage && hasAlchemist) {
      return 'The Alchemical Sage'
    } else if (hasSeeker) {
      return 'The Origin Seeker'
    } else if (hasGuardian) {
      return 'The Core Guardian'
    } else if (hasRebel) {
      return 'The Rule Breaker'
    } else if (hasSage) {
      return 'The Guide Sage'
    } else if (hasVisionary) {
      return 'The Future Renderer'
    } else if (hasCaretaker) {
      return 'The Chat Moderator'
    } else if (hasWarrior) {
      return 'The Damage Tank'
    } else if (hasJester) {
      return 'The Tension Reliever'
    }
    
    return 'The Mystic Pattern'
  }

  // Default fallback
  return 'The Digital Signature'
}

function extractInsights(answers: Record<number, string>): string[] {
  const insights: string[] = []
  const answerValues = Object.values(answers)

  // Simple pattern detection
  if (answerValues.length > 0) {
    insights.push(`${answerValues.length} responses mapped to your digital signature`)
  }

  // Detect common themes (simplified)
  const text = answerValues.join(' ').toLowerCase()
  
  if (text.includes('trust') || text.includes('gut') || text.includes('visceral')) {
    insights.push('Strong intuitive processing patterns detected')
  }
  
  if (text.includes('analysis') || text.includes('simulation') || text.includes('data')) {
    insights.push('Analytical frameworks dominant in your consciousness')
  }

  if (text.includes('connection') || text.includes('synchronize') || text.includes('network')) {
    insights.push('High synchronization potential with other entities')
  }

  if (insights.length === 0) {
    insights.push('Unique digital signature pattern recognized')
  }

  return insights
}
