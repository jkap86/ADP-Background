CREATE TABLE IF NOT EXISTS adp__drafts (
  draft_id VARCHAR(255) PRIMARY KEY,
  status VARCHAR(255) NOT NULL,
  type VARCHAR(255) NOT NULL,
  settings JSONB NOT NULL,
  start_time TIMESTAMP,
  last_picked TIMESTAMP,
  league_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  picks JSONB DEFAULT '{}',
  CONSTRAINT fk_league FOREIGN KEY (league_id) REFERENCES adp__leagues(league_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS adp__drafts_league_status ON adp__drafts (league_id, status);
