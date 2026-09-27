/**
 * Database refresh script for Grok-Bot avatars.
 *
 * 1. Sets default Grok-Bot avatar for any user missing an avatar or holding a legacy IPFS angel avatar.
 * 2. Ensures all users have their 6 deterministically assigned Grok-Bot choices in `user_avatars`.
 * 3. Updates legacy avatars in `chat_messages` to the user's active Grok-Bot avatar.
 *
 * Usage:
 *   npx tsx scripts/refresh-grok-bot-avatars.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { isDbConfigured, sqlQuery, withTransaction, sqlQueryWithClient } from '../lib/db';
import { getAssignedAvatars } from '../lib/avatars';

async function refreshAvatars() {
  if (!isDbConfigured()) {
    throw new Error('Database is not configured.');
  }

  console.log('[Avatar Refresh] Starting database refresh...');

  // 1. Update users with null or legacy angel/ipfs avatar_urls
  const updatedUsers = await sqlQuery<Array<{ id: string; username: string }>>(
    `UPDATE users
     SET selected_avatar_id = id || '#0',
         avatar_url = '/api/avatars/render?seed=' || id || '%230'
     WHERE (
       avatar_url IS NULL
       OR selected_avatar_id IS NULL
       OR avatar_url LIKE '%ipfs%'
       OR selected_avatar_id LIKE 'avatar_%'
       OR selected_avatar_id LIKE 'angel_%'
     )
     AND username != 'Blue'
     RETURNING id, username`
  );
  console.log(`[Avatar Refresh] Updated ${updatedUsers.length} users with null or legacy avatars to Grok-Bot #0.`);

  // 2. Clean up legacy angel / IPFS avatar entries from user_avatars
  const deletedOldUa = await sqlQuery(
    `DELETE FROM user_avatars
     WHERE avatar_url LIKE '%ipfs%'
        OR avatar_id LIKE 'avatar_%'
        OR avatar_id LIKE 'angel_%'`
  );
  console.log('[Avatar Refresh] Cleaned up legacy IPFS/angel rows from user_avatars.');

  // 3. For every user, ensure all 6 Grok-Bot choices exist in user_avatars
  const allUsers = await sqlQuery<Array<{ id: string; selected_avatar_id: string | null; avatar_reroll_count: number }>>(
    `SELECT id, selected_avatar_id, avatar_reroll_count FROM users WHERE username != 'Blue'`
  );

  console.log(`[Avatar Refresh] Populating assigned choices for ${allUsers.length} users...`);

  await withTransaction(async (client) => {
    for (const user of allUsers) {
      const choices = getAssignedAvatars(user.id, user.avatar_reroll_count || 0);
      for (const choice of choices) {
        const isSelected = user.selected_avatar_id === choice.id;
        await sqlQueryWithClient(
          client,
          `INSERT INTO user_avatars (id, user_id, avatar_id, avatar_url, is_selected)
           VALUES (:id, :userId, :avatarId, :avatarUrl, :isSelected)
           ON CONFLICT (user_id, avatar_id) DO UPDATE SET
             avatar_url = EXCLUDED.avatar_url,
             is_selected = EXCLUDED.is_selected`,
          {
            id: uuidv4(),
            userId: user.id,
            avatarId: choice.id,
            avatarUrl: choice.image_url,
            isSelected,
          }
        );
      }
    }
  });

  console.log(`[Avatar Refresh] Successfully seeded 6 choices per user in user_avatars.`);

  // 4. Update chat_messages with legacy or null avatars
  const updatedChat = await sqlQuery(
    `UPDATE chat_messages cm
     SET avatar_url = u.avatar_url
     FROM users u
     WHERE cm.user_id = u.id
       AND (
         cm.avatar_url IS NULL
         OR cm.avatar_url LIKE '%dicebear%'
         OR cm.avatar_url LIKE '%ipfs%'
       )
       AND u.avatar_url IS NOT NULL`
  );
  console.log('[Avatar Refresh] Synced historical chat message avatar URLs.');

  console.log('[Avatar Refresh] All database avatars successfully refreshed!');
}

refreshAvatars()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Avatar Refresh] Failed:', err);
    process.exit(1);
  });
