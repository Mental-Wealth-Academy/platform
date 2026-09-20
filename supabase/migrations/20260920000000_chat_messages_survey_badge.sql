-- Add survey_badge column to chat_messages for global chat recognition
ALTER TABLE IF EXISTS public.chat_messages
ADD COLUMN IF NOT EXISTS survey_badge TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
ON public.chat_messages (user_id);
