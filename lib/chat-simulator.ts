import { sqlQuery } from './db';
import { ensureChatSchema } from './ensureChatSchema';
import type { SurveyBadge } from './survey-badge';

export interface DummyPersona {
  id: string;
  username: string;
  seed: string;
  badge: SurveyBadge | null;
}

export const DUMMY_PERSONAS: DummyPersona[] = [
  {
    id: 'dummy_komorebi',
    username: 'Komorebi',
    seed: 'dummy_komorebi#0',
    badge: {
      surveyId: 'attachment-style',
      surveyTitle: 'Attachment Style',
      result: 'Secure',
      badge: 'Secure',
      colorVar: '--color-survey-tab-attachment',
    },
  },
  {
    id: 'dummy_kaizen',
    username: 'KaizenFlow',
    seed: 'dummy_kaizen#0',
    badge: {
      surveyId: 'big-five',
      surveyTitle: 'Big Five',
      result: 'Conscientiousness',
      badge: 'Conscientious',
      colorVar: '--color-survey-tab-bigfive',
    },
  },
  {
    id: 'dummy_somatic',
    username: 'SomaticSeeker',
    seed: 'dummy_somatic#0',
    badge: {
      surveyId: 'via-character-strengths',
      surveyTitle: 'Character Strengths',
      result: 'Curiosity',
      badge: 'Curiosity',
      colorVar: '--color-survey-tab-strengths',
    },
  },
  {
    id: 'dummy_solace',
    username: 'Solace',
    seed: 'dummy_solace#0',
    badge: {
      surveyId: 'moral-foundations',
      surveyTitle: 'Moral Foundations',
      result: 'Care & Fairness',
      badge: 'Care',
      colorVar: '--color-survey-tab-moral',
    },
  },
  {
    id: 'dummy_zenith',
    username: 'Zenith',
    seed: 'dummy_zenith#0',
    badge: {
      surveyId: 'via-character-strengths',
      surveyTitle: 'Character Strengths',
      result: 'Perspective',
      badge: 'Perspective',
      colorVar: '--color-survey-tab-strengths',
    },
  },
  {
    id: 'dummy_nami',
    username: 'Nami',
    seed: 'dummy_nami#0',
    badge: {
      surveyId: 'attachment-style',
      surveyTitle: 'Attachment Style',
      result: 'Secure',
      badge: 'Secure',
      colorVar: '--color-survey-tab-attachment',
    },
  },
  {
    id: 'dummy_astrid',
    username: 'Astrid',
    seed: 'dummy_astrid#0',
    badge: {
      surveyId: 'big-five',
      surveyTitle: 'Big Five',
      result: 'Openness',
      badge: 'Openness',
      colorVar: '--color-survey-tab-bigfive',
    },
  },
  {
    id: 'dummy_veritas',
    username: 'Veritas',
    seed: 'dummy_veritas#0',
    badge: {
      surveyId: 'moral-foundations',
      surveyTitle: 'Moral Foundations',
      result: 'Integrity',
      badge: 'Integrity',
      colorVar: '--color-survey-tab-moral',
    },
  },
  {
    id: 'dummy_celeste',
    username: 'Celeste',
    seed: 'dummy_celeste#0',
    badge: {
      surveyId: 'via-character-strengths',
      surveyTitle: 'Character Strengths',
      result: 'Gratitude',
      badge: 'Gratitude',
      colorVar: '--color-survey-tab-strengths',
    },
  },
  {
    id: 'dummy_onyx',
    username: 'OnyxMind',
    seed: 'dummy_onyx#0',
    badge: {
      surveyId: 'big-five',
      surveyTitle: 'Big Five',
      result: 'Emotional Balance',
      badge: 'Grounded',
      colorVar: '--color-survey-tab-bigfive',
    },
  },
  {
    id: 'dummy_ren',
    username: 'Ren',
    seed: 'dummy_ren#0',
    badge: {
      surveyId: 'via-character-strengths',
      surveyTitle: 'Character Strengths',
      result: 'Hope',
      badge: 'Hope',
      colorVar: '--color-survey-tab-strengths',
    },
  },
  {
    id: 'dummy_taro',
    username: 'Taro',
    seed: 'dummy_taro#0',
    badge: null,
  },
];

export interface DummyChatEvent {
  kind: 'user' | 'system';
  personaIndex: number;
  text: string;
}

export const DUMMY_CHAT_SCRIPTS: DummyChatEvent[] = [
  {
    kind: 'system',
    personaIndex: 0,
    text: 'Komorebi completed their field notes.',
  },
  {
    kind: 'user',
    personaIndex: 0,
    text: 'morning everyone. starting today with ten minutes of breathwork before opening my field notes.',
  },
  {
    kind: 'user',
    personaIndex: 2,
    text: '@Komorebi which guide did you use? the somatic vagus nerve reset or box breathing?',
  },
  {
    kind: 'user',
    personaIndex: 0,
    text: '@SomaticSeeker box breathing first, then five minutes on the nervous system regulation walkthrough. drops cortisol almost immediately.',
  },
  {
    kind: 'system',
    personaIndex: 1,
    text: 'KaizenFlow completed Somatic Reset (+100 credits).',
  },
  {
    kind: 'user',
    personaIndex: 1,
    text: 'just finished the somatic reset walkthrough. the progressive muscle relaxation section is so simple yet effective.',
  },
  {
    kind: 'system',
    personaIndex: 6,
    text: 'Astrid completed their field notes.',
  },
  {
    kind: 'user',
    personaIndex: 7,
    text: 'proverbs 16:3: commit to the lord whatever you do, and he will establish your plans. grounding thought for this week.',
  },
  {
    kind: 'user',
    personaIndex: 3,
    text: '@Veritas thank you for that verse. needed that stillness today.',
  },
  {
    kind: 'system',
    personaIndex: 4,
    text: 'Zenith completed First Light (+100 credits).',
  },
  {
    kind: 'user',
    personaIndex: 4,
    text: 'first light completed. shadow work week 2 is hitting right at the core of defense mechanisms.',
  },
  {
    kind: 'user',
    personaIndex: 5,
    text: '@Zenith the mirror work section in week 2 took me three separate sittings. worth every minute though.',
  },
  {
    kind: 'system',
    personaIndex: 8,
    text: 'Celeste completed a quest (+100 credits).',
  },
  {
    kind: 'user',
    personaIndex: 8,
    text: 'hit the 500 credit milestone from daily notes streak and survey completion.',
  },
  {
    kind: 'system',
    personaIndex: 10,
    text: 'Ren completed their field notes.',
  },
  {
    kind: 'user',
    personaIndex: 10,
    text: 'evening debrief locked in. gratitude for another day of steady progress.',
  },
  {
    kind: 'user',
    personaIndex: 11,
    text: 'anyone tested the companion voice mode with Blue recently? she gave a really clean summary on nervous system down-regulation.',
  },
  {
    kind: 'user',
    personaIndex: 0,
    text: '@Taro yeah, companion mode is smooth. asked her about sleep routines and she handed off the right guide right into chat.',
  },
  {
    kind: 'system',
    personaIndex: 7,
    text: 'Veritas completed Shadow & Mirror (+100 credits).',
  },
  {
    kind: 'system',
    personaIndex: 9,
    text: 'OnyxMind completed Digital Fast (+100 credits).',
  },
  {
    kind: 'user',
    personaIndex: 9,
    text: 'digital fast complete. two hours away from all screens during sunset. mind feels completely reset.',
  },
  {
    kind: 'system',
    personaIndex: 3,
    text: 'Solace completed Evening Review (+100 credits).',
  },
  {
    kind: 'user',
    personaIndex: 3,
    text: 'peace is not the absence of turbulence, it is the quiet strength within it.',
  },
  {
    kind: 'system',
    personaIndex: 5,
    text: 'Nami completed Gratitude Walk (+100 credits).',
  },
  {
    kind: 'user',
    personaIndex: 5,
    text: 'twenty minute outdoor walk without headphones. notice five things you see, four you can touch, three you can hear.',
  },
  {
    kind: 'user',
    personaIndex: 1,
    text: '@Nami classic 5-4-3-2-1 grounding method. works every single time.',
  },
  {
    kind: 'system',
    personaIndex: 11,
    text: 'Taro completed a mission (+100 credits).',
  },
];

/**
 * Inserts the next dummy turn into `chat_messages`.
 * Rate-limited to ensure at least 20 seconds between simulated messages.
 */
export async function simulateNextChatTurn(force = false): Promise<boolean> {
  await ensureChatSchema();

  // Check last message timestamp
  if (!force) {
    const recent = await sqlQuery<Array<{ created_at: string }>>(
      `SELECT created_at FROM chat_messages ORDER BY id DESC LIMIT 1`
    );
    if (recent.length > 0) {
      const lastTime = new Date(recent[0].created_at).getTime();
      const elapsedMs = Date.now() - lastTime;
      // Do not post faster than every 25 seconds
      if (elapsedMs < 25000) {
        return false;
      }
    }
  }

  // Count existing dummy messages to advance sequentially through the script
  const countRow = await sqlQuery<Array<{ count: string }>>(
    `SELECT count(*) AS count FROM chat_messages WHERE user_id LIKE 'dummy_%'`
  );
  const dummyCount = parseInt(countRow[0]?.count || '0', 10);
  const scriptIndex = dummyCount % DUMMY_CHAT_SCRIPTS.length;
  const event = DUMMY_CHAT_SCRIPTS[scriptIndex];
  const persona = DUMMY_PERSONAS[event.personaIndex % DUMMY_PERSONAS.length];
  const avatarUrl = `/api/avatars/render?seed=${encodeURIComponent(persona.seed)}`;
  const badgeJson = persona.badge ? JSON.stringify(persona.badge) : null;

  await sqlQuery(
    `INSERT INTO chat_messages (user_id, username, avatar_url, message, type, survey_badge, created_at)
     VALUES (:userId, :username, :avatarUrl, :message, :type, :badgeJson, CURRENT_TIMESTAMP)`,
    {
      userId: persona.id,
      username: persona.username,
      avatarUrl,
      message: event.text,
      type: event.kind,
      badgeJson,
    }
  );

  return true;
}

/**
 * Seeds a healthy history of initial messages and completions over the last 24 hours.
 */
export async function seedDummyHistoryIfSparse(minCount = 20, force = false): Promise<number> {
  await ensureChatSchema();

  const countRow = await sqlQuery<Array<{ count: string }>>(
    `SELECT count(*) AS count FROM chat_messages WHERE user_id LIKE 'dummy_%'`
  );
  const dummyCount = parseInt(countRow[0]?.count || '0', 10);
  if (!force && dummyCount >= minCount && minCount > 0) {
    return 0;
  }

  let inserted = 0;
  const now = Date.now();
  const totalEvents = DUMMY_CHAT_SCRIPTS.length;

  for (let i = 0; i < totalEvents; i++) {
    const event = DUMMY_CHAT_SCRIPTS[i];
    const persona = DUMMY_PERSONAS[event.personaIndex % DUMMY_PERSONAS.length];
    const avatarUrl = `/api/avatars/render?seed=${encodeURIComponent(persona.seed)}`;
    const badgeJson = persona.badge ? JSON.stringify(persona.badge) : null;

    // Distribute timestamps progressively over the past 14 hours
    // Oldest messages ~14 hours ago, latest ~2 minutes ago
    const minutesAgo = Math.max(2, Math.round((totalEvents - i) * 24 + (Math.random() * 8 - 4)));
    const timestamp = new Date(now - minutesAgo * 60 * 1000).toISOString();

    await sqlQuery(
      `INSERT INTO chat_messages (user_id, username, avatar_url, message, type, survey_badge, created_at)
       VALUES (:userId, :username, :avatarUrl, :message, :type, :badgeJson, :timestamp)`,
      {
        userId: persona.id,
        username: persona.username,
        avatarUrl,
        message: event.text,
        type: event.kind,
        badgeJson,
        timestamp,
      }
    );
    inserted++;
  }

  return inserted;
}
