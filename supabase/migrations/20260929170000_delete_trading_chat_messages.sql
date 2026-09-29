-- Purge legacy simulated messages that mention trading, charts, or market stress
DELETE FROM chat_messages
WHERE user_id LIKE 'dummy_%'
  AND (
    message ILIKE '%trading%'
    OR message ILIKE '%panic-sell%'
    OR message ILIKE '%touching the charts%'
    OR message ILIKE '%market stress%'
  );
