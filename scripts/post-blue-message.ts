import { sqlQuery } from '@/lib/db';
import { ensureChatSchema } from '@/lib/ensureChatSchema';

const BLUE_USER_ID = 'blue-system';
const BLUE_USERNAME = 'Blue';
const BLUE_AVATAR = '/blue/blue-avatar.png';

async function getOrCreateBlueUser() {
  await ensureChatSchema();

  // Check if Blue exists
  const existing = await sqlQuery<Array<{ id: string }>>(
    `SELECT id FROM users WHERE id = :id`,
    { id: BLUE_USER_ID }
  );

  if (existing.length > 0) {
    return BLUE_USER_ID;
  }

  // Create Blue user if not exists
  await sqlQuery(
    `INSERT INTO users (id, username, avatar_url)
     VALUES (:id, :username, :avatarUrl)
     ON CONFLICT DO NOTHING`,
    {
      id: BLUE_USER_ID,
      username: BLUE_USERNAME,
      avatarUrl: BLUE_AVATAR
    }
  );

  return BLUE_USER_ID;
}

async function postBlueMessage(messageText: string) {
  const userId = await getOrCreateBlueUser();
  await ensureChatSchema();

  const result = await sqlQuery<
    Array<{ id: number; created_at: string }>
  >(
    `INSERT INTO chat_messages (user_id, username, avatar_url, message, type)
     VALUES (:userId, :username, :avatarUrl, :message, 'user')
     RETURNING id, created_at`,
    {
      userId,
      username: BLUE_USERNAME,
      avatarUrl: BLUE_AVATAR,
      message: messageText
    }
  );

  console.log(`Message posted successfully:`, result[0]);
  return result[0];
}

async function main() {
  const message = process.argv[2] ||
    "The archives were quiet until now. Someone's been paying attention.";

  try {
    await postBlueMessage(message);
  } catch (error) {
    console.error('Error posting Blue message:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
