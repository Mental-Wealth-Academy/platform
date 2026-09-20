import { sqlQuery } from './db';

export interface SurveyBadge {
  surveyId: string;
  surveyTitle: string;
  result: string;
  badge: string;
  colorVar: string;
}

export function formatSurveyBadge(surveyId: string, rawProfileType: string): SurveyBadge {
  const profileType = (rawProfileType || '').trim();

  if (surveyId === 'attachment-style') {
    return {
      surveyId: 'attachment-style',
      surveyTitle: 'Attachment Style',
      result: profileType || 'Completed',
      badge: profileType || 'Secure',
      colorVar: '--color-survey-tab-attachment',
    };
  }

  if (surveyId === 'big-five') {
    // profileType is e.g. "Openness, Conscientiousness" or "Balanced Profile"
    const firstTrait = profileType.includes(',') ? profileType.split(',')[0].trim() : profileType;
    return {
      surveyId: 'big-five',
      surveyTitle: 'Big Five',
      result: profileType || 'Completed',
      badge: firstTrait || 'Balanced',
      colorVar: '--color-survey-tab-bigfive',
    };
  }

  if (surveyId === 'moral-foundations') {
    // profileType is e.g. "Care & Fairness"
    return {
      surveyId: 'moral-foundations',
      surveyTitle: 'Moral Foundations',
      result: profileType || 'Completed',
      badge: profileType || 'Ethics',
      colorVar: '--color-survey-tab-moral',
    };
  }

  if (surveyId === 'via-character-strengths' || surveyId === 'via-strengths') {
    // profileType is e.g. "Curiosity, Hope, Gratitude"
    const firstStrength = profileType.includes(',') ? profileType.split(',')[0].trim() : profileType;
    return {
      surveyId: 'via-character-strengths',
      surveyTitle: 'Character Strengths',
      result: profileType || 'Completed',
      badge: firstStrength || 'Strengths',
      colorVar: '--color-survey-tab-strengths',
    };
  }

  return {
    surveyId: surveyId || 'custom',
    surveyTitle: 'Survey',
    result: profileType || 'Completed',
    badge: profileType.slice(0, 16) || 'Verified',
    colorVar: '--color-primary',
  };
}

export async function getUserLatestSurveyBadge(userId: string): Promise<SurveyBadge | null> {
  if (!userId) return null;
  try {
    const rows = await sqlQuery<Array<{ survey_id: string; profile_type: string }>>(
      `SELECT survey_id, profile_type
       FROM survey_completions
       WHERE user_id = :userId
       ORDER BY completed_at DESC
       LIMIT 1`,
      { userId }
    );
    if (!rows || rows.length === 0) return null;
    return formatSurveyBadge(rows[0].survey_id, rows[0].profile_type);
  } catch (err) {
    console.error('[survey-badge] Error loading user latest survey badge:', err);
    return null;
  }
}

export async function syncUserChatSurveyBadges(userId: string, badge: SurveyBadge): Promise<void> {
  if (!userId || !badge) return;
  try {
    const badgeJson = JSON.stringify(badge);
    await sqlQuery(
      `UPDATE chat_messages
       SET survey_badge = :badgeJson
       WHERE user_id = :userId`,
      { userId, badgeJson }
    );
  } catch (err) {
    console.error('[survey-badge] Error syncing user chat badges:', err);
  }
}
