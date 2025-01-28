CREATE TABLE IF NOT EXISTS adp__leagues (
  league_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  avatar VARCHAR(255),
  season VARCHAR(255),
  settings JSONB,
  scoring_settings JSONB,
  roster_positions JSONB,
  status VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

