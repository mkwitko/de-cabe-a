-- De Cabeça: analytics queries over the "Event" table (ANALYTICS.md §2).
-- Days are São Paulo civil dates. Run with psql against the API database.

-- 1. DAU: sessions with at least one game started per day
SELECT (ts AT TIME ZONE 'America/Sao_Paulo')::date AS day, COUNT(DISTINCT "sessionHash") AS dau
FROM "Event" WHERE name = 'game_started'
GROUP BY 1 ORDER BY 1 DESC;

-- 2. Completion and abandonment rate per game and kind (last 14 days)
SELECT props->>'mode' AS mode, props->>'kind' AS kind,
       COUNT(*) FILTER (WHERE name = 'game_started') AS started,
       COUNT(*) FILTER (WHERE name = 'game_completed') AS completed,
       ROUND(100.0 * COUNT(*) FILTER (WHERE name = 'game_completed')
             / NULLIF(COUNT(*) FILTER (WHERE name = 'game_started'), 0), 1) AS completion_pct
FROM "Event" WHERE name IN ('game_started', 'game_completed') AND ts > now() - interval '14 days'
GROUP BY 1, 2 ORDER BY 1, 2;

-- 3. D1 and D7 retention by first-seen day
WITH first AS (
  SELECT "sessionHash", MIN((ts AT TIME ZONE 'America/Sao_Paulo')::date) AS d0 FROM "Event" GROUP BY 1
), days AS (
  SELECT DISTINCT "sessionHash", (ts AT TIME ZONE 'America/Sao_Paulo')::date AS d FROM "Event"
)
SELECT f.d0, COUNT(*) AS cohort,
       ROUND(100.0 * COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM days x WHERE x."sessionHash" = f."sessionHash" AND x.d = f.d0 + 1)) / COUNT(*), 1) AS d1_pct,
       ROUND(100.0 * COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM days x WHERE x."sessionHash" = f."sessionHash" AND x.d = f.d0 + 7)) / COUNT(*), 1) AS d7_pct
FROM first f GROUP BY 1 ORDER BY 1 DESC;

-- 4. Share rate: shared / completed, per game
SELECT props->>'mode' AS mode,
       COUNT(*) FILTER (WHERE name = 'result_shared') AS shared,
       COUNT(*) FILTER (WHERE name = 'game_completed') AS completed,
       ROUND(100.0 * COUNT(*) FILTER (WHERE name = 'result_shared') / NULLIF(COUNT(*) FILTER (WHERE name = 'game_completed'), 0), 1) AS share_pct
FROM "Event" WHERE name IN ('result_shared', 'game_completed')
GROUP BY 1;

-- 5. Invalid answer rate per daily challenge (high = hard challenge or missing data)
SELECT props->>'mode' AS mode, props->>'challengeId' AS challenge_id,
       COUNT(*) AS guesses,
       ROUND(100.0 * COUNT(*) FILTER (WHERE (props->>'correct')::boolean IS FALSE) / COUNT(*), 1) AS wrong_pct
FROM "Event"
WHERE name = 'answer_submitted' AND props->>'kind' = 'daily'
GROUP BY 1, 2 ORDER BY wrong_pct DESC;
