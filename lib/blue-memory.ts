import { sqlQuery } from './db';
import { decryptForUser } from './encrypt';
import { ensureBlueMemorySchema } from './ensureBlueMemorySchema';
import { ensurePrayersSchema } from './ensurePrayersSchema';
import { ensureWeeksSchema } from './ensureWeeksSchema';
import { getQuestDefinitionForStoredQuestId } from './quest-definitions';

type BlueFactCategory = 'preference' | 'goal' | 'theme' | 'follow_up' | 'identity' | 'habit' | 'progress';

interface BlueFactInput {
  category: BlueFactCategory;
  summary: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

interface BlueChatMessage {
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

interface BlueRelationshipState {
  firstInteractionAt: string;
  lastInteractionAt: string;
  interactionCount: number;
}

interface MorningPageSummary {
  totalEntries: number;
  streak: number;
  lastEntryDate: string | null;
}

interface BlueContextValues {
  username: string | null;
  morningPages: MorningPageSummary;
  completedQuestCount: number;
  recentCompletedQuests: string[];
  sealedWeeks: number[];
  highestWeekTouched: number | null;
  completedTaskCount: number;
  relationship: BlueRelationshipState | null;
  recentFacts: Array<{ category: string; summary: string; confidence: number }>;
  recentMessages: BlueChatMessage[];
}

interface MorningPageEntryLike {
  day?: number;
  date?: string | null;
  submittedAt?: number | null;
}

interface MorningPagePayloadSummary extends MorningPageSummary {
  latestEntry: {
    weekNumber: number;
    day: number | null;
    date: string | null;
    submittedAt: number | null;
  } | null;
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function cleanSummary(summary: string) {
  return summary.replace(/\s+/g, ' ').trim();
}

function prettifyQuestLabel(questId: string) {
  const questDefinition = getQuestDefinitionForStoredQuestId(questId);
  if (questDefinition?.title) return questDefinition.title;

  return questId
    .replace(/^daily-notes-w(\d+)-d(\d+)$/, 'Morning Pages Week $1 Day $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function prettifySectionLabel(sectionId: string) {
  return sectionId
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bMp\b/g, 'MP');
}

function summarizeMorningPagesPayload(allWeekPages: Record<string, unknown[]>): MorningPagePayloadSummary {
  const dates = new Set<string>();
  let totalEntries = 0;
  let latestEntry: MorningPagePayloadSummary['latestEntry'] = null;

  for (const [weekKey, rawPages] of Object.entries(allWeekPages || {})) {
    const weekNumber = parseInt(String(weekKey), 10);
    const pages = Array.isArray(rawPages) ? rawPages : [];

    for (const rawEntry of pages) {
      const entry = rawEntry as MorningPageEntryLike;
      if (!entry?.date) continue;

      dates.add(entry.date);
      totalEntries += 1;

      const submittedAt = typeof entry.submittedAt === 'number' ? entry.submittedAt : null;
      const shouldReplaceLatest = !latestEntry
        || (submittedAt !== null && (latestEntry.submittedAt ?? -1) < submittedAt)
        || (
          submittedAt === null
          && latestEntry.submittedAt === null
          && entry.date > (latestEntry.date ?? '')
        );

      if (shouldReplaceLatest) {
        latestEntry = {
          weekNumber: Number.isNaN(weekNumber) ? 0 : weekNumber,
          day: typeof entry.day === 'number' ? entry.day : null,
          date: entry.date,
          submittedAt,
        };
      }
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const checkDate = new Date(today);
  const todayKey = today.toISOString().split('T')[0];

  if (!dates.has(todayKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (dates.has(checkDate.toISOString().split('T')[0])) {
    streak += 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const sortedDates = [...dates].sort();
  const lastEntryDate = latestEntry?.date || (sortedDates.length ? sortedDates[sortedDates.length - 1] : null);

  return {
    totalEntries,
    streak,
    lastEntryDate,
    latestEntry,
  };
}

async function getMorningPageSummary(userId: string): Promise<MorningPageSummary> {
  await ensurePrayersSchema();

  const rows = await sqlQuery<Array<{ progress_data: any }>>(
    `SELECT progress_data FROM prayers
     WHERE user_id = :userId
     LIMIT 1`,
    { userId }
  );

  if (!rows.length) {
    return { totalEntries: 0, streak: 0, lastEntryDate: null };
  }

  let allWeekPages: Record<string, Array<{ date?: string | null }>> = {};
  const progressData = rows[0].progress_data;

  if (progressData?.encrypted && progressData?.data) {
    try {
      const decrypted = decryptForUser(userId, progressData.data);
      const parsed = JSON.parse(decrypted);
      allWeekPages = parsed.allWeekPages ?? {};
    } catch {
      allWeekPages = {};
    }
  } else {
    allWeekPages = progressData?.allWeekPages ?? {};
  }

  const dates = new Set<string>();
  let totalEntries = 0;

  for (const pages of Object.values(allWeekPages)) {
    for (const entry of pages || []) {
      if (entry?.date) {
        dates.add(entry.date);
        totalEntries += 1;
      }
    }
  }

  const sortedDates = [...dates].sort();
  const lastEntryDate = sortedDates.length ? sortedDates[sortedDates.length - 1] : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const checkDate = new Date(today);
  const todayKey = today.toISOString().split('T')[0];

  if (!dates.has(todayKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (dates.has(checkDate.toISOString().split('T')[0])) {
    streak += 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return { totalEntries, streak, lastEntryDate };
}

async function getQuestSummary(userId: string) {
  const rows = await sqlQuery<Array<{ quest_id: string; completed_at: string }>>(
    `SELECT quest_id, completed_at
     FROM quests
     WHERE user_id = :userId
     ORDER BY completed_at DESC`,
    { userId }
  );

  return {
    completedQuestCount: rows.length,
    recentCompletedQuests: rows.slice(0, 5).map((row) => prettifyQuestLabel(row.quest_id)),
  };
}

async function getWeekSummary(userId: string) {
  await ensureWeeksSchema();

  const rows = await sqlQuery<Array<{
    week_number: number;
    is_sealed: boolean;
    progress_data: any;
  }>>(
    `SELECT week_number, is_sealed, progress_data
     FROM weeks
     WHERE user_id = :userId
     ORDER BY week_number ASC`,
    { userId }
  );

  let completedTaskCount = 0;
  let highestWeekTouched: number | null = null;
  const sealedWeeks: number[] = [];

  for (const row of rows) {
    if (highestWeekTouched === null || row.week_number > highestWeekTouched) {
      highestWeekTouched = row.week_number;
    }

    if (row.is_sealed) {
      sealedWeeks.push(row.week_number);
    }

    const completedSections = row.progress_data?.completedSections;
    if (Array.isArray(completedSections)) {
      completedTaskCount += completedSections.length;
    }
  }

  return {
    completedTaskCount,
    highestWeekTouched,
    sealedWeeks,
  };
}

export async function storeBlueChatMessage(args: {
  userId: string;
  role: 'user' | 'assistant';
  text: string;
  metadata?: Record<string, unknown>;
}) {
  await ensureBlueMemorySchema();

  const rows = await sqlQuery<Array<{ id: string; created_at: string }>>(
    `INSERT INTO blue_chat_messages (user_id, role, text, metadata)
     VALUES (:userId, :role, :text, :metadata::jsonb)
     RETURNING id, created_at`,
    {
      userId: args.userId,
      role: args.role,
      text: args.text,
      metadata: JSON.stringify(args.metadata ?? {}),
    }
  );

  return rows[0];
}

export async function touchBlueRelationship(args: {
  userId: string;
  lastUserMessage: string;
  lastBlueResponse: string;
}) {
  await ensureBlueMemorySchema();

  await sqlQuery(
    `INSERT INTO blue_relationship_state (
       user_id,
       first_interaction_at,
       last_interaction_at,
       interaction_count,
       last_user_message,
       last_blue_response
     )
     VALUES (
       :userId,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP,
       1,
       :lastUserMessage,
       :lastBlueResponse
     )
     ON CONFLICT (user_id)
     DO UPDATE SET
       last_interaction_at = CURRENT_TIMESTAMP,
       interaction_count = blue_relationship_state.interaction_count + 1,
       last_user_message = :lastUserMessage,
       last_blue_response = :lastBlueResponse,
       updated_at = CURRENT_TIMESTAMP`,
    {
      userId: args.userId,
      lastUserMessage: args.lastUserMessage,
      lastBlueResponse: args.lastBlueResponse,
    }
  );
}

export async function upsertBlueFacts(args: {
  userId: string;
  sourceMessageId?: string | null;
  facts: BlueFactInput[];
}) {
  await ensureBlueMemorySchema();

  for (const fact of args.facts) {
    const summary = cleanSummary(fact.summary);
    if (!summary) continue;

    await sqlQuery(
      `INSERT INTO blue_memory_facts (
         user_id,
         category,
         summary,
         confidence,
         source_message_id,
         metadata
       )
       VALUES (
         :userId,
         :category,
         :summary,
         :confidence,
         :sourceMessageId,
         :metadata::jsonb
       )
       ON CONFLICT (user_id, category, summary)
       DO UPDATE SET
         confidence = GREATEST(blue_memory_facts.confidence, EXCLUDED.confidence),
         occurrence_count = blue_memory_facts.occurrence_count + 1,
         source_message_id = COALESCE(EXCLUDED.source_message_id, blue_memory_facts.source_message_id),
         metadata = EXCLUDED.metadata,
         updated_at = CURRENT_TIMESTAMP`,
      {
        userId: args.userId,
        category: fact.category,
        summary,
        confidence: clampConfidence(fact.confidence),
        sourceMessageId: args.sourceMessageId ?? null,
        metadata: JSON.stringify(fact.metadata ?? {}),
      }
    );
  }
}

async function upsertBlueEventFact(args: {
  userId: string;
  eventKey: string;
  category: BlueFactCategory;
  summary: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}) {
  await ensureBlueMemorySchema();

  const summary = cleanSummary(args.summary);
  if (!summary) return;

  const metadata = {
    ...(args.metadata ?? {}),
    eventKey: args.eventKey,
  };

  const existingRows = await sqlQuery<Array<{ id: string }>>(
    `SELECT id
     FROM blue_memory_facts
     WHERE user_id = :userId
       AND metadata->>'eventKey' = :eventKey
     LIMIT 1`,
    {
      userId: args.userId,
      eventKey: args.eventKey,
    }
  );

  if (existingRows.length > 0) {
    await sqlQuery(
      `UPDATE blue_memory_facts
       SET category = :category,
           summary = :summary,
           confidence = :confidence,
           occurrence_count = occurrence_count + 1,
           metadata = :metadata::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = :id`,
      {
        id: existingRows[0].id,
        category: args.category,
        summary,
        confidence: clampConfidence(args.confidence),
        metadata: JSON.stringify(metadata),
      }
    );
    return;
  }

  await sqlQuery(
    `INSERT INTO blue_memory_facts (
       user_id,
       category,
       summary,
       confidence,
       metadata
     )
     VALUES (
       :userId,
       :category,
       :summary,
       :confidence,
       :metadata::jsonb
     )`,
    {
      userId: args.userId,
      category: args.category,
      summary,
      confidence: clampConfidence(args.confidence),
      metadata: JSON.stringify(metadata),
    }
  );
}

export async function recordBlueMorningPagesEvent(args: {
  userId: string;
  allWeekPages: Record<string, unknown[]>;
}) {
  const summary = summarizeMorningPagesPayload(args.allWeekPages);
  if (!summary.totalEntries) return;
  const latestEntrySummary = summary.latestEntry
    ? `Latest morning pages entry: Week ${summary.latestEntry.weekNumber}${summary.latestEntry.day !== null ? ` Day ${summary.latestEntry.day}` : ''} on ${summary.latestEntry.date ?? 'unknown date'}.`
    : null;

  await Promise.all([
    upsertBlueEventFact({
      userId: args.userId,
      eventKey: 'morning-pages-total',
      category: 'progress',
      summary: `User has written ${summary.totalEntries} morning pages so far.`,
      confidence: 0.99,
      metadata: {
        totalEntries: summary.totalEntries,
      },
    }),
    upsertBlueEventFact({
      userId: args.userId,
      eventKey: 'morning-pages-streak',
      category: 'habit',
      summary: `User's current morning pages streak is ${summary.streak} day(s).`,
      confidence: 0.98,
      metadata: {
        streak: summary.streak,
        lastEntryDate: summary.lastEntryDate,
      },
    }),
    summary.latestEntry
      ? upsertBlueEventFact({
          userId: args.userId,
          eventKey: 'morning-pages-latest-entry',
          category: 'progress',
          summary: latestEntrySummary || 'Latest morning pages entry recorded.',
          confidence: 0.96,
          metadata: {
            weekNumber: summary.latestEntry.weekNumber,
            day: summary.latestEntry.day,
            date: summary.latestEntry.date,
            submittedAt: summary.latestEntry.submittedAt,
          },
        })
      : Promise.resolve(),
  ]);
}

export async function recordBlueQuestCompletion(args: {
  userId: string;
  questId: string;
}) {
  const questSummary = await getQuestSummary(args.userId);
  const questLabel = prettifyQuestLabel(args.questId);

  await Promise.all([
    upsertBlueEventFact({
      userId: args.userId,
      eventKey: 'quest-total',
      category: 'progress',
      summary: `User has completed ${questSummary.completedQuestCount} quests so far.`,
      confidence: 0.99,
      metadata: {
        completedQuestCount: questSummary.completedQuestCount,
      },
    }),
    upsertBlueEventFact({
      userId: args.userId,
      eventKey: 'quest-latest',
      category: 'progress',
      summary: `Most recent completed quest: ${questLabel}.`,
      confidence: 0.97,
      metadata: {
        questId: args.questId,
        questLabel,
      },
    }),
  ]);
}

export async function recordBlueWeekProgressEvent(args: {
  userId: string;
  weekNumber: number;
  previousCompletedSections?: string[];
  currentCompletedSections?: string[];
  sealed?: boolean;
  pathwayCompleted?: boolean;
}) {
  const previousCompleted = new Set(
    (args.previousCompletedSections ?? []).filter((sectionId): sectionId is string => typeof sectionId === 'string')
  );
  const currentCompleted = (args.currentCompletedSections ?? []).filter(
    (sectionId): sectionId is string => typeof sectionId === 'string'
  );
  const newlyCompleted = currentCompleted.filter((sectionId) => !previousCompleted.has(sectionId));
  const previousCount = previousCompleted.size;
  const currentCount = currentCompleted.length;

  const updates: Promise<void>[] = [];

  if (currentCount > 0 && (currentCount !== previousCount || args.sealed)) {
    updates.push(
      upsertBlueEventFact({
        userId: args.userId,
        eventKey: `course-week-${args.weekNumber}-progress`,
        category: 'progress',
        summary: `Week ${args.weekNumber} progress: ${currentCount} course task(s) completed.`,
        confidence: 0.97,
        metadata: {
          weekNumber: args.weekNumber,
          completedTaskCount: currentCount,
          completedSections: currentCompleted,
        },
      })
    );
    updates.push(
      upsertBlueEventFact({
        userId: args.userId,
        eventKey: 'course-current-focus',
        category: 'progress',
        summary: `User is currently working through Week ${args.weekNumber}.`,
        confidence: 0.93,
        metadata: {
          weekNumber: args.weekNumber,
          completedTaskCount: currentCount,
        },
      })
    );
  }

  if (currentCount > 0 && (newlyCompleted.length > 0 || currentCount !== previousCount)) {
    const recentTaskLabels = currentCompleted.slice(-3).map(prettifySectionLabel);
    updates.push(
      upsertBlueEventFact({
        userId: args.userId,
        eventKey: `course-week-${args.weekNumber}-recent-tasks`,
        category: 'progress',
        summary: `Recent completed tasks in Week ${args.weekNumber}: ${recentTaskLabels.join(', ')}.`,
        confidence: 0.94,
        metadata: {
          weekNumber: args.weekNumber,
          recentTaskIds: currentCompleted.slice(-3),
          recentTaskLabels,
        },
      })
    );
  }

  if (newlyCompleted.length > 0) {
    const latestTaskId = newlyCompleted[newlyCompleted.length - 1];
    updates.push(
      upsertBlueEventFact({
        userId: args.userId,
        eventKey: 'course-latest-task',
        category: 'progress',
        summary: `Most recently completed course task: Week ${args.weekNumber} ${prettifySectionLabel(latestTaskId)}.`,
        confidence: 0.97,
        metadata: {
          weekNumber: args.weekNumber,
          taskId: latestTaskId,
          taskLabel: prettifySectionLabel(latestTaskId),
        },
      })
    );
  }

  if (args.sealed) {
    updates.push(
      upsertBlueEventFact({
        userId: args.userId,
        eventKey: `course-week-${args.weekNumber}-sealed`,
        category: 'progress',
        summary: `Week ${args.weekNumber} has been sealed.`,
        confidence: 0.99,
        metadata: {
          weekNumber: args.weekNumber,
          completedTaskCount: currentCount,
        },
      })
    );
  }

  if (args.pathwayCompleted) {
    updates.push(
      upsertBlueEventFact({
        userId: args.userId,
        eventKey: 'course-pathway-complete',
        category: 'progress',
        summary: 'User has sealed the full academy pathway.',
        confidence: 0.99,
        metadata: {
          weekNumber: args.weekNumber,
        },
      })
    );
  }

  if (updates.length) {
    await Promise.all(updates);
  }
}

export async function getBlueRecentMessages(userId: string, limit = 8): Promise<BlueChatMessage[]> {
  await ensureBlueMemorySchema();

  const rows = await sqlQuery<Array<{ role: 'user' | 'assistant'; text: string; created_at: string }>>(
    `SELECT role, text, created_at
     FROM blue_chat_messages
     WHERE user_id = :userId
     ORDER BY created_at DESC
     LIMIT :limit`,
    { userId, limit }
  );

  return rows.reverse().map((row) => ({
    role: row.role,
    text: row.text,
    createdAt: row.created_at,
  }));
}

export async function buildBlueContext(args: {
  userId: string;
  username?: string | null;
}) {
  await ensureBlueMemorySchema();

  const [morningPages, questSummary, weekSummary, relationshipRows, factRows, recentMessages] = await Promise.all([
    getMorningPageSummary(args.userId),
    getQuestSummary(args.userId),
    getWeekSummary(args.userId),
    sqlQuery<Array<{
      first_interaction_at: string;
      last_interaction_at: string;
      interaction_count: number;
    }>>(
      `SELECT first_interaction_at, last_interaction_at, interaction_count
       FROM blue_relationship_state
       WHERE user_id = :userId
       LIMIT 1`,
      { userId: args.userId }
    ),
    sqlQuery<Array<{ category: string; summary: string; confidence: number }>>(
      `SELECT category, summary, confidence
       FROM blue_memory_facts
       WHERE user_id = :userId
       ORDER BY updated_at DESC, confidence DESC
       LIMIT 12`,
      { userId: args.userId }
    ),
    getBlueRecentMessages(args.userId, 8),
  ]);

  const relationship = relationshipRows[0]
    ? {
        firstInteractionAt: relationshipRows[0].first_interaction_at,
        lastInteractionAt: relationshipRows[0].last_interaction_at,
        interactionCount: Number(relationshipRows[0].interaction_count || 0),
      }
    : null;

  const values: BlueContextValues = {
    username: args.username ?? null,
    morningPages,
    completedQuestCount: questSummary.completedQuestCount,
    recentCompletedQuests: questSummary.recentCompletedQuests,
    sealedWeeks: weekSummary.sealedWeeks,
    highestWeekTouched: weekSummary.highestWeekTouched,
    completedTaskCount: weekSummary.completedTaskCount,
    relationship,
    recentFacts: factRows.map((row) => ({
      category: row.category,
      summary: row.summary,
      confidence: Number(row.confidence),
    })),
    recentMessages,
  };

  const contextText = [
    'Blue memory context for this user.',
    `Username: ${values.username || 'unknown'}`,
    `Morning pages total: ${values.morningPages.totalEntries}`,
    `Morning page streak: ${values.morningPages.streak} day(s)`,
    `Last morning page date: ${values.morningPages.lastEntryDate || 'none'}`,
    `Completed quests: ${values.completedQuestCount}`,
    `Recent completed quests: ${values.recentCompletedQuests.length ? values.recentCompletedQuests.join(', ') : 'none'}`,
    `Completed course tasks: ${values.completedTaskCount}`,
    `Highest week touched: ${values.highestWeekTouched ?? 'none'}`,
    `Sealed weeks: ${values.sealedWeeks.length ? values.sealedWeeks.join(', ') : 'none'}`,
    values.relationship
      ? `Relationship: interaction #${values.relationship.interactionCount}, first seen ${values.relationship.firstInteractionAt}, last seen ${values.relationship.lastInteractionAt}`
      : 'Relationship: first-time or not yet recorded',
    `Durable memories: ${values.recentFacts.length ? values.recentFacts.map((fact) => `[${fact.category}] ${fact.summary}`).join(' | ') : 'none yet'}`,
    `Recent chat history: ${values.recentMessages.length ? values.recentMessages.map((message) => `${message.role}: ${message.text}`).join(' || ') : 'none yet'}`,
    'Use this context naturally. Do not dump it back to the user. Reference it only when it improves warmth, continuity, accountability, or personalization.',
  ].join('\n');

  return { values, contextText };
}
