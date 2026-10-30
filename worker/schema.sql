-- Feed the Goop leaderboard database (Cloudflare D1, which is SQLite). From the design doc's Data table.
-- Apply with: npx wrangler d1 execute goop --file=schema.sql   (add --remote for the deployed database)

-- A claimed name. The token and the recovery phrase are only ever stored hashed.
CREATE TABLE IF NOT EXISTS players (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL UNIQUE COLLATE NOCASE,   -- 3 to 16 characters, checked by the game's own validateName
  token_hash    TEXT    NOT NULL,                         -- SHA-256 of the bearer token kept beside the save
  recovery_hash TEXT    NOT NULL,                         -- SHA-256 of the recovery phrase (salty-pipette-42)
  created_at    INTEGER NOT NULL                          -- unix ms
);

-- One submitted result. kind is a board: sun, universe, week, daily, bigbangs.
CREATE TABLE IF NOT EXISTS runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id    INTEGER NOT NULL REFERENCES players(id),
  kind         TEXT    NOT NULL CHECK (kind IN ('sun', 'universe', 'week', 'daily', 'bigbangs')),
  board_key    TEXT,                                      -- the week (its Monday) or the date, for keyed boards
  seconds      REAL,                                      -- time boards
  slop         REAL,                                      -- the weekly board
  clicks       INTEGER NOT NULL DEFAULT 0,
  hops         INTEGER NOT NULL DEFAULT 0,
  stage        INTEGER NOT NULL DEFAULT 0,
  flagged      INTEGER NOT NULL DEFAULT 0,                -- 1: faster than the simulated floor; shown on Suspicious Goop
  flag_reason  TEXT,
  submitted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS runs_board ON runs (kind, board_key, flagged, seconds);
CREATE INDEX IF NOT EXISTS runs_player ON runs (player_id, kind);

-- Badges, for public profiles and link previews.
CREATE TABLE IF NOT EXISTS badges (
  player_id INTEGER NOT NULL REFERENCES players(id),
  badge_id  TEXT    NOT NULL,
  earned_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, badge_id)
);

-- The daily goop. Normally the same date rule as the game (src/daily.js); a row here pins a day.
CREATE TABLE IF NOT EXISTS daily (
  date    TEXT    PRIMARY KEY,                            -- YYYY-MM-DD, UTC
  seed    INTEGER NOT NULL,
  mutator TEXT    NOT NULL
);
