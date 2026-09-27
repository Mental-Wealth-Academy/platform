-- Refresh all users to Grok-Bot avatars
-- Sets default Grok-Bot avatar for any accounts with null or legacy IPFS avatars

UPDATE public.users
SET selected_avatar_id = id || '#0',
    avatar_url = '/api/avatars/render?seed=' || id || '%230'
WHERE (
  avatar_url IS NULL
  OR selected_avatar_id IS NULL
  OR avatar_url LIKE '%ipfs%'
  OR selected_avatar_id LIKE 'avatar_%'
  OR selected_avatar_id LIKE 'angel_%'
)
AND username != 'Blue';

-- Clean up legacy angel / IPFS avatar entries from user_avatars
DELETE FROM public.user_avatars
WHERE avatar_url LIKE '%ipfs%'
   OR avatar_id LIKE 'avatar_%'
   OR avatar_id LIKE 'angel_%';

-- Sync historical chat messages to the user's active avatar
UPDATE public.chat_messages cm
SET avatar_url = u.avatar_url
FROM public.users u
WHERE cm.user_id = u.id
  AND (
    cm.avatar_url IS NULL
    OR cm.avatar_url LIKE '%dicebear%'
    OR cm.avatar_url LIKE '%ipfs%'
  )
  AND u.avatar_url IS NOT NULL;
