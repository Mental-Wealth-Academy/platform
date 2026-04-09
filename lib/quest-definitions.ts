export type QuestType =
  | 'proof-required'
  | 'no-proof'
  | 'twitter-follow'
  | 'follow-and-own'
  | 'sealed-week';

export interface QuestDefinition {
  key: string;
  title: string;
  points: number;
  desc: string;
  questType: QuestType;
  targetCount: number;
  weekNumber?: number;
  icon?: string;
}

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    key: 'quest-week-1-sealed',
    title: 'Complete and seal Week 1',
    points: 100,
    desc: 'Finish the full Week 1 course and seal it from your home dashboard.',
    questType: 'sealed-week',
    targetCount: 1,
    weekNumber: 1,
  },
  {
    key: 'quest-week-2-sealed',
    title: 'Complete and seal Week 2',
    points: 100,
    desc: 'Finish the full Week 2 course and seal it from your home dashboard.',
    questType: 'sealed-week',
    targetCount: 1,
    weekNumber: 2,
  },
  {
    key: 'quest-blog-post',
    title: 'Write community blog reports',
    points: 50,
    desc: 'Share knowledge or a personal story with the community in five separate entries.',
    questType: 'proof-required',
    targetCount: 5,
  },
  {
    key: 'quest-social-asset',
    title: 'Design social media assets',
    points: 60,
    desc: 'Create five shareable assets that represent Mental Wealth Academy values.',
    questType: 'proof-required',
    targetCount: 5,
  },
  {
    key: 'quest-onboard-member',
    title: 'Onboard a new member',
    points: 75,
    desc: 'Walk someone through their first week in the academy.',
    questType: 'no-proof',
    targetCount: 1,
  },
  {
    key: 'twitter-follow-quest',
    title: 'Follow @MentalWealthDAO',
    points: 40,
    desc: 'Connect your X account and follow the official Mental Wealth Academy account.',
    questType: 'twitter-follow',
    targetCount: 1,
  },
];

export const QUEST_DEFINITION_MAP = Object.fromEntries(
  QUEST_DEFINITIONS.map((quest) => [quest.key, quest])
) as Record<string, QuestDefinition>;

const REPEATABLE_QUEST_KEYS = new Set(
  QUEST_DEFINITIONS.filter((quest) => quest.targetCount > 1).map((quest) => quest.key)
);

export function getQuestDefinition(questKey: string): QuestDefinition | null {
  return QUEST_DEFINITION_MAP[questKey] ?? null;
}

export function getQuestDefinitionForStoredQuestId(questId: string): QuestDefinition | null {
  const direct = getQuestDefinition(questId);
  if (direct) return direct;

  for (const questKey of REPEATABLE_QUEST_KEYS) {
    if (new RegExp(`^${questKey}-\\d+$`).test(questId)) {
      return QUEST_DEFINITION_MAP[questKey];
    }
  }

  return null;
}

export function isRepeatableQuest(questKey: string): boolean {
  const definition = getQuestDefinition(questKey);
  return !!definition && definition.targetCount > 1;
}
